import assert from "node:assert/strict";
import test from "node:test";
import type MarimoBridgePlugin from "../src/main";
import { createMarimoWebview } from "../src/editor-view";

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
