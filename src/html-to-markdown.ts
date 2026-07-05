/**
 * Minimal, dependency-free HTML → Markdown conversion for the rendered outputs
 * marimo embeds in its HTML export. marimo's renderer emits a constrained tag
 * subset (headings, paragraph spans, lists, `strong`/`em`/`code`, links, images,
 * tables, `pre`), so a focused converter avoids pulling in a runtime dependency
 * and stays unit-testable under Node (no browser DOM required).
 *
 * Image handling is delegated to an {@link ImageSink} so the caller decides how
 * to persist data-URI images (e.g. as Obsidian attachments); external image URLs
 * are kept as inline Markdown image links.
 */
import {
	CH_AMP,
	CH_APOS,
	CH_GT,
	CH_LT,
	CH_QUOTE,
	CH_SPACE,
	CHAR_NEWLINE,
	DATA_URI_PREFIX,
	OFFSET_ONE,
	ENT_AMP,
	ENT_APOS,
	ENT_BACKSLASH,
	ENT_GT,
	ENT_LT,
	ENT_NBSP,
	ENT_QUOT,
	MD_BLANK_LINE,
	MD_BOLD,
	MD_BULLET,
	MD_CODE,
	MD_IMAGE_PREFIX,
	MD_ITALIC,
	MD_LINK_CLOSE,
	MD_LINK_MID,
	MD_LINK_OPEN,
	MD_ORDERED_MARKER,
	MD_TABLE_EDGE,
	MD_TABLE_PIPE,
	MD_TABLE_SEP_CELL,
	MIME_HTML,
	MIME_MARIMO_BUNDLE,
	MIME_MARKDOWN,
	MIME_PLAIN,
	MIME_PNG,
	MD_MATH_BLOCK,
	MD_MATH_INLINE,
	MD_QUOTE_PREFIX,
	REGEX_GROUP_FIRST,
	REGEX_GROUP_SECOND,
	TAG_MARIMO_UI_ELEMENT,
	TEX_BLOCK_CLOSE,
	TEX_BLOCK_OPEN,
	TEX_INLINE_CLOSE,
	TEX_INLINE_OPEN,
	RUNTIME_CONSTANTS,
	TAG_MARIMO_TABLE,
	TAG_MARIMO_TABS,
	TAG_MARIMO_ACCORDION,
	TAG_MARIMO_VEGA,
	TAG_MARIMO_PLOTLY,
	CALLOUT_TYPE_NOTE,
	CHART_KIND_ALTAIR,
	CHART_KIND_PLOTLY,
	HEADING_LEVEL_TAB,
	formatHeadingPrefix,
	formatCallout,
	formatMermaidBlock,
	formatChartPlaceholder,
	formatMediaToken,
} from "./constants";
import type { CellOutput } from "./marimo-mount-config";

const EMPTY = "";

/** Persists a data-URI image and returns Markdown that embeds it. */
export interface ImageSink {
	addDataUri(value: string): string;
}

function decodeEntities(text: string): string {
	return text
		.split(ENT_LT)
		.join(CH_LT)
		.split(ENT_GT)
		.join(CH_GT)
		.split(ENT_QUOT)
		.join(CH_QUOTE)
		.split(ENT_APOS)
		.join(CH_APOS)
		.split(ENT_NBSP)
		.join(CH_SPACE)
		.split(ENT_AMP)
		.join(CH_AMP);
}

function stripTags(html: string): string {
	return html.replace(/<[^>]*>/g, () => EMPTY);
}

function attr(tag: string, pattern: RegExp): string | null {
	const m = pattern.exec(tag);
	if (!m) return null;
	return m[REGEX_GROUP_FIRST] ?? m[REGEX_GROUP_SECOND] ?? null;
}

function convertImage(tag: string, sink: ImageSink): string {
	const src = attr(tag, /\bsrc\s*=\s*"([^"]*)"|\bsrc\s*=\s*'([^']*)'/i);
	if (!src) return EMPTY;
	if (src.startsWith(DATA_URI_PREFIX)) return sink.addDataUri(src);
	const alt = attr(tag, /\balt\s*=\s*"([^"]*)"|\balt\s*=\s*'([^']*)'/i) ?? EMPTY;
	return MD_IMAGE_PREFIX + MD_LINK_OPEN + alt + MD_LINK_MID + src + MD_LINK_CLOSE;
}

/** Convert marimo's rendered LaTeX (`||(...||)` / `||[...||]`) to Obsidian math. */
function convertTex(inner: string): string {
	const math = decodeEntities(inner)
		.split(TEX_BLOCK_OPEN)
		.join(MD_MATH_BLOCK)
		.split(TEX_BLOCK_CLOSE)
		.join(MD_MATH_BLOCK)
		.split(TEX_INLINE_OPEN)
		.join(MD_MATH_INLINE)
		.split(TEX_INLINE_CLOSE)
		.join(MD_MATH_INLINE);
	return math;
}

/** Convert inline-level tags, strip the rest, and decode HTML entities. */
function convertInline(html: string, sink: ImageSink): string {
	let s = html.replace(
		/<marimo-tex\b[^>]*>([\s\S]*?)<\/marimo-tex>/gi,
		(_m, inner: string) => convertTex(inner)
	);
	s = s.replace(/<img\b[^>]*>/gi, (tag) => convertImage(tag, sink));
	s = s.replace(
		/<a\b[^>]*?href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
		(_m, href: string, inner: string) =>
			MD_LINK_OPEN + convertInline(inner, sink).trim() + MD_LINK_MID + href + MD_LINK_CLOSE
	);
	s = s.replace(
		/<a\b[^>]*?href\s*=\s*'([^']*)'[^>]*>([\s\S]*?)<\/a>/gi,
		(_m, href: string, inner: string) =>
			MD_LINK_OPEN + convertInline(inner, sink).trim() + MD_LINK_MID + href + MD_LINK_CLOSE
	);
	s = s.replace(
		/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi,
		(_m, _tag: string, inner: string) => MD_BOLD + convertInline(inner, sink) + MD_BOLD
	);
	s = s.replace(
		/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi,
		(_m, _tag: string, inner: string) => MD_ITALIC + convertInline(inner, sink) + MD_ITALIC
	);
	s = s.replace(
		/<code\b[^>]*>([\s\S]*?)<\/code>/gi,
		(_m, inner: string) => MD_CODE + decodeEntities(stripTags(inner)) + MD_CODE
	);
	return decodeEntities(stripTags(s));
}

function convertLists(html: string, sink: ImageSink): string {
	const items = (inner: string, ordered: boolean): string => {
		const lines: string[] = [];
		let index = 0;
		inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, body: string) => {
			index++;
			const marker = ordered ? index.toString() + MD_ORDERED_MARKER : MD_BULLET;
			lines.push(marker + convertInline(body, sink).trim());
			return EMPTY;
		});
		return lines.join(CHAR_NEWLINE);
	};
	return html
		.replace(
			/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi,
			(_m, inner: string) => MD_BLANK_LINE + items(inner, false) + MD_BLANK_LINE
		)
		.replace(
			/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi,
			(_m, inner: string) => MD_BLANK_LINE + items(inner, true) + MD_BLANK_LINE
		);
}

/** Render `rows` (first row = header) as a GitHub-flavored Markdown table. */
function renderTableRows(rows: string[][]): string | null {
	const header = rows[0];
	if (!header) return null;
	const body = rows.slice(OFFSET_ONE);
	const renderRow = (cells: string[]): string =>
		MD_TABLE_EDGE + CH_SPACE + cells.join(MD_TABLE_PIPE) + CH_SPACE + MD_TABLE_EDGE;
	const separator =
		MD_TABLE_EDGE + header.map(() => MD_TABLE_SEP_CELL).join(MD_TABLE_EDGE) + MD_TABLE_EDGE;
	const lines = [renderRow(header), separator, ...body.map(renderRow)];
	return MD_BLANK_LINE + lines.join(CHAR_NEWLINE) + MD_BLANK_LINE;
}

function convertTables(html: string, sink: ImageSink): string {
	return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner: string) => {
		const rows: string[][] = [];
		inner.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_r, rowHtml: string) => {
			const cells: string[] = [];
			rowHtml.replace(
				/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi,
				(_c, cell: string) => {
					cells.push(convertInline(cell, sink).trim());
					return EMPTY;
				}
			);
			rows.push(cells);
			return EMPTY;
		});
		return renderTableRows(rows) ?? EMPTY;
	});
}

/** Decode the HTML-entity-encoded JSON marimo stores in `data-data`. */
function decodeTableData(raw: string): string {
	return raw
		.split(ENT_QUOT)
		.join(CH_QUOTE)
		.split(ENT_BACKSLASH)
		.join(RUNTIME_CONSTANTS.BACKSLASH)
		.split(ENT_APOS)
		.join(CH_APOS)
		.split(ENT_LT)
		.join(CH_LT)
		.split(ENT_GT)
		.join(CH_GT)
		.split(ENT_AMP)
		.join(CH_AMP);
}

/**
 * Parse `data-data` into row records. marimo double-encodes it as a JSON string
 * whose contents are themselves JSON, so parse once, and again if the result is
 * still a string. Returns `null` when the payload is not a row array.
 */
function parseTableRows(raw: string): Record<string, unknown>[] | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(decodeTableData(raw));
		if (typeof parsed === RUNTIME_CONSTANTS.TYPE_STRING) {
			parsed = JSON.parse(parsed as string);
		}
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	return parsed as Record<string, unknown>[];
}

/** Render one table cell value; collapse newlines so the row stays intact. */
function cellToText(value: unknown): string {
	if (value === null || value === undefined) return EMPTY;
	const text =
		typeof value === RUNTIME_CONSTANTS.TYPE_STRING
			? (value as string)
			: JSON.stringify(value);
	return text.split(CHAR_NEWLINE).join(CH_SPACE);
}

/**
 * Convert marimo's `<marimo-table>` (a displayed DataFrame) to a Markdown table
 * using the preview rows embedded in its `data-data` attribute. marimo only
 * embeds the first page of rows, so large frames export truncated.
 */
function convertMarimoTables(html: string): string {
	return html.replace(/<marimo-table\b[^>]*>/gi, (tag) => {
		const raw = attr(
			tag,
			/\bdata-data\s*=\s*"([^"]*)"|\bdata-data\s*=\s*'([^']*)'/i
		);
		if (!raw) return EMPTY;
		const rows = parseTableRows(raw);
		const first = rows?.[0];
		if (!first || typeof first !== RUNTIME_CONSTANTS.TYPE_OBJECT) return EMPTY;
		const headers = Object.keys(first);
		const matrix = [
			headers,
			...rows.map((row) => headers.map((key) => cellToText(row[key]))),
		];
		return renderTableRows(matrix) ?? EMPTY;
	});
}

/** Parse an entity-encoded JSON string attribute (e.g. mermaid `data-diagram`). */
function parseEncodedString(raw: string): string | null {
	try {
		const parsed: unknown = JSON.parse(decodeTableData(raw));
		return typeof parsed === RUNTIME_CONSTANTS.TYPE_STRING ? (parsed as string) : null;
	} catch {
		return null;
	}
}

/** Parse an entity-encoded JSON array attribute (e.g. tab/accordion labels). */
function parseEncodedArray(raw: string): string[] | null {
	try {
		const parsed: unknown = JSON.parse(decodeTableData(raw));
		return Array.isArray(parsed) ? (parsed as string[]) : null;
	} catch {
		return null;
	}
}

/** Quote every line of a Markdown block as a callout body (`> ` prefix). */
function quoteBlock(markdown: string): string {
	return markdown
		.split(CHAR_NEWLINE)
		.map((line) => MD_QUOTE_PREFIX + line)
		.join(CHAR_NEWLINE);
}

/** Plain-text label from `labels[index]` (each label is an HTML fragment). */
function labelText(labels: string[] | null, index: number): string {
	const raw = labels?.[index];
	if (raw === undefined) return EMPTY;
	return decodeEntities(stripTags(raw)).trim();
}

/** The admonition type (note/tip/warning/danger) from a `class` attribute. */
function admonitionType(cls: string): string {
	const m = /admonition\s+([a-z]+)/i.exec(cls);
	return m ? m[REGEX_GROUP_FIRST] ?? CALLOUT_TYPE_NOTE : CALLOUT_TYPE_NOTE;
}

/** Convert marimo `<div class="admonition T">` blocks to Obsidian callouts. */
function convertAdmonitions(html: string, sink: ImageSink): string {
	return html.replace(
		/<div\b[^>]*class\s*=\s*("admonition[^"]*"|'admonition[^']*')[^>]*>([\s\S]*?)<\/div>/gi,
		(_m, cls: string, inner: string) => {
			const type = admonitionType(cls);
			const titleMatch =
				/<span\b[^>]*admonition-title[^>]*>([\s\S]*?)<\/span>/i.exec(inner);
			const title = titleMatch
				? decodeEntities(stripTags(titleMatch[REGEX_GROUP_FIRST] ?? EMPTY)).trim()
				: EMPTY;
			const body = inner.replace(
				/<span\b[^>]*admonition-title[^>]*>[\s\S]*?<\/span>/i,
				() => EMPTY
			);
			const md = htmlToMarkdown(body, sink);
			return (
				MD_BLANK_LINE +
				formatCallout(type, title, false) +
				CHAR_NEWLINE +
				quoteBlock(md) +
				MD_BLANK_LINE
			);
		}
	);
}

/** Convert `<details><summary>T</summary>…` to a collapsed Obsidian callout. */
function convertDetails(html: string, sink: ImageSink): string {
	return html.replace(
		/<details\b[^>]*>([\s\S]*?)<\/details>/gi,
		(_m, inner: string) => {
			const sm = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(inner);
			const title = sm
				? decodeEntities(stripTags(sm[REGEX_GROUP_FIRST] ?? EMPTY)).trim()
				: EMPTY;
			const body = inner.replace(
				/<summary\b[^>]*>[\s\S]*?<\/summary>/i,
				() => EMPTY
			);
			const md = htmlToMarkdown(body, sink);
			return (
				MD_BLANK_LINE +
				formatCallout(CALLOUT_TYPE_NOTE, title, true) +
				CHAR_NEWLINE +
				quoteBlock(md) +
				MD_BLANK_LINE
			);
		}
	);
}

/** Convert `<marimo-mermaid data-diagram>` to a native ` ```mermaid ` fence. */
function convertMermaid(html: string): string {
	return html.replace(
		/<marimo-mermaid\b[^>]*>(?:[\s\S]*?<\/marimo-mermaid>)?/gi,
		(tag) => {
			const raw = attr(
				tag,
				/\bdata-diagram\s*=\s*"([^"]*)"|\bdata-diagram\s*=\s*'([^']*)'/i
			);
			if (!raw) return EMPTY;
			const src = parseEncodedString(raw);
			if (src === null) return EMPTY;
			return MD_BLANK_LINE + formatMermaidBlock(src.trim()) + MD_BLANK_LINE;
		}
	);
}

/** Unwrap `<marimo-tabs>` into a heading + content per tab. */
function convertTabs(html: string, sink: ImageSink): string {
	return html.replace(
		/<marimo-tabs\b[^>]*>([\s\S]*?)<\/marimo-tabs>/gi,
		(tag, inner: string) => {
			const labelsRaw = attr(
				tag,
				/\bdata-tabs\s*=\s*"([^"]*)"|\bdata-tabs\s*=\s*'([^']*)'/i
			);
			const labels = labelsRaw ? parseEncodedArray(labelsRaw) : null;
			const panels: string[] = [];
			let index = 0;
			inner.replace(
				/<div\b[^>]*\bdata-kind\s*=\s*["']tab["'][^>]*>([\s\S]*?)<\/div>/gi,
				(_m, body: string) => {
					const label = labelText(labels, index);
					const content = htmlToMarkdown(body, sink);
					panels.push(
						formatHeadingPrefix(HEADING_LEVEL_TAB) + label + MD_BLANK_LINE + content
					);
					index++;
					return EMPTY;
				}
			);
			return MD_BLANK_LINE + panels.join(MD_BLANK_LINE) + MD_BLANK_LINE;
		}
	);
}

/** Convert `<marimo-accordion>` sections to collapsed callouts. */
function convertAccordion(html: string, sink: ImageSink): string {
	return html.replace(
		/<marimo-accordion\b[^>]*>([\s\S]*?)<\/marimo-accordion>/gi,
		(tag, inner: string) => {
			const labelsRaw = attr(
				tag,
				/\bdata-labels\s*=\s*"([^"]*)"|\bdata-labels\s*=\s*'([^']*)'/i
			);
			const labels = labelsRaw ? parseEncodedArray(labelsRaw) : null;
			const sections: string[] = [];
			let index = 0;
			inner.replace(/<div\b[^>]*>([\s\S]*?)<\/div>/gi, (_m, body: string) => {
				const label = labelText(labels, index);
				const content = htmlToMarkdown(body, sink);
				sections.push(
					formatCallout(CALLOUT_TYPE_NOTE, label, true) +
						CHAR_NEWLINE +
						quoteBlock(content)
				);
				index++;
				return EMPTY;
			});
			return MD_BLANK_LINE + sections.join(MD_BLANK_LINE) + MD_BLANK_LINE;
		}
	);
}

/**
 * Replace `<audio>`/`<video>` elements with sentinels and stash them verbatim,
 * so the later tag-stripping passes leave the playable HTML intact. The caller
 * restores them after conversion.
 */
function protectMedia(html: string, store: string[]): string {
	return html.replace(/<(audio|video)\b[\s\S]*?<\/\1>/gi, (element) => {
		const token = formatMediaToken(store.length);
		store.push(element);
		return token;
	});
}

function convertHeadings(html: string, sink: ImageSink): string {
	return html.replace(
		/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
		(_m, level: string, inner: string) =>
			MD_BLANK_LINE + formatHeadingPrefix(Number(level)) + convertInline(inner, sink).trim() + MD_BLANK_LINE
	);
}

function convertPre(html: string, sink: ImageSink): string {
	return html.replace(
		/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi,
		(_m, inner: string) => MD_BLANK_LINE + convertInline(inner, sink).trim() + MD_BLANK_LINE
	);
}

function convertParagraphs(html: string, sink: ImageSink): string {
	return html.replace(
		/<(p|span)\b[^>]*class\s*=\s*("[^"]*paragraph[^"]*"|'[^']*paragraph[^']*')[^>]*>([\s\S]*?)<\/\1>/gi,
		(_m, _tag: string, _cls: string, inner: string) =>
			MD_BLANK_LINE + convertInline(inner, sink).trim() + MD_BLANK_LINE
	).replace(
		/<p\b[^>]*>([\s\S]*?)<\/p>/gi,
		(_m, inner: string) => MD_BLANK_LINE + convertInline(inner, sink).trim() + MD_BLANK_LINE
	);
}

function collapseBlankLines(text: string): string {
	return text.replace(/\n{3,}/g, () => MD_BLANK_LINE);
}

/** Convert a marimo-rendered HTML fragment to Markdown. */
export function htmlToMarkdown(html: string, sink: ImageSink): string {
	const media: string[] = [];
	let s = convertMarimoTables(html);
	s = convertAdmonitions(s, sink);
	s = convertDetails(s, sink);
	s = convertMermaid(s);
	s = convertTabs(s, sink);
	s = convertAccordion(s, sink);
	s = protectMedia(s, media);
	s = convertTables(s, sink);
	s = convertLists(s, sink);
	s = convertHeadings(s, sink);
	s = convertPre(s, sink);
	s = convertParagraphs(s, sink);
	s = convertInline(s, sink);
	s = collapseBlankLines(s).trim();
	for (let i = 0; i < media.length; i++) {
		const element = media[i];
		if (element === undefined) continue;
		s = s.split(formatMediaToken(i)).join(element);
	}
	return s;
}

/** True when any output carries a `text/markdown` payload (a Markdown cell). */
export function hasMarkdownOutput(outputs: CellOutput[] | undefined): boolean {
	if (!outputs) return false;
	return outputs.some(
		(o) =>
			typeof o.data === RUNTIME_CONSTANTS.TYPE_OBJECT &&
			(o.data as Record<string, string>)[MIME_MARKDOWN] !== undefined
	);
}

function dataRecord(output: CellOutput): Record<string, string> | null {
	if (output.data && typeof output.data === RUNTIME_CONSTANTS.TYPE_OBJECT) {
		return output.data as Record<string, string>;
	}
	return null;
}

function containsWidget(record: Record<string, string>): boolean {
	return Object.values(record).some((v) => v.includes(TAG_MARIMO_UI_ELEMENT));
}

/** The payload carrying a renderable `<marimo-table>`, or `null` if none. */
function tableSource(record: Record<string, string>): string | null {
	for (const value of Object.values(record)) {
		if (value.includes(TAG_MARIMO_TABLE)) return value;
	}
	return null;
}

/**
 * The payload carrying a layout container (`<marimo-tabs>`/`<marimo-accordion>`)
 * whose static content must be rendered even when wrapped as a widget.
 */
function containerSource(record: Record<string, string>): string | null {
	for (const value of Object.values(record)) {
		if (value.includes(TAG_MARIMO_TABS) || value.includes(TAG_MARIMO_ACCORDION)) {
			return value;
		}
	}
	return null;
}

/** The interactive-chart kind in this output, or `null` if none. */
function chartKind(record: Record<string, string>): string | null {
	for (const value of Object.values(record)) {
		if (value.includes(TAG_MARIMO_VEGA)) return CHART_KIND_ALTAIR;
		if (value.includes(TAG_MARIMO_PLOTLY)) return CHART_KIND_PLOTLY;
	}
	return null;
}

/**
 * Render one cell output to Markdown, or `null` when it should be omitted
 * (interactive widgets, console-only/empty, or unsupported payloads).
 */
export function renderOutput(output: CellOutput, sink: ImageSink): string | null {
	const record = dataRecord(output);
	if (!record) {
		if (typeof output.data === RUNTIME_CONSTANTS.TYPE_STRING) {
			const t = (output.data as string).trim();
			return t.length === 0 ? null : t;
		}
		return null;
	}
	// A displayed DataFrame is wrapped in a `marimo-ui-element` but carries
	// static rows; render it instead of dropping it as an interactive widget.
	const table = tableSource(record);
	if (table !== null) {
		const md = htmlToMarkdown(table, sink);
		return md.length === 0 ? null : md;
	}
	// Layout containers are wrapped as widgets but carry static content: render
	// them instead of dropping them with the interactive wrapper.
	const container = containerSource(record);
	if (container !== null) {
		const md = htmlToMarkdown(container, sink);
		return md.length === 0 ? null : md;
	}
	// Interactive charts have no static equivalent here; emit a visible
	// placeholder so the chart is never silently dropped.
	const chart = chartKind(record);
	if (chart !== null) return formatChartPlaceholder(chart);
	if (containsWidget(record)) return null;

	if (record[MIME_MARKDOWN] !== undefined) {
		const md = htmlToMarkdown(record[MIME_MARKDOWN], sink);
		return md.length === 0 ? null : md;
	}
	if (record[MIME_PNG] !== undefined) {
		return sink.addDataUri(record[MIME_PNG]);
	}
	if (record[MIME_MARIMO_BUNDLE] !== undefined) {
		return renderBundle(record[MIME_MARIMO_BUNDLE], sink);
	}
	if (record[MIME_HTML] !== undefined) {
		const html = htmlToMarkdown(record[MIME_HTML], sink);
		return html.length === 0 ? null : html;
	}
	if (record[MIME_PLAIN] !== undefined) {
		const t = record[MIME_PLAIN].trim();
		return t.length === 0 ? null : t;
	}
	return null;
}

function renderBundle(bundleJson: string, sink: ImageSink): string | null {
	let inner: Record<string, string>;
	try {
		inner = JSON.parse(bundleJson) as Record<string, string>;
	} catch {
		return null;
	}
	if (inner[MIME_PNG] !== undefined) return sink.addDataUri(inner[MIME_PNG]);
	if (inner[MIME_HTML] !== undefined) {
		const html = htmlToMarkdown(inner[MIME_HTML], sink);
		return html.length === 0 ? null : html;
	}
	return null;
}
