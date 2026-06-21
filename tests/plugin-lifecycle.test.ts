import assert from "node:assert/strict";
import test from "node:test";
import MarimoBridgePlugin from "../src/main";

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
