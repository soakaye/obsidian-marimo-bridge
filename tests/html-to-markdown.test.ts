import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";
import {
	htmlToMarkdown,
	hasMarkdownOutput,
	renderOutput,
	type ImageSink,
} from "../src/html-to-markdown";
import { extractMountConfig } from "../src/marimo-mount-config";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

function fixture(name: string): string {
	return readFileSync(path.join(fixtures, name), "utf8");
}

class FakeSink implements ImageSink {
	readonly uris: string[] = [];
	addDataUri(value: string): string {
		this.uris.push(value);
		return `__IMG_${(this.uris.length - 1).toString()}__`;
	}
}

test("converts headings, bold and lists", () => {
	const html =
		'<span class="markdown"><h1 id="hello">Hello</h1>\n' +
		'<span class="paragraph">This is <strong>bold</strong>:</span>\n' +
		"<ul>\n<li>one</li>\n<li>two</li>\n</ul></span>";
	const md = htmlToMarkdown(html, new FakeSink());
	assert.match(md, /^# Hello/m);
	assert.match(md, /This is \*\*bold\*\*:/);
	assert.match(md, /- one/);
	assert.match(md, /- two/);
});

test("converts an ordered list with numeric markers", () => {
	const md = htmlToMarkdown("<ol><li>a</li><li>b</li></ol>", new FakeSink());
	assert.match(md, /1\. a/);
	assert.match(md, /2\. b/);
});

test("converts a table", () => {
	const html =
		"<table><tr><th>h1</th><th>h2</th></tr><tr><td>a</td><td>b</td></tr></table>";
	const md = htmlToMarkdown(html, new FakeSink());
	assert.match(md, /\| h1 \| h2 \|/);
	assert.match(md, /\| --- \| --- \|/);
	assert.match(md, /\| a \| b \|/);
});

test("renders a marimo-table (DataFrame) from its data-data attribute", () => {
	// data-data is HTML-entity-encoded, double-JSON-encoded row records.
	const rows = JSON.stringify([
		{ Name: "a", Value: 1 },
		{ Name: "b", Value: 2 },
	]);
	const encoded = JSON.stringify(rows)
		.split("\\")
		.join("&#92;")
		.split('"')
		.join("&quot;");
	const html =
		"<marimo-ui-element object-id='t-0'>" +
		`<marimo-table data-label='null' data-data='${encoded}'></marimo-table>` +
		"</marimo-ui-element>";
	const out = renderOutput({ data: { "text/html": html } }, new FakeSink());
	assert.ok(out, "a displayed DataFrame must not be dropped as a widget");
	assert.match(out, /\| Name \| Value \|/);
	assert.match(out, /\| --- \| --- \|/);
	assert.match(out, /\| a \| 1 \|/);
	assert.match(out, /\| b \| 2 \|/);
	assert.doesNotMatch(out, /<marimo-/);
});

test("routes data-URI images to the sink and keeps external images as links", () => {
	const sink = new FakeSink();
	const md = htmlToMarkdown(
		"<img src=\"data:image/png;base64,AAAA\" /><img src='https://example.com/x.png' alt='ext' />",
		sink
	);
	assert.equal(sink.uris.length, 1);
	assert.match(md, /__IMG_0__/);
	assert.match(md, /!\[ext\]\(https:\/\/example\.com\/x\.png\)/);
});

test("converts marimo-tex inline LaTeX to Obsidian math", () => {
	const md = htmlToMarkdown(
		'<span class="paragraph"><marimo-tex class="arithmatex">||(e^1 = 2.718||)</marimo-tex></span>',
		new FakeSink()
	);
	assert.match(md, /\$e\^1 = 2\.718\$/);
	assert.doesNotMatch(md, /marimo-tex/);
});

test("converts marimo-tex block LaTeX to a math block", () => {
	const md = htmlToMarkdown(
		'<marimo-tex class="arithmatex">||[x = 1||]</marimo-tex>',
		new FakeSink()
	);
	assert.match(md, /\$\$x = 1\$\$/);
});

test("renderOutput keeps a math (marimo-tex) markdown output", () => {
	const sink = new FakeSink();
	const out = renderOutput(
		{
			data: {
				"text/markdown":
					'<span class="markdown"><span class="paragraph"><marimo-tex class="arithmatex">||(e^1 = 2.718||)</marimo-tex></span></span>',
			},
		},
		sink
	);
	assert.ok(out, "math output must not be dropped as a widget");
	assert.match(out, /\$e\^1 = 2\.718\$/);
});

test("renderOutput converts markdown output and ignores widgets", () => {
	const config = extractMountConfig(fixture("export-widget.html"));
	assert.ok(config);
	const sink = new FakeSink();
	const rendered = config.session.cells.map((c) =>
		(c.outputs ?? []).map((o) => renderOutput(o, sink))
	);
	const flat = rendered.flat();
	// The slider widget output must be ignored (null) and never leak markup.
	const joined = flat.filter((x): x is string => x !== null).join("\n");
	assert.doesNotMatch(joined, /<marimo-/);
	assert.match(joined, /value is 1/);
});

test("hasMarkdownOutput detects text/markdown payloads", () => {
	assert.equal(
		hasMarkdownOutput([{ data: { "text/markdown": "<p>x</p>" } }]),
		true
	);
	assert.equal(hasMarkdownOutput([{ data: { "text/html": "<p>x</p>" } }]), false);
	assert.equal(hasMarkdownOutput(undefined), false);
});

test("renderOutput extracts image/png from a marimo mimebundle", () => {
	const sink = new FakeSink();
	const out = renderOutput(
		{
			data: {
				"application/vnd.marimo+mimebundle": JSON.stringify({
					"image/png": "data:image/png;base64,AAAA",
				}),
			},
		},
		sink
	);
	assert.equal(sink.uris.length, 1);
	assert.equal(out, "__IMG_0__");
});

test("renderOutput returns null for empty text and unsupported payloads", () => {
	const sink = new FakeSink();
	assert.equal(renderOutput({ data: { "text/plain": "" } }, sink), null);
	assert.equal(
		renderOutput({ data: { "application/x-unknown": "?" } }, sink),
		null
	);
});
