/**
 * marimo Bridge - Obsidian plugin entry point.
 *
 * The plugin lets you view and edit {@link https://marimo.io | marimo} notebooks
 * (plain `.py` files) directly inside Obsidian. marimo's editor is a web app, so
 * the plugin:
 *
 *   1. Auto-starts a local `marimo edit` server rooted at the vault
 *      ({@link ServerManager}).
 *   2. Embeds that server's UI in an Electron `<webview>` — either as a
 *      full-tab editor ({@link MarimoEditorView}) or inline inside a note
 *      ({@link createMarimoEmbedProcessor}).
 *
 * Because the marimo server reads and writes the real `.py` file on disk, edits
 * are persisted with no extra file I/O on the plugin side.
 *
 * Desktop only: the plugin depends on Node's `child_process` and Electron's
 * `<webview>` tag.
 */
import {
	FileSystemAdapter,
	Notice,
	Plugin,
	TFile,
	TFolder,
	addIcon,
	normalizePath,
} from "obsidian";
import * as path from "path";
import {
	DEFAULT_SETTINGS,
	MarimoBridgeSettings,
	MarimoBridgeSettingTab,
} from "./settings";
import { ServerManager } from "./server-manager";
import { MarimoEditorView } from "./editor-view";
import { createMarimoEmbedProcessor } from "./embed-processor";
import { exportNotebookToMarkdown } from "./notebook-export";
import {
	NEW_NOTEBOOK_TEMPLATE,
	SVG_MARIMO_LOGO,
	ICON_MARIMO_LOGO,
	VIEW_TYPE_MARIMO,
	CMD_OPEN_MARIMO_HOME_ID,
	CMD_OPEN_MARIMO_HOME_NAME,
	CMD_OPEN_ACTIVE_FILE_ID,
	CMD_OPEN_ACTIVE_FILE_NAME,
	CMD_CREATE_NOTEBOOK_ID,
	CMD_CREATE_NOTEBOOK_NAME,
	CMD_RESTART_SERVER_ID,
	CMD_RESTART_SERVER_NAME,
	CMD_EXPORT_MARKDOWN_ID,
	CMD_EXPORT_MARKDOWN_NAME,
	CMD_EXPORT_OUTPUTS_MARKDOWN_ID,
	CMD_EXPORT_OUTPUTS_MARKDOWN_NAME,
	NOTICE_TIMEOUT_MS,
	FILE_SERVER_RECORDS,
	MAX_NOTEBOOK_NAME_ATTEMPTS,
	TEXT_NOTEBOOK_NAME_EXHAUSTED,
	FILE_NEW,
	LEAF_TAB,
	EXT_PY,
	RUNTIME_CONSTANTS,
} from "./constants";

/**
 * Minimal, valid marimo notebook used by the "Create new marimo notebook"
 * command. A marimo notebook is just a Python module whose cells are functions
 * decorated with `@app.cell`.
 */
// NEW_NOTEBOOK_TEMPLATE is imported from constants.ts

export default class MarimoBridgePlugin extends Plugin {
	/** Persisted user settings (loaded in {@link onload}). */
	settings!: MarimoBridgeSettings;
	/** Owns the lifecycle of every marimo server process. */
	private serverManager: ServerManager | null = null;

	get servers(): ServerManager {
		if (!this.serverManager) {
			throw new Error(RUNTIME_CONSTANTS.ERROR_SERVER_MANAGER_UNAVAILABLE);
		}
		return this.serverManager;
	}

	async onload(): Promise<void> {
		// Register custom marimo logo icon
		addIcon(
			ICON_MARIMO_LOGO,
			SVG_MARIMO_LOGO
		);

		await this.loadSettings();

		// We need a real on-disk path to launch marimo and resolve notebooks.
		// Non-FileSystem adapters (e.g. Obsidian Sync sandbox) are unsupported.
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice(
				RUNTIME_CONSTANTS.NOTICE_LOCAL_VAULT_REQUIRED
			);
			return;
		}
		// Records of servers we spawn live in the plugin dir, separate from
		// data.json (which saveData overwrites), so they survive a crash and can
		// be reconciled on the next launch.
		const recordsPath = path.join(
			adapter.getBasePath(),
			this.manifest.dir ?? "",
			FILE_SERVER_RECORDS
		);
		this.serverManager = new ServerManager(adapter, this.settings, recordsPath);

		// Kick off prior-session orphan reconciliation NOW (not awaited here) so
		// `reconcilePromise` is set before Obsidian restores any marimo view. A
		// restored view calls ensureEditServer() on its own (setState → render),
		// and that path only waits for reconciliation if the promise already
		// exists. Starting it later (in onLayoutReady) lets a restored view spawn
		// a fresh server on our fixed port first; the reconcile then fires and —
		// because the OS can recycle the orphan's PID for that new server and we
		// confirm identity by port — kills the very replacement it just spawned,
		// leaving a blank webview. Setting the promise here closes that race.
		void this.servers.reconcileOrphans();

		// The custom view that hosts the marimo web UI in a <webview>.
		this.registerView(
			VIEW_TYPE_MARIMO,
			(leaf) => new MarimoEditorView(leaf, this)
		);

		// Optionally make `.py` open in the marimo editor by default. Obsidian
		// delivers the opened file to the view via its view state ({ file }).
		if (this.settings.takeOverPyExtension) {
			this.registerExtensions(
				[RUNTIME_CONSTANTS.EXTENSION_PY],
				VIEW_TYPE_MARIMO
			);
		}

		// Inline embeds: ```marimo code blocks become <webview>s.
		this.registerMarkdownCodeBlockProcessor(
			RUNTIME_CONSTANTS.MARKDOWN_BLOCK_MARIMO,
			createMarimoEmbedProcessor(this)
		);

		// Ribbon: left-click directly opens the marimo home dashboard.
		this.addRibbonIcon(ICON_MARIMO_LOGO, CMD_OPEN_MARIMO_HOME_NAME, () => {
			void this.openMarimo(undefined);
		});

		this.addCommand({
			id: CMD_OPEN_MARIMO_HOME_ID,
			name: CMD_OPEN_MARIMO_HOME_NAME,
			callback: () => void this.openMarimo(undefined),
		});

		// Only enabled when the active file is a `.py` notebook.
		this.addCommand({
			id: CMD_OPEN_ACTIVE_FILE_ID,
			name: CMD_OPEN_ACTIVE_FILE_NAME,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const isPy = file?.extension === RUNTIME_CONSTANTS.EXTENSION_PY;
				if (checking) return isPy;
				if (file) void this.openMarimo(file.path);
				return true;
			},
		});

		this.addCommand({
			id: CMD_CREATE_NOTEBOOK_ID,
			name: CMD_CREATE_NOTEBOOK_NAME,
			callback: () => void this.createNotebook(),
		});

		this.addCommand({
			id: CMD_RESTART_SERVER_ID,
			name: CMD_RESTART_SERVER_NAME,
			callback: async () => {
				new Notice(RUNTIME_CONSTANTS.NOTICE_RESTARTING_SERVER);
				await this.servers.restartEditServer();
			},
		});

		// Export the active `.py` notebook (code + outputs) to a static Markdown
		// note. Enabled only when a `.py` file is active.
		this.addCommand({
			id: CMD_EXPORT_MARKDOWN_ID,
			name: CMD_EXPORT_MARKDOWN_NAME,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const isPy = file?.extension === RUNTIME_CONSTANTS.EXTENSION_PY;
				if (checking) return isPy;
				if (file) void exportNotebookToMarkdown(this, file.path, true);
				return true;
			},
		});

		// Same as above but exports only the execution results (no code).
		this.addCommand({
			id: CMD_EXPORT_OUTPUTS_MARKDOWN_ID,
			name: CMD_EXPORT_OUTPUTS_MARKDOWN_NAME,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const isPy = file?.extension === RUNTIME_CONSTANTS.EXTENSION_PY;
				if (checking) return isPy;
				if (file) void exportNotebookToMarkdown(this, file.path, false);
				return true;
			},
		});

		// Right-click → "Open in marimo" on `.py` files in the file explorer,
		// and on `.md` files when the Markdown context-menu option is enabled
		// (requires a marimo Markdown integration in the user's environment).
		this.registerEvent(
			this.app.workspace.on(
				RUNTIME_CONSTANTS.EVENT_FILE_MENU,
				(menu, file) => {
					if (!(file instanceof TFile)) return;
					const isPy =
						file.extension === RUNTIME_CONSTANTS.EXTENSION_PY;
					const isMd =
						file.extension === RUNTIME_CONSTANTS.EXTENSION_MD &&
						this.settings.showMarkdownContextMenu;
					if (isPy || isMd) {
						menu.addItem((item) =>
							item
								.setTitle(RUNTIME_CONSTANTS.TITLE_OPEN_IN_MARIMO)
								.setIcon(ICON_MARIMO_LOGO)
								.onClick(() => void this.openMarimo(file.path))
						);
					}
					if (isPy) {
						menu.addItem((item) =>
							item
								.setTitle(CMD_EXPORT_MARKDOWN_NAME)
								.setIcon(ICON_MARIMO_LOGO)
								.onClick(
									() => void exportNotebookToMarkdown(this, file.path, true)
								)
						);
						menu.addItem((item) =>
							item
								.setTitle(CMD_EXPORT_OUTPUTS_MARKDOWN_NAME)
								.setIcon(ICON_MARIMO_LOGO)
								.onClick(
									() => void exportNotebookToMarkdown(this, file.path, false)
								)
						);
					}
				}
			)
		);

		// Right-click → "Create new marimo notebook" in the file explorer.
		this.registerEvent(
			this.app.workspace.on(
				RUNTIME_CONSTANTS.EVENT_FILE_MENU,
				(menu, file) => {
					if (!this.settings.showContextMenu) return;
					menu.addItem((item) =>
						item
							.setTitle(CMD_CREATE_NOTEBOOK_NAME)
							.setIcon(ICON_MARIMO_LOGO)
							.onClick(() => {
								const folderPath =
									file instanceof TFolder
										? file.path
										: (file.parent?.path ?? "");
								void this.createNotebook(folderPath);
							})
					);
				}
			)
		);

		this.addSettingTab(new MarimoBridgeSettingTab(this.app, this));

		// A full Obsidian quit does not reliably invoke onunload, and Unix servers
		// are spawned detached (their own process group), so they survive a parent
		// exit. Synchronously signal every server we spawned on window unload;
		// anything that slips through is reconciled on the next launch. We listen
		// on both `beforeunload` and `unload` because neither fires reliably across
		// all quit paths; `stopAllSync` is idempotent, so a double-fire is a no-op.
		this.registerDomEvent(window, RUNTIME_CONSTANTS.EVENT_BEFORE_UNLOAD, () => {
			this.servers.stopAllSync();
		});
		this.registerDomEvent(window, RUNTIME_CONSTANTS.EVENT_UNLOAD, () => {
			this.servers.stopAllSync();
		});

		// Defer until the workspace is ready so we never block startup.
		this.app.workspace.onLayoutReady(async () => {
			// Clean up any servers a prior session left orphaned (crash/force-quit)
			// before we start or adopt anything on our ports.
			await this.servers.reconcileOrphans();

			if (!this.settings.autoStart) return;
			// Only auto-start when marimo is actually installed — otherwise stay
			// quiet and point the user at the installer in settings.
			if (await this.servers.checkAvailable()) {
				await this.servers.ensureEditServer();
			} else {
				new Notice(
						RUNTIME_CONSTANTS.NOTICE_MARIMO_NOT_INSTALLED,
					NOTICE_TIMEOUT_MS
				);
			}
		});
	}

	onunload(): void {
		// Tear down every server we started (best-effort; safe if none ran).
		// `serverManager` is unset when onload bailed early (non-FileSystem vault).
		this.serverManager?.stopAll();
	}

	/**
	 * Open a notebook by vault-relative path, or the marimo home page when
	 * `file` is undefined, in a new tab hosting {@link MarimoEditorView}.
	 */
	public async openMarimo(
		file: string | undefined,
		openInNewTab = true,
		active = true
	): Promise<void> {
		if (file === FILE_NEW || file?.startsWith(FILE_NEW)) {
			const folder = this.app.workspace.getActiveFile()?.parent?.path ?? "";
			const created = await this.createUntitledNotebook(folder);
			if (!created) return;
			file = created;
		}

		const previousLeaf = this.app.workspace.getMostRecentLeaf();
		const leaf = openInNewTab
			? this.app.workspace.getLeaf(LEAF_TAB)
			: previousLeaf;
		if (!leaf) return;
		await leaf.setViewState({
			type: VIEW_TYPE_MARIMO,
			active: active,
			state: { file },
		});
		if (active) {
			this.app.workspace.setActiveLeaf(leaf, { focus: true });
		} else if (previousLeaf && leaf !== previousLeaf) {
			this.app.workspace.setActiveLeaf(previousLeaf, { focus: true });
		}
	}

	/**
	 * Create a new notebook next to the active file (or at the vault root),
	 * picking a non-colliding `untitled_marimo*.py` name, then open it.
	 */
	private async createNotebook(folderPath?: string): Promise<void> {
		const folder = folderPath ?? this.app.workspace.getActiveFile()?.parent?.path ?? "";
		const target = await this.createUntitledNotebook(folder);
		if (!target) return;
		await this.openMarimo(target);
	}

	/**
	 * Create an `untitled_marimo*.py` notebook in `folder` (vault-relative, or ""
	 * for the vault root), picking the first non-colliding name, and return its
	 * vault-relative path. Does not open it.
	 */
	private async createUntitledNotebook(folder: string): Promise<string | null> {
		for (let i = 0; i < MAX_NOTEBOOK_NAME_ATTEMPTS; i++) {
			const name =
				i === 0
					? RUNTIME_CONSTANTS.FILE_UNTITLED_MARIMO
					: `${RUNTIME_CONSTANTS.FILE_UNTITLED_MARIMO_PREFIX}${i.toString()}${EXT_PY}`;
			const target = normalizePath(
				folder ? [folder, name].join(RUNTIME_CONSTANTS.SLASH) : name
			);
			if (this.app.vault.getAbstractFileByPath(target)) continue;
			await this.app.vault.create(target, NEW_NOTEBOOK_TEMPLATE);
			return target;
		}
		new Notice(TEXT_NOTEBOOK_NAME_EXHAUSTED, NOTICE_TIMEOUT_MS);
		return null;
	}

	async loadSettings(): Promise<void> {
		// loadData() resolves to null on a fresh install (no data.json yet), so
		// fall back to an empty object before touching its properties.
		const stored = ((await this.loadData()) ?? {}) as Partial<MarimoBridgeSettings> & {
			host?: unknown;
		};
		delete stored.host;
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			stored
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// Re-evaluate executable availability and stop managed servers when a
		// process-affecting setting (path, port, or token) changed.
		this.servers.invalidateAvailability();
	}
}
