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
