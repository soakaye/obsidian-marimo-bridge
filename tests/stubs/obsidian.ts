export class Notice {
	constructor(message: string, _timeout?: number) {
		noticeMessages.push(message);
	}
}

const noticeMessages: string[] = [];

export function resetNoticeMessages(): void {
	noticeMessages.length = 0;
}

export function getNoticeMessages(): string[] {
	return [...noticeMessages];
}

export class FileSystemAdapter {
	getBasePath(): string {
		return "";
	}
}

export class TFile {
	extension = "";
	path = "";
	parent: TFolder | null = null;
}

export class TFolder {
	path = "";
	parent: TFolder | null = null;
}

export class Plugin {
	app: unknown;
	manifest = { dir: "" };

	async loadData(): Promise<unknown> {
		return {};
	}

	async saveData(_data: unknown): Promise<void> {}
}

export class PluginSettingTab {
	constructor(_app: unknown, _plugin: unknown) {}
}

class FakeModalElement {
	setText(_value: string): void {}
	createEl(_tag: string, _options?: unknown): FakeModalElement {
		return new FakeModalElement();
	}
}

export class Modal {
	app: unknown;
	titleEl = new FakeModalElement();
	contentEl = new FakeModalElement();

	constructor(app: unknown) {
		this.app = app;
	}

	open(): void {
		this.onOpen();
	}

	close(): void {
		this.onClose();
	}

	onOpen(): void {}

	onClose(): void {}
}

export class ButtonComponent {
	text = "";
	disabled = false;

	setButtonText(value: string): this {
		this.text = value;
		return this;
	}

	setCta(): this {
		return this;
	}

	setDisabled(value: boolean): this {
		this.disabled = value;
		return this;
	}

	onClick(_callback: () => void | Promise<void>): this {
		return this;
	}
}

class FakeInputEl {
	private listeners = new Map<string, (() => void)[]>();

	addEventListener(event: string, listener: () => void): void {
		const existing = this.listeners.get(event) ?? [];
		existing.push(listener);
		this.listeners.set(event, existing);
	}

	dispatchEvent(event: { type: string }): boolean {
		for (const listener of this.listeners.get(event.type) ?? []) {
			listener();
		}
		return true;
	}
}

export class TextComponent {
	inputEl = new FakeInputEl();
	placeholder = "";
	value = "";

	setPlaceholder(value: string): this {
		this.placeholder = value;
		return this;
	}

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	getValue(): string {
		return this.value;
	}
}

export class ToggleComponent {
	value = false;

	setValue(value: boolean): this {
		this.value = value;
		return this;
	}

	onChange(_callback: (value: boolean) => void | Promise<void>): this {
		return this;
	}
}

export class DropdownComponent {
	value = "";
	options = new Map<string, string>();

	addOption(value: string, label: string): this {
		this.options.set(value, label);
		return this;
	}

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	onChange(_callback: (value: string) => void | Promise<void>): this {
		return this;
	}
}

export class Setting {
	name = "";
	desc: unknown = "";
	textComponents: TextComponent[] = [];

	constructor(containerEl: unknown) {
		const collector = containerEl as {
			settings?: Setting[];
		};
		collector.settings?.push(this);
	}

	setName(value: string): this {
		this.name = value;
		return this;
	}

	setDesc(value: unknown): this {
		this.desc = value;
		return this;
	}

	setHeading(): this {
		return this;
	}

	addText(callback: (text: TextComponent) => void): this {
		const text = new TextComponent();
		this.textComponents.push(text);
		callback(text);
		return this;
	}

	addButton(callback: (button: ButtonComponent) => void): this {
		callback(new ButtonComponent());
		return this;
	}

	addToggle(callback: (toggle: ToggleComponent) => void): this {
		callback(new ToggleComponent());
		return this;
	}

	addDropdown(callback: (dropdown: DropdownComponent) => void): this {
		callback(new DropdownComponent());
		return this;
	}
}

export function addIcon(_id: string, _svg: string): void {}

export function normalizePath(value: string): string {
	return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export class ItemView {
	leaf: unknown;
	contentEl: HTMLElement;
	navigation = false;

	constructor(leaf: unknown) {
		this.leaf = leaf;
		this.contentEl = {} as HTMLElement;
	}

	async setState(_state: unknown, _result: unknown): Promise<void> {}
}

export class WorkspaceLeaf {}

export class MarkdownRenderChild {
	constructor(_containerEl: HTMLElement) {}
}

export async function requestUrl(): Promise<{ status: number }> {
	return { status: 503 };
}
