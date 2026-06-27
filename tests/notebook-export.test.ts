import assert from "node:assert/strict";
import {
	copyFileSync,
	existsSync,
	mkdtempSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import { FileSystemAdapter, TFile } from "obsidian";
import { getNoticeMessages, resetNoticeMessages } from "./stubs/obsidian";
import { exportNotebookToMarkdown } from "../src/notebook-export";
import type MarimoBridgePlugin from "../src/main";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

interface Harness {
	plugin: MarimoBridgePlugin;
	created: Map<string, string>;
	binaries: Map<string, ArrayBuffer>;
	attachmentCalls: { name: string; source: string }[];
	opened: string[];
	lastOutHtml: string | null;
}

function makeHarness(options: {
	fixture: string | null;
	exitCode?: number;
	existing?: string[];
}): Harness {
	const vaultDir = mkdtempSync(path.join(tmpdir(), "marimo-export-vault-"));
	writeFileSync(path.join(vaultDir, "nb.py"), "import marimo\n");

	const adapter = new FileSystemAdapter();
	adapter.getBasePath = () => vaultDir;

	const created = new Map<string, string>();
	const binaries = new Map<string, ArrayBuffer>();
	const attachmentCalls: { name: string; source: string }[] = [];
	const opened: string[] = [];
	const existing = new Set(options.existing ?? []);
	const harness: Harness = {
		created,
		binaries,
		attachmentCalls,
		opened,
		lastOutHtml: null,
		plugin: null as unknown as MarimoBridgePlugin,
	};

	const vault = {
		adapter,
		getAbstractFileByPath(p: string): unknown {
			return existing.has(p) || created.has(p) ? { path: p } : null;
		},
		async create(p: string, data: string): Promise<TFile> {
			created.set(p, data);
			const f = new TFile();
			f.path = p;
			return f;
		},
		async createBinary(p: string, data: ArrayBuffer): Promise<TFile> {
			binaries.set(p, data);
			const f = new TFile();
			f.path = p;
			return f;
		},
	};

	const fileManager = {
		async getAvailablePathForAttachment(
			name: string,
			source: string
		): Promise<string> {
			attachmentCalls.push({ name, source });
			return `attachments/${name}`;
		},
		generateMarkdownLink(file: TFile, _source: string): string {
			return `[[${file.path}]]`;
		},
	};

	const workspace = {
		getLeaf(_newLeaf: boolean) {
			return {
				async openFile(file: TFile): Promise<void> {
					opened.push(file.path);
				},
			};
		},
	};

	const servers = {
		async exportNotebookHtml(
			_abs: string,
			_includeCode: boolean,
			outHtml: string
		): Promise<{ code: number; stdout: string; stderr: string }> {
			harness.lastOutHtml = outHtml;
			if (options.fixture && (options.exitCode ?? 0) === 0) {
				copyFileSync(path.join(fixtures, options.fixture), outHtml);
			}
			return { code: options.exitCode ?? 0, stdout: "", stderr: "boom" };
		},
	};

	harness.plugin = {
		app: { vault, fileManager, workspace },
		servers,
	} as unknown as MarimoBridgePlugin;

	return harness;
}

test("with-code export fences code cells but renders markdown cells natively", async () => {
	resetNoticeMessages();
	const h = makeHarness({ fixture: "export-basic-code.html" });
	await exportNotebookToMarkdown(h.plugin, "nb.py", true);

	const md = h.created.get("nb.md");
	assert.ok(md, "nb.md should be created");
	assert.match(md, /```python/);
	assert.match(md, /import marimo as mo/);
	assert.match(md, /# Hello/);
	// The markdown cell's source must NOT appear as code.
	assert.doesNotMatch(md, /mo\.md\(/);
	assert.doesNotMatch(md, /<marimo-/);
	assert.ok(h.opened.includes("nb.md"));
});

test("outputs-only export omits code fences and widget markup", async () => {
	resetNoticeMessages();
	const h = makeHarness({ fixture: "export-widget.html" });
	await exportNotebookToMarkdown(h.plugin, "nb.py", false);

	const md = h.created.get("nb.md");
	assert.ok(md);
	assert.doesNotMatch(md, /```python/);
	assert.doesNotMatch(md, /<marimo-/);
	assert.match(md, /value is 1/);
});

test("images are saved as attachments with the markdown path as source", async () => {
	resetNoticeMessages();
	const h = makeHarness({ fixture: "export-image.html" });
	await exportNotebookToMarkdown(h.plugin, "nb.py", false);

	const md = h.created.get("nb.md");
	assert.ok(md);
	assert.ok(h.attachmentCalls.length > 0, "an attachment should be requested");
	for (const call of h.attachmentCalls) {
		assert.equal(call.source, "nb.md");
	}
	assert.equal(h.binaries.size, h.attachmentCalls.length);
	assert.match(md, /!\[\[attachments\/nb-0\.png\]\]/);
	// External image URL stays an inline link, not downloaded.
	assert.match(md, /https:\/\/example\.com\/x\.png/);
});

test("never overwrites an existing note (uses a non-colliding name)", async () => {
	resetNoticeMessages();
	const h = makeHarness({
		fixture: "export-basic.html",
		existing: ["nb.md"],
	});
	await exportNotebookToMarkdown(h.plugin, "nb.py", false);

	assert.equal(h.created.has("nb.md"), false);
	assert.ok(h.created.has("nb-1.md"));
});

test("failed export writes no note and cleans up the temp file", async () => {
	resetNoticeMessages();
	const h = makeHarness({ fixture: null, exitCode: 1 });
	await exportNotebookToMarkdown(h.plugin, "nb.py", true);

	assert.equal(h.created.size, 0, "no markdown on failure");
	assert.ok(h.lastOutHtml);
	assert.equal(existsSync(h.lastOutHtml), false, "temp html removed");
	assert.ok(
		getNoticeMessages().some((m) => m.includes("failed")),
		"a failure notice is shown"
	);
});

test("successful export removes the temporary html", async () => {
	resetNoticeMessages();
	const h = makeHarness({ fixture: "export-basic.html" });
	await exportNotebookToMarkdown(h.plugin, "nb.py", false);

	assert.ok(h.lastOutHtml);
	assert.equal(existsSync(h.lastOutHtml), false, "temp html removed");
});
