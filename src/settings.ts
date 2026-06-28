/**
 * Settings schema, defaults, and the settings tab UI for marimo Bridge.
 *
 * The tab is ordered:
 *   1. marimo executable path
 *   2. Python interpreter path
 *   3. marimo installation (status + install/upgrade button)
 *   ...then server, embedding, and behaviour options.
 */
import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
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
	DEFAULT_ENABLE_MARKDOWN_EXPORT,
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
	SETTING_EXPERIMENTAL_HEADER,
	SETTING_ENABLE_MARKDOWN_EXPORT_NAME,
	SETTING_ENABLE_MARKDOWN_EXPORT_DESC,
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
	formatVaultExecutablePath,
	formatInstalledDescription,
	formatBrokenEnvironmentHint,
	formatNotInstalledDescription,
} from "./constants";

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
	/**
	 * Experimental: expose the Markdown export commands / context-menu items.
	 * This is a best-effort static conversion and is NOT intended to reproduce
	 * marimo's live rendering faithfully. Off by default.
	 */
	enableMarkdownExport: boolean;
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
	enableMarkdownExport: DEFAULT_ENABLE_MARKDOWN_EXPORT,
};

export class MarimoBridgeSettingTab extends PluginSettingTab {
	plugin: MarimoBridgePlugin;

	constructor(app: App, plugin: MarimoBridgePlugin) {
		super(app, plugin);
		this.plugin = plugin;
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

		// Experimental section. Markdown export is a best-effort static
		// conversion and does NOT faithfully reproduce marimo's live rendering,
		// so it is grouped here and disabled by default.
		new Setting(containerEl)
			.setName(SETTING_EXPERIMENTAL_HEADER)
			.setHeading();

		new Setting(containerEl)
			.setName(SETTING_ENABLE_MARKDOWN_EXPORT_NAME)
			.setDesc(SETTING_ENABLE_MARKDOWN_EXPORT_DESC)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.enableMarkdownExport)
					.onChange(async (value) => {
						this.plugin.settings.enableMarkdownExport = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
