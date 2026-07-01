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

// --- Feature 027: conversion fidelity ---

// Mirror marimo's entity-encoded JSON attribute encoding (see marimo-table test).
function encodeAttr(value: unknown): string {
	return JSON.stringify(value).split("\\").join("&#92;").split('"').join("&quot;");
}

test("US1: converts all admonition types to Obsidian callouts", () => {
	const html =
		'<span class="markdown">' +
		'<div class="admonition note"><span class="admonition-title">Note</span><span class="paragraph">a note.</span></div>' +
		'<div class="admonition tip"><span class="admonition-title">Tip</span><span class="paragraph">a tip.</span></div>' +
		'<div class="admonition warning"><span class="admonition-title">Warning</span><span class="paragraph">a warning.</span></div>' +
		'<div class="admonition danger"><span class="admonition-title">Danger</span><span class="paragraph">a danger.</span></div>' +
		"</span>";
	const md = htmlToMarkdown(html, new FakeSink());
	assert.match(md, /^> \[!note\] Note$/m);
	assert.match(md, /^> a note\.$/m);
	assert.match(md, /> \[!tip\] Tip/);
	assert.match(md, /> \[!warning\] Warning/);
	assert.match(md, /> \[!danger\] Danger/);
	assert.doesNotMatch(md, /admonition/);
});

test("US1: converts details to a collapsed callout, preserving interpolated text", () => {
	const html =
		"<details><summary>Click to expand</summary>" +
		'<span class="paragraph">value is 42.</span></details>';
	const md = htmlToMarkdown(html, new FakeSink());
	assert.match(md, /^> \[!note\]- Click to expand$/m);
	assert.match(md, /^> value is 42\./m);
	assert.doesNotMatch(md, /<details|<summary/);
});

test("US2: converts marimo-mermaid to a mermaid fence with the diagram source", () => {
	const diagram = "graph LR\n  A[Edit] --> B[Run]";
	const html = `<marimo-mermaid data-diagram='${encodeAttr(diagram)}'></marimo-mermaid>`;
	const md = htmlToMarkdown(html, new FakeSink());
	assert.match(md, /```mermaid/);
	assert.match(md, /graph LR/);
	assert.match(md, /A\[Edit\] --> B\[Run\]/);
	assert.doesNotMatch(md, /<marimo-/);
});

test("US3: unwraps marimo-tabs into a heading + content per tab", () => {
	const labels = [
		'<span class="paragraph">Overview</span>',
		'<span class="paragraph">Details</span>',
	];
	const html =
		"<marimo-ui-element object-id='x'>" +
		`<marimo-tabs data-tabs='${encodeAttr(labels)}'>` +
		"<div data-kind='tab'><span class=\"paragraph\">First panel.</span></div>" +
		"<div data-kind='tab'><span class=\"paragraph\">Second panel.</span></div>" +
		"</marimo-tabs></marimo-ui-element>";
	const out = renderOutput({ data: { "text/html": html } }, new FakeSink());
	assert.ok(out, "tabs must not be dropped as a widget");
	assert.match(out, /^#### Overview$/m);
	assert.match(out, /First panel\./);
	assert.match(out, /^#### Details$/m);
	assert.match(out, /Second panel\./);
	assert.doesNotMatch(out, /<marimo-/);
});

test("US3: converts marimo-accordion sections to collapsed callouts", () => {
	const labels = [
		'<span class="paragraph">Section 1</span>',
		'<span class="paragraph">Section 2</span>',
	];
	const html =
		`<marimo-accordion data-labels='${encodeAttr(labels)}' data-multiple='false'>` +
		'<div><span class="paragraph">First section.</span></div>' +
		'<div><span class="paragraph">Second section.</span></div>' +
		"</marimo-accordion>";
	const out = renderOutput({ data: { "text/html": html } }, new FakeSink());
	assert.ok(out, "accordion must not be dropped");
	assert.match(out, /^> \[!note\]- Section 1$/m);
	assert.match(out, /^> First section\./m);
	assert.match(out, /^> \[!note\]- Section 2$/m);
	assert.doesNotMatch(out, /<marimo-/);
});

test("US4: preserves audio and video as HTML5 elements", () => {
	const html =
		"<audio src='https://example.com/a.ogg' controls></audio>" +
		"<video src='https://example.com/v.webm' controls></video>";
	const md = htmlToMarkdown(html, new FakeSink());
	assert.match(md, /<audio src='https:\/\/example\.com\/a\.ogg' controls><\/audio>/);
	assert.match(md, /<video src='https:\/\/example\.com\/v\.webm' controls><\/video>/);
});

test("US5: emits a placeholder for interactive Altair and Plotly charts", () => {
	const altair = renderOutput(
		{ data: { "text/html": "<marimo-ui-element><marimo-vega object-id='v'></marimo-vega></marimo-ui-element>" } },
		new FakeSink()
	);
	assert.ok(altair);
	assert.match(altair, /Interactive chart \(Altair\)/);
	assert.doesNotMatch(altair, /<marimo-/);
	const plotly = renderOutput(
		{ data: { "text/html": "<marimo-ui-element><marimo-plotly object-id='p'></marimo-plotly></marimo-ui-element>" } },
		new FakeSink()
	);
	assert.ok(plotly);
	assert.match(plotly, /Interactive chart \(Plotly\)/);
});

// marimo carries the stable object-id on the <marimo-ui-element> wrapper
// (e.g. object-id='bkHC-0'), not on the inner <marimo-vega>/<marimo-plotly>.
const ALTAIR_HTML =
	"<marimo-ui-element object-id='bkHC-0'><marimo-vega data-spec='{}'></marimo-vega></marimo-ui-element>";
const PLOTLY_HTML =
	"<marimo-ui-element object-id='xy12-3'><marimo-plotly data-spec='{}'></marimo-plotly></marimo-ui-element>";

test("US1: embeds a rasterized image when the chart object-id is in the charts map", () => {
	const altairPng = "data:image/png;base64,AAA";
	const altairSink = new FakeSink();
	const altair = renderOutput(
		{ data: { "text/html": ALTAIR_HTML } },
		altairSink,
		{ "bkHC-0": altairPng }
	);
	assert.equal(altair, "__IMG_0__");
	assert.deepEqual(altairSink.uris, [altairPng]);

	const plotlyPng = "data:image/png;base64,BBB";
	const plotlySink = new FakeSink();
	const plotly = renderOutput(
		{ data: { "text/html": PLOTLY_HTML } },
		plotlySink,
		{ "xy12-3": plotlyPng }
	);
	assert.equal(plotly, "__IMG_0__");
	assert.deepEqual(plotlySink.uris, [plotlyPng]);
});

test("US2: falls back to the placeholder when no chart image matches the object-id", () => {
	// Non-matching key → placeholder, never another chart's image (no positional match).
	const mismatch = renderOutput(
		{ data: { "text/html": ALTAIR_HTML } },
		new FakeSink(),
		{ "other-id": "data:image/png;base64,AAA" }
	);
	assert.ok(mismatch);
	assert.match(mismatch, /Interactive chart \(Altair\)/);
	assert.doesNotMatch(mismatch, /__IMG_/);

	// Empty map (e.g. CLI-fallback export) → placeholder, matching default behavior.
	const empty = renderOutput(
		{ data: { "text/html": PLOTLY_HTML } },
		new FakeSink(),
		{}
	);
	assert.ok(empty);
	assert.match(empty, /Interactive chart \(Plotly\)/);
});

test("FR-013/FR-014: pure UI inputs and progress/spinner are omitted without leaking", () => {
	const slider = renderOutput(
		{ data: { "text/html": "<marimo-ui-element><marimo-slider object-id='s'></marimo-slider></marimo-ui-element>" } },
		new FakeSink()
	);
	assert.equal(slider, null);
	// A transient progress element must never leak raw custom-element markup.
	const progress = htmlToMarkdown(
		"<marimo-progress title='Working'></marimo-progress>",
		new FakeSink()
	);
	assert.doesNotMatch(progress, /<marimo-/);
});
