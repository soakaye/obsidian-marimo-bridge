/**
 * Extract the notebook session data that `marimo export html` embeds in its
 * output. marimo serializes the whole notebook (code + rendered outputs) into a
 * `window.__MARIMO_MOUNT_CONFIG__` object frozen inside a `<script>` tag, so we
 * can read execution results without rendering the page (no headless browser).
 *
 * The embedded text is a JavaScript object literal, not strict JSON: it can
 * contain trailing commas. We brace-match it (string-aware), normalize trailing
 * commas, then `JSON.parse` — never `eval`.
 */
import {
	CONFIG_MARKER,
	CONFIG_FREEZE_ANCHOR,
	CH_OPEN_BRACE,
	CH_CLOSE_BRACE,
	CH_QUOTE,
	INDEX_NOT_FOUND,
	OFFSET_ONE,
	RUNTIME_CONSTANTS,
} from "./constants";

/** One cell's source, from `notebook.cells[]`. */
export interface NotebookCell {
	/** Source code; empty when exported with `--no-include-code`. */
	code: string;
	code_hash?: string;
}

/** One output of a cell, from `session.cells[].outputs[]`. */
export interface CellOutput {
	type?: string;
	/** mime → rendered string, or a plain string for simple outputs. */
	data?: Record<string, string> | string;
}

/** One cell's runtime result, from `session.cells[]`. */
export interface SessionCell {
	id?: string;
	code_hash?: string;
	outputs?: CellOutput[];
}

/** The subset of `__MARIMO_MOUNT_CONFIG__` this plugin consumes. */
export interface MarimoMountConfig {
	notebook: { cells: NotebookCell[] };
	session: { cells: SessionCell[] };
}

/**
 * Find the matching `}` for the `{` at `start`, ignoring braces inside strings
 * and respecting backslash escapes. Returns the index just past the `}`, or
 * {@link INDEX_NOT_FOUND} when unbalanced.
 */
function matchBraces(text: string, start: number): number {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (ch === RUNTIME_CONSTANTS.BACKSLASH) {
				escaped = true;
			} else if (ch === CH_QUOTE) {
				inString = false;
			}
			continue;
		}
		if (ch === CH_QUOTE) {
			inString = true;
		} else if (ch === CH_OPEN_BRACE) {
			depth++;
		} else if (ch === CH_CLOSE_BRACE) {
			depth--;
			if (depth === 0) return i + OFFSET_ONE;
		}
	}
	return INDEX_NOT_FOUND;
}

/**
 * Extract and parse `__MARIMO_MOUNT_CONFIG__` from exported HTML.
 * Returns `null` when the marker/object is absent or cannot be parsed.
 */
export function extractMountConfig(html: string): MarimoMountConfig | null {
	const markerAt = html.indexOf(CONFIG_MARKER);
	if (markerAt === INDEX_NOT_FOUND) return null;

	const anchorAt = html.indexOf(CONFIG_FREEZE_ANCHOR, markerAt);
	if (anchorAt === INDEX_NOT_FOUND) return null;

	const braceAt = html.indexOf(CH_OPEN_BRACE, anchorAt);
	if (braceAt === INDEX_NOT_FOUND) return null;

	const end = matchBraces(html, braceAt);
	if (end === INDEX_NOT_FOUND) return null;

	const literal = html.slice(braceAt, end);
	// Strip trailing commas (`,}` / `,]`) so the JS object literal parses as JSON.
	const normalized = literal.replace(/,(\s*[}\]])/g, (_match, tail: string) => tail);

	try {
		const parsed = JSON.parse(normalized) as Partial<MarimoMountConfig>;
		if (!parsed.notebook?.cells || !parsed.session?.cells) return null;
		return parsed as MarimoMountConfig;
	} catch {
		return null;
	}
}
