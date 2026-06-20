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
	NOTICE_TIMEOUT_MS,
	FILE_SERVER_RECORDS,
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
	servers!: ServerManager;

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
				"Marimo bridge requires a local vault (desktop). Disabling."
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
		this.servers = new ServerManager(adapter, this.settings, recordsPath);

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
			this.registerExtensions(["py"], VIEW_TYPE_MARIMO);
		}

		// Inline embeds: ```marimo code blocks become <webview>s.
		this.registerMarkdownCodeBlockProcessor(
			"marimo",
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
				const isPy = file?.extension === "py";
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
				new Notice("Restarting marimo server…");
				await this.servers.restartEditServer();
			},
		});

		// Right-click → "Open in marimo" on `.py` files in the file explorer.
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && file.extension === "py") {
					menu.addItem((item) =>
						item
							.setTitle("Open in marimo")
							.setIcon(ICON_MARIMO_LOGO)
							.onClick(() => void this.openMarimo(file.path))
					);
				}
			})
		);

		// Right-click → "Create new marimo notebook" in the file explorer.
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!this.settings.showContextMenu) return;
				menu.addItem((item) =>
					item
						.setTitle("Create new marimo notebook")
						.setIcon(ICON_MARIMO_LOGO)
						.onClick(() => {
							const folderPath = file instanceof TFolder ? file.path : (file.parent?.path ?? "");
							void this.createNotebook(folderPath);
						})
				);
			})
		);

		this.addSettingTab(new MarimoBridgeSettingTab(this.app, this));

		// A full Obsidian quit does not reliably invoke onunload, and Unix servers
		// are spawned detached (their own process group), so they survive a parent
		// exit. Synchronously signal every server we spawned on window unload;
		// anything that slips through is reconciled on the next launch. We listen
		// on both `beforeunload` and `unload` because neither fires reliably across
		// all quit paths; `stopAllSync` is idempotent, so a double-fire is a no-op.
		this.registerDomEvent(window, "beforeunload", () => {
			this.servers.stopAllSync();
		});
		this.registerDomEvent(window, "unload", () => {
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
					"Marimo bridge: marimo is not installed, so the server was not started. Install it from the plugin settings.",
					NOTICE_TIMEOUT_MS
				);
			}
		});
	}

	onunload(): void {
		// Tear down every server we started (best-effort; safe if none ran).
		this.servers.stopAll();
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
		if (file === "__new__" || file?.startsWith("__new__")) {
			const folder = this.app.workspace.getActiveFile()?.parent?.path ?? "";
			let name = "untitled_marimo.py";
			let target = normalizePath(folder ? `${folder}/${name}` : name);
			let i = 1;
			while (this.app.vault.getAbstractFileByPath(target)) {
				name = `untitled_marimo_${(i++).toString()}.py`;
				target = normalizePath(folder ? `${folder}/${name}` : name);
			}
			await this.app.vault.create(target, NEW_NOTEBOOK_TEMPLATE);
			file = target;
		}

		const leaf = openInNewTab
			? this.app.workspace.getLeaf("tab")
			: this.app.workspace.getMostRecentLeaf();
		if (!leaf) return;
		await leaf.setViewState({
			type: VIEW_TYPE_MARIMO,
			active: active,
			state: { file },
		});
		if (active) {
			// eslint-disable-next-line obsidianmd/no-unsupported-api
			void this.app.workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Create a new notebook next to the active file (or at the vault root),
	 * picking a non-colliding `untitled_marimo*.py` name, then open it.
	 */
	private async createNotebook(folderPath?: string): Promise<void> {
		const folder = folderPath ?? this.app.workspace.getActiveFile()?.parent?.path ?? "";
		let name = "untitled_marimo.py";
		let target = normalizePath(folder ? `${folder}/${name}` : name);
		let i = 1;
		while (this.app.vault.getAbstractFileByPath(target)) {
			name = `untitled_marimo_${(i++).toString()}.py`;
			target = normalizePath(folder ? `${folder}/${name}` : name);
		}
		await this.app.vault.create(target, NEW_NOTEBOOK_TEMPLATE);
		await this.openMarimo(target);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MarimoBridgeSettings>
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// A changed interpreter/marimo path may flip availability, so drop the
		// cached result and let the next check re-detect.
		this.servers.invalidateAvailability();
	}
}
