/**
 * MarimoEmbedProcessor — renders a ```marimo fenced code block in a note as an
 * embedded marimo notebook (a `<webview>`).
 *
 * Block syntax (one `key: value` per line):
 *
 *   ```marimo
 *   file: 02_Tools/analysis.py
 *   mode: run        # edit | run
 *   height: 600
 *   ```
 *
 * - `mode: edit` (default) points at the always-on edit server (full editor).
 * - `mode: run` lazily starts a per-notebook read-only "app" server.
 */
import { MarkdownPostProcessorContext, MarkdownRenderChild } from "obsidian";
import type MarimoBridgePlugin from "./main";
import { createMarimoWebview } from "./editor-view";
import {
	TAG_DIV,
	CLS_EMBED_ERROR,
	TEXT_MISSING_FILE,
	CLS_EMBED,
	CLS_LOADING,
	TEXT_STARTING,
	TEXT_SERVER_UNAVAILABLE,
	MODE_RUN,
	TEXT_RUN_SERVER_ERROR_PREFIX,
	CHAR_DOT,
	PARTITION_PREFIX,
	CHAR_NEWLINE,
	CHAR_HASH,
	CHAR_COLON,
	KEY_FILE,
	KEY_MODE,
	KEY_HEIGHT,
	MODE_EDIT,
	RADIX_DECIMAL,
	INDEX_NOT_FOUND,
	OFFSET_ONE,
} from "./constants";

/** Parsed configuration of a single ```marimo block. */
interface EmbedConfig {
	/** Vault-relative path of the notebook to embed. */
	file?: string;
	/** edit = full editor; run = read-only app view. */
	mode: typeof MODE_EDIT | typeof MODE_RUN;
	/** Embed height in pixels. */
	height: number;
}

/**
 * A render child that encapsulates the embedded webview's DOM element
 * and handles starting/stopping the dedicated marimo run server on unload.
 */
class MarimoEmbedChild extends MarkdownRenderChild {
	private plugin: MarimoBridgePlugin;
	private file: string;
	private mode: typeof MODE_EDIT | typeof MODE_RUN;
	private height: number;
	private wrapper: HTMLDivElement;

	constructor(
		containerEl: HTMLElement,
		plugin: MarimoBridgePlugin,
		file: string,
		mode: typeof MODE_EDIT | typeof MODE_RUN,
		height: number
	) {
		super(containerEl);
		this.plugin = plugin;
		this.file = file;
		this.mode = mode;
		this.height = height;
		this.wrapper = containerEl.createDiv({ cls: CLS_EMBED });
	}

	onload(): void {
		const loading = this.wrapper.createDiv({
			cls: CLS_LOADING,
			text: TEXT_STARTING,
		});

		void (async () => {
			// Every embed needs at least the edit server (run mode also reuses it
			// for availability checks / fast failure).
			const ok = await this.plugin.servers.ensureEditServer();
			if (!ok) {
				loading.setText(TEXT_SERVER_UNAVAILABLE);
				return;
			}

			let url: string | null;
			if (this.mode === MODE_RUN) {
				url = await this.plugin.servers.ensureRunServer(this.file);
				if (!url) {
					loading.setText(`${TEXT_RUN_SERVER_ERROR_PREFIX}${this.file}${CHAR_DOT}`);
					return;
				}
			} else {
				url = this.plugin.servers.editFileUrl(this.file);
			}

			const partitionName = `${PARTITION_PREFIX}shared`;

			loading.remove();
			createMarimoWebview(this.plugin, this.wrapper, url, partitionName, undefined, this.height);
		})();
	}

	onunload(): void {
		if (this.mode === MODE_RUN) {
			void this.plugin.servers.releaseRunServer(this.file);
		}
		this.wrapper.empty();
	}
}

/**
 * Build the markdown code-block processor. Returns an async handler suitable
 * for `registerMarkdownCodeBlockProcessor("marimo", ...)`.
 */
export function createMarimoEmbedProcessor(plugin: MarimoBridgePlugin) {
	return async (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> => {
		const cfg = parseEmbedConfig(source, plugin);

		if (!cfg.file) {
			el.createEl(TAG_DIV, {
				cls: CLS_EMBED_ERROR,
				text: TEXT_MISSING_FILE,
			});
			return;
		}

		const child = new MarimoEmbedChild(el, plugin, cfg.file, cfg.mode, cfg.height);
		ctx.addChild(child);
	};
}

/**
 * Parse the `key: value` lines of a ```marimo block. Unknown keys, blank lines
 * and `#` comments are ignored; missing keys fall back to plugin defaults.
 */
function parseEmbedConfig(
	source: string,
	plugin: MarimoBridgePlugin
): EmbedConfig {
	const cfg: EmbedConfig = {
		mode: plugin.settings.defaultEmbedMode,
		height: plugin.settings.defaultEmbedHeight,
	};

	for (const raw of source.split(CHAR_NEWLINE)) {
		const line = raw.trim();
		if (!line || line.startsWith(CHAR_HASH)) continue;
		const idx = line.indexOf(CHAR_COLON);
		if (idx === INDEX_NOT_FOUND) continue;
		const key = line.slice(0, idx).trim().toLowerCase();
		const value = line.slice(idx + OFFSET_ONE).trim();
		if (key === KEY_FILE) cfg.file = value;
		else if (key === KEY_MODE && (value === MODE_EDIT || value === MODE_RUN))
			cfg.mode = value;
		else if (key === KEY_HEIGHT) {
			const n = parseInt(value, RADIX_DECIMAL);
			if (!isNaN(n) && n > 0) cfg.height = n;
		}
	}
	return cfg;
}
