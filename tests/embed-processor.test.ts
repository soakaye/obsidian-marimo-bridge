import assert from "node:assert/strict";
import test from "node:test";
import type MarimoBridgePlugin from "../src/main";
import { createMarimoEmbedProcessor } from "../src/embed-processor";

class FakeWebview extends EventTarget {
	private attributes = new Map<string, string>();
	isConnected = false;
	style = {
		setProperty: (_name: string, _value: string): void => {},
	};

	addClass(_name: string): void {}

	getAttribute(name: string): string | null {
		return this.attributes.get(name) ?? null;
	}

	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value);
	}

	reload(): void {}

	executeJavaScript(_script: string): void {}
}

class FakeElement {
	ownerDocument = {
		createElement: () => new FakeWebview(),
	};
	appended = 0;

	createDiv(_options?: unknown): FakeElement {
		return new FakeElement();
	}

	createEl(_tag: string, _options?: unknown): FakeElement {
		return new FakeElement();
	}

	setText(_text: string): void {}

	remove(): void {}

	empty(): void {}

	appendChild(child: FakeWebview): FakeWebview {
		this.appended++;
		child.isConnected = true;
		return child;
	}
}

test("releases a late run-server acquisition when the embed unloads during startup", async () => {
	let resolveRun: ((url: string | null) => void) | undefined;
	let releaseCount = 0;
	const plugin = {
		settings: {
			defaultEmbedMode: "run",
			defaultEmbedHeight: 600,
		},
		servers: {
			ensureEditServer: async () => true,
			ensureRunServer: () =>
				new Promise<string | null>((resolve) => {
					resolveRun = resolve;
				}),
			releaseRunServer: async () => {
				releaseCount++;
			},
			getActiveToken: () => "session-token",
		},
		openMarimo: async () => {},
		app: {
			workspace: {
				openLinkText: async () => {},
			},
		},
	} as unknown as MarimoBridgePlugin;
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			require: () => ({
				shell: {
					openExternal: async () => {},
				},
			}),
			setTimeout: () => 0,
			clearTimeout: () => {},
		},
	});
	const root = new FakeElement();
	let child:
		| {
				onload(): void;
				onunload(): void;
		  }
		| undefined;
	const processor = createMarimoEmbedProcessor(plugin);
	await processor(
		"file: notebook.py\nmode: run",
		root as unknown as HTMLElement,
		{
			addChild: (value: typeof child) => {
				child = value;
			},
		} as never
	);
	assert.ok(child);
	child.onload();
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
	assert.ok(resolveRun);

	child.onunload();
	assert.equal(releaseCount, 0);
	resolveRun("http://127.0.0.1:2719/");
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});

	assert.equal(releaseCount, 1);
	assert.equal(root.appended, 0);
});
