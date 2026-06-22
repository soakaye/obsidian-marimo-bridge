import assert from "node:assert/strict";
import test from "node:test";
import MarimoBridgePlugin from "../src/main";
import {
	DEFAULT_SETTINGS,
	type MarimoBridgeSettings,
} from "../src/settings";

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
