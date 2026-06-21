export class Notice {
	constructor(_message: string, _timeout?: number) {}
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

export class ButtonComponent {}

export class Setting {
	constructor(_containerEl: unknown) {}
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
