import assert from "node:assert/strict";
import test from "node:test";
import MarimoBridgePlugin from "../src/main";
import {
	getNoticeMessages,
	resetNoticeMessages,
} from "./stubs/obsidian";

interface NotebookCreationInternals {
	app: {
		vault: {
			getAbstractFileByPath(path: string): object | null;
			create(path: string, contents: string): Promise<void>;
		};
	};
	createUntitledNotebook(folder: string): Promise<string | null>;
}

test("stops notebook creation after 1000 naming collisions", async () => {
	resetNoticeMessages();
	let lookups = 0;
	let createCount = 0;
	const plugin = Object.create(
		MarimoBridgePlugin.prototype
	) as NotebookCreationInternals;
	plugin.app = {
		vault: {
			getAbstractFileByPath: () => {
				lookups++;
				if (lookups > 1000) {
					throw new Error("naming search exceeded the required limit");
				}
				return {};
			},
			create: async () => {
				createCount++;
			},
		},
	};

	let result: string | null | undefined;
	let error: unknown;
	try {
		result = await plugin.createUntitledNotebook("folder");
	} catch (caught) {
		error = caught;
	}

	assert.equal(error, undefined);
	assert.equal(result, null);
	assert.equal(lookups, 1000);
	assert.equal(createCount, 0);
	assert.equal(getNoticeMessages().length, 1);
});

test("creates the first available generated notebook without overwriting", async () => {
	resetNoticeMessages();
	const occupied = new Set([
		"folder/untitled_marimo.py",
		"folder/untitled_marimo_1.py",
	]);
	const created: { path: string; contents: string }[] = [];
	const plugin = Object.create(
		MarimoBridgePlugin.prototype
	) as NotebookCreationInternals;
	plugin.app = {
		vault: {
			getAbstractFileByPath: (path) =>
				occupied.has(path) ? {} : null,
			create: async (path, contents) => {
				created.push({ path, contents });
			},
		},
	};

	const result = await plugin.createUntitledNotebook("folder");

	assert.equal(result, "folder/untitled_marimo_2.py");
	assert.equal(created.length, 1);
	assert.equal(created[0]?.path, result);
	assert.equal(getNoticeMessages().length, 0);
});
