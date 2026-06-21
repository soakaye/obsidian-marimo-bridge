import assert from "node:assert/strict";
import test from "node:test";
import MarimoBridgePlugin from "../src/main";

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
});
