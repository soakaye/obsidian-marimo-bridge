/**
 * Settings schema, defaults, and the settings tab UI for marimo Bridge.
 *
 * The tab is ordered:
 *   1. marimo executable path
 *   2. Python interpreter path
 *   3. marimo installation (status + install/upgrade button)
 *   ...then server, embedding, and behaviour options.
 */
import {
	App,
	ButtonComponent,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
} from "obsidian";
import type MarimoBridgePlugin from "./main";
import {
	DEFAULT_PORT,
	DEFAULT_AUTO_START,
	DEFAULT_STARTUP_TIMEOUT,
	DEFAULT_TAKE_OVER_PY_EXTENSION,
	DEFAULT_EMBED_MODE,
	DEFAULT_EMBED_HEIGHT,
	DEFAULT_SHOW_CONTEXT_MENU,
	DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU,
	DEFAULT_API_TOKEN,
	DEFAULT_UV_PATH,
	SETTINGS_TAB_HEADER,
	SETTING_MARIMO_PATH_NAME,
	SETTING_PYTHON_PATH_NAME,
	SETTING_UV_PATH_NAME,
	SETTING_MARIMO_INSTALL_NAME,
	SETTING_PORT_NAME,
	SETTING_AUTO_START_NAME,
	SETTING_TIMEOUT_NAME,
	SETTING_TAKEOVER_NAME,
	SETTING_EMBED_MODE_NAME,
	SETTING_EMBED_HEIGHT_NAME,
	SETTING_CONTEXT_MENU_NAME,
	SETTING_MD_CONTEXT_MENU_NAME,
	SETTING_API_TOKEN_NAME,
	SETTING_API_TOKEN_DESC,
	SETTING_API_TOKEN_WARN,
	PLACEHOLDER_AUTO_DETECT,
	TEXT_CHECKING,
	TEXT_INSTALLING,
	TEXT_REINSTALL,
	TEXT_INSTALL,
	PLATFORM_WIN32,
	DIR_SCRIPTS_WIN,
	DIR_SCRIPTS_UNIX,
	EXE_MARIMO_WIN,
	EXE_MARIMO_UNIX,
	EXE_PYTHON_WIN,
	EXE_PYTHON_UNIX,
	SETTING_MARIMO_PATH_DESC,
	SETTING_PYTHON_PATH_DESC,
	SETTING_UV_PATH_DESC,
	SETTING_PORT_DESC,
	SETTING_AUTO_START_DESC,
	SETTING_TAKEOVER_DESC,
	SETTING_EMBED_MODE_DESC,
	SETTING_CONTEXT_MENU_DESC,
	SETTING_MD_CONTEXT_MENU_DESC,
	TEXT_EMBED_MODE_EDIT,
	TEXT_EMBED_MODE_RUN,
	TEXT_VENV_BROKEN_HINT,
	RUNTIME_CONSTANTS,
	RADIX_DECIMAL,
	PORT_MAX,
	OFFSET_ONE,
	MODE_EDIT,
	MODE_RUN,
	SETTINGS_KEY_MARIMO_PATH,
	SETTINGS_KEY_PYTHON_PATH,
	SETTINGS_KEY_UV_PATH,
	SETTINGS_KEY_PORT,
	SETTINGS_KEY_AUTO_START,
	SETTINGS_KEY_STARTUP_TIMEOUT,
	SETTINGS_KEY_TAKEOVER_PY_EXTENSION,
	SETTINGS_KEY_DEFAULT_EMBED_MODE,
	SETTINGS_KEY_DEFAULT_EMBED_HEIGHT,
	SETTINGS_KEY_SHOW_CONTEXT_MENU,
	SETTINGS_KEY_SHOW_MARKDOWN_CONTEXT_MENU,
	SETTINGS_KEY_API_TOKEN,
	CONTROL_TYPE_TEXT,
	CONTROL_TYPE_NUMBER,
	CONTROL_TYPE_TOGGLE,
	CONTROL_TYPE_DROPDOWN,
	SETTING_NUMBER_MIN,
	VALIDATION_MSG_PORT_RANGE,
	VALIDATION_MSG_POSITIVE_NUMBER,
	formatVaultExecutablePath,
	formatInstalledDescription,
	formatBrokenEnvironmentHint,
	formatNotInstalledDescription,
} from "./constants";

/**
 * Type-predicate wrapper: an inline `typeof value === RUNTIME_CONSTANTS.TYPE_STRING`
 * does not narrow `value` (TypeScript only narrows `typeof` checks against a
 * literal or a variable with a literal type, not a property-access
 * expression), matching the same pattern used in editor-view.ts's `isString`.
 */
function isString(value: unknown): value is string {
	return typeof value === RUNTIME_CONSTANTS.TYPE_STRING;
}

/** Keys trimmed of surrounding whitespace before being persisted (FR-009). */
const TRIMMED_SETTINGS_KEYS: readonly string[] = [
	SETTINGS_KEY_MARIMO_PATH,
	SETTINGS_KEY_PYTHON_PATH,
	SETTINGS_KEY_UV_PATH,
	SETTINGS_KEY_API_TOKEN,
];

/** Keys whose change re-triggers the installation-status check (FR-009). */
const PATH_SETTINGS_KEYS: readonly string[] = [
	SETTINGS_KEY_MARIMO_PATH,
	SETTINGS_KEY_PYTHON_PATH,
	SETTINGS_KEY_UV_PATH,
];

export interface MarimoBridgeSettings {
	/** Path to the Python interpreter (used for install and `python -m marimo`). Empty => auto-detect under <vault>/.venv. */
	pythonPath: string;
	/** Path to the uv executable. Empty => auto-detect when uv package operations are required. */
	uvPath: string;
	/** Path to the marimo executable. Empty => auto-detect under <vault>/.venv. */
	marimoPath: string;
	/** Port for the always-on edit server. */
	port: number;
	/** Start the marimo edit server automatically when the plugin loads. */
	autoStart: boolean;
	/** Seconds to wait for the server health check before giving up. */
	startupTimeout: number;
	/** Open .py files in the marimo editor by default (registerExtensions). */
	takeOverPyExtension: boolean;
	/** Default mode for ```marimo embeds when not specified. */
	defaultEmbedMode: "edit" | "run";
	/** Default height (px) for ```marimo embeds. */
	defaultEmbedHeight: number;
	/** Enable file explorer context menu options (e.g. "Create new marimo notebook"). */
	showContextMenu: boolean;
	/** Add "Open in marimo" to .md files in the file explorer (requires a marimo Markdown integration). */
	showMarkdownContextMenu: boolean;
	/** Custom API token for authentication. Empty => auto-generated session token. */
	apiToken: string;
}

export const DEFAULT_SETTINGS: MarimoBridgeSettings = {
	pythonPath: "",
	uvPath: DEFAULT_UV_PATH,
	marimoPath: "",
	port: DEFAULT_PORT,
	autoStart: DEFAULT_AUTO_START,
	startupTimeout: DEFAULT_STARTUP_TIMEOUT,
	takeOverPyExtension: DEFAULT_TAKE_OVER_PY_EXTENSION,
	defaultEmbedMode: DEFAULT_EMBED_MODE,
	defaultEmbedHeight: DEFAULT_EMBED_HEIGHT,
	showContextMenu: DEFAULT_SHOW_CONTEXT_MENU,
	showMarkdownContextMenu: DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU,
	apiToken: DEFAULT_API_TOKEN,
};

export class MarimoBridgeSettingTab extends PluginSettingTab {
	plugin: MarimoBridgePlugin;

	/**
	 * The active installation-status row's own refresh function, set while
	 * that row is mounted (see {@link buildInstallStatusRow}). `setControlValue`
	 * calls this after a path option changes so the declarative presentation
	 * re-checks installation exactly as the legacy `display()` handlers do.
	 * `null` when no such row is currently rendered.
	 */
	private installStatusRefresh: (() => Promise<void>) | null = null;

	constructor(app: App, plugin: MarimoBridgePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Declarative settings API (Obsidian 1.13+). Returns every option as
	 * structured data so the host can index it for global settings search.
	 * `display()` below is untouched and is not called when this returns a
	 * non-empty array (spec 031-declarative-settings-api, FR-005a).
	 *
	 * No control declares `defaultValue`: `loadSettings()` already merges
	 * `DEFAULT_SETTINGS`, so a per-control default would be a second, unused
	 * source of truth (FR-011a).
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		const isWin = process.platform === PLATFORM_WIN32;
		const marimoExample = isWin
			? formatVaultExecutablePath(DIR_SCRIPTS_WIN, EXE_MARIMO_WIN)
			: formatVaultExecutablePath(DIR_SCRIPTS_UNIX, EXE_MARIMO_UNIX);
		const pythonExample = isWin
			? formatVaultExecutablePath(DIR_SCRIPTS_WIN, EXE_PYTHON_WIN)
			: formatVaultExecutablePath(DIR_SCRIPTS_UNIX, EXE_PYTHON_UNIX);

		return [
			// 1. marimo executable path
			{
				name: SETTING_MARIMO_PATH_NAME,
				desc: SETTING_MARIMO_PATH_DESC.replace(
					RUNTIME_CONSTANTS.PLACEHOLDER_MARIMO_EXAMPLE,
					marimoExample
				),
				control: {
					type: CONTROL_TYPE_TEXT,
					key: SETTINGS_KEY_MARIMO_PATH,
					placeholder: PLACEHOLDER_AUTO_DETECT,
				},
			},
			// 2. Python interpreter path
			{
				name: SETTING_PYTHON_PATH_NAME,
				desc: SETTING_PYTHON_PATH_DESC.replace(
					RUNTIME_CONSTANTS.PLACEHOLDER_PYTHON_EXAMPLE,
					pythonExample
				),
				control: {
					type: CONTROL_TYPE_TEXT,
					key: SETTINGS_KEY_PYTHON_PATH,
					placeholder: PLACEHOLDER_AUTO_DETECT,
				},
			},
			// 3. uv command path
			{
				name: SETTING_UV_PATH_NAME,
				desc: SETTING_UV_PATH_DESC,
				control: {
					type: CONTROL_TYPE_TEXT,
					key: SETTINGS_KEY_UV_PATH,
					placeholder: PLACEHOLDER_AUTO_DETECT,
				},
			},
			// 4. marimo installation status / installer (live, non-persisted)
			this.buildInstallStatusRow(),
			// 5. Port
			{
				name: SETTING_PORT_NAME,
				desc: SETTING_PORT_DESC,
				control: {
					type: CONTROL_TYPE_NUMBER,
					key: SETTINGS_KEY_PORT,
					min: SETTING_NUMBER_MIN,
					max: PORT_MAX,
					validate: (value) =>
						value < SETTING_NUMBER_MIN || value > PORT_MAX
							? VALIDATION_MSG_PORT_RANGE
							: undefined,
				},
			},
			// 6. Auto-start server on load
			{
				name: SETTING_AUTO_START_NAME,
				desc: SETTING_AUTO_START_DESC,
				control: {
					type: CONTROL_TYPE_TOGGLE,
					key: SETTINGS_KEY_AUTO_START,
				},
			},
			// 7. Startup timeout (seconds) — no description in the legacy path
			{
				name: SETTING_TIMEOUT_NAME,
				control: {
					type: CONTROL_TYPE_NUMBER,
					key: SETTINGS_KEY_STARTUP_TIMEOUT,
					min: SETTING_NUMBER_MIN,
					validate: (value) =>
						value < SETTING_NUMBER_MIN
							? VALIDATION_MSG_POSITIVE_NUMBER
							: undefined,
				},
			},
			// 8. Open .py files in marimo by default
			{
				name: SETTING_TAKEOVER_NAME,
				desc: SETTING_TAKEOVER_DESC,
				control: {
					type: CONTROL_TYPE_TOGGLE,
					key: SETTINGS_KEY_TAKEOVER_PY_EXTENSION,
				},
			},
			// 9. Default embed mode
			{
				name: SETTING_EMBED_MODE_NAME,
				desc: SETTING_EMBED_MODE_DESC,
				control: {
					type: CONTROL_TYPE_DROPDOWN,
					key: SETTINGS_KEY_DEFAULT_EMBED_MODE,
					options: {
						[MODE_EDIT]: TEXT_EMBED_MODE_EDIT,
						[MODE_RUN]: TEXT_EMBED_MODE_RUN,
					},
				},
			},
			// 10. Default embed height (px) — no description in the legacy path
			{
				name: SETTING_EMBED_HEIGHT_NAME,
				control: {
					type: CONTROL_TYPE_NUMBER,
					key: SETTINGS_KEY_DEFAULT_EMBED_HEIGHT,
					min: SETTING_NUMBER_MIN,
					validate: (value) =>
						value < SETTING_NUMBER_MIN
							? VALIDATION_MSG_POSITIVE_NUMBER
							: undefined,
				},
			},
			// 11. Enable file explorer context menu
			{
				name: SETTING_CONTEXT_MENU_NAME,
				desc: SETTING_CONTEXT_MENU_DESC,
				control: {
					type: CONTROL_TYPE_TOGGLE,
					key: SETTINGS_KEY_SHOW_CONTEXT_MENU,
				},
			},
			// 12. Open Markdown files in marimo
			{
				name: SETTING_MD_CONTEXT_MENU_NAME,
				desc: SETTING_MD_CONTEXT_MENU_DESC,
				control: {
					type: CONTROL_TYPE_TOGGLE,
					key: SETTINGS_KEY_SHOW_MARKDOWN_CONTEXT_MENU,
				},
			},
			// 13. API token
			{
				name: SETTING_API_TOKEN_NAME,
				desc: SETTING_API_TOKEN_DESC,
				control: {
					type: CONTROL_TYPE_TEXT,
					key: SETTINGS_KEY_API_TOKEN,
					placeholder: SETTING_API_TOKEN_WARN,
				},
			},
		];
	}

	/**
	 * Row 4: a live, non-persisted status (detected marimo version, or a
	 * not-installed state) with an install/upgrade button. Declares `desc`
	 * with the same "checking" text `display()` passes to `setDesc()` so the
	 * row still has an indexed description (contracts C5) — a render-only
	 * definition would leave it with none. The render callback ports
	 * `display()`'s `refreshInstallStatus` logic and returns a cleanup
	 * function so an in-flight check cannot write into a torn-down row
	 * (FR-010).
	 */
	private buildInstallStatusRow(): SettingDefinitionItem {
		return {
			name: SETTING_MARIMO_INSTALL_NAME,
			desc: TEXT_CHECKING,
			render: (setting) => {
				// The flag is only ever set by the cleanup function returned
				// below — a sibling closure `refresh`'s own control flow can't
				// see. TypeScript's narrowing doesn't model that concurrent
				// mutation and would treat a direct read as permanently
				// `false` inside `refresh` (flagging every guard below as
				// dead code); routing the read through a function call
				// defeats that over-narrowing.
				const lifecycle = { disposed: false };
				const isDisposed = (): boolean => lifecycle.disposed;
				let installButton: ButtonComponent | null = null;

				const refresh = async (): Promise<void> => {
					if (isDisposed()) return;
					setting.setDesc(TEXT_CHECKING);
					installButton?.setDisabled(true);
					const version = await this.plugin.servers.getMarimoPackageVersion();
					if (isDisposed()) return;
					if (version) {
						setting.setDesc(
							formatInstalledDescription(
								version,
								this.plugin.servers.resolvePython()
							)
						);
						installButton
							?.setButtonText(TEXT_REINSTALL)
							.setDisabled(false);
					} else {
						const brokenHint = this.plugin.servers.vaultVenvBroken()
							? formatBrokenEnvironmentHint(TEXT_VENV_BROKEN_HINT)
							: "";
						const installTarget =
							await this.plugin.servers.describeMarimoInstallTarget();
						if (isDisposed()) return;
						setting.setDesc(
							formatNotInstalledDescription(
								brokenHint,
								installTarget
							)
						);
						installButton
							?.setButtonText(TEXT_INSTALL)
							.setDisabled(false);
					}
				};

				setting.addButton((btn) => {
					installButton = btn;
					btn.setButtonText(TEXT_INSTALL)
						.setCta()
						.setDisabled(true)
						.onClick(async () => {
							btn.setButtonText(TEXT_INSTALLING).setDisabled(true);
							await this.plugin.servers.installMarimo();
							await refresh();
						});
				});

				this.installStatusRefresh = refresh;
				void refresh();

				return () => {
					lifecycle.disposed = true;
					if (this.installStatusRefresh === refresh) {
						this.installStatusRefresh = null;
					}
				};
			},
		};
	}

	/** Reads from `plugin.settings`, keyed by the persisted setting key. */
	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[
			key
		];
	}

	/**
	 * Persists a control's new value through the plugin's own save path
	 * (`saveSettings()`, not the framework default) so side effects like
	 * `invalidateAvailability()` still run (contracts C2/C3, FR-006).
	 * Trims the four text-ish keys the legacy path trims (FR-009) — `validate`
	 * cannot transform a value, only reject it, so trimming has to live here.
	 * Re-checks installation status only for the three path keys.
	 */
	async setControlValue(key: string, value: unknown): Promise<void> {
		const resolved =
			TRIMMED_SETTINGS_KEYS.includes(key) && isString(value)
				? value.trim()
				: value;
		(this.plugin.settings as unknown as Record<string, unknown>)[key] =
			resolved;
		await this.plugin.saveSettings();
		if (PATH_SETTINGS_KEYS.includes(key)) {
			await this.installStatusRefresh?.();
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName(SETTINGS_TAB_HEADER).setHeading();

		const isWin = process.platform === PLATFORM_WIN32;
		const marimoExample = isWin
			? formatVaultExecutablePath(DIR_SCRIPTS_WIN, EXE_MARIMO_WIN)
			: formatVaultExecutablePath(DIR_SCRIPTS_UNIX, EXE_MARIMO_UNIX);
		const pythonExample = isWin
			? formatVaultExecutablePath(DIR_SCRIPTS_WIN, EXE_PYTHON_WIN)
			: formatVaultExecutablePath(DIR_SCRIPTS_UNIX, EXE_PYTHON_UNIX);

		// 1. marimo executable path
		new Setting(containerEl)
			.setName(SETTING_MARIMO_PATH_NAME)
			.setDesc(
				SETTING_MARIMO_PATH_DESC.replace(
					RUNTIME_CONSTANTS.PLACEHOLDER_MARIMO_EXAMPLE,
					marimoExample
				)
			)
			.addText((text) => {
				text
					.setPlaceholder(PLACEHOLDER_AUTO_DETECT)
					.setValue(this.plugin.settings.marimoPath);
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						this.plugin.settings.marimoPath = text.getValue().trim();
						await this.plugin.saveSettings();
						void refreshInstallStatus();
					})();
				});
			});

		// 2. Python interpreter path
		new Setting(containerEl)
			.setName(SETTING_PYTHON_PATH_NAME)
			.setDesc(
				SETTING_PYTHON_PATH_DESC.replace(
					RUNTIME_CONSTANTS.PLACEHOLDER_PYTHON_EXAMPLE,
					pythonExample
				)
			)
			.addText((text) => {
				text
					.setPlaceholder(PLACEHOLDER_AUTO_DETECT)
					.setValue(this.plugin.settings.pythonPath);
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						this.plugin.settings.pythonPath = text.getValue().trim();
						await this.plugin.saveSettings();
						void refreshInstallStatus();
					})();
				});
			});

		// 3. uv command path
		new Setting(containerEl)
			.setName(SETTING_UV_PATH_NAME)
			.setDesc(SETTING_UV_PATH_DESC)
			.addText((text) => {
				text
					.setPlaceholder(PLACEHOLDER_AUTO_DETECT)
					.setValue(this.plugin.settings.uvPath);
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						this.plugin.settings.uvPath = text.getValue().trim();
						await this.plugin.saveSettings();
						this.plugin.servers.invalidateAvailability();
						void refreshInstallStatus();
					})();
				});
			});

		// 4. marimo installation status / installer
		const installSetting = new Setting(containerEl)
			.setName(SETTING_MARIMO_INSTALL_NAME)
			.setDesc(TEXT_CHECKING);

		let installButton: ButtonComponent | null = null;
		installSetting.addButton((btn) => {
			installButton = btn;
			btn.setButtonText(TEXT_INSTALL)
				.setCta()
				.setDisabled(true)
				.onClick(async () => {
					btn.setButtonText(TEXT_INSTALLING).setDisabled(true);
					await this.plugin.servers.installMarimo();
					await refreshInstallStatus();
				});
		});

		const refreshInstallStatus = async (): Promise<void> => {
			installSetting.setDesc(TEXT_CHECKING);
			installButton?.setDisabled(true);
			const version = await this.plugin.servers.getMarimoPackageVersion();
			if (version) {
				installSetting.setDesc(
					formatInstalledDescription(
						version,
						this.plugin.servers.resolvePython()
					)
				);
				installButton
					?.setButtonText(TEXT_REINSTALL)
					.setDisabled(false);
			} else {
				const brokenHint = this.plugin.servers.vaultVenvBroken()
					? formatBrokenEnvironmentHint(TEXT_VENV_BROKEN_HINT)
					: "";
				const installTarget =
					await this.plugin.servers.describeMarimoInstallTarget();
				installSetting.setDesc(
					formatNotInstalledDescription(
						brokenHint,
						installTarget
					)
				);
				installButton
					?.setButtonText(TEXT_INSTALL)
					.setDisabled(false);
			}
		};
		void refreshInstallStatus();

		new Setting(containerEl)
			.setName(SETTING_PORT_NAME)
			.setDesc(SETTING_PORT_DESC)
			.addText((text) => {
				text
					.setValue(String(this.plugin.settings.port));
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						const value = text.getValue();
						const n = parseInt(value, RADIX_DECIMAL);
						if (!isNaN(n) && n > 0 && n < PORT_MAX + OFFSET_ONE) {
							this.plugin.settings.port = n;
							await this.plugin.saveSettings();
						} else {
							text.setValue(String(this.plugin.settings.port));
						}
					})();
				});
			});

		new Setting(containerEl)
			.setName(SETTING_AUTO_START_NAME)
			.setDesc(SETTING_AUTO_START_DESC)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoStart)
					.onChange(async (value) => {
						this.plugin.settings.autoStart = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(SETTING_TIMEOUT_NAME)
			.addText((text) => {
				text
					.setValue(String(this.plugin.settings.startupTimeout));
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						const value = text.getValue();
						const n = parseInt(value, RADIX_DECIMAL);
						if (!isNaN(n) && n > 0) {
							this.plugin.settings.startupTimeout = n;
							await this.plugin.saveSettings();
						} else {
							text.setValue(String(this.plugin.settings.startupTimeout));
						}
					})();
				});
			});

		new Setting(containerEl)
			.setName(SETTING_TAKEOVER_NAME)
			.setDesc(SETTING_TAKEOVER_DESC)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.takeOverPyExtension)
					.onChange(async (value) => {
						this.plugin.settings.takeOverPyExtension = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(SETTING_EMBED_MODE_NAME)
			.setDesc(SETTING_EMBED_MODE_DESC)
			.addDropdown((d) =>
				d
					.addOption(MODE_EDIT, TEXT_EMBED_MODE_EDIT)
					.addOption(MODE_RUN, TEXT_EMBED_MODE_RUN)
					.setValue(this.plugin.settings.defaultEmbedMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultEmbedMode = value as
							| typeof MODE_EDIT
							| typeof MODE_RUN;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(SETTING_EMBED_HEIGHT_NAME)
			.addText((text) => {
				text
					.setValue(String(this.plugin.settings.defaultEmbedHeight));
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						const value = text.getValue();
						const n = parseInt(value, RADIX_DECIMAL);
						if (!isNaN(n) && n > 0) {
							this.plugin.settings.defaultEmbedHeight = n;
							await this.plugin.saveSettings();
						} else {
							text.setValue(String(this.plugin.settings.defaultEmbedHeight));
						}
					})();
				});
			});


		new Setting(containerEl)
			.setName(SETTING_CONTEXT_MENU_NAME)
			.setDesc(SETTING_CONTEXT_MENU_DESC)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.showContextMenu)
					.onChange(async (value) => {
						this.plugin.settings.showContextMenu = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(SETTING_MD_CONTEXT_MENU_NAME)
			.setDesc(SETTING_MD_CONTEXT_MENU_DESC)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.showMarkdownContextMenu)
					.onChange(async (value) => {
						this.plugin.settings.showMarkdownContextMenu = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(SETTING_API_TOKEN_NAME)
			.setDesc(SETTING_API_TOKEN_DESC)
			.addText((text) => {
				text
					.setPlaceholder(SETTING_API_TOKEN_WARN)
					.setValue(this.plugin.settings.apiToken);
				text.inputEl.addEventListener(RUNTIME_CONSTANTS.EVENT_BLUR, () => {
					void (async () => {
						this.plugin.settings.apiToken = text.getValue().trim();
						await this.plugin.saveSettings();
					})();
				});
			});
	}
}
