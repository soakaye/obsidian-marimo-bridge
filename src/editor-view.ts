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
	formatLiveExportScript,
	CLS_BRIDGE_VIEW,
	CLS_LOADING,
	CLS_LOADING_OVERLAY,
	CLS_LOADING_SPINNER,
	CLS_WEBVIEW,
	ATTR_ALLOWPOPUPS,
	ATTR_PARTITION,
	ATTR_SRC,
	ATTR_INERT,
	ATTR_ROLE,
	ATTR_ARIA_LIVE,
	ATTR_ARIA_HIDDEN,
	ARIA_ROLE_STATUS,
	ARIA_LIVE_POLITE,
	ARIA_VALUE_TRUE,
	EVENT_DOM_READY,
	EVENT_DID_START_NAVIGATION,
	EVENT_WILL_NAVIGATE,
	EVENT_NEW_WINDOW,
	EVENT_DID_NAVIGATE,
	EVENT_CONSOLE_MESSAGE,
	EVENT_DID_FAIL_LOAD,
	WEBVIEW_LOAD_WATCHDOG_MS,
	WEBVIEW_MAX_LOAD_RETRIES,
	ERR_LOAD_ABORTED,
	INJECTION_SCRIPT,
	BRIDGE_MESSAGE_TYPE_OPEN,
	BRIDGE_NEXT_MESSAGE_SCRIPT,
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
	TEXT_LOADING_MARIMO,
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

interface ElectronModule {
	shell: {
		openExternal(url: string): Promise<void>;
	};
}

interface ElectronWindow {
	require(moduleName: string): ElectronModule;
}

interface MarimoWebviewElement extends HTMLElement {
	executeJavaScript(script: string): Promise<unknown>;
	reload(): void;
}

interface BridgeOpenMessage {
	type: typeof BRIDGE_MESSAGE_TYPE_OPEN;
	url: string;
	disposition?: string;
}

interface WebviewConsoleMessageEvent extends Event {
	level: number;
	message: string;
	line: number;
	sourceId: string;
}

interface WebviewDidStartNavigationEvent extends Event {
	isInPlace: boolean;
	isMainFrame: boolean;
}

function isString(value: unknown): value is string {
	return typeof value === RUNTIME_CONSTANTS.TYPE_STRING;
}

function isBridgeOpenMessage(value: unknown): value is BridgeOpenMessage {
	if (
		typeof value !== RUNTIME_CONSTANTS.TYPE_OBJECT ||
		value === null
	) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	const url = candidate.url;
	const disposition = candidate.disposition;
	return (
		candidate.type === BRIDGE_MESSAGE_TYPE_OPEN &&
		isString(url) &&
		url.length > 0 &&
		(disposition === undefined || isString(disposition))
	);
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

	/** Vault-relative path of the notebook this view is showing, if any. */
	getCurrentFile(): string | undefined {
		return this.currentFile;
	}

	/**
	 * Export the LIVE marimo session (current widget values) to HTML by calling
	 * the running edit server's `/api/export/html` from inside the webview.
	 * Returns the HTML string, or `null` when the webview/session is not ready
	 * (the caller then falls back to a fresh CLI export).
	 */
	async exportLiveHtml(includeCode: boolean): Promise<string | null> {
		const webview = this.webview as MarimoWebviewElement | null;
		if (!webview?.executeJavaScript) return null;
		try {
			const result = await webview.executeJavaScript(
				formatLiveExportScript(includeCode)
			);
			return isString(result) ? result : null;
		} catch {
			return null;
		}
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
	const electronWindow = window as unknown as ElectronWindow;
	const electron = electronWindow.require(
		RUNTIME_CONSTANTS.ELECTRON_MODULE
	);
	const shell = electron.shell;
	// Create the <webview> DETACHED. Electron reads `preload` and `partition`
	// when the guest attaches (on insertion into the DOM); setting them after
	// the element is already in the document is silently ignored. So we set all
	// attributes and wire every event listener first, then append at the very
	// end of this function.
	const el = parent.ownerDocument.createElement(
		RUNTIME_CONSTANTS.TAG_WEBVIEW as keyof HTMLElementTagNameMap
	) as unknown as MarimoWebviewElement;
	el.addClass(CLS_WEBVIEW);
	el.setAttribute(ATTR_ALLOWPOPUPS, "");
	el.setAttribute(ATTR_PARTITION, partition);
	el.setAttribute(ATTR_SRC, addTokenToUrl(plugin, url));

	let loadingElement: HTMLDivElement | null = null;
	const showLoading = () => {
		if (loadingElement) return;
		el.setAttribute(ATTR_INERT, "");
		loadingElement = parent.createDiv({
			cls: [CLS_LOADING, CLS_LOADING_OVERLAY],
			text: TEXT_LOADING_MARIMO,
			attr: {
				[ATTR_ROLE]: ARIA_ROLE_STATUS,
				[ATTR_ARIA_LIVE]: ARIA_LIVE_POLITE,
			},
		});
		loadingElement.createSpan({
			cls: CLS_LOADING_SPINNER,
			attr: {
				[ATTR_ARIA_HIDDEN]: ARIA_VALUE_TRUE,
			},
		});
	};
	const hideLoading = () => {
		loadingElement?.remove();
		loadingElement = null;
		el.removeAttribute(ATTR_INERT);
	};

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

	const routeOpenRequest = async (
		targetUrl: string,
		disposition?: string
	): Promise<void> => {
		if (shouldIntercept(targetUrl)) {
			await handleLinkClick(targetUrl, disposition);
			return;
		}
		try {
			const base = el.getAttribute(ATTR_SRC) ?? undefined;
			const absoluteUrl = addTokenToUrl(
				plugin,
				new URL(targetUrl, base).href
			);
			el.setAttribute(ATTR_SRC, absoluteUrl);
		} catch (e) {
			console.error(
				RUNTIME_CONSTANTS.LOG_RELATIVE_URL_FAILED,
				targetUrl,
				e
			);
		}
	};

	// Inject the link/popup interception into the guest page. Obsidian strips
	// <webview> preload and forces sandbox + no node integration. The guest
	// therefore exposes a Promise-returning FIFO bridge through injected code,
	// which the host awaits via executeJavaScript. Re-run on every dom-ready
	// (full reloads); the script self-guards against double injection.
	let domReady = false;
	let bridgeGeneration = 0;
	const isCurrentBridge = (generation: number): boolean =>
		generation === bridgeGeneration && el.isConnected;
	const runBridge = async (generation: number): Promise<void> => {
		try {
			await el.executeJavaScript(INJECTION_SCRIPT);
		} catch (e) {
			if (isCurrentBridge(generation)) {
				console.error(RUNTIME_CONSTANTS.LOG_INJECTION_FAILED, e);
			}
			return;
		}
		if (!isCurrentBridge(generation)) return;
		while (isCurrentBridge(generation)) {
			let value: unknown;
			try {
				value = await el.executeJavaScript(
					BRIDGE_NEXT_MESSAGE_SCRIPT
				);
			} catch {
				return;
			}
			if (!isCurrentBridge(generation)) return;
			if (!isBridgeOpenMessage(value)) continue;
			await routeOpenRequest(value.url, value.disposition);
		}
	};
	el.addEventListener(
		EVENT_DID_START_NAVIGATION,
		(event: Event) => {
			const ev = event as WebviewDidStartNavigationEvent;
			if (ev.isMainFrame && !ev.isInPlace) {
				bridgeGeneration++;
				if (domReady) {
					domReady = false;
					loadRetries = 0;
					showLoading();
					scheduleLoadWatchdog();
				}
			}
		}
	);
	el.addEventListener(EVENT_DOM_READY, () => {
		domReady = true;
		clearLoadWatchdog();
		hideLoading();
		const generation = ++bridgeGeneration;
		void runBridge(generation);
	});

	// Recover from blank webviews. On view restore the guest sometimes attaches
	// without ever loading its content: it stays blank and never fires
	// `dom-ready`. A `reload()` reliably brings it up, so we watch for missing
	// readiness (and explicit load failures) and reload, capped to avoid loops.
	let loadRetries = 0;
	let loadFailureShown = false;
	let loadWatchdog: number | null = null;
	const clearLoadWatchdog = () => {
		if (loadWatchdog === null) return;
		window.clearTimeout(loadWatchdog);
		loadWatchdog = null;
	};
	const showLoadFailure = () => {
		if (loadFailureShown) return;
		if (!el.isConnected) return;
		loadFailureShown = true;
		clearLoadWatchdog();
		hideLoading();
		el.remove();
		parent.createDiv({
			cls: CLS_LOADING,
			text: TEXT_WEBVIEW_LOAD_FAILED,
		});
	};
	const reloadWebview = (reason: string) => {
		if (domReady) return;
		// The view/embed may have been torn down while the watchdog was pending;
		// reloading or rendering failure UI for a detached guest is pointless.
		if (!el.isConnected) return;
		if (loadRetries >= WEBVIEW_MAX_LOAD_RETRIES) {
			showLoadFailure();
			return;
		}
		loadRetries++;
		console.warn(
			formatWebviewReloadLog(
				reason,
				loadRetries,
				WEBVIEW_MAX_LOAD_RETRIES
			)
		);
		try {
			el.reload();
		} catch (e) {
			console.error(RUNTIME_CONSTANTS.LOG_WEBVIEW_RELOAD_FAILED, e);
		}
		scheduleLoadWatchdog();
	};
	const scheduleLoadWatchdog = () => {
		clearLoadWatchdog();
		loadWatchdog = window.setTimeout(() => {
			loadWatchdog = null;
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

		void routeOpenRequest(ev.url, ev.disposition);
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

	// Console output is diagnostics only; navigation control messages use the
	// Promise-based guest bridge installed above.
	el.addEventListener(EVENT_CONSOLE_MESSAGE, (event: Event) => {
		const ev = event as WebviewConsoleMessageEvent;

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
			console.debug(prefix);
		}
	});

	// Attach last: everything above (preload, partition, listeners) must be in
	// place before Electron attaches the guest page.
	showLoading();
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
