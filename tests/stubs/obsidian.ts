export class Notice {
	constructor(_message: string, _timeout?: number) {}
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

export async function requestUrl(): Promise<{ status: number }> {
	return { status: 503 };
}
