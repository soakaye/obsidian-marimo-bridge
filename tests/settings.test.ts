import assert from "node:assert/strict";
import test from "node:test";
import { Setting } from "obsidian";
import MarimoBridgePlugin from "../src/main";
import {
	DEFAULT_SETTINGS,
	MarimoBridgeSettingTab,
	type MarimoBridgeSettings,
} from "../src/settings";
import {
	SETTINGS_TAB_HEADER,
	SETTING_MARIMO_PATH_NAME,
	SETTING_PYTHON_PATH_NAME,
	SETTING_UV_PATH_NAME,
	SETTING_MARIMO_INSTALL_NAME,
	SETTING_PORT_NAME,
	SETTING_AUTO_START_NAME,
	SETTING_TIMEOUT_NAME,
	SETTING_TAKEOVER_NAME,
	SETTING_TAKEOVER_DESC,
	SETTING_EMBED_MODE_NAME,
	SETTING_EMBED_HEIGHT_NAME,
	SETTING_CONTEXT_MENU_NAME,
	SETTING_MD_CONTEXT_MENU_NAME,
	SETTING_API_TOKEN_NAME,
	SETTINGS_KEY_MARIMO_PATH,
	SETTINGS_KEY_PYTHON_PATH,
	SETTINGS_KEY_UV_PATH,
	SETTINGS_KEY_PORT,
	SETTINGS_KEY_AUTO_START,
	SETTINGS_KEY_STARTUP_TIMEOUT,
	SETTINGS_KEY_API_TOKEN,
	PORT_MAX,
} from "../src/constants";

/** Loosely-typed view of a declarative row, for tests only. */
interface TestSettingRow {
	name: string;
	desc?: unknown;
	control?: {
		type: string;
		key: string;
		min?: number;
		max?: number;
		validate?: (
			value: number
		) => string | undefined | Promise<string | undefined>;
	};
	render?: (setting: Setting) => undefined | (() => void);
}

function makeServerlessPlugin(
	overrides: Partial<MarimoBridgeSettings> = {}
): {
	plugin: MarimoBridgePlugin;
	saveCount: () => number;
	versionCalls: () => number;
} {
	let saveCalls = 0;
	let versionCalls = 0;
	const plugin = {
		settings: { ...DEFAULT_SETTINGS, ...overrides },
		saveSettings: async () => {
			saveCalls++;
		},
		servers: {
			getMarimoPackageVersion: async () => {
				versionCalls++;
				return null;
			},
			describeMarimoInstallTarget: async () =>
				"python3 -m pip install marimo",
			resolvePython: () => "python3",
			vaultVenvBroken: () => false,
			installMarimo: async () => ({ ok: true, message: "ok" }),
			invalidateAvailability: () => {},
		},
	} as unknown as MarimoBridgePlugin;
	return {
		plugin,
		saveCount: () => saveCalls,
		versionCalls: () => versionCalls,
	};
}

async function flushMicrotasks(): Promise<void> {
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
}

test("describes the .py takeover as skippable by a competing plugin and reload-gated (FR-008)", () => {
	assert.match(SETTING_TAKEOVER_DESC, /takes precedence/i);
	assert.match(SETTING_TAKEOVER_DESC, /reloading the plugin/i);
});

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

// ---------------------------------------------------------------------------
// Declarative settings API (spec 031-declarative-settings-api)
// ---------------------------------------------------------------------------

test("getSettingDefinitions() describes all 13 rows in display() order with matching control kinds (US1, FR-013a, FR-011a)", () => {
	const { plugin } = makeServerlessPlugin();
	const tab = new MarimoBridgeSettingTab({} as never, plugin);

	const defs = tab.getSettingDefinitions() as unknown as TestSettingRow[];

	const expectedRows: {
		name: string;
		kind: string;
		key?: string;
		hasDesc: boolean;
	}[] = [
		{ name: SETTING_MARIMO_PATH_NAME, kind: "text", key: SETTINGS_KEY_MARIMO_PATH, hasDesc: true },
		{ name: SETTING_PYTHON_PATH_NAME, kind: "text", key: SETTINGS_KEY_PYTHON_PATH, hasDesc: true },
		{ name: SETTING_UV_PATH_NAME, kind: "text", key: SETTINGS_KEY_UV_PATH, hasDesc: true },
		{ name: SETTING_MARIMO_INSTALL_NAME, kind: "render", hasDesc: true },
		{ name: SETTING_PORT_NAME, kind: "number", key: SETTINGS_KEY_PORT, hasDesc: true },
		{ name: SETTING_AUTO_START_NAME, kind: "toggle", key: SETTINGS_KEY_AUTO_START, hasDesc: true },
		{ name: SETTING_TIMEOUT_NAME, kind: "number", key: SETTINGS_KEY_STARTUP_TIMEOUT, hasDesc: false },
		{ name: SETTING_TAKEOVER_NAME, kind: "toggle", key: "takeOverPyExtension", hasDesc: true },
		{ name: SETTING_EMBED_MODE_NAME, kind: "dropdown", key: "defaultEmbedMode", hasDesc: true },
		{ name: SETTING_EMBED_HEIGHT_NAME, kind: "number", key: "defaultEmbedHeight", hasDesc: false },
		{ name: SETTING_CONTEXT_MENU_NAME, kind: "toggle", key: "showContextMenu", hasDesc: true },
		{ name: SETTING_MD_CONTEXT_MENU_NAME, kind: "toggle", key: "showMarkdownContextMenu", hasDesc: true },
		{ name: SETTING_API_TOKEN_NAME, kind: "text", key: SETTINGS_KEY_API_TOKEN, hasDesc: true },
	];

	assert.equal(defs.length, expectedRows.length);

	expectedRows.forEach((expected, index) => {
		const row = defs[index];
		assert.ok(row, `row ${String(index)} exists`);
		assert.equal(row.name, expected.name, `row ${String(index)} name`);
		assert.equal(
			row.desc !== undefined,
			expected.hasDesc,
			`row ${String(index)} (${expected.name}) desc presence`
		);
		if (expected.kind === "render") {
			assert.equal(typeof row.render, "function");
			assert.equal(row.control, undefined);
		} else {
			assert.ok(row.control, `row ${String(index)} (${expected.name}) has a control`);
			assert.equal(row.control.type, expected.kind);
			assert.equal(row.control.key, expected.key);
			assert.equal(
				Object.prototype.hasOwnProperty.call(row.control, "defaultValue"),
				false,
				`row ${String(index)} (${expected.name}) must not declare defaultValue (FR-011a)`
			);
		}
	});

	// Every DEFAULT_SETTINGS key is bound by exactly one control (INV-2).
	const boundKeys = defs
		.map((row) => row.control?.key)
		.filter((key): key is string => key !== undefined);
	assert.deepEqual([...boundKeys].sort(), Object.keys(DEFAULT_SETTINGS).sort());
});

test("DEFAULT_SETTINGS is unchanged by this feature (FR-011, SC-004, INV-1)", () => {
	assert.deepEqual(DEFAULT_SETTINGS, {
		pythonPath: "",
		uvPath: "",
		marimoPath: "",
		port: 2718,
		autoStart: true,
		startupTimeout: 30,
		takeOverPyExtension: true,
		defaultEmbedMode: "edit",
		defaultEmbedHeight: 600,
		showContextMenu: true,
		showMarkdownContextMenu: false,
		apiToken: "",
	});
});

test("legacy display() and declarative getSettingDefinitions() list the same options in the same order (US2, FR-005b, SC-006)", () => {
	const container = {
		settings: [] as { name: string }[],
		empty(): void {
			this.settings.length = 0;
		},
	};
	const { plugin } = makeServerlessPlugin();
	const tab = new MarimoBridgeSettingTab({} as never, plugin);
	Object.defineProperty(tab, "containerEl", {
		configurable: true,
		value: container,
	});

	tab.display();

	// display() also emits a leading heading row (SETTINGS_TAB_HEADER) that
	// the declarative presentation intentionally omits (research.md R8).
	const legacyNames = container.settings
		.map((setting) => setting.name)
		.filter((name) => name !== SETTINGS_TAB_HEADER);

	const declarativeNames = (
		tab.getSettingDefinitions() as unknown as TestSettingRow[]
	).map((row) => row.name);

	assert.deepEqual(legacyNames, declarativeNames);
});

test("validate() accepts in-range and rejects out-of-range numeric input without transforming it (US3, FR-008)", () => {
	const { plugin } = makeServerlessPlugin();
	const tab = new MarimoBridgeSettingTab({} as never, plugin);
	const defs = tab.getSettingDefinitions() as unknown as TestSettingRow[];
	const byName = (name: string): TestSettingRow => {
		const row = defs.find((r) => r.name === name);
		assert.ok(row, `${name} row exists`);
		return row;
	};

	const port = byName(SETTING_PORT_NAME).control?.validate;
	assert.ok(port);
	assert.equal(port(1), undefined);
	assert.equal(port(PORT_MAX), undefined);
	assert.ok(port(0));
	assert.ok(port(PORT_MAX + 1));

	const timeout = byName(SETTING_TIMEOUT_NAME).control?.validate;
	assert.ok(timeout);
	assert.equal(timeout(1), undefined);
	assert.ok(timeout(0));

	const embedHeight = byName(SETTING_EMBED_HEIGHT_NAME).control?.validate;
	assert.ok(embedHeight);
	assert.equal(embedHeight(1), undefined);
	assert.ok(embedHeight(0));
});

test("setControlValue() trims path options and the API token before persisting (US3, FR-009)", async () => {
	const { plugin } = makeServerlessPlugin();
	const tab = new MarimoBridgeSettingTab({} as never, plugin);

	for (const key of [
		SETTINGS_KEY_MARIMO_PATH,
		SETTINGS_KEY_PYTHON_PATH,
		SETTINGS_KEY_UV_PATH,
		SETTINGS_KEY_API_TOKEN,
	]) {
		await tab.setControlValue(key, "  value  ");
		assert.equal(
			(plugin.settings as unknown as Record<string, unknown>)[key],
			"value",
			`${key} is stored trimmed`
		);
	}
});

test("setControlValue() persists through the plugin's own save path (US3, FR-006, INV-4)", async () => {
	const { plugin, saveCount } = makeServerlessPlugin();
	const tab = new MarimoBridgeSettingTab({} as never, plugin);

	await tab.setControlValue(SETTINGS_KEY_AUTO_START, true);

	assert.equal(plugin.settings.autoStart, true);
	assert.equal(saveCount(), 1);
});

test("row 4's render callback re-checks installation on a path-key save, not on a token save, and stops writing after its cleanup runs (US3, FR-007, FR-009, FR-010)", async () => {
	const { plugin, versionCalls } = makeServerlessPlugin();
	const tab = new MarimoBridgeSettingTab({} as never, plugin);

	const defs = tab.getSettingDefinitions() as unknown as TestSettingRow[];
	const installRow = defs.find(
		(row) => row.name === SETTING_MARIMO_INSTALL_NAME
	);
	assert.ok(installRow?.render);

	const settingRow = new Setting({} as never);
	const cleanup = installRow.render(settingRow);
	await flushMicrotasks();
	assert.equal(versionCalls(), 1);

	// Saving a path key re-runs the check.
	await tab.setControlValue(SETTINGS_KEY_MARIMO_PATH, "/x");
	await flushMicrotasks();
	assert.equal(versionCalls(), 2);

	// Saving the token does not.
	await tab.setControlValue(SETTINGS_KEY_API_TOKEN, "secret");
	await flushMicrotasks();
	assert.equal(versionCalls(), 2);

	// After cleanup, no further re-check is triggered.
	assert.equal(typeof cleanup, "function");
	cleanup?.();
	await tab.setControlValue(SETTINGS_KEY_MARIMO_PATH, "/y");
	await flushMicrotasks();
	assert.equal(versionCalls(), 2);
});
