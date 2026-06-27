/**
 * Confirmation modal shown when the user exports a notebook that is NOT open in
 * a running marimo editor. Without a live session the export falls back to a
 * fresh CLI run, which uses the notebook's initial widget values rather than the
 * values the user may have set interactively. The modal lets the user proceed
 * (CLI fallback) or cancel and open the notebook first.
 */
import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import {
	EXPORT_WARNING_TITLE,
	EXPORT_WARNING_BODY,
	EXPORT_WARNING_CONTINUE,
	EXPORT_WARNING_CANCEL,
	TAG_PARAGRAPH,
} from "./constants";

class ExportWarningModal extends Modal {
	private settled = false;

	constructor(
		app: App,
		private readonly onResult: (proceed: boolean) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(EXPORT_WARNING_TITLE);
		this.contentEl.createEl(TAG_PARAGRAPH, { text: EXPORT_WARNING_BODY });
		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText(EXPORT_WARNING_CANCEL)
					.onClick(() => {
						this.settle(false);
					})
			)
			.addButton((button) =>
				button
					.setButtonText(EXPORT_WARNING_CONTINUE)
					.setCta()
					.onClick(() => {
						this.settle(true);
					})
			);
	}

	onClose(): void {
		// Dismissing the modal (e.g. via Escape or the close button) is a cancel.
		if (!this.settled) this.onResult(false);
	}

	private settle(proceed: boolean): void {
		this.settled = true;
		this.onResult(proceed);
		this.close();
	}
}

/** Resolve `true` to proceed with the CLI fallback, `false` to cancel. */
export function confirmExportWithoutLiveSession(app: App): Promise<boolean> {
	return new Promise((resolve) => {
		new ExportWarningModal(app, resolve).open();
	});
}
