import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import type MarimoBridgePlugin from "../src/main";
import { createMarimoWebview } from "../src/editor-view";
import { INJECTION_SCRIPT } from "../src/constants";

const FORMER_OPEN_SENTINEL = "[MarimoBridge-Open] ";

interface Deferred<T> {
	promise: Promise<T>;
	resolve(value: T): void;
	reject(reason?: unknown): void;
}

function deferred<T>(): Deferred<T> {
	let resolvePromise!: (value: T) => void;
	let rejectPromise!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolve, reject) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	});
	return {
		promise,
		resolve: resolvePromise,
		reject: rejectPromise,
	};
}

async function flushAsync(): Promise<void> {
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
}

class FakeWebview extends EventTarget {
	private attributes = new Map<string, string>();
	private idleExecution = deferred<unknown>();
	executeJavaScriptImpl: (script: string) => Promise<unknown> =
		(script) =>
			script === INJECTION_SCRIPT
				? Promise.resolve(true)
				: this.idleExecution.promise;
	isConnected = false;
	reloadCount = 0;
	executedScripts: string[] = [];
	classNames: string[] = [];
	style = {
		values: new Map<string, string>(),
		setProperty(name: string, value: string): void {
			this.values.set(name, value);
		},
	};

	addClass(name: string): void {
		this.classNames.push(name);
	}

	getAttribute(name: string): string | null {
		return this.attributes.get(name) ?? null;
	}

	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value);
	}

	removeAttribute(name: string): void {
		this.attributes.delete(name);
	}

	reload(): void {
		this.reloadCount++;
	}

	executeJavaScript(script: string): Promise<unknown> {
		this.executedScripts.push(script);
		return this.executeJavaScriptImpl(script);
	}

	remove(): void {
		this.isConnected = false;
	}
}

interface FakeElementOptions {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string>;
}

class FakeStatusElement {
	attributes = new Map<string, string>();
	children: FakeStatusElement[] = [];
	classNames: string[];
	text: string;
	removed = false;

	constructor(options: FakeElementOptions = {}) {
		this.classNames = Array.isArray(options.cls)
			? [...options.cls]
			: options.cls
				? [options.cls]
				: [];
		this.text = options.text ?? "";
		for (const [name, value] of Object.entries(options.attr ?? {})) {
			this.attributes.set(name, value);
		}
	}

	createSpan(options: FakeElementOptions = {}): FakeStatusElement {
		const child = new FakeStatusElement(options);
		this.children.push(child);
		return child;
	}

	remove(): void {
		this.removed = true;
	}
}

interface WebviewHarness {
	webview: FakeWebview;
	openedMarimo: string[];
	openedWorkspace: string[];
	openedExternal: string[];
	parent: HTMLElement;
	statuses: FakeStatusElement[];
	appendOrder: string[];
	plugin: MarimoBridgePlugin;
}

interface GuestBridge {
	nextMessage(): Promise<unknown>;
}

interface GuestWindow {
	__marimoBridge?: GuestBridge;
	addEventListener(): void;
	location: { href: string };
	open(url?: string | URL, target?: string): unknown;
}

function evaluateGuestBridge(): { bridge: GuestBridge; window: GuestWindow } {
	const guestWindow: GuestWindow = {
		addEventListener: () => {},
		location: { href: "http://127.0.0.1:2718/" },
		open: () => null,
	};
	runInNewContext(INJECTION_SCRIPT, {
		document: { body: {} },
		Promise,
		URL,
		window: guestWindow,
	});
	assert.ok(guestWindow.__marimoBridge);
	return { bridge: guestWindow.__marimoBridge, window: guestWindow };
}

function createWebviewHarness(timers?: (() => void)[]): WebviewHarness {
	const webview = new FakeWebview();
	const openedMarimo: string[] = [];
	const openedWorkspace: string[] = [];
	const openedExternal: string[] = [];
	const statuses: FakeStatusElement[] = [];
	const appendOrder: string[] = [];
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			appendOrder.push("webview");
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) => {
			appendOrder.push("status");
			const status = new FakeStatusElement(options);
			statuses.push(status);
			return status;
		},
	} as unknown as HTMLElement;
	const plugin = {
		servers: {
			getActiveToken: () => "session-token",
		},
		openMarimo: async (file: string) => {
			openedMarimo.push(file);
		},
		app: {
			workspace: {
				openLinkText: async (file: string) => {
					openedWorkspace.push(file);
				},
			},
		},
	} as unknown as MarimoBridgePlugin;
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			require: () => ({
				shell: {
					openExternal: async (url: string) => {
						openedExternal.push(url);
					},
				},
			}),
			setTimeout: (callback: () => void) => {
				if (!timers) return 0;
				timers.push(callback);
				return timers.length;
			},
			clearTimeout: () => {},
		},
	});
	return {
		webview,
		openedMarimo,
		openedWorkspace,
		openedExternal,
		parent,
		statuses,
		appendOrder,
		plugin,
	};
}

function configureBridgeMessages(
	webview: FakeWebview,
	messages: unknown[]
): Deferred<unknown> {
	const idle = deferred<unknown>();
	let invocation = 0;
	webview.executeJavaScriptImpl = () => {
		invocation++;
		if (invocation === 1) return Promise.resolve(true);
		const next = messages.shift();
		return next === undefined ? idle.promise : Promise.resolve(next);
	};
	return idle;
}

function dispatchNavigationStart(
	webview: FakeWebview,
	options: { isMainFrame: boolean; isInPlace: boolean }
): void {
	const event = new Event("did-start-navigation");
	Object.defineProperties(event, {
		isMainFrame: { value: options.isMainFrame },
		isInPlace: { value: options.isInPlace },
	});
	webview.dispatchEvent(event);
}

test("shows an accessible loading status until the initial webview is ready", () => {
	const harness = createWebviewHarness();

	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);

	assert.deepEqual(harness.appendOrder.slice(0, 2), ["status", "webview"]);
	assert.equal(harness.statuses.length, 1);
	const status = harness.statuses[0];
	assert.ok(status);
	assert.equal(status.text, "Loading marimo…");
	assert.ok(status.classNames.includes("marimo-bridge-loading-overlay"));
	assert.equal(status.attributes.get("role"), "status");
	assert.equal(status.attributes.get("aria-live"), "polite");
	assert.equal(status.children.length, 1);
	const spinner = status.children[0];
	assert.ok(spinner);
	assert.ok(spinner.classNames.includes("marimo-bridge-loading-spinner"));
	assert.equal(spinner.attributes.get("aria-hidden"), "true");
	assert.equal(harness.webview.getAttribute("inert"), "");

	harness.webview.dispatchEvent(new Event("dom-ready"));

	assert.equal(status.removed, true);
	assert.equal(harness.webview.getAttribute("inert"), null);

	harness.webview.dispatchEvent(new Event("dom-ready"));
	assert.equal(status.removed, true);
});

test("shows loading again only for replacement main-frame navigation", () => {
	const harness = createWebviewHarness();

	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	harness.webview.dispatchEvent(new Event("dom-ready"));
	const initialStatus = harness.statuses[0];
	assert.ok(initialStatus);
	assert.equal(initialStatus.removed, true);

	dispatchNavigationStart(harness.webview, {
		isMainFrame: false,
		isInPlace: false,
	});
	dispatchNavigationStart(harness.webview, {
		isMainFrame: true,
		isInPlace: true,
	});
	assert.equal(harness.statuses.length, 1);
	assert.equal(harness.webview.getAttribute("inert"), null);

	dispatchNavigationStart(harness.webview, {
		isMainFrame: true,
		isInPlace: false,
	});

	assert.equal(harness.statuses.length, 2);
	const replacementStatus = harness.statuses[1];
	assert.ok(replacementStatus);
	assert.equal(replacementStatus.attributes.get("role"), "status");
	assert.equal(replacementStatus.attributes.get("aria-live"), "polite");
	assert.equal(replacementStatus.removed, false);
	assert.equal(harness.webview.getAttribute("inert"), "");

	dispatchNavigationStart(harness.webview, {
		isMainFrame: true,
		isInPlace: false,
	});
	assert.equal(harness.statuses.length, 2);

	harness.webview.dispatchEvent(new Event("dom-ready"));
	assert.equal(replacementStatus.removed, true);
	assert.equal(harness.webview.getAttribute("inert"), null);
});

test("keeps one loading status through retries and replaces it on failure", () => {
	const timers: (() => void)[] = [];
	const harness = createWebviewHarness(timers);

	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	const loading = harness.statuses[0];
	assert.ok(loading);

	for (let attempt = 0; attempt < 3; attempt++) {
		const callback = timers.shift();
		assert.ok(callback);
		callback();
		dispatchNavigationStart(harness.webview, {
			isMainFrame: true,
			isInPlace: false,
		});
		assert.equal(harness.statuses.length, 1);
		assert.equal(loading.removed, false);
	}

	const finalCallback = timers.shift();
	assert.ok(finalCallback);
	finalCallback();

	assert.equal(harness.webview.reloadCount, 3);
	assert.equal(harness.statuses.length, 2);
	assert.equal(loading.removed, true);
	const failure = harness.statuses[1];
	assert.ok(failure);
	assert.equal(
		failure.text,
		"marimo server is not available. Check the marimo path in settings, then reopen."
	);
});

test("does not replace loading with failure after detachment at the retry cap", () => {
	const timers: (() => void)[] = [];
	const harness = createWebviewHarness(timers);

	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	for (let attempt = 0; attempt < 3; attempt++) {
		const callback = timers.shift();
		assert.ok(callback);
		callback();
	}
	harness.webview.remove();

	const finalCallback = timers.shift();
	assert.ok(finalCallback);
	finalCallback();

	assert.equal(harness.statuses.length, 1);
	assert.equal(harness.webview.reloadCount, 3);
});

test("opens a local notebook whose decoded path contains a percent sign", async () => {
	const webview = new FakeWebview();
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) =>
			new FakeStatusElement(options),
	};
	const opened: string[] = [];
	const plugin = {
		servers: {
			getActiveToken: () => "session-token",
		},
		openMarimo: async (file: string) => {
			opened.push(file);
		},
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

	createMarimoWebview(
		plugin,
		parent as unknown as HTMLElement,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	const event = new Event("new-window", { cancelable: true });
	Object.defineProperties(event, {
		url: {
			value: "http://127.0.0.1:2718/?file=percent%25.py",
		},
		disposition: {
			value: "foreground-tab",
		},
	});

	webview.dispatchEvent(event);
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});

	assert.deepEqual(opened, ["percent%.py"]);
});

test("shows an explanatory failure after capped webview reloads", () => {
	const webview = new FakeWebview();
	const timers: (() => void)[] = [];
	const messages: string[] = [];
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) => {
			if (options.text) messages.push(options.text);
			return new FakeStatusElement(options);
		},
	};
	const plugin = {
		servers: {
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
			setTimeout: (callback: () => void) => {
				timers.push(callback);
				return timers.length;
			},
			clearTimeout: () => {},
		},
	});

	createMarimoWebview(
		plugin,
		parent as unknown as HTMLElement,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	for (let attempt = 0; attempt < 4; attempt++) {
		const callback = timers.shift();
		assert.ok(callback);
		callback();
	}

	assert.equal(webview.reloadCount, 3);
	assert.deepEqual(messages, [
		"Loading marimo…",
		"marimo server is not available. Check the marimo path in settings, then reopen.",
	]);
	assert.equal(webview.isConnected, false);
});

test("cancels recovery after the webview becomes ready", () => {
	const webview = new FakeWebview();
	const timers: (() => void)[] = [];
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) =>
			new FakeStatusElement(options),
	};
	const plugin = {
		servers: {
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
			setTimeout: (callback: () => void) => {
				timers.push(callback);
				return timers.length;
			},
			clearTimeout: () => {},
		},
	});

	createMarimoWebview(
		plugin,
		parent as unknown as HTMLElement,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	webview.dispatchEvent(new Event("dom-ready"));
	const callback = timers.shift();
	assert.ok(callback);
	callback();

	assert.equal(webview.reloadCount, 0);
});

test("does not recover a detached webview", () => {
	const webview = new FakeWebview();
	const timers: (() => void)[] = [];
	const messages: string[] = [];
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) => {
			if (options.text) messages.push(options.text);
			return new FakeStatusElement(options);
		},
	};
	const plugin = {
		servers: {
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
			setTimeout: (callback: () => void) => {
				timers.push(callback);
				return timers.length;
			},
			clearTimeout: () => {},
		},
	});

	createMarimoWebview(
		plugin,
		parent as unknown as HTMLElement,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	webview.remove();
	const callback = timers.shift();
	assert.ok(callback);
	callback();

	assert.equal(webview.reloadCount, 0);
	assert.deepEqual(messages, ["Loading marimo…"]);
});

test("retries an explicit main-frame load failure", () => {
	const webview = new FakeWebview();
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) =>
			new FakeStatusElement(options),
	};
	const plugin = {
		servers: {
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

	createMarimoWebview(
		plugin,
		parent as unknown as HTMLElement,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	const event = new Event("did-fail-load");
	Object.defineProperties(event, {
		errorCode: { value: -2 },
		isMainFrame: { value: true },
	});
	webview.dispatchEvent(event);

	assert.equal(webview.reloadCount, 1);
});

test("injects the interception script when the webview becomes ready", () => {
	const webview = new FakeWebview();
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) =>
			new FakeStatusElement(options),
	};
	const plugin = {
		servers: {
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

	createMarimoWebview(
		plugin,
		parent as unknown as HTMLElement,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	webview.dispatchEvent(new Event("dom-ready"));

	assert.equal(webview.executedScripts.length, 1);
	assert.match(webview.executedScripts[0] ?? "", /marimoBridgeInjected/);
});

test("waits for bridge installation before receiving its first message", async () => {
	const { webview, parent, plugin } = createWebviewHarness();
	const installation = deferred<unknown>();
	const idle = deferred<unknown>();
	webview.executeJavaScriptImpl = () => {
		if (webview.executedScripts.length === 1) return installation.promise;
		return idle.promise;
	};

	createMarimoWebview(
		plugin,
		parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	webview.dispatchEvent(new Event("dom-ready"));

	assert.equal(webview.executedScripts.length, 1);
	installation.resolve(true);
	await flushAsync();

	assert.equal(webview.executedScripts.length, 2);
});

test("routes structured bridge open messages through existing destinations", async () => {
	const cases = [
		{
			message: {
				type: "open",
				url: "http://127.0.0.1:2718/?file=notebook.py",
				disposition: "foreground-tab",
			},
			verify: (harness: WebviewHarness) => {
				assert.deepEqual(harness.openedMarimo, ["notebook.py"]);
			},
		},
		{
			message: {
				type: "open",
				url: "http://127.0.0.1:2718/?file=notes.md",
				disposition: "foreground-tab",
			},
			verify: (harness: WebviewHarness) => {
				assert.deepEqual(harness.openedWorkspace, ["notes.md"]);
			},
		},
		{
			message: {
				type: "open",
				url: "https://marimo.io/docs/",
				disposition: "foreground-tab",
			},
			verify: (harness: WebviewHarness) => {
				assert.deepEqual(harness.openedExternal, ["https://marimo.io/docs/"]);
			},
		},
		{
			message: {
				type: "open",
				url: "ftp://example.com/file",
				disposition: "foreground-tab",
			},
			verify: (harness: WebviewHarness) => {
				assert.deepEqual(harness.openedExternal, []);
			},
		},
		{
			message: {
				type: "open",
				url: "http://127.0.0.1:2718/",
				disposition: "foreground-tab",
			},
			verify: (harness: WebviewHarness) => {
				assert.match(
					harness.webview.getAttribute("src") ?? "",
					/access_token=session-token/
				);
			},
		},
	] as const;

	for (const current of cases) {
		const harness = createWebviewHarness();
		configureBridgeMessages(harness.webview, [current.message]);
		createMarimoWebview(
			harness.plugin,
			harness.parent,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		harness.webview.dispatchEvent(new Event("dom-ready"));
		await flushAsync();
		await flushAsync();
		current.verify(harness);
	}
});

test("uses console messages only for diagnostics", () => {
	assert.doesNotMatch(INJECTION_SCRIPT, /MarimoBridge-Open/);
	assert.doesNotMatch(INJECTION_SCRIPT, /console\.log/);

	const { webview, parent, plugin, openedMarimo } = createWebviewHarness();
	const seenDebug: string[] = [];
	const originalDebug = console.debug;
	console.debug = (message?: unknown) => {
		seenDebug.push(String(message));
	};

	try {
		createMarimoWebview(
			plugin,
			parent,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		const event = new Event("console-message");
		Object.defineProperties(event, {
			level: { value: 1 },
			message: {
				value: `${FORMER_OPEN_SENTINEL}{"url":"http://127.0.0.1:2718/?file=ignored.py"}`,
			},
			line: { value: 7 },
			sourceId: { value: "guest.js" },
		});
		webview.dispatchEvent(event);
	} finally {
		console.debug = originalDebug;
	}

	assert.equal(openedMarimo.length, 0);
	assert.match(seenDebug[0] ?? "", /MarimoBridge-Open/);
});

test("delivers pre-queued guest messages once in FIFO order", async () => {
	const { bridge, window: guestWindow } = evaluateGuestBridge();
	const expected = Array.from(
		{ length: 20 },
		(_, index) => `http://127.0.0.1:2718/?file=queued-${index.toString()}.py`
	);
	for (const url of expected) {
		guestWindow.open(url, "foreground-tab");
	}

	const received: string[] = [];
	for (const expectedUrl of expected) {
		const message = await bridge.nextMessage() as { url: string };
		assert.equal(message.url, expectedUrl);
		received.push(message.url);
	}

	assert.deepEqual(received, expected);
});

test("keeps one guest receive pending until the next message", async () => {
	const { bridge, window: guestWindow } = evaluateGuestBridge();
	let settled = false;
	const pending = bridge.nextMessage().then((message) => {
		settled = true;
		return message;
	});

	await flushAsync();
	assert.equal(settled, false);

	guestWindow.open(
		"http://127.0.0.1:2718/?file=pending.py",
		"foreground-tab"
	);
	const message = await pending as { url: string };

	assert.equal(
		message.url,
		"http://127.0.0.1:2718/?file=pending.py"
	);
});

test("does not issue another host receive while one is pending", async () => {
	const { webview, parent, plugin } = createWebviewHarness();
	const receive = deferred<unknown>();
	let invocation = 0;
	webview.executeJavaScriptImpl = () => {
		invocation++;
		return invocation === 1 ? Promise.resolve(true) : receive.promise;
	};

	createMarimoWebview(
		plugin,
		parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	webview.dispatchEvent(new Event("dom-ready"));
	await flushAsync();
	await flushAsync();

	assert.equal(webview.executedScripts.length, 2);
});

test("ignores malformed bridge values and continues to the next valid message", async () => {
	const harness = createWebviewHarness();
	configureBridgeMessages(harness.webview, [
		null,
		7,
		{ type: "unknown", url: "http://127.0.0.1:2718/?file=unknown.py" },
		{ type: "open", url: "" },
		{
			type: "open",
			url: "http://127.0.0.1:2718/?file=bad-disposition.py",
			disposition: 4,
		},
		{
			type: "open",
			url: "http://127.0.0.1:2718/?file=valid.py",
			disposition: "foreground-tab",
		},
	]);
	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	harness.webview.dispatchEvent(new Event("dom-ready"));
	await flushAsync();
	await flushAsync();

	assert.deepEqual(harness.openedMarimo, ["valid.py"]);
});

test("ignores a receive result from an invalidated main-frame generation", async () => {
	const harness = createWebviewHarness();
	const oldReceive = deferred<unknown>();
	const idle = deferred<unknown>();
	let invocation = 0;
	harness.webview.executeJavaScriptImpl = () => {
		invocation++;
		if (invocation === 1) return Promise.resolve(true);
		if (invocation === 2) return oldReceive.promise;
		return idle.promise;
	};
	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	harness.webview.dispatchEvent(new Event("dom-ready"));
	await flushAsync();

	dispatchNavigationStart(harness.webview, {
		isMainFrame: true,
		isInPlace: false,
	});
	oldReceive.resolve({
		type: "open",
		url: "http://127.0.0.1:2718/?file=stale.py",
		disposition: "foreground-tab",
	});
	await flushAsync();

	assert.deepEqual(harness.openedMarimo, []);
});

test("keeps the current receive active for subframe and in-place navigation", async () => {
	for (const options of [
		{ isMainFrame: false, isInPlace: false },
		{ isMainFrame: true, isInPlace: true },
	]) {
		const harness = createWebviewHarness();
		const receive = deferred<unknown>();
		const idle = deferred<unknown>();
		let invocation = 0;
		harness.webview.executeJavaScriptImpl = () => {
			invocation++;
			if (invocation === 1) return Promise.resolve(true);
			if (invocation === 2) return receive.promise;
			return idle.promise;
		};
		createMarimoWebview(
			harness.plugin,
			harness.parent,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		harness.webview.dispatchEvent(new Event("dom-ready"));
		await flushAsync();
		dispatchNavigationStart(harness.webview, options);
		receive.resolve({
			type: "open",
			url: "http://127.0.0.1:2718/?file=current.py",
			disposition: "foreground-tab",
		});
		await flushAsync();

		assert.deepEqual(harness.openedMarimo, ["current.py"]);
	}
});

test("starts a fresh bridge generation after top-level navigation", async () => {
	const harness = createWebviewHarness();
	const oldReceive = deferred<unknown>();
	const newReceive = deferred<unknown>();
	const idle = deferred<unknown>();
	let invocation = 0;
	harness.webview.executeJavaScriptImpl = () => {
		invocation++;
		if (invocation === 1 || invocation === 3) return Promise.resolve(true);
		if (invocation === 2) return oldReceive.promise;
		if (invocation === 4) return newReceive.promise;
		return idle.promise;
	};
	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	harness.webview.dispatchEvent(new Event("dom-ready"));
	await flushAsync();
	dispatchNavigationStart(harness.webview, {
		isMainFrame: true,
		isInPlace: false,
	});
	harness.webview.dispatchEvent(new Event("dom-ready"));
	await flushAsync();
	newReceive.resolve({
		type: "open",
		url: "http://127.0.0.1:2718/?file=fresh.py",
		disposition: "foreground-tab",
	});
	await flushAsync();

	assert.deepEqual(harness.openedMarimo, ["fresh.py"]);
});

test("ignores a late receive after the webview is detached", async () => {
	const harness = createWebviewHarness();
	const receive = deferred<unknown>();
	let invocation = 0;
	harness.webview.executeJavaScriptImpl = () => {
		invocation++;
		return invocation === 1 ? Promise.resolve(true) : receive.promise;
	};
	createMarimoWebview(
		harness.plugin,
		harness.parent,
		"http://127.0.0.1:2718/",
		"persist:test"
	);
	harness.webview.dispatchEvent(new Event("dom-ready"));
	await flushAsync();
	harness.webview.remove();
	receive.resolve({
		type: "open",
		url: "http://127.0.0.1:2718/?file=detached.py",
		disposition: "foreground-tab",
	});
	await flushAsync();

	assert.deepEqual(harness.openedMarimo, []);
});

test("stops quietly when a pending receive rejects", async () => {
	const harness = createWebviewHarness();
	const receive = deferred<unknown>();
	let invocation = 0;
	harness.webview.executeJavaScriptImpl = () => {
		invocation++;
		return invocation === 1 ? Promise.resolve(true) : receive.promise;
	};
	const seenErrors: string[] = [];
	const originalError = console.error;
	console.error = (message?: unknown) => {
		seenErrors.push(String(message));
	};
	try {
		createMarimoWebview(
			harness.plugin,
			harness.parent,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		harness.webview.dispatchEvent(new Event("dom-ready"));
		await flushAsync();
		receive.reject(new Error("execution context destroyed"));
		await flushAsync();
	} finally {
		console.error = originalError;
	}

	assert.deepEqual(seenErrors, []);
	assert.deepEqual(harness.openedMarimo, []);
});

test("reports bridge installation errors only for the current connected context", async () => {
	const current = createWebviewHarness();
	const currentInstallation = deferred<unknown>();
	current.webview.executeJavaScriptImpl = () => currentInstallation.promise;
	const detached = createWebviewHarness();
	const detachedInstallation = deferred<unknown>();
	detached.webview.executeJavaScriptImpl = () => detachedInstallation.promise;
	const seenErrors: string[] = [];
	const originalError = console.error;
	console.error = (message?: unknown) => {
		seenErrors.push(String(message));
	};
	try {
		createMarimoWebview(
			current.plugin,
			current.parent,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		current.webview.dispatchEvent(new Event("dom-ready"));
		currentInstallation.reject(new Error("install failed"));
		await flushAsync();

		createMarimoWebview(
			detached.plugin,
			detached.parent,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		detached.webview.dispatchEvent(new Event("dom-ready"));
		detached.webview.remove();
		detachedInstallation.reject(new Error("detached install failed"));
		await flushAsync();
	} finally {
		console.error = originalError;
	}

	assert.equal(seenErrors.length, 1);
	assert.match(seenErrors[0] ?? "", /inject interception script/i);
});

test("forwards webview console messages at matching severities", () => {
	const webview = new FakeWebview();
	const parent = {
		ownerDocument: {
			createElement: () => webview,
		},
		appendChild: (child: FakeWebview) => {
			child.isConnected = true;
			return child;
		},
		createDiv: (options: FakeElementOptions = {}) =>
			new FakeStatusElement(options),
	};
	const plugin = {
		servers: {
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
	const seen = {
		debug: [] as string[],
		warn: [] as string[],
		error: [] as string[],
	};
	const original = {
		debug: console.debug,
		warn: console.warn,
		error: console.error,
	};
	console.debug = (message?: unknown) => {
		seen.debug.push(String(message));
	};
	console.warn = (message?: unknown) => {
		seen.warn.push(String(message));
	};
	console.error = (message?: unknown) => {
		seen.error.push(String(message));
	};

	try {
		createMarimoWebview(
			plugin,
			parent as unknown as HTMLElement,
			"http://127.0.0.1:2718/",
			"persist:test"
		);
		for (const [level, message] of [
			[0, "debug message"],
			[1, "routine message"],
			[2, "warning message"],
			[3, "error message"],
		] as const) {
			const event = new Event("console-message");
			Object.defineProperties(event, {
				level: { value: level },
				message: { value: message },
				line: { value: 7 },
				sourceId: { value: "guest.js" },
			});
			webview.dispatchEvent(event);
		}
	} finally {
		console.debug = original.debug;
		console.warn = original.warn;
		console.error = original.error;
	}

	assert.match(seen.debug[0] ?? "", /debug message/);
	assert.match(seen.debug[1] ?? "", /routine message/);
	assert.match(seen.warn[0] ?? "", /warning message/);
	assert.match(seen.error[0] ?? "", /error message/);
});
