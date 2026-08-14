import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import MarimoBridgePlugin from "../src/main";
import { FileSystemAdapter } from "obsidian";
import { getNoticeMessages, resetNoticeMessages } from "./stubs/obsidian";
import { RUNTIME_CONSTANTS } from "../src/constants";

interface PluginInternals {
	app: {
		workspace: {
			getActiveFile(): null;
			getLeaf(kind: string): FakeLeaf;
			getMostRecentLeaf(): FakeLeaf | null;
			setActiveLeaf(leaf: FakeLeaf, options: { focus: boolean }): void;
		};
	};
	serverManager: {
		stopAll(): void;
	} | null;
	onunload(): void;
	openMarimo(
		file: string | undefined,
		openInNewTab?: boolean,
		active?: boolean
	): Promise<void>;
}

interface FakeLeaf {
	setViewState(state: unknown): Promise<void>;
}

function makePlugin(): {
	plugin: PluginInternals;
	states: unknown[];
	activations: { leaf: FakeLeaf; focus: boolean }[];
	leaf: FakeLeaf;
	previousLeaf: FakeLeaf;
	getActiveLeaf: () => FakeLeaf;
} {
	const states: unknown[] = [];
	const activations: { leaf: FakeLeaf; focus: boolean }[] = [];
	const previousLeaf: FakeLeaf = {
		setViewState: async () => {},
	};
	const leaf: FakeLeaf = {
		setViewState: async (state) => {
			states.push(state);
		},
	};
	let activeLeaf = previousLeaf;
	const plugin = Object.create(
		MarimoBridgePlugin.prototype
	) as PluginInternals;
	plugin.app = {
		workspace: {
			getActiveFile: () => null,
			getLeaf: () => {
				activeLeaf = leaf;
				return leaf;
			},
			getMostRecentLeaf: () => activeLeaf,
			setActiveLeaf: (activeTarget, options) => {
				activeLeaf = activeTarget;
				activations.push({
					leaf: activeTarget,
					focus: options.focus,
				});
			},
		},
	};
	plugin.serverManager = null;
	return {
		plugin,
		states,
		activations,
		leaf,
		previousLeaf,
		getActiveLeaf: () => activeLeaf,
	};
}

test("activates and focuses a foreground marimo leaf", async () => {
	const { plugin, states, activations, leaf } = makePlugin();

	await plugin.openMarimo("notebook.py", true, true);

	assert.equal(states.length, 1);
	assert.deepEqual(activations, [{ leaf, focus: true }]);
});

test("does not activate a background marimo leaf", async () => {
	const {
		plugin,
		states,
		activations,
		previousLeaf,
		getActiveLeaf,
	} = makePlugin();

	await plugin.openMarimo("notebook.py", true, false);

	assert.equal(states.length, 1);
	assert.deepEqual(activations, [{ leaf: previousLeaf, focus: true }]);
	assert.equal(getActiveLeaf(), previousLeaf);
});

test("stops an initialized server manager during unload", () => {
	const { plugin } = makePlugin();
	let stopCount = 0;
	plugin.serverManager = {
		stopAll: () => {
			stopCount++;
		},
	};

	plugin.onunload();

	assert.equal(stopCount, 1);
});

test("allows unload before server manager initialization", () => {
	const { plugin } = makePlugin();

	assert.doesNotThrow(() => {
		plugin.onunload();
	});
});

// ---------------------------------------------------------------------------
// onload() harness (spec 030-fix-py-extension-conflict)
//
// Drives the real onload() with own-property fakes for every Obsidian
// registration method it calls, a FileSystemAdapter subclass rooted at a
// throwaway directory (so onload() clears its non-local-vault early return
// and ServerManager/ServerRecordStore I/O stays out of the repository), and
// an onLayoutReady that records its callback without invoking it (so no
// marimo availability check or process spawn happens in a unit test).
// ---------------------------------------------------------------------------

interface RecordedCommand {
	id: string;
	callback?: () => void;
	checkCallback?: (checking: boolean) => boolean;
}

interface OnloadPluginInternals {
	manifest: { dir: string };
	app: unknown;
	settings?: { takeOverPyExtension: boolean };
	loadData(): Promise<unknown>;
	saveData(data: unknown): Promise<void>;
	onload(): Promise<void>;
	registerView(type: string, factory: unknown): void;
	registerExtensions(extensions: string[], viewType: string): void;
	registerMarkdownCodeBlockProcessor(type: string, processor: unknown): void;
	addRibbonIcon(icon: string, title: string, callback: unknown): unknown;
	addCommand(command: RecordedCommand): void;
	registerEvent(eventRef: unknown): void;
	registerDomEvent(
		target: unknown,
		type: string,
		callback: unknown
	): void;
	addSettingTab(tab: unknown): void;
}

class TempVaultAdapter extends FileSystemAdapter {
	constructor(private readonly base: string) {
		super();
	}

	override getBasePath(): string {
		return this.base;
	}
}

function makeOnloadHarness(options: {
	takeOverPyExtension?: boolean;
	registerExtensionsImpl?: (extensions: string[], viewType: string) => void;
} = {}): {
	plugin: OnloadPluginInternals;
	registerExtensionsCalls: { extensions: string[]; viewType: string }[];
	registerViewCalls: unknown[];
	registerMarkdownCodeBlockProcessorCalls: unknown[];
	addRibbonIconCalls: unknown[];
	commands: RecordedCommand[];
	registerEventCalls: unknown[];
	registerDomEventCalls: { type: string }[];
	addSettingTabCalls: unknown[];
	layoutReadyCallbacks: (() => void | Promise<void>)[];
} {
	// Every recorded call is pushed onto an array (rather than incrementing a
	// primitive counter) so the returned references stay live: onload() runs
	// AFTER this function returns the harness, and a primitive captured by
	// value at return time would not observe later mutations of its closure
	// variable.
	const registerExtensionsCalls: { extensions: string[]; viewType: string }[] = [];
	const registerViewCalls: unknown[] = [];
	const registerMarkdownCodeBlockProcessorCalls: unknown[] = [];
	const addRibbonIconCalls: unknown[] = [];
	const commands: RecordedCommand[] = [];
	const registerEventCalls: unknown[] = [];
	const registerDomEventCalls: { type: string }[] = [];
	const addSettingTabCalls: unknown[] = [];
	const layoutReadyCallbacks: (() => void | Promise<void>)[] = [];

	const vaultDir = mkdtempSync(
		path.join(tmpdir(), "marimo-bridge-onload-")
	);

	const plugin = Object.create(
		MarimoBridgePlugin.prototype
	) as OnloadPluginInternals;

	plugin.manifest = { dir: "" };
	plugin.loadData = async () => ({
		takeOverPyExtension: options.takeOverPyExtension ?? true,
	});
	plugin.saveData = async () => {};

	plugin.app = {
		vault: { adapter: new TempVaultAdapter(vaultDir) },
		workspace: {
			getActiveFile: () => null,
			on: () => ({}),
			onLayoutReady: (cb: () => void | Promise<void>) => {
				layoutReadyCallbacks.push(cb);
			},
		},
	};

	plugin.registerView = () => {
		registerViewCalls.push(undefined);
	};
	plugin.registerExtensions = (extensions, viewType) => {
		registerExtensionsCalls.push({ extensions, viewType });
		options.registerExtensionsImpl?.(extensions, viewType);
	};
	plugin.registerMarkdownCodeBlockProcessor = () => {
		registerMarkdownCodeBlockProcessorCalls.push(undefined);
	};
	plugin.addRibbonIcon = () => {
		addRibbonIconCalls.push(undefined);
		return {};
	};
	plugin.addCommand = (command) => {
		commands.push(command);
	};
	plugin.registerEvent = () => {
		registerEventCalls.push(undefined);
	};
	plugin.registerDomEvent = (_target, type) => {
		registerDomEventCalls.push({ type });
	};
	plugin.addSettingTab = () => {
		addSettingTabCalls.push(undefined);
	};

	return {
		plugin,
		registerExtensionsCalls,
		registerViewCalls,
		registerMarkdownCodeBlockProcessorCalls,
		addRibbonIconCalls,
		commands,
		registerEventCalls,
		registerDomEventCalls,
		addSettingTabCalls,
		layoutReadyCallbacks,
	};
}

/**
 * Installs a minimal `window` (onload() calls registerDomEvent(window, ...))
 * for the duration of an async `run()`. Must `await` the callback before
 * restoring — `onload()` reaches the `window` reference after its own
 * `await`s, so a synchronous try/finally would tear the global down before
 * that point is reached.
 */
async function withFakeWindow<T>(run: () => Promise<T>): Promise<T> {
	const previous = (globalThis as { window?: unknown }).window;
	(globalThis as { window?: unknown }).window = {
		addEventListener: () => {},
		removeEventListener: () => {},
	};
	try {
		return await run();
	} finally {
		if (previous === undefined) {
			delete (globalThis as { window?: unknown }).window;
		} else {
			(globalThis as { window?: unknown }).window = previous;
		}
	}
}

async function withCapturedWarnings<T>(
	run: (warnings: unknown[][]) => Promise<T>
): Promise<T> {
	const warnings: unknown[][] = [];
	const original = console.warn;
	console.warn = (...args: unknown[]) => {
		warnings.push(args);
	};
	try {
		return await run(warnings);
	} finally {
		console.warn = original;
	}
}

test("onload() survives a .py extension claim conflict and completes every other registration (US1, FR-001..FR-003)", async () => {
	await withFakeWindow(async () => {
		await withCapturedWarnings(async () => {
			resetNoticeMessages();
			const harness = makeOnloadHarness({
				takeOverPyExtension: true,
				registerExtensionsImpl: () => {
					throw new Error(
						'Attempting to register an existing file extension "py"'
					);
				},
			});

			await assert.doesNotReject(harness.plugin.onload());

			assert.equal(harness.registerExtensionsCalls.length, 1);
			assert.equal(harness.registerViewCalls.length, 1);
			assert.equal(
				harness.registerMarkdownCodeBlockProcessorCalls.length,
				1
			);
			assert.equal(harness.addRibbonIconCalls.length, 1);
			assert.equal(harness.commands.length, 4);
			assert.equal(harness.registerEventCalls.length, 2);
			assert.deepEqual(
				harness.registerDomEventCalls.map((c) => c.type),
				[
					RUNTIME_CONSTANTS.EVENT_BEFORE_UNLOAD,
					RUNTIME_CONSTANTS.EVENT_UNLOAD,
				]
			);
			assert.equal(harness.addSettingTabCalls.length, 1);
			assert.equal(harness.layoutReadyCallbacks.length, 1);
		});
	});
});

test("onload() reports a .py extension conflict exactly once (US2, FR-004, FR-005, INV-2)", async () => {
	await withFakeWindow(async () => {
		await withCapturedWarnings(async (warnings) => {
			resetNoticeMessages();
			const thrown = new Error(
				'Attempting to register an existing file extension "py"'
			);
			const harness = makeOnloadHarness({
				takeOverPyExtension: true,
				registerExtensionsImpl: () => {
					throw thrown;
				},
			});

			await harness.plugin.onload();

			assert.deepEqual(getNoticeMessages(), [
				RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT,
			]);
			assert.equal(warnings.length, 1);
			const [warning] = warnings;
			assert.ok(warning);
			assert.equal(warning[0], RUNTIME_CONSTANTS.LOG_PY_EXTENSION_CONFLICT);
			assert.equal(warning[1], thrown);
		});
	});
});

test("onload() catches any .py claim failure, not just Obsidian's specific conflict message (research.md R3)", async () => {
	// The catch must not narrow on Obsidian's exact wording — that string is
	// unstable across versions/locales and is only ONE way the optional claim
	// can fail. Prove it with an unrelated Error and, separately, a thrown
	// non-Error value (both are legal `throw` targets in JS).
	await withFakeWindow(async () => {
		await withCapturedWarnings(async (warnings) => {
			resetNoticeMessages();
			const unrelated = new Error("boom");
			const harness = makeOnloadHarness({
				takeOverPyExtension: true,
				registerExtensionsImpl: () => {
					throw unrelated;
				},
			});

			await assert.doesNotReject(harness.plugin.onload());

			assert.deepEqual(getNoticeMessages(), [
				RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT,
			]);
			assert.equal(warnings.length, 1);
			const [warning] = warnings;
			assert.ok(warning);
			assert.equal(warning[1], unrelated);
		});
	});

	await withFakeWindow(async () => {
		await withCapturedWarnings(async (warnings) => {
			resetNoticeMessages();
			const harness = makeOnloadHarness({
				takeOverPyExtension: true,
				registerExtensionsImpl: () => {
					// Intentionally a non-Error throw: research.md R3 requires the
					// catch to be broad, not narrowed to `instanceof Error`.
					// eslint-disable-next-line @typescript-eslint/only-throw-error
					throw "not an Error instance";
				},
			});

			await assert.doesNotReject(harness.plugin.onload());

			assert.deepEqual(getNoticeMessages(), [
				RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT,
			]);
			assert.equal(warnings.length, 1);
			const [warning] = warnings;
			assert.ok(warning);
			assert.equal(warning[1], "not an Error instance");
		});
	});
});

test("onload() claims .py silently when the extension is free (FR-006, FR-007)", async () => {
	await withFakeWindow(async () => {
		await withCapturedWarnings(async (warnings) => {
			resetNoticeMessages();
			const harness = makeOnloadHarness({ takeOverPyExtension: true });

			await harness.plugin.onload();

			assert.deepEqual(harness.registerExtensionsCalls, [
				{
					extensions: [RUNTIME_CONSTANTS.EXTENSION_PY],
					viewType: "marimo-editor",
				},
			]);
			assert.deepEqual(getNoticeMessages(), []);
			assert.equal(warnings.length, 0);
		});
	});
});

test("onload() skips the .py claim and stays silent when the takeover preference is off (FR-006)", async () => {
	await withFakeWindow(async () => {
		await withCapturedWarnings(async (warnings) => {
			resetNoticeMessages();
			const harness = makeOnloadHarness({ takeOverPyExtension: false });

			await harness.plugin.onload();

			assert.equal(harness.registerExtensionsCalls.length, 0);
			assert.deepEqual(getNoticeMessages(), []);
			assert.equal(warnings.length, 0);
		});
	});
});
