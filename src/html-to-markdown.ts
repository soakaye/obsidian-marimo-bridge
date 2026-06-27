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
	REGEX_GROUP_FIRST,
	REGEX_GROUP_SECOND,
	TAG_MARIMO_PREFIX,
	RUNTIME_CONSTANTS,
	formatHeadingPrefix,
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

/** Convert inline-level tags, strip the rest, and decode HTML entities. */
function convertInline(html: string, sink: ImageSink): string {
	let s = html.replace(/<img\b[^>]*>/gi, (tag) => convertImage(tag, sink));
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
		const header = rows[0];
		if (!header) return EMPTY;
		const body = rows.slice(OFFSET_ONE);
		const renderRow = (cells: string[]): string =>
			MD_TABLE_EDGE + CH_SPACE + cells.join(MD_TABLE_PIPE) + CH_SPACE + MD_TABLE_EDGE;
		const separator =
			MD_TABLE_EDGE + header.map(() => MD_TABLE_SEP_CELL).join(MD_TABLE_EDGE) + MD_TABLE_EDGE;
		const lines = [renderRow(header), separator, ...body.map(renderRow)];
		return MD_BLANK_LINE + lines.join(CHAR_NEWLINE) + MD_BLANK_LINE;
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
	let s = convertTables(html, sink);
	s = convertLists(s, sink);
	s = convertHeadings(s, sink);
	s = convertPre(s, sink);
	s = convertParagraphs(s, sink);
	s = convertInline(s, sink);
	return collapseBlankLines(s).trim();
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
	return Object.values(record).some((v) => v.includes(TAG_MARIMO_PREFIX));
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
