/**
 * Orchestrates exporting an active marimo notebook to a static Obsidian
 * Markdown note. Runs `marimo export html`, reads the embedded session data,
 * converts each cell's code/outputs to Markdown, persists embedded images as
 * vault attachments, and writes the note next to the source notebook under a
 * non-colliding name — never overwriting an existing file. The temporary HTML
 * is always removed, and a failed export leaves any existing note untouched.
 */
import { FileSystemAdapter, Notice, TFile, normalizePath } from "obsidian";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import {
	CHAR_NEWLINE,
	ENCODING_BASE64,
	ENCODING_UTF8,
	EXPORT_TEMP_PREFIX,
	EXT_HTML,
	EXT_MD,
	EXT_PY,
	BASE64_MARKER,
	INDEX_NOT_FOUND,
	MD_BLANK_LINE,
	MD_FENCE,
	MD_IMAGE_PREFIX,
	MD_LANG_PYTHON,
	NOTICE_TIMEOUT_MS,
	OFFSET_ONE,
	RUNTIME_CONSTANTS,
	formatCollisionBase,
	formatExportFailureNotice,
	formatExportImageName,
	formatExportParseFailure,
	formatExportSuccessNotice,
	formatImageToken,
} from "./constants";
import { extractMountConfig, type MarimoMountConfig } from "./marimo-mount-config";
import {
	hasMarkdownOutput,
	renderOutput,
	type ImageSink,
} from "./html-to-markdown";
import { resolveVaultNotebook } from "./notebook-path";
import type MarimoBridgePlugin from "./main";

const EMPTY = "";

interface PendingImage {
	token: string;
	dataUri: string;
}

/** Collects data-URI images during synchronous rendering for later async save. */
class CollectingImageSink implements ImageSink {
	readonly pending: PendingImage[] = [];

	addDataUri(value: string): string {
		const token = formatImageToken(this.pending.length);
		this.pending.push({ token, dataUri: value });
		return token;
	}
}

function dataUriToArrayBuffer(value: string): ArrayBuffer {
	const markerAt = value.indexOf(BASE64_MARKER);
	const base64 =
		markerAt === INDEX_NOT_FOUND
			? value
			: value.slice(markerAt + BASE64_MARKER.length);
	const buffer = Buffer.from(base64, ENCODING_BASE64);
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength
	);
}

function notebookBaseName(notebookPath: string): string {
	const slashAt = notebookPath.lastIndexOf(RUNTIME_CONSTANTS.SLASH);
	const name =
		slashAt === INDEX_NOT_FOUND
			? notebookPath
			: notebookPath.slice(slashAt + OFFSET_ONE);
	return name.endsWith(EXT_PY)
		? name.slice(0, name.length - EXT_PY.length)
		: name;
}

function notebookFolder(notebookPath: string): string {
	const slashAt = notebookPath.lastIndexOf(RUNTIME_CONSTANTS.SLASH);
	return slashAt === INDEX_NOT_FOUND ? EMPTY : notebookPath.slice(0, slashAt);
}

function joinVaultPath(folder: string, name: string): string {
	const joined = folder
		? folder + RUNTIME_CONSTANTS.SLASH + name
		: name;
	return normalizePath(joined);
}

/** Pick `<base>.md`, or the first free `<base>-N.md`; never an existing file. */
function resolveMarkdownPath(
	plugin: MarimoBridgePlugin,
	notebookPath: string
): string {
	const folder = notebookFolder(notebookPath);
	const base = notebookBaseName(notebookPath);
	let candidate = joinVaultPath(folder, base + EXT_MD);
	let index = 0;
	while (plugin.app.vault.getAbstractFileByPath(candidate)) {
		index++;
		candidate = joinVaultPath(folder, formatCollisionBase(base, index) + EXT_MD);
	}
	return candidate;
}

function buildMarkdown(
	config: MarimoMountConfig,
	includeCode: boolean,
	sink: ImageSink,
	charts: Record<string, string>
): string {
	const notebookCells = config.notebook.cells;
	const sessionCells = config.session.cells;
	const count = Math.max(notebookCells.length, sessionCells.length);
	const blocks: string[] = [];

	for (let i = 0; i < count; i++) {
		const cell = notebookCells[i];
		const code = cell ? cell.code.trim() : EMPTY;
		const outputs = sessionCells[i]?.outputs;
		const isMarkdownCell = hasMarkdownOutput(outputs);
		const cellParts: string[] = [];

		if (includeCode && code.length > 0 && !isMarkdownCell) {
			cellParts.push(
				MD_FENCE + MD_LANG_PYTHON + CHAR_NEWLINE + code + CHAR_NEWLINE + MD_FENCE
			);
		}
		for (const output of outputs ?? []) {
			const rendered = renderOutput(output, sink, charts);
			if (rendered && rendered.length > 0) cellParts.push(rendered);
		}
		if (cellParts.length > 0) blocks.push(cellParts.join(MD_BLANK_LINE));
	}

	return blocks.join(MD_BLANK_LINE) + CHAR_NEWLINE;
}

/**
 * Export `notebookPath` (vault-relative `.py`) to Markdown. `includeCode`
 * selects the with-code vs outputs-only variant. Surfaces a `Notice` on
 * success and failure; never throws.
 */
export async function exportNotebookToMarkdown(
	plugin: MarimoBridgePlugin,
	notebookPath: string,
	includeCode: boolean
): Promise<void> {
	const adapter = plugin.app.vault.adapter;
	if (!(adapter instanceof FileSystemAdapter)) {
		new Notice(formatExportFailureNotice(notebookPath), NOTICE_TIMEOUT_MS);
		return;
	}
	const resolved = resolveVaultNotebook(adapter.getBasePath(), notebookPath);
	if (!resolved) {
		new Notice(formatExportFailureNotice(notebookPath), NOTICE_TIMEOUT_MS);
		return;
	}

	const base = notebookBaseName(notebookPath);
	let tempDir: string | null = null;
	try {
		// Prefer the live running session (reflects current widget values). The
		// live export also carries rasterized images for interactive charts,
		// keyed by object-id; the CLI fallback has none (charts stay placeholders).
		const liveView = plugin.findOpenNotebookView(notebookPath);
		const live = liveView ? await liveView.exportLiveHtml(includeCode) : null;
		let html = live ? live.html : null;
		const charts: Record<string, string> = live ? live.charts : {};

		if (html === null) {
			// No live session (or live export failed). When the notebook is not
			// open in a marimo editor, warn the user that the CLI fallback uses
			// initial widget values, and let them cancel.
			if (!liveView) {
				const proceed = await plugin.confirmExportWithoutLiveSession();
				if (!proceed) return;
			}
			tempDir = mkdtempSync(path.join(tmpdir(), EXPORT_TEMP_PREFIX));
			const outHtml = path.join(tempDir, base + EXT_HTML);
			const result = await plugin.servers.exportNotebookHtml(
				resolved.absolutePath,
				includeCode,
				outHtml
			);
			if (result.code !== 0) {
				new Notice(
					formatExportFailureNotice(result.stderr.trim() || base),
					NOTICE_TIMEOUT_MS
				);
				return;
			}
			html = readFileSync(outHtml, ENCODING_UTF8);
		}

		const config = extractMountConfig(html);
		if (!config) {
			new Notice(
				formatExportFailureNotice(formatExportParseFailure(base)),
				NOTICE_TIMEOUT_MS
			);
			return;
		}

		const markdownPath = resolveMarkdownPath(plugin, notebookPath);
		const sink = new CollectingImageSink();
		let markdown = buildMarkdown(config, includeCode, sink, charts);

		for (let i = 0; i < sink.pending.length; i++) {
			const image = sink.pending[i];
			if (!image) continue;
			const attachmentName = formatExportImageName(base, i);
			const attachmentPath =
				await plugin.app.fileManager.getAvailablePathForAttachment(
					attachmentName,
					markdownPath
				);
			const file = await plugin.app.vault.createBinary(
				attachmentPath,
				dataUriToArrayBuffer(image.dataUri)
			);
			const link =
				MD_IMAGE_PREFIX +
				plugin.app.fileManager.generateMarkdownLink(file, markdownPath);
			markdown = markdown.split(image.token).join(link);
		}

		const mdFile = await plugin.app.vault.create(markdownPath, markdown);
		if (mdFile instanceof TFile) {
			await plugin.app.workspace.getLeaf(false).openFile(mdFile);
		}
		new Notice(formatExportSuccessNotice(markdownPath), NOTICE_TIMEOUT_MS);
	} catch (error) {
		new Notice(formatExportFailureNotice(String(error)), NOTICE_TIMEOUT_MS);
	} finally {
		if (tempDir) rmSync(tempDir, { recursive: true, force: true });
	}
}
