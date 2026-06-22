import assert from "node:assert/strict";
import test from "node:test";
import type MarimoBridgePlugin from "../src/main";
import { createMarimoEmbedProcessor } from "../src/embed-processor";

class FakeWebview extends EventTarget {
	private attributes = new Map<string, string>();
	isConnected = false;
	style = {
		values: new Map<string, string>(),
		setProperty(name: string, value: string): void {
			this.values.set(name, value);
		},
	};

	addClass(_name: string): void {}

	getAttribute(name: string): string | null {
		return this.attributes.get(name) ?? null;
	}

	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value);
	}

	removeAttribute(name: string): void {
		this.attributes.delete(name);
	}

	reload(): void {}

	executeJavaScript(_script: string): void {}
}

interface FakeElementOptions {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string>;
}

class FakeElement {
	children: FakeElement[] = [];
	classNames: string[];
	text: string;
	removed = false;
	webviews: FakeWebview[];
	style = {
		values: new Map<string, string>(),
		setProperty(name: string, value: string): void {
			this.values.set(name, value);
		},
	};
	ownerDocument = {
		createElement: () => {
			const webview = new FakeWebview();
			this.webviews.push(webview);
			return webview;
		},
	};
	appended = 0;

	constructor(
		options: FakeElementOptions = {},
		webviews: FakeWebview[] = []
	) {
		this.classNames = Array.isArray(options.cls)
			? [...options.cls]
			: options.cls
				? [options.cls]
				: [];
		this.text = options.text ?? "";
		this.webviews = webviews;
	}

	createDiv(options: FakeElementOptions = {}): FakeElement {
		const child = new FakeElement(options, this.webviews);
		this.children.push(child);
		return child;
	}

	createEl(_tag: string, options: FakeElementOptions = {}): FakeElement {
		const child = new FakeElement(options, this.webviews);
		this.children.push(child);
		return child;
	}

	createSpan(options: FakeElementOptions = {}): FakeElement {
		return this.createEl("span", options);
	}

	setText(text: string): void {
		this.text = text;
	}

	remove(): void {
		this.removed = true;
	}

	empty(): void {
		for (const child of this.children) child.remove();
		for (const webview of this.webviews) webview.isConnected = false;
	}

	appendChild(child: FakeWebview): FakeWebview {
		this.appended++;
		child.isConnected = true;
		return child;
	}
}

test("transitions an edit embed from server startup to page loading", async () => {
	const plugin = {
		settings: {
			defaultEmbedMode: "edit",
			defaultEmbedHeight: 600,
		},
		servers: {
			ensureEditServer: async () => true,
			editFileUrl: () => "http://127.0.0.1:2718/",
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
	let child: { onload(): void } | undefined;
	const processor = createMarimoEmbedProcessor(plugin);
	await processor(
		"file: notebook.py\nmode: edit\nheight: 600",
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

	const wrapper = root.children[0];
	assert.ok(wrapper);
	const starting = wrapper.children[0];
	assert.ok(starting);
	assert.equal(starting.text, "Starting marimo…");
	assert.equal(starting.removed, true);
	const loading = wrapper.children.find(
		(element) => element.text === "Loading marimo…"
	);
	assert.ok(loading);
	const webview = root.webviews[0];
	assert.ok(webview);
	assert.equal(webview.style.values.get("height"), "600px");
});

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

test("releases an acquired run-server lease exactly once", async () => {
	let releaseCount = 0;
	const plugin = {
		settings: {
			defaultEmbedMode: "run",
			defaultEmbedHeight: 600,
		},
		servers: {
			ensureEditServer: async () => true,
			ensureRunServer: async () => "http://127.0.0.1:2719/",
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
	let child: { onload(): void; onunload(): void } | undefined;
	const processor = createMarimoEmbedProcessor(plugin);
	await processor(
		"file: notebook.py\nmode: run",
		new FakeElement() as unknown as HTMLElement,
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
	child.onunload();
	child.onunload();
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});

	assert.equal(releaseCount, 1);
});

test("does not release a run-server lease for edit-mode embeds", async () => {
	let releaseCount = 0;
	const plugin = {
		settings: {
			defaultEmbedMode: "edit",
			defaultEmbedHeight: 600,
		},
		servers: {
			ensureEditServer: async () => true,
			ensureRunServer: async () => "http://127.0.0.1:2719/",
			releaseRunServer: async () => {
				releaseCount++;
			},
			editFileUrl: () => "http://127.0.0.1:2718/",
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
	let child: { onload(): void; onunload(): void } | undefined;
	const processor = createMarimoEmbedProcessor(plugin);
	await processor(
		"file: notebook.py\nmode: edit",
		new FakeElement() as unknown as HTMLElement,
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
	child.onunload();

	assert.equal(releaseCount, 0);
});
