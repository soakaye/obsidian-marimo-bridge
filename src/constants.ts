/**
 * Centralized registry for all constants, settings default values, and magic numbers/strings
 * used within the marimo Bridge plugin codebase.
 *
 * Adheres strictly to Principle VI (Constant Externalization).
 */

// Settings Defaults
export const DEFAULT_PORT = 2718;
export const DEFAULT_AUTO_START = true;
export const DEFAULT_STARTUP_TIMEOUT = 30;
export const DEFAULT_TAKE_OVER_PY_EXTENSION = true;
export const DEFAULT_EMBED_MODE = "edit" as const;
export const DEFAULT_EMBED_HEIGHT = 600;
export const DEFAULT_SHOW_CONTEXT_MENU = true;
export const DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU = false;
export const DEFAULT_API_TOKEN = "";
export const DEFAULT_UV_PATH = "";

// UI & Notice Messages / Timing
export const NOTICE_TIMEOUT_MS = 8000;
export const PIP_INSTALL_TIMEOUT_MS = 180000;
export const SLEEP_DELAY_MS = 500;
export const MAX_NOTEBOOK_NAME_ATTEMPTS = 1000;

// Commands & Icons / Views
export const ICON_MARIMO_LOGO = "marimo-logo";
export const VIEW_TYPE_MARIMO = "marimo-editor";

// Paths & Environment
export const PLATFORM_WIN32 = "win32";
export const DIR_VENV = ".venv";
export const DIR_SCRIPTS_WIN = "Scripts";
export const DIR_SCRIPTS_UNIX = "bin";
export const EXE_MARIMO_WIN = "marimo.exe";
export const EXE_MARIMO_UNIX = "marimo";
export const EXE_PYTHON_WIN = "python.exe";
export const EXE_PYTHON_UNIX = "python";
export const EXE_UV_WIN = "uv.exe";
export const FALLBACK_PYTHON_UNIX = "python3";
export const CMD_MARIMO = "marimo";
export const CMD_UV = "uv";

// Settings tab text
export const SETTINGS_TAB_HEADER = "marimo Bridge";
export const SETTING_MARIMO_PATH_NAME = "marimo executable path";
export const SETTING_PYTHON_PATH_NAME = "Python interpreter path";
export const SETTING_UV_PATH_NAME = "uv command path";
export const SETTING_MARIMO_INSTALL_NAME = "marimo installation";
export const SETTING_PORT_NAME = "Port";
export const SETTING_AUTO_START_NAME = "Auto-start server on load";
export const SETTING_TIMEOUT_NAME = "Startup timeout (seconds)";
export const SETTING_TAKEOVER_NAME = "Open .py files in marimo by default";
export const SETTING_EMBED_MODE_NAME = "Default embed mode";
export const SETTING_EMBED_HEIGHT_NAME = "Default embed height (px)";
export const SETTING_CONTEXT_MENU_NAME = "Enable file explorer context menu";
export const SETTING_MD_CONTEXT_MENU_NAME = "Open Markdown files in marimo";
export const SETTING_API_TOKEN_NAME = "API token";
export const SETTING_API_TOKEN_DESC = "API token for authenticating with the marimo server. If left empty, a secure, random session token is generated on startup.";
export const SETTING_API_TOKEN_WARN = "Changing this token stops the current server; it restarts on the next use.";

// Commands
export const CMD_OPEN_MARIMO_HOME_ID = "open-marimo-home";
export const CMD_OPEN_MARIMO_HOME_NAME = "Open marimo home";
export const CMD_OPEN_ACTIVE_FILE_ID = "open-active-file-in-marimo";
export const CMD_OPEN_ACTIVE_FILE_NAME = "Open active .py file in marimo";
export const CMD_CREATE_NOTEBOOK_ID = "create-marimo-notebook";
export const CMD_CREATE_NOTEBOOK_NAME = "Create new marimo notebook";
export const CMD_RESTART_SERVER_ID = "restart-marimo-server";
export const CMD_RESTART_SERVER_NAME = "Restart marimo server";

// Placeholders & Status Strings
export const PLACEHOLDER_AUTO_DETECT = "(auto-detect)";
export const TEXT_CHECKING = "Checking…";
export const TEXT_INSTALLING = "Installing…";
export const TEXT_REINSTALL = "Reinstall / upgrade";
export const TEXT_INSTALL = "Install marimo";
export const TEXT_NOTEBOOK_NAME_EXHAUSTED = "Could not create a marimo notebook because the first 1000 names are already in use.";
export const TEXT_WEBVIEW_LOAD_FAILED = "marimo server is not available. Check the marimo path in settings, then reopen.";
export const TEXT_LOADING_MARIMO = "Loading marimo…";
export const CLS_BRIDGE_VIEW = "marimo-bridge-view";
export const CLS_LOADING = "marimo-bridge-loading";
export const CLS_LOADING_OVERLAY = "marimo-bridge-loading-overlay";
export const CLS_LOADING_SPINNER = "marimo-bridge-loading-spinner";
export const CLS_WEBVIEW = "marimo-bridge-webview";
export const CLS_EMBED = "marimo-bridge-embed";
export const CLS_EMBED_ERROR = "marimo-bridge-embed-error";

// HTTP & Command parameters
export const METHOD_GET = "GET";
export const PATH_HEALTH = "/health";
export const PATH_AUTH_LOGIN = "/auth/login";
export const QUERY_FILE = "/?file=";
export const SCHEME_HTTP = "http://";
export const CMD_ARG_M = "-m";
export const CMD_ARG_PIP = "pip";
export const CMD_ARG_INSTALL = "install";
export const CMD_ARG_SHOW = "show";
export const CMD_ARG_UPGRADE = "--upgrade";
export const CMD_ARG_VERSION = "--version";
export const CMD_ARG_PYTHON = "--python";
export const CMD_ARG_HEADLESS = "--headless";
export const CMD_ARG_PORT = "--port";
export const CMD_ARG_HOST = "--host";
export const CMD_ARG_TOKEN_PASSWORD = "--token-password";
export const SIGNAL_SIGTERM = "SIGTERM";
export const MS_PER_SEC = 1000;
/** Highest valid TCP port number; bounds the run-server port search. */
export const PORT_MAX = 65535;

// Spawned-server record store (crash-recovery for self-started marimo servers)
/** File holding ownership records for servers spawned by this plugin. */
export const FILE_SERVER_RECORDS = ".marimo-servers.json";
/** uv-created virtual environments record this file under their root. */
export const FILE_PYVENV_CFG = "pyvenv.cfg";
/** Signal `0` probes process existence without terminating it. */
export const SIGNAL_PROBE = 0;
/** Per-record timeout when confirming a leftover server on next-launch reconcile. */
export const RECONCILE_CONFIRM_TIMEOUT_MS = 3000;
/** Text encoding used when reading/writing the record file. */
export const ENCODING_UTF8 = "utf8";
export const ENV_USERPROFILE = "USERPROFILE";
export const DIR_UV_LOCAL = ".local";
export const DIR_UV_CARGO = ".cargo";
export const UV_HOMEBREW_ARM_PATH = "/opt/homebrew/bin/uv";
export const UV_HOMEBREW_INTEL_PATH = "/usr/local/bin/uv";
export const PACKAGE_MANAGER_PIP = "pip" as const;
export const PACKAGE_MANAGER_UV = "uv" as const;
export const UV_COMMAND_SOURCE_CONFIGURED = "configured" as const;
export const UV_COMMAND_SOURCE_PATH = "path" as const;
export const UV_COMMAND_SOURCE_DEFAULT_LOCATION = "default-location" as const;
export const UV_COMMAND_SOURCE_UNAVAILABLE = "unavailable" as const;

// View attributes & events
export const ATTR_ALLOWPOPUPS = "allowpopups";
export const ATTR_PARTITION = "partition";
export const ATTR_SRC = "src";
export const ATTR_INERT = "inert";
export const ATTR_ROLE = "role";
export const ATTR_ARIA_LIVE = "aria-live";
export const ATTR_ARIA_HIDDEN = "aria-hidden";
export const ARIA_ROLE_STATUS = "status";
export const ARIA_LIVE_POLITE = "polite";
export const ARIA_VALUE_TRUE = "true";
export const EVENT_DOM_READY = "dom-ready";
export const EVENT_DID_START_NAVIGATION = "did-start-navigation";
export const EVENT_WILL_NAVIGATE = "will-navigate";
export const EVENT_NEW_WINDOW = "new-window";
export const EVENT_DID_NAVIGATE = "did-navigate";
export const EVENT_CONSOLE_MESSAGE = "console-message";
export const EVENT_DID_FAIL_LOAD = "did-fail-load";
export const BRIDGE_MESSAGE_TYPE_OPEN = "open";
export const BRIDGE_NEXT_MESSAGE_SCRIPT =
	"window.__marimoBridge.nextMessage()";

/**
 * On view restore (and occasionally cold start) an Electron `<webview>` can
 * attach without ever loading its guest — it stays blank and never fires
 * `dom-ready`. We watch for that and `reload()` to recover.
 */
export const WEBVIEW_LOAD_WATCHDOG_MS = 3000;
export const WEBVIEW_MAX_LOAD_RETRIES = 3;
/** Electron `did-fail-load` code for an aborted (e.g. redirected) load; benign. */
export const ERR_LOAD_ABORTED = -3;

/**
 * Script injected into the guest page (main world) via
 * `webview.executeJavaScript()` on `dom-ready`. It overrides `window.open`
 * (marimo's home page creates new notebooks via `window.open(url, "_blank")`,
 * which modern Electron no longer surfaces as a `<webview>` "new-window"
 * event) and intercepts link clicks that target a new window/tab, reporting
 * each through a guest-local FIFO bridge. The host awaits `nextMessage()`
 * through `executeJavaScript()` and routes structured messages into Obsidian
 * (other notebooks → marimo tabs, external URLs → system browser).
 *
 * Idempotent: a re-injection (e.g. after a full page reload re-fires
 * `dom-ready`) is a no-op thanks to the `__marimoBridgeInjected` guard.
 */
export const INJECTION_SCRIPT = `(function () {
	if (window.__marimoBridgeInjected) return true;
	window.__marimoBridgeInjected = true;

	var messages = [];
	var waiter = null;

	function enqueue(message) {
		if (waiter) {
			var resolve = waiter;
			waiter = null;
			resolve(message);
			return;
		}
		messages.push(message);
	}

	window.__marimoBridge = {
		nextMessage: function () {
			if (messages.length > 0) {
				return Promise.resolve(messages.shift());
			}
			return new Promise(function (resolve) {
				waiter = resolve;
			});
		}
	};

	function emit(url, disposition) {
		if (!url) return;
		try {
			var absolute = new URL(url, window.location.href).href;
			enqueue({
				type: "${BRIDGE_MESSAGE_TYPE_OPEN}",
				url: absolute,
				disposition: disposition || "default"
			});
		} catch (e) {
			// Ignore malformed URLs.
		}
	}

	window.open = function (url, target) {
		emit(url, target);
		return null;
	};

	// Capture the marimo client's request headers (session id, server token,
	// auth) so the host can replay them to export the LIVE session as HTML,
	// reflecting current widget values. We only remember requests that carry a
	// Marimo-Session-Id, i.e. real kernel RPC/health calls.
	var __nativeFetch = window.fetch;
	window.__marimoBridgeHeaders = null;
	window.fetch = function (input, init) {
		try {
			var raw = init && init.headers;
			if (raw) {
				var obj = {};
				if (typeof Headers !== "undefined" && raw instanceof Headers) {
					raw.forEach(function (v, k) { obj[k] = v; });
				} else if (Array.isArray(raw)) {
					raw.forEach(function (pair) { obj[pair[0]] = pair[1]; });
				} else {
					for (var k in raw) { obj[k] = raw[k]; }
				}
				if (obj["Marimo-Session-Id"] || obj["marimo-session-id"]) {
					window.__marimoBridgeHeaders = obj;
				}
			}
		} catch (e) {
			// Ignore header capture failures; export falls back to the CLI.
		}
		return __nativeFetch.apply(this, arguments);
	};

	// Capture phase: run before the page's own handlers and cancel the default
	// navigation for links that target a new window/tab.
	window.addEventListener(
		"click",
		function (event) {
			var node = event.target;
			while (node && node !== document.body) {
				if (node.tagName === "A") {
					var href = node.getAttribute("href");
					var targetAttr = node.getAttribute("target");
					var isNewWindow =
						targetAttr &&
						["_self", "_parent", "_top"].indexOf(targetAttr.toLowerCase()) === -1;
					if (isNewWindow && href) {
						event.preventDefault();
						event.stopPropagation();
						emit(href, targetAttr);
					}
					break;
				}
				node = node.parentNode;
			}
		},
		true
	);

	return true;
})();
`;

// View protocols & query paths
export const URL_ABOUT_BLANK = "about:blank";
export const PROTOCOL_JAVASCRIPT = "javascript:";
export const SCHEME_CUSTOM = "marimo-bridge://";
export const PARTITION_PREFIX = "persist:marimo-bridge-";
export const DISPOSITION_DEFAULT = "default";
export const DISPOSITION_BG_TAB = "background-tab";
export const LEAF_TAB = "tab";
export const PROTOCOL_HTTP = "http:";
export const PROTOCOL_HTTPS = "https:";
export const HOST_LOCALHOST = "localhost";
export const HOST_LOOPBACK = "127.0.0.1";
export const QUERY_FILE_KEY = "file";
/** Query-string key carrying the marimo server auth token. */
export const ACCESS_TOKEN_KEY = "access_token";
/** Max times the view re-applies the token after landing on /auth/login. */
export const AUTH_RETRY_MAX = 2;
export const PATH_NEW = "/__new__";
export const PATH_NEW_SLASH = "/__new__/";
export const FILE_NEW = "__new__";
export const EXT_PY = ".py";
export const TEXT_MARIMO = "Marimo";
export const REDIRECT_URL_KEY = "/__marimo_bridge_open__";

// Embed processor & parser constants
export const TEXT_STARTING = "Starting marimo…";
export const TEXT_SERVER_UNAVAILABLE = "Marimo server is not available.";
export const TEXT_MISSING_FILE = 'Marimo embed: missing "file:" key.';
export const KEY_FILE = "file";
export const KEY_MODE = "mode";
export const KEY_HEIGHT = "height";
export const MODE_EDIT = "edit";
export const MODE_RUN = "run";
export const TAG_DIV = "div";
export const TAG_PARAGRAPH = "p";
export const CHAR_COLON = ":";
export const CHAR_HASH = "#";
export const RADIX_DECIMAL = 10;
export const INDEX_NOT_FOUND = -1;
export const CHAR_DOT = ".";
export const CHAR_NEWLINE = "\n";
export const OFFSET_ONE = 1;
export const TEXT_RUN_SERVER_ERROR_PREFIX = "Could not start a run server for ";

// Markdown export (feature 026: export notebook to static Markdown)
export const CMD_EXPORT = "export";
export const CMD_ARG_HTML = "html";
export const CMD_ARG_OUTPUT = "-o";
export const CMD_ARG_NO_INCLUDE_CODE = "--no-include-code";

export const CMD_EXPORT_MARKDOWN_ID = "export-marimo-notebook-markdown";
export const CMD_EXPORT_MARKDOWN_NAME = "Export active marimo notebook to Markdown";
export const CMD_EXPORT_OUTPUTS_MARKDOWN_ID = "export-marimo-notebook-outputs-markdown";
export const CMD_EXPORT_OUTPUTS_MARKDOWN_NAME = "Export active marimo notebook outputs only to Markdown";

export const EXT_MD = ".md";
export const EXT_HTML = ".html";
export const EXT_PNG = ".png";
export const COLLISION_SEPARATOR = "-";
export const EXPORT_TEMP_PREFIX = "marimo-export-";

/** Timeout for one `marimo export html` invocation (ms). */
export const EXPORT_TIMEOUT_MS = 120000;

export const MIME_MARKDOWN = "text/markdown";
export const MIME_HTML = "text/html";
export const MIME_PLAIN = "text/plain";
export const MIME_PNG = "image/png";
export const MIME_MARIMO_BUNDLE = "application/vnd.marimo+mimebundle";

/** Marker and anchor that bracket the embedded notebook session JSON. */
export const CONFIG_MARKER = "__MARIMO_MOUNT_CONFIG__";
export const CONFIG_FREEZE_ANCHOR = "Object.freeze(";

export const CH_OPEN_BRACE = "{";
export const CH_CLOSE_BRACE = "}";
export const CH_QUOTE = '"';
export const CH_SPACE = " ";
export const CH_AMP = "&";
export const CH_LT = "<";
export const CH_GT = ">";
export const CH_APOS = "'";

export const ENCODING_BASE64 = "base64";
export const DATA_URI_PREFIX = "data:";
export const BASE64_MARKER = ";base64,";

/** Sentinel wrapping an image placeholder before its attachment link is resolved. */
export const IMAGE_TOKEN_OPEN = "@@marimo-image-";
export const IMAGE_TOKEN_CLOSE = "@@";

/** Wrapper element marimo emits for interactive UI widgets (`mo.ui.*`). */
export const TAG_MARIMO_UI_ELEMENT = "<marimo-ui-element";

/**
 * Table widget marimo emits for a displayed DataFrame. Although wrapped in a
 * `marimo-ui-element`, it carries the (preview) rows statically in its
 * `data-data` attribute, so the export renders them rather than dropping it.
 */
export const TAG_MARIMO_TABLE = "<marimo-table";

/** marimo wraps rendered LaTeX in this non-interactive element. */
export const TEX_INLINE_OPEN = "||(";
export const TEX_INLINE_CLOSE = "||)";
export const TEX_BLOCK_OPEN = "||[";
export const TEX_BLOCK_CLOSE = "||]";
export const MD_MATH_INLINE = "$";
export const MD_MATH_BLOCK = "$$";

/** Regex capture-group indices used when reading HTML attributes. */
export const REGEX_GROUP_FIRST = 1;
export const REGEX_GROUP_SECOND = 2;

// Markdown emit tokens
export const MD_FENCE = "```";
export const MD_LANG_PYTHON = "python";
export const MD_BOLD = "**";
export const MD_ITALIC = "_";
export const MD_CODE = "`";
export const MD_BULLET = "- ";
export const MD_ORDERED_MARKER = ". ";
export const MD_LINK_OPEN = "[";
export const MD_LINK_MID = "](";
export const MD_LINK_CLOSE = ")";
export const MD_IMAGE_PREFIX = "!";
export const MD_TABLE_PIPE = " | ";
export const MD_TABLE_EDGE = "|";
export const MD_TABLE_SEP_CELL = " --- ";
export const MD_BLANK_LINE = "\n\n";

// Warning modal shown when exporting a notebook that is not open in a marimo
// editor (no live session → CLI fallback uses initial widget values).
export const EXPORT_WARNING_TITLE = "Export without live values";
export const EXPORT_WARNING_BODY = "This notebook is not open in the marimo editor, so the export cannot capture your current interactive values (e.g. slider positions). It will run the notebook fresh and use initial values. Open the notebook in marimo first to export the values you see. Continue anyway?";
export const EXPORT_WARNING_CONTINUE = "Export with initial values";
export const EXPORT_WARNING_CANCEL = "Cancel";

// HTML entities decoded during conversion
export const ENT_AMP = "&amp;";
export const ENT_LT = "&lt;";
export const ENT_GT = "&gt;";
export const ENT_QUOT = "&quot;";
export const ENT_APOS = "&#39;";
export const ENT_NBSP = "&nbsp;";
/** Numeric entity for a backslash; marimo uses it in `data-data` JSON. */
export const ENT_BACKSLASH = "&#92;";

// Template & SVG
export const NEW_NOTEBOOK_TEMPLATE = `import marimo

app = marimo.App()


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md("# New notebook")
    return


if __name__ == "__main__":
    app.run()`;
export const SVG_MARIMO_LOGO = '<g transform="scale(0.083333)"><path fill="none" stroke="currentColor" stroke-width="41" stroke-miterlimit="10" d="m 184.3917,241.02387 c 7.7558,-8.80555 16.27626,-20.58165 10.70519,-30.97856 30.80474,-17.61111 58.00467,-40.84502 80.28895,-68.1104 -12.12527,9.33601 -25.3429,16.86846 -39.3252,22.70346 C 341.47402,63.53369 499.97641,17.596304 645.47964,45.92259 528.26871,41.678952 408.87303,71.808785 311.98012,135.99382 214.86873,199.86058 141.13399,297.88863 112.84169,408.5415 c 42.93,-121.04979 133.48719,-225.54938 248.95035,-286.97605 -9.06665,9.12382 -18.13329,18.45982 -27.52765,27.47755 44.02238,-17.6111 83.89377,-44.13383 127.69766,-62.487572 128.46231,-54.530754 283.14143,-33.949107 402.75557,37.131832 119.72337,71.08095 205.80188,187.56883 255.83228,314.77189 22.0657,55.59166 37.4682,117.3366 17.9148,173.6709 -4.3695,-73.52103 -29.1662,-144.2837 -61.3911,-210.80274 C 1023.7662,290.46225 947.30053,186.49311 839.70242,122.83854 732.10431,59.502233 589.87818,42.63377 479.87686,102.25689 c 56.36612,-5.835002 113.38766,-9.123822 169.20759,-1.37918 105.08566,14.42837 202.19706,67.89821 275.9318,141.84362 73.40708,74.26367 124.31135,168.04808 154.35145,266.71267 29.1661,96.43669 38.779,202.84592 1.42,296.84251 109.2367,-171.54908 91.1034,-410.46593 -42.3838,-564.6161 C 982.58397,177.2632 910.16007,127.82481 832.05586,92.072159 741.82637,50.908866 642.74873,27.14449 543.12489,29.796764 443.50106,32.449038 343.87722,62.684963 264.46218,120.9289 330.55035,64.276327 416.62884,32.236856 504.12741,23.431306 c 87.71703,-8.593367 176.63567,5.304549 259.98324,32.569926 173.35858,57.183028 331.31485,183.325188 382.10985,354.025538 12.89,43.81557 18.6794,89.2225 23.9228,134.62943 4.3695,39.25366 7.9743,78.6134 7.1004,118.07924 -3.8233,195.31346 -132.2856,386.06496 -319.7357,457.46426 -53.08902,20.0511 -109.23667,30.9785 -165.60278,38.7232 -90.22948,12.3065 -183.73606,16.0197 -270.68844,-10.1847 -44.89627,-13.5797 -86.62467,-34.6918 -125.51292,-60.6841 C 135.12597,981.43269 33.645112,795.13696 33.645112,605.97678 c 0,-33.63084 3.058626,-67.04949 7.755803,-100.25596 4.150992,-30.44811 9.612825,-60.68403 18.679468,-90.07122 13.763819,-43.28512 35.174204,-84.13014 63.575737,-120.20107 4.91565,-2.97054 9.94053,-6.15327 14.63771,-9.336 C 73.079546,419.99933 34.300532,578.18094 93.943748,714.72001 72.533362,625.7097 71.113286,532.45574 90.120465,443.23324 c 6.008016,-2.1218 12.125265,-4.56191 17.914815,-6.89591 0.32771,-5.835 0.54618,-11.45782 0.87389,-17.39892 -4.36947,4.7741 -8.52046,9.65428 -12.889926,14.1101 9.940536,-70.76267 41.291466,-137.81216 88.372456,-192.02464 m 44.24085,-3.50101 c 17.04092,-11.24564 34.08183,-22.49128 51.12276,-33.63083 -10.70519,21.1121 -30.58627,37.6623 -53.6352,45.19476 -107.2704,107.57623 -140.259876,268.19794 -127.588423,417.25575 4.915653,56.3343 16.822443,114.89651 54.181383,158.18162 -26.10756,-104.18133 -27.52764,-214.30374 -3.60481,-319.01552 4.69717,-0.31827 6.33573,5.62282 6.33573,10.18473 1.96625,70.23222 -10.48672,140.57052 -5.24336,210.80274 5.24336,70.02003 32.22481,144.07153 92.74192,182.26428 47.40871,29.91764 94.38047,59.83529 141.46147,89.75295 C 274.29347,964.35205 178.27445,890.08837 118.84971,793.86387 c 15.94855,41.90593 38.23283,81.79613 65.76046,117.54879 -3.6048,-9.65428 -6.88191,-19.52074 -10.48671,-29.3872 27.74611,25.35574 55.81993,50.28711 83.67527,75.32458 20.31802,18.45983 52.32437,37.13187 73.18857,19.52074 3.27709,6.68373 -2.73092,14.95882 -10.15901,16.86851 -7.4281,2.12173 -15.40237,0 -22.83047,-2.12187 33.31719,23.23388 67.94521,44.66438 103.77484,64.07898 -5.24337,0.8487 -6.88192,8.2751 -3.60481,12.5187 3.27709,4.2436 8.84816,5.3046 13.98229,6.6837 131.19323,27.4776 271.01614,17.3989 396.41983,-29.7055 -107.81658,24.6132 -222.84279,30.236 -327.38226,-5.3045 -88.37246,-29.9177 -165.60278,-89.01031 -216.28859,-165.18362 -16.27626,-24.6131 -29.71237,-50.49929 -42.05611,-76.91594 -39.87138,-87.10069 -65.21429,-182.26428 -58.00467,-277.32178 7.10038,-95.16359 50.03039,-190.00891 127.15147,-248.78331 7.97427,-6.15327 17.91481,-11.98827 27.74612,-9.65427 -75.91949,53.46984 -121.03423,141.94971 -132.83178,232.23311 -11.79756,90.60169 7.42809,182.47646 41.29145,267.45532 24.25054,60.15357 56.36611,118.39751 100.7162,166.45672 19.00718,20.58165 40.41757,39.25365 64.88658,53.46985 44.89626,26.20442 97.98528,36.07092 149.98193,42.43632 70.67612,8.8056 142.00766,12.5188 213.22996,10.9275 -90.01101,20.5816 -184.06377,5.835 -275.16715,-8.8056 154.56987,56.3343 335.90274,21.9608 468.84375,-72.9906 26.43527,-18.99029 51.45043,-40.10238 71.54993,-65.45812 30.8048,-39.04149 49.2658,-86.57023 58.5509,-134.94771 24.2505,-126.14215 -10.4867,-257.90713 -73.407,-370.89401 C 963.68603,303.29926 905.57213,230.62695 829.10647,181.18856 757.55646,135.25118 672.57034,110.95635 587.03803,106.39444 455.40786,99.074162 316.13111,141.29837 228.63255,237.52286 m 258.3447,867.93014 c 59.20627,14.4284 118.84948,24.8253 179.36659,31.8273 -74.28092,16.5502 -150.74659,-8.8055 -222.62431,-33.6308 -42.38383,-14.4284 -85.31383,-29.3872 -124.63903,-50.8176 -95.14513,-51.348 -166.69514,-139.19133 -208.31431,-237.0072 -7.10038,-17.39892 -13.763816,-34.69175 -19.225649,-52.40893 -0.546183,-2.12182 -2.184733,2.97054 0,1.90964 2.184733,-0.84874 1.96626,-4.03146 0.873893,-6.15329 C 67.617712,701.14037 52.543054,638.97106 47.845877,576.3774 c -4.697176,94.63314 19.553363,189.69064 63.575743,274.45732 47.95488,92.08695 119.72337,173.03438 209.95285,227.88338 90.01101,54.743 198.37377,82.5388 304.00563,72.6723 148.56186,-14.1101 278.99042,-98.3463 398.7138,-184.59826 -52.87054,67.89826 -132.94101,109.80416 -210.71752,149.37616 134.57957,-36.6015 242.39622,-140.04016 307.28272,-260.24122 -32.2248,53.46984 -82.5829,95.37578 -137.31048,126.88479 -55.05527,31.50903 -115.24467,53.46993 -175.5433,74.58203 -26.43527,9.3359 -53.08902,18.4597 -80.28895,25.8861 -77.88573,21.6426 -159.92247,29.069 -240.53912,22.173 M 1037.3115,924.78011 c 13.7639,-12.51873 27.2,-25.35574 38.2328,-39.78411 17.3687,-23.23391 28.8385,-50.28711 39.8714,-76.91594 14.8562,-36.3892 30.0401,-72.99058 33.8635,-111.92596 -7.1005,6.15327 -9.6129,15.2771 -12.3439,24.08265 -36.5942,123.06551 -127.1514,230.42957 -244.69004,289.20395 55.38298,-11.98823 102.90094,-46.99829 145.06624,-84.66059 M 364.85066,1055.6964 c 5.78954,1.3791 12.88993,3.7132 13.21764,9.336 2.18473,-3.7132 8.84816,-3.7132 11.25138,0 1.09236,-0.3183 0.21847,-2.1219 -1.09237,-2.6523 -8.30199,-4.2436 -16.49474,-8.5934 -24.46901,-12.837 -33.31719,-17.3989 -63.79422,-39.0415 -91.10338,-64.18504 -3.2771,7.002 -0.87389,15.80764 5.46183,20.05114 12.12528,8.5935 24.25055,17.0807 36.26657,25.674 14.74696,11.7762 32.00635,20.3695 50.46734,24.6132 M 1159.4381,651.70199 c -1.0923,19.73292 -2.1847,39.7841 -3.6048,59.62311 -0.3277,2.65228 -0.3277,5.30455 -0.3277,8.06291 -0.2185,4.7741 -0.5461,9.65429 -1.0923,14.21619 -0.3278,5.835 -0.5462,11.24565 -0.5462,17.08064 11.579,-45.40693 15.73,-93.04176 12.1252,-139.50961 -1.4201,-0.53045 -2.7308,-1.37918 -3.8232,-2.12181 -0.7647,14.004 -1.8571,28.22019 -2.731,42.64857 M 90.011228,358.78484 c -1.96626,3.501 -3.60481,6.89591 -5.24336,10.39691 1.96626,2.44009 5.461833,-0.53045 6.335727,-3.501 0.873892,-2.65227 1.638549,-6.36546 4.697175,-6.68374 -1.420076,-1.37917 -2.730916,-2.65226 -4.150992,-4.03145 -0.546183,1.06091 -1.092367,2.65228 -0.546183,3.71318 M 290.02355,137.05472 c 2.73092,-2.12181 5.46183,-4.24363 8.30199,-6.68372 -4.69718,-1.90964 -10.7052,0.53045 -12.67146,5.30455 1.31085,0.53045 2.73092,1.0609 4.36947,1.37917 m 8.52046,-12.51873 c 6.00802,1.37919 12.88992,-0.21218 17.91481,-4.24363 -6.33572,-0.31828 -12.67145,0.95481 -17.91481,4.24363 M 79.524509,395.70449 c -0.327711,-1.37918 -0.546184,-2.65227 -0.546184,-3.71318 -5.24336,1.90964 -7.755802,8.80555 -4.697176,13.36745 1.092366,-3.50099 2.840153,-6.68372 5.24336,-9.65427 M 48.501297,532.03138 c -1.420076,1.90964 -0.327709,5.09237 2.184733,5.30455 1.420077,-4.24365 1.092367,-8.80555 -0.218473,-13.36746 -2.730917,1.37917 -3.60481,5.09236 -1.96626,7.53245"/></g><text x="50" y="50" fill="currentColor" font-size="52" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">m</text>';

// Setting Tab Descriptions
export const SETTING_MARIMO_PATH_DESC = "Absolute path to marimo (e.g. {marimoExample}). Leave empty to auto-detect under <vault>/.venv.";
export const SETTING_PYTHON_PATH_DESC = "Absolute path to the Python interpreter (e.g. {pythonExample}). Used to install marimo and to run `python -m marimo`. Leave empty to auto-detect under <vault>/.venv.";
export const SETTING_UV_PATH_DESC = "Absolute path to uv. Leave empty to search PATH and common uv install locations.";
export const SETTING_PORT_DESC = "Port for the marimo edit server.";
export const SETTING_AUTO_START_DESC = "Launch the marimo edit server when Obsidian starts.";
export const SETTING_TAKEOVER_DESC = "When on, clicking a .py file opens the marimo editor. Turn off to keep .py as plain text and use the command / context menu instead. Change takes effect after reloading the plugin.";
export const SETTING_EMBED_MODE_DESC = "Mode for ```marimo blocks when not specified.";
export const SETTING_CONTEXT_MENU_DESC = "When enabled, right-clicking files and folders in the file explorer shows the 'create new marimo notebook' option.";
export const SETTING_MD_CONTEXT_MENU_DESC = "When enabled, right-clicking a Markdown (.md) file in the file explorer shows an 'Open in marimo' option. Requires a marimo Markdown integration (e.g. mkdocs-marimo or quarto-marimo) installed in your marimo environment for the file to open as a notebook.";
export const TEXT_EMBED_MODE_EDIT = "Edit (full editor)";
export const TEXT_EMBED_MODE_RUN = "Run (read-only app)";
export const TEXT_NOT_INSTALLED_ERROR = "Marimo is not installed. Install it from the marimo bridge settings.";
export const TEXT_VENV_BROKEN_ERROR = "The vault's marimo virtual environment (.venv) is broken: its Python interpreter is missing (often after a Homebrew/pyenv upgrade). Recreate .venv and reinstall marimo, or set a marimo path in settings.";
export const TEXT_VENV_BROKEN_HINT = "The existing .venv is broken (its Python is missing); it will be bypassed.";

// Remaining runtime literals centralized for Constitution Principle VI.
export const RUNTIME_CONSTANTS = {
	SLASH: "/",
	BACKSLASH: "\\",
	PARENT_PATH: "..",
	EXTENSION_PY: "py",
	EXTENSION_MD: "md",
	MARKDOWN_BLOCK_MARIMO: "marimo",
	EVENT_FILE_MENU: "file-menu",
	EVENT_BEFORE_UNLOAD: "beforeunload",
	EVENT_UNLOAD: "unload",
	EVENT_BLUR: "blur",
	EVENT_DATA: "data",
	EVENT_ERROR: "error",
	EVENT_CLOSE: "close",
	EVENT_EXIT: "exit",
	EVENT_LISTENING: "listening",
	ELECTRON_MODULE: "electron",
	TAG_WEBVIEW: "webview",
	CSS_HEIGHT: "height",
	CSS_PX: "px",
	PARTITION_SHARED: "shared",
	ENCODING_HEX: "hex",
	PROCESS_ERROR_PERMISSION: "EPERM",
	TYPE_OBJECT: "object",
	TYPE_NUMBER: "number",
	TYPE_STRING: "string",
	PLACEHOLDER_MARIMO_EXAMPLE: "{marimoExample}",
	PLACEHOLDER_PYTHON_EXAMPLE: "{pythonExample}",
	FILE_UNTITLED_MARIMO: "untitled_marimo.py",
	FILE_UNTITLED_MARIMO_PREFIX: "untitled_marimo_",
	NOTICE_LOCAL_VAULT_REQUIRED: "Marimo bridge requires a local vault (desktop). Disabling.",
	NOTICE_RESTARTING_SERVER: "Restarting marimo server…",
	NOTICE_MARIMO_NOT_INSTALLED: "Marimo bridge: marimo is not installed, so the server was not started. Install it from the plugin settings.",
	NOTICE_INSTALLING_MARIMO: "Installing marimo… this may take a minute.",
	NOTICE_UV_REQUIRED: "uv is required for this uv-created .venv. Configure a valid uv command path or install uv in a standard location.",
	NOTICE_PORT_CONFLICT_SUFFIX: " is already in use and could not be released. Change the marimo bridge port or stop that process manually.",
	TITLE_OPEN_IN_MARIMO: "Open in marimo",
	TEXT_STARTING_SERVER: "Starting marimo server...",
	LOG_RENDER_ERROR: "[MarimoBridge] render error:",
	LOG_UNSAFE_PROTOCOL: "[MarimoBridge] Blocked external navigation to unsafe protocol:",
	LOG_LINK_PARSE_FAILED: "Failed to parse link URL:",
	LOG_INJECTION_FAILED: "[MarimoBridge] Failed to inject interception script:",
	LOG_WEBVIEW_RELOAD_FAILED: "[MarimoBridge] webview reload failed:",
	LOG_NO_DOM_READY: "no dom-ready",
	LOG_RELATIVE_URL_FAILED: "[MarimoBridge] Failed to resolve relative URL:",
	LOG_AUTH_RETRY: "[MarimoBridge] Landed on login page, retrying with token. Attempt:",
	LOG_AUTH_LIMIT: "[MarimoBridge] Auth retry limit reached. Showing login page.",
	LOG_NAVIGATE_PARSE_FAILED: "[MarimoBridge] Failed to parse did-navigate URL:",
	LOG_PIP_INSTALL_FAILED: "[marimo-bridge] pip install failed:",
	LOG_UV_INSTALL_FAILED: "[marimo-bridge] uv pip install failed:",
	LOG_UV_COMMAND_UNAVAILABLE: "[marimo-bridge] uv command unavailable:",
	LOG_EDIT_SERVER_EXCEPTION: "[MarimoBridge] Exception in ensureEditServer:",
	LOG_RECORD_WRITE_FAILED: "[MarimoBridge] Failed to write server records:",
	ERROR_SERVER_MANAGER_UNAVAILABLE: "Marimo server manager is unavailable.",
	TEXT_TIMEOUT_SUFFIX: "\n[timeout]",
	TEXT_INSTALLED: "installed",
	HTTP_ROOT: "/",
	CMD_NETSTAT_LISTENERS: "netstat -ano -p tcp",
	TOKEN_BYTES: 16,
	EXIT_CODE_FAILURE: -1,
	HTTP_STATUS_OK: 200,
	HTTP_REDIRECT_MIN: 300,
	HTTP_REDIRECT_MAX_EXCLUSIVE: 400,
	AUTH_TIMEOUT_MULTIPLIER: 6,
	CONSOLE_LEVEL_ERROR: 3,
	CONSOLE_LEVEL_WARNING: 2,
	NETSTAT_PORT_GROUP: 1,
	NETSTAT_PID_GROUP: 2,
} as const;

export function formatClassSelector(className: string): string {
	return `.${className}`;
}

export function formatWebviewReloadLog(
	reason: string,
	attempt: number,
	maxAttempts: number
): string {
	return `[MarimoBridge] webview not ready (${reason}); reloading, attempt ${attempt.toString()}/${maxAttempts.toString()}`;
}

export function formatDidFailLoadReason(errorCode: number | undefined): string {
	return `did-fail-load ${String(errorCode)}`;
}

export function formatWebviewConsoleLog(
	message: string,
	sourceId: string,
	line: number
): string {
	return `[MarimoWebviewConsole] ${message} (${sourceId}:${line.toString()})`;
}

export function formatMarimoInstallSuccess(version: string | null): string {
	return `marimo installed${version ? ` (${version})` : ""}.`;
}

export function formatMarimoInstallFailure(code: number | null): string {
	return `marimo install failed (exit ${String(code)}). Check the console.`;
}

export function formatUvCommandInvalid(command: string): string {
	return `Configured uv command path is not usable: ${command}`;
}

export function formatUvCommandUnavailable(diagnostic: string): string {
	return `uv command unavailable. ${diagnostic}`;
}

export function formatServerBaseUrl(port: number): string {
	return `${SCHEME_HTTP}${HOST_LOOPBACK}:${port.toString()}`;
}

export function formatServerFileUrl(
	baseUrl: string,
	vaultRelativePath: string,
	token: string
): string {
	return `${baseUrl}${QUERY_FILE}${encodeURIComponent(vaultRelativePath)}&${ACCESS_TOKEN_KEY}=${encodeURIComponent(token)}`;
}

export function formatServerRootUrl(baseUrl: string, token: string): string {
	return `${baseUrl}/?${ACCESS_TOKEN_KEY}=${encodeURIComponent(token)}`;
}

export function formatServerHealthUrl(port: number): string {
	return `${formatServerBaseUrl(port)}${PATH_HEALTH}`;
}

export function formatAccessTokenPath(token: string): string {
	return `/?${ACCESS_TOKEN_KEY}=${encodeURIComponent(token)}`;
}

export function formatLsofCommand(port: number): string {
	return `lsof -ti tcp:${port.toString()} -sTCP:LISTEN`;
}

export function formatServerReadyNotice(port: number): string {
	return `marimo server ready on :${port.toString()}`;
}

export function formatServerTimeoutNotice(timeoutSeconds: number): string {
	return `marimo server did not become ready within ${timeoutSeconds.toString()}s. Check the marimo path in settings.`;
}

export function formatServerOutputLog(
	kind: string,
	port: number,
	output: string
): string {
	return `[marimo:${kind}:${port.toString()}] ${output}`;
}

export function formatServerExitLog(
	kind: string,
	port: number,
	code: number | null
): string {
	return `[marimo:${kind}:${port.toString()}] exited (${String(code)})`;
}

export function formatServerSpawnErrorLog(kind: string, port: number): string {
	return `[marimo:${kind}:${port.toString()}] spawn error`;
}

export function formatServerSpawnErrorNotice(message: string): string {
	return `marimo failed to start: ${message}. Check the marimo path in settings.`;
}

export function formatTaskkillCommand(pid: number): string {
	return `taskkill /PID ${pid.toString()} /T /F`;
}

export function formatOrphanReconciledLog(pid: number, port: number): string {
	return `[MarimoBridge] Reconciled orphaned marimo server from a prior session (pid ${pid.toString()}, :${port.toString()}).`;
}

export function formatPortFallbackLog(port: number): string {
	return `[MarimoBridge] Port ${port.toString()} is occupied by a server not started by this vault. It will not be terminated; falling back to a free port.`;
}

export function formatVaultExecutablePath(
	scriptsDirectory: string,
	executable: string
): string {
	return `${DIR_VENV}/${scriptsDirectory}/${executable}`;
}

export function formatInstalledDescription(
	version: string,
	pythonPath: string
): string {
	return `Installed: marimo ${version} (Python: ${pythonPath})`;
}

export function formatBrokenEnvironmentHint(hint: string): string {
	return `${hint} `;
}

export function formatNotInstalledDescription(
	brokenHint: string,
	installTarget: string
): string {
	return `Not installed. ${brokenHint}Will install with: ${installTarget}`;
}

export function formatPipInstallTargetDescription(pythonPath: string): string {
	return `${pythonPath} -m pip install marimo`;
}

export function formatUvInstallTargetDescription(
	uvCommand: string,
	pythonPath: string
): string {
	return `${uvCommand} pip install marimo --python ${pythonPath}`;
}

export function formatExportSuccessNotice(markdownPath: string): string {
	return `Exported notebook to ${markdownPath}`;
}

export function formatExportFailureNotice(reason: string): string {
	return `marimo export failed: ${reason}`;
}

/** Diagnostic used when the export ran but no embedded session data was found. */
export function formatExportParseFailure(notebookName: string): string {
	return `could not read export data from ${notebookName}`;
}

/** Heading prefix of `level` hashes followed by a space. */
export function formatHeadingPrefix(level: number): string {
	return `${CHAR_HASH.repeat(level)}${CH_SPACE}`;
}

/** Collision-avoiding base name: `base-1`, `base-2`, … */
export function formatCollisionBase(base: string, index: number): string {
	return `${base}${COLLISION_SEPARATOR}${index.toString()}`;
}

/** Attachment image base name derived from the notebook and output index. */
export function formatExportImageName(
	notebookBase: string,
	index: number
): string {
	return `${notebookBase}${COLLISION_SEPARATOR}${index.toString()}${EXT_PNG}`;
}

/** Placeholder embedded in Markdown until the image attachment link is resolved. */
export function formatImageToken(index: number): string {
	return `${IMAGE_TOKEN_OPEN}${index.toString()}${IMAGE_TOKEN_CLOSE}`;
}

/**
 * Script run inside the marimo `<webview>` to export the LIVE session as HTML
 * via `POST /api/export/html`, reusing the headers captured by the injection
 * script. Resolves to the HTML string, or `null` when no live session/headers
 * are available (caller then falls back to the CLI export).
 */
export function formatLiveExportScript(includeCode: boolean): string {
	return `(async function () {
	try {
		var headers = window.__marimoBridgeHeaders;
		if (!headers) return null;
		var sent = {};
		for (var k in headers) { sent[k] = headers[k]; }
		sent["Content-Type"] = "application/json";
		var url = new URL("/api/export/html", window.location.href).href;
		var res = await fetch(url, {
			method: "POST",
			headers: sent,
			body: JSON.stringify({
				download: false,
				files: [],
				includeCode: ${includeCode ? "true" : "false"},
				assetUrl: null
			})
		});
		if (!res.ok) return null;
		return await res.text();
	} catch (e) {
		return null;
	}
})()`;
}
