/**
 * MarimoEditorView — a full-tab Obsidian view that hosts the marimo editor for
 * one notebook (or the marimo home page) inside an Electron `<webview>`.
 *
 * The view is intentionally thin: it holds only the vault-relative path of the
 * notebook to show, resolves the matching server URL, and renders a webview.
 * All editing/state lives in the marimo server, which persists to the real
 * `.py` file.
 */
import { ItemView, WorkspaceLeaf } from "obsidian";
import type MarimoBridgePlugin from "./main";
import { getFilePathFromUrl } from "./url-utils";
import {
	VIEW_TYPE_MARIMO,
	ICON_MARIMO_LOGO,
	CLS_BRIDGE_VIEW,
	CLS_LOADING,
	CLS_WEBVIEW,
	ATTR_ALLOWPOPUPS,
	ATTR_PARTITION,
	ATTR_SRC,
	EVENT_DOM_READY,
	EVENT_WILL_NAVIGATE,
	EVENT_NEW_WINDOW,
	EVENT_DID_NAVIGATE,
	EVENT_CONSOLE_MESSAGE,
	EVENT_DID_FAIL_LOAD,
	WEBVIEW_LOAD_WATCHDOG_MS,
	WEBVIEW_MAX_LOAD_RETRIES,
	ERR_LOAD_ABORTED,
	MARIMO_OPEN_SENTINEL,
	INJECTION_SCRIPT,
	URL_ABOUT_BLANK,
	PROTOCOL_JAVASCRIPT,
	SCHEME_CUSTOM,
	PARTITION_PREFIX,
	DISPOSITION_DEFAULT,
	DISPOSITION_BG_TAB,
	LEAF_TAB,
	PROTOCOL_HTTP,
	PROTOCOL_HTTPS,
	HOST_LOCALHOST,
	HOST_LOOPBACK,
	ACCESS_TOKEN_KEY,
	AUTH_RETRY_MAX,
	PATH_AUTH_LOGIN,
	PATH_NEW,
	PATH_NEW_SLASH,
	FILE_NEW,
	EXT_PY,
	TEXT_MARIMO,
	REDIRECT_URL_KEY,
	TEXT_WEBVIEW_LOAD_FAILED,
	RUNTIME_CONSTANTS,
	formatClassSelector,
	formatWebviewReloadLog,
	formatDidFailLoadReason,
	formatWebviewConsoleLog,
} from "./constants";

/** Persisted view state. `file` undefined → the marimo home page. */
interface MarimoViewState {
	file?: string;
}

export class MarimoEditorView extends ItemView {
	private plugin: MarimoBridgePlugin;
	private currentFile: string | undefined;
	private webview: HTMLElement | null = null;
	private activeRenderPromise: Promise<void> = Promise.resolve();

	constructor(leaf: WorkspaceLeaf, plugin: MarimoBridgePlugin) {
		super(leaf);
		this.plugin = plugin;
		// Show forward/back navigation chrome on the leaf.
		this.navigation = true;
	}

	getViewType(): string {
		return VIEW_TYPE_MARIMO;
	}

	getDisplayText(): string {
		if (!this.currentFile) return TEXT_MARIMO;
		return this.currentFile.split(RUNTIME_CONSTANTS.SLASH).pop() ?? TEXT_MARIMO;
	}

	getIcon(): string {
		return ICON_MARIMO_LOGO;
	}

	/**
	 * Obsidian calls this both when opening a `.py` via the registered
	 * extension and when we programmatically `setViewState({ file })`. We read
	 * the file out of the state and (re)render.
	 */
	async setState(state: MarimoViewState, result: unknown): Promise<void> {
		const newFile = state.file;
		const fileChanged = newFile !== this.currentFile;
		this.currentFile = newFile;
		await super.setState(state, result as never);
		if (fileChanged || !this.webview) {
			await this.render();
		}
	}

	getState(): Record<string, unknown> {
		return { file: this.currentFile };
	}

	async onOpen(): Promise<void> {
		// No-op. Let setState load the view when the workspace resolves the tab state.
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
		this.webview = null;
	}

	/** Ensure the edit server is up, then render its UI in a webview. */
	private async render(): Promise<void> {
		// Queue this render call to avoid overlapping DOM manipulations
		this.activeRenderPromise = this.activeRenderPromise.then(async () => {
			try {
				await this.executeRender();
			} catch (e) {
				console.error(RUNTIME_CONSTANTS.LOG_RENDER_ERROR, e);
			}
		});
		await this.activeRenderPromise;
	}

	private async executeRender(): Promise<void> {
		const container = this.contentEl;
		container.addClass(CLS_BRIDGE_VIEW);

		// Show temporary loading indicator while starting or verifying server
		container.empty();
		container.createDiv({
			cls: CLS_LOADING,
			text: RUNTIME_CONSTANTS.TEXT_STARTING_SERVER,
		});

		const ok = await this.plugin.servers.ensureEditServer();
		if (!ok) {
			container.empty();
			this.webview = null;
			container.createDiv({
				cls: CLS_LOADING,
				text: TEXT_WEBVIEW_LOAD_FAILED,
			});
			return;
		}

		// Render the WebView using the latest file path resolved after startup
		const url = this.currentFile
			? this.plugin.servers.editFileUrl(this.currentFile)
			: this.plugin.servers.editHomeUrl();

		const partitionName = `${PARTITION_PREFIX}${RUNTIME_CONSTANTS.PARTITION_SHARED}`;

		const onFileChanged = (newFile: string) => {
			if (this.currentFile !== newFile) {
				this.currentFile = newFile;
				void this.leaf.setViewState({
					type: VIEW_TYPE_MARIMO,
					state: { file: newFile }
				});
			}
		};

		if (this.webview && container.contains(this.webview)) {
			const currentPartition = this.webview.getAttribute(ATTR_PARTITION);
			if (currentPartition !== partitionName) {
				container.empty();
				this.webview = createMarimoWebview(this.plugin, container, url, partitionName, onFileChanged);
			} else {
				// Remove any loading indicator if it was created/left over
				container.querySelectorAll(formatClassSelector(CLS_LOADING)).forEach(el => { el.remove(); });
				
				const currentSrc = this.webview.getAttribute(ATTR_SRC);
				if (currentSrc !== url) {
					this.webview.setAttribute(ATTR_SRC, addTokenToUrl(this.plugin, url));
				}
			}
		} else {
			container.empty();
			this.webview = createMarimoWebview(this.plugin, container, url, partitionName, onFileChanged);
		}
	}
}

/**
 * Create an Electron `<webview>` embedding a marimo URL.
 *
 * `<webview>` is used (as the Surfing plugin does) instead of `<iframe>` so the
 * embedded `http://localhost` content bypasses Obsidian's page CSP and runs in
 * its own process. `partition` gives the embeds a shared persistent session.
 *
 * @param parent    element to append the webview to
 * @param url       marimo URL to load
 * @param partition Electron webview partition name
 * @param heightPx  optional fixed height; omit to fill the parent (100%)
 */
export function createMarimoWebview(
	plugin: MarimoBridgePlugin,
	parent: HTMLElement,
	url: string,
	partition: string,
	onFileChanged?: (filePath: string) => void,
	heightPx?: number
): HTMLElement {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
	const electron = (window as any).require(
		RUNTIME_CONSTANTS.ELECTRON_MODULE
	) as { shell: { openExternal: (url: string) => Promise<void> } };
	const shell = electron.shell;
	// Create the <webview> DETACHED. Electron reads `preload` and `partition`
	// when the guest attaches (on insertion into the DOM); setting them after
	// the element is already in the document is silently ignored. So we set all
	// attributes and wire every event listener first, then append at the very
	// end of this function.
	const el = parent.ownerDocument.createElement(
		RUNTIME_CONSTANTS.TAG_WEBVIEW as keyof HTMLElementTagNameMap
	) as HTMLElement;
	el.addClass(CLS_WEBVIEW);
	el.setAttribute(ATTR_ALLOWPOPUPS, "");
	el.setAttribute(ATTR_PARTITION, partition);
	el.setAttribute(ATTR_SRC, addTokenToUrl(plugin, url));

	if (heightPx) {
		el.style.setProperty(
			RUNTIME_CONSTANTS.CSS_HEIGHT,
			`${heightPx.toString()}${RUNTIME_CONSTANTS.CSS_PX}`
		);
	}

	let initialFilePath: string | null = null;
	initialFilePath = getFilePathFromUrl(url);

	// Check if a URL should be intercepted by the plugin
	const shouldIntercept = (targetUrl: string): boolean => {
		try {
			if (!targetUrl || targetUrl === URL_ABOUT_BLANK || targetUrl.startsWith(PROTOCOL_JAVASCRIPT)) {
				return false;
			}
			if (targetUrl.startsWith(SCHEME_CUSTOM) || targetUrl.includes(REDIRECT_URL_KEY)) {
				return false;
			}
			const base = el.getAttribute(ATTR_SRC) ?? undefined;
			const parsed = new URL(targetUrl, base);

			if (parsed.protocol !== PROTOCOL_HTTP && parsed.protocol !== PROTOCOL_HTTPS) {
				return true;
			}

			const isLocal = parsed.hostname === HOST_LOOPBACK || parsed.hostname === HOST_LOCALHOST;
			if (isLocal) {
				const filePath = getFilePathFromUrl(parsed.href);
				if (filePath) {
					if (initialFilePath && filePath === initialFilePath) {
						return false;
					}
					return true;
				}
				if (parsed.pathname === PATH_NEW || parsed.pathname.startsWith(PATH_NEW_SLASH)) {
					return true;
				}
				return false;
			}
			return true; // Always intercept external links to open in default browser
		} catch {
			return false;
		}
	};

	// Link interception handler
	const handleLinkClick = async (targetUrl: string, disposition?: string) => {
		try {
			const base = el.getAttribute(ATTR_SRC) ?? undefined;
			const parsed = new URL(targetUrl, base);
			// Check if it's pointing to the local marimo server
			const isLocal = parsed.hostname === HOST_LOOPBACK || parsed.hostname === HOST_LOCALHOST;
			if (isLocal) {
				let filePath = getFilePathFromUrl(parsed.href);
				if (!filePath && (parsed.pathname === PATH_NEW || parsed.pathname.startsWith(PATH_NEW_SLASH))) {
					filePath = FILE_NEW;
				}
				if (filePath) {
					const active = disposition !== DISPOSITION_BG_TAB;
					const isMarimo = filePath.endsWith(EXT_PY) || filePath.startsWith(FILE_NEW);
					if (isMarimo) {
						await plugin.openMarimo(filePath, true, active);
					} else {
						// US2: Non-marimo local workspace file
						await plugin.app.workspace.openLinkText(filePath, "", LEAF_TAB, { active });
					}
				}
			} else {
				// US3: External link - open in default browser (restrict to http/https)
				if (parsed.protocol === PROTOCOL_HTTP || parsed.protocol === PROTOCOL_HTTPS) {
					await shell.openExternal(parsed.href);
				} else {
					console.warn(RUNTIME_CONSTANTS.LOG_UNSAFE_PROTOCOL, parsed.protocol);
				}
			}
		} catch (e) {
			console.error(RUNTIME_CONSTANTS.LOG_LINK_PARSE_FAILED, e);
		}
	};

	// Inject the link/popup interception into the guest page. Obsidian strips
	// <webview> preload and forces sandbox + no node integration, so the only
	// way to run code in the guest is executeJavaScript, and the only way for
	// the guest to call back is console (see INJECTION_SCRIPT / the
	// console-message handler below). Re-run on every dom-ready (full reloads)
	// — the script self-guards against double injection.
	let domReady = false;
	el.addEventListener(EVENT_DOM_READY, () => {
		domReady = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			(el as any).executeJavaScript(INJECTION_SCRIPT);
		} catch (e) {
			console.error(RUNTIME_CONSTANTS.LOG_INJECTION_FAILED, e);
		}
	});

	// Recover from blank webviews. On view restore the guest sometimes attaches
	// without ever loading its content: it stays blank and never fires
	// `dom-ready`. A `reload()` reliably brings it up, so we watch for missing
	// readiness (and explicit load failures) and reload, capped to avoid loops.
	let loadRetries = 0;
	let loadFailureShown = false;
	const showLoadFailure = () => {
		if (loadFailureShown) return;
		loadFailureShown = true;
		el.remove();
		parent.createDiv({
			cls: CLS_LOADING,
			text: TEXT_WEBVIEW_LOAD_FAILED,
		});
	};
	const reloadWebview = (reason: string) => {
		if (domReady) return;
		if (loadRetries >= WEBVIEW_MAX_LOAD_RETRIES) {
			showLoadFailure();
			return;
		}
		// The view/embed may have been torn down while the watchdog was pending;
		// reloading a detached <webview> is pointless (and the guest is gone).
		if (!el.isConnected) return;
		loadRetries++;
		console.warn(
			formatWebviewReloadLog(
				reason,
				loadRetries,
				WEBVIEW_MAX_LOAD_RETRIES
			)
		);
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			(el as any).reload();
		} catch (e) {
			console.error(RUNTIME_CONSTANTS.LOG_WEBVIEW_RELOAD_FAILED, e);
		}
		scheduleLoadWatchdog();
	};
	const scheduleLoadWatchdog = () => {
		window.setTimeout(() => {
			reloadWebview(RUNTIME_CONSTANTS.LOG_NO_DOM_READY);
		}, WEBVIEW_LOAD_WATCHDOG_MS);
	};

	el.addEventListener(EVENT_DID_FAIL_LOAD, (event: Event) => {
		// Ignore aborted loads (errorCode -3) — those fire on the normal
		// access_token → cookie redirect and are not real failures.
		const ev = event as unknown as { errorCode?: number; isMainFrame?: boolean };
		if (ev.errorCode === ERR_LOAD_ABORTED) return;
		if (ev.isMainFrame === false) return;
		reloadWebview(formatDidFailLoadReason(ev.errorCode));
	});

	el.addEventListener(EVENT_WILL_NAVIGATE, (event: Event) => {
		const ev = event as unknown as { url: string; preventDefault: () => void };
		if (shouldIntercept(ev.url)) {
			ev.preventDefault();
			void handleLinkClick(ev.url, DISPOSITION_DEFAULT);
		}
	});

	el.addEventListener(EVENT_NEW_WINDOW, (event: Event) => {
		const ev = event as unknown as { url: string; disposition?: string; preventDefault: () => void };

		// If it's an empty popup (about:blank), let Electron handle it to prevent script crashes
		if (!ev.url || ev.url === URL_ABOUT_BLANK) {
			return; 
		}
		// If it's our redirect URL, ignore it here
		if (ev.url.startsWith(SCHEME_CUSTOM) || ev.url.includes(REDIRECT_URL_KEY)) {
			return;
		}

		ev.preventDefault(); // Stop default popup window creation

		if (shouldIntercept(ev.url)) {
			void handleLinkClick(ev.url, ev.disposition);
		} else {
			// Internal local popup navigation (like "new notebook"): load in same webview
			try {
				const base = el.getAttribute(ATTR_SRC) ?? undefined;
				const absoluteUrl = addTokenToUrl(plugin, new URL(ev.url, base).href);
				el.setAttribute(ATTR_SRC, absoluteUrl);
			} catch (e) {
				console.error(RUNTIME_CONSTANTS.LOG_RELATIVE_URL_FAILED, ev.url, e);
			}
		}
	});

	let authRetryCount = 0;
	el.addEventListener(EVENT_DID_NAVIGATE, (event: Event) => {
		const ev = event as unknown as { url: string };
		try {
			const parsed = new URL(ev.url);
			if (parsed.pathname === PATH_AUTH_LOGIN) {
				if (authRetryCount < AUTH_RETRY_MAX) {
					authRetryCount++;
					const base = el.getAttribute(ATTR_SRC) ?? undefined;
					if (base) {
						const absoluteUrl = addTokenToUrl(plugin, base);
						console.warn(RUNTIME_CONSTANTS.LOG_AUTH_RETRY, authRetryCount);
						el.setAttribute(ATTR_SRC, absoluteUrl);
					}
				} else {
					console.error(RUNTIME_CONSTANTS.LOG_AUTH_LIMIT);
				}
				return;
			}
			authRetryCount = 0; // Reset on successful load

			const isLocal = parsed.hostname === HOST_LOOPBACK || parsed.hostname === HOST_LOCALHOST;
			if (isLocal) {
				const filePath = getFilePathFromUrl(parsed.href);
				if (filePath && onFileChanged) {
					onFileChanged(filePath);
				}
			}
		} catch (e) {
			console.error(RUNTIME_CONSTANTS.LOG_NAVIGATE_PARSE_FAILED, ev.url, e);
		}
	});

	// The injected script reports navigations as a single sentinel-prefixed
	// console line; intercept those here and route them, forwarding everything
	// else to the Obsidian console for debugging.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	el.addEventListener(EVENT_CONSOLE_MESSAGE, (event: any) => {
		const ev = event as { level: number; message: string; line: number; sourceId: string };

		if (ev.message.startsWith(MARIMO_OPEN_SENTINEL)) {
			const json = ev.message.slice(MARIMO_OPEN_SENTINEL.length).trim();
			try {
				const data = JSON.parse(json) as { url?: string; disposition?: string };
				if (data.url) {
					if (shouldIntercept(data.url)) {
						void handleLinkClick(data.url, data.disposition);
					} else {
						// Internal local popup navigation (like "new notebook"):
						// load in the same webview instead of spawning a window.
						const base = el.getAttribute(ATTR_SRC) ?? undefined;
						const absoluteUrl = addTokenToUrl(plugin, new URL(data.url, base).href);
						el.setAttribute(ATTR_SRC, absoluteUrl);
					}
				}
			} catch (e) {
				console.error(RUNTIME_CONSTANTS.LOG_OPEN_MESSAGE_PARSE_FAILED, ev.message, e);
			}
			return;
		}

		const prefix = formatWebviewConsoleLog(
			ev.message,
			ev.sourceId,
			ev.line
		);
		if (ev.level === RUNTIME_CONSTANTS.CONSOLE_LEVEL_ERROR) {
			console.error(prefix);
		} else if (ev.level === RUNTIME_CONSTANTS.CONSOLE_LEVEL_WARNING) {
			console.warn(prefix);
		} else {
			// eslint-disable-next-line
			console.log(prefix);
		}
	});

	// Attach last: everything above (preload, partition, listeners) must be in
	// place before Electron attaches the guest page.
	parent.appendChild(el);

	// Start the blank-webview watchdog now that the guest is attaching.
	scheduleLoadWatchdog();

	return el;
}

/**
 * Append the active API token to a URL if it's not already present.
 */
function addTokenToUrl(plugin: MarimoBridgePlugin, targetUrl: string): string {
	try {
		const parsed = new URL(targetUrl);
		if (!parsed.searchParams.has(ACCESS_TOKEN_KEY)) {
			parsed.searchParams.set(ACCESS_TOKEN_KEY, plugin.servers.getActiveToken());
			return parsed.href;
		}
	} catch {
		// Ignore URL parsing errors and return original URL
	}
	return targetUrl;
}
