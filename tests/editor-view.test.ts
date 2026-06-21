import assert from "node:assert/strict";
import test from "node:test";
import type MarimoBridgePlugin from "../src/main";
import { createMarimoWebview } from "../src/editor-view";

class FakeWebview extends EventTarget {
	private attributes = new Map<string, string>();
	isConnected = false;
	reloadCount = 0;
	executedScripts: string[] = [];
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

	reload(): void {
		this.reloadCount++;
	}

	executeJavaScript(script: string): void {
		this.executedScripts.push(script);
	}

	remove(): void {
		this.isConnected = false;
	}
}

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
		createDiv: (options: { text?: string }) => {
			if (options.text) messages.push(options.text);
			return {};
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
		createDiv: () => ({}),
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
		createDiv: (options: { text?: string }) => {
			if (options.text) messages.push(options.text);
			return {};
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
	assert.deepEqual(messages, []);
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
		createDiv: () => ({}),
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
		createDiv: () => ({}),
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
		createDiv: () => ({}),
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
