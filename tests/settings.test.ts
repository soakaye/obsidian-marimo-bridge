import assert from "node:assert/strict";
import test from "node:test";
import MarimoBridgePlugin from "../src/main";
import {
	DEFAULT_SETTINGS,
	MarimoBridgeSettingTab,
	type MarimoBridgeSettings,
} from "../src/settings";
import {
	SETTING_MARIMO_INSTALL_NAME,
	SETTING_PYTHON_PATH_NAME,
	SETTING_UV_PATH_NAME,
} from "../src/constants";

test("does not expose a configurable server host", () => {
	assert.equal(
		Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, "host"),
		false
	);
});

test("discards a legacy persisted host while loading settings", async () => {
	const plugin = Object.create(MarimoBridgePlugin.prototype) as {
		loadData(): Promise<unknown>;
		loadSettings(): Promise<void>;
		settings: MarimoBridgeSettings;
	};
	plugin.loadData = async () => ({
		host: "0.0.0.0",
		port: 3000,
	});

	await plugin.loadSettings();

	assert.equal(plugin.settings.port, 3000);
	assert.equal(
		Object.prototype.hasOwnProperty.call(plugin.settings, "host"),
		false
	);
});

test("loads defaults when no settings were ever persisted (loadData null)", async () => {
	const plugin = Object.create(MarimoBridgePlugin.prototype) as {
		loadData(): Promise<unknown>;
		loadSettings(): Promise<void>;
		settings: MarimoBridgeSettings;
	};
	// Fresh install: Obsidian's loadData() resolves to null when no data.json
	// exists yet. loadSettings() must not throw on the null result.
	plugin.loadData = async () => null;

	await plugin.loadSettings();

	assert.deepEqual(plugin.settings, DEFAULT_SETTINGS);
});

test("defaults uvPath to automatic discovery", () => {
	assert.equal(DEFAULT_SETTINGS.uvPath, "");
});

test("adds uvPath while loading older persisted settings", async () => {
	const plugin = Object.create(MarimoBridgePlugin.prototype) as {
		loadData(): Promise<unknown>;
		loadSettings(): Promise<void>;
		settings: MarimoBridgeSettings;
	};
	plugin.loadData = async () => ({
		port: 3000,
	});

	await plugin.loadSettings();

	assert.equal(plugin.settings.uvPath, "");
	assert.equal(plugin.settings.port, 3000);
});

test("renders uv command path between Python path and install status", () => {
	const container = {
		settings: [] as { name: string }[],
		empty(): void {
			this.settings.length = 0;
		},
	};
	const plugin = {
		settings: { ...DEFAULT_SETTINGS },
		saveSettings: async () => {},
		servers: {
			getMarimoPackageVersion: async () => null,
			describeMarimoInstallTarget: async () => "python3 -m pip install marimo",
			resolvePython: () => "python3",
			vaultVenvBroken: () => false,
			installMarimo: async () => ({ ok: true, message: "ok" }),
			invalidateAvailability: () => {},
		},
	} as unknown as MarimoBridgePlugin;
	const tab = new MarimoBridgeSettingTab({} as never, plugin);
	Object.defineProperty(tab, "containerEl", {
		configurable: true,
		value: container,
	});

	tab.display();

	const names = container.settings.map((setting) => setting.name);
	assert.ok(
		names.indexOf(SETTING_PYTHON_PATH_NAME) <
			names.indexOf(SETTING_UV_PATH_NAME)
	);
	assert.ok(
		names.indexOf(SETTING_UV_PATH_NAME) <
			names.indexOf(SETTING_MARIMO_INSTALL_NAME)
	);
});

test("trims and saves uvPath from the settings tab", async () => {
	const container = {
		settings: [] as {
			name: string;
			textComponents: {
				setValue(value: string): unknown;
				inputEl: { dispatchEvent(event: { type: string }): boolean };
			}[];
		}[],
		empty(): void {
			this.settings.length = 0;
		},
	};
	let saveCount = 0;
	let invalidated = false;
	const plugin = {
		settings: { ...DEFAULT_SETTINGS },
		saveSettings: async () => {
			saveCount++;
		},
		servers: {
			getMarimoPackageVersion: async () => null,
			describeMarimoInstallTarget: async () => "python3 -m pip install marimo",
			resolvePython: () => "python3",
			vaultVenvBroken: () => false,
			installMarimo: async () => ({ ok: true, message: "ok" }),
			invalidateAvailability: () => {
				invalidated = true;
			},
		},
	} as unknown as MarimoBridgePlugin;
	const tab = new MarimoBridgeSettingTab({} as never, plugin);
	Object.defineProperty(tab, "containerEl", {
		configurable: true,
		value: container,
	});

	tab.display();
	const uvSetting = container.settings.find(
		(setting) => setting.name === SETTING_UV_PATH_NAME
	);
	assert.ok(uvSetting);
	const uvInput = uvSetting.textComponents[0];
	assert.ok(uvInput);
	uvInput.setValue("  /custom/bin/uv  ");
	uvInput.inputEl.dispatchEvent({ type: "blur" });
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});

	assert.equal(plugin.settings.uvPath, "/custom/bin/uv");
	assert.equal(saveCount, 1);
	assert.equal(invalidated, true);
});
