import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";

interface PluginManifest {
	description: string;
	authorUrl: string;
	isDesktopOnly: boolean;
	minAppVersion: string;
}

const ROOT = process.cwd();
const AFFECTED_SOURCE_FILES = [
	"src/editor-view.ts",
	"src/main.ts",
	"src/server-manager.ts",
];

function readProjectFile(file: string): string {
	return readFileSync(path.join(ROOT, file), "utf8");
}

test("uses review-compliant manifest metadata", () => {
	const manifest = JSON.parse(
		readProjectFile("manifest.json")
	) as PluginManifest;

	assert.doesNotMatch(manifest.description, /\bObsidian\b/);
	assert.equal(manifest.authorUrl, "https://github.com/soakaye");
	assert.equal(manifest.isDesktopOnly, true);
	// Bumped to 1.5.7 for FileManager.getAvailablePathForAttachment, used by the
	// notebook-to-Markdown export to place image attachments per vault settings.
	assert.equal(manifest.minAppVersion, "1.5.7");
});

test("contains no next-line lint suppressions in affected production files", () => {
	for (const file of AFFECTED_SOURCE_FILES) {
		assert.doesNotMatch(
			readProjectFile(file),
			/eslint-disable-next-line/,
			file
		);
	}
});

test("keeps plugin-created vault content on the vault API", () => {
	assert.match(
		readProjectFile("src/main.ts"),
		/this\.app\.vault\.create\(/
	);
});
