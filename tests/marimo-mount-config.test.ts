import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";
import { extractMountConfig } from "../src/marimo-mount-config";
import { hasMarkdownOutput } from "../src/html-to-markdown";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

function fixture(name: string): string {
	return readFileSync(path.join(fixtures, name), "utf8");
}

test("extracts notebook and session cells from exported HTML", () => {
	const config = extractMountConfig(fixture("export-basic-code.html"));
	assert.ok(config, "config should parse");
	assert.equal(config.notebook.cells.length, config.session.cells.length);
	// The import cell carries code; the second cell is a markdown cell.
	assert.ok(config.notebook.cells.some((c) => c.code.length > 0));
	const markdownOutput = config.session.cells.some((c) =>
		hasMarkdownOutput(c.outputs)
	);
	assert.ok(markdownOutput, "a cell should expose text/markdown output");
});

test("outputs-only export has empty code but keeps outputs", () => {
	const config = extractMountConfig(fixture("export-basic.html"));
	assert.ok(config);
	assert.ok(config.notebook.cells.every((c) => c.code.length === 0));
	assert.ok(config.session.cells.some((c) => (c.outputs ?? []).length > 0));
});

test("normalizes trailing commas in the JS object literal", () => {
	const html =
		'<script>Object.defineProperty(window, "__MARIMO_MOUNT_CONFIG__", { value: Object.freeze(' +
		'{"notebook": {"cells": [{"code": "x",},],}, "session": {"cells": [{"outputs": [],},],},})' +
		"});</script>";
	const config = extractMountConfig(html);
	assert.ok(config, "trailing-comma literal should parse");
	assert.equal(config.notebook.cells[0]?.code, "x");
});

test("ignores braces inside string values", () => {
	const html =
		'window.__MARIMO_MOUNT_CONFIG__ = Object.freeze({"notebook": {"cells": [{"code": "if (a) { b }"}]}, ' +
		'"session": {"cells": [{"outputs": []}]}})';
	const config = extractMountConfig(html);
	assert.ok(config);
	assert.equal(config.notebook.cells[0]?.code, "if (a) { b }");
});

test("returns null when the marker is missing", () => {
	assert.equal(extractMountConfig("<html><body>no config</body></html>"), null);
});

test("returns null for a truncated/unbalanced object", () => {
	const html = 'Object.freeze({"notebook": {"cells": [';
	assert.equal(extractMountConfig(html), null);
});
