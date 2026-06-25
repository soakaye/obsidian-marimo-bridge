import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import type { FileSystemAdapter } from "obsidian";
import { resolveVaultNotebook } from "../src/notebook-path";
import { ServerManager } from "../src/server-manager";
import type { MarimoBridgeSettings } from "../src/settings";

Object.defineProperty(globalThis, "window", {
	configurable: true,
	value: globalThis,
});

interface RunManagerInternals {
	allocateRunPort(): Promise<number>;
	spawnServer(
		kind: "edit" | "run",
		port: number,
		file?: string
	): ChildProcess;
	waitForReady(port: number): Promise<boolean>;
}

function settings(): MarimoBridgeSettings {
	return {
		pythonPath: "",
		marimoPath: "",
		port: 2718,
		autoStart: false,
		startupTimeout: 1,
		takeOverPyExtension: true,
		defaultEmbedMode: "edit",
		defaultEmbedHeight: 600,
		showContextMenu: true,
		showMarkdownContextMenu: false,
		apiToken: "session-token",
		uvPath: "",
	};
}

function fakeChild(): ChildProcess {
	const child = new EventEmitter() as EventEmitter & {
		pid: number;
		stdout: EventEmitter;
		stderr: EventEmitter;
		kill: () => boolean;
	};
	child.pid = 99_999_993;
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = () => true;
	return child as unknown as ChildProcess;
}

function configureRunManager(
	vault: string
): {
	manager: ServerManager;
	spawnedFile: () => string | undefined;
} {
	const adapter = { getBasePath: () => vault } as FileSystemAdapter;
	const manager = new ServerManager(
		adapter,
		settings(),
		path.join(vault, "records.json")
	);
	const internal = manager as unknown as RunManagerInternals;
	let file: string | undefined;
	internal.allocateRunPort = async () => 2719;
	internal.spawnServer = (_kind, _port, requestedFile) => {
		file = requestedFile;
		return fakeChild();
	};
	internal.waitForReady = async () => true;
	return { manager, spawnedFile: () => file };
}

test("rejects run notebooks outside the Vault or without a Python file", async () => {
	const root = mkdtempSync(path.join(tmpdir(), "marimo-path-"));
	const vault = path.join(root, "vault");
	mkdirSync(vault);
	try {
		const outside = path.join(root, "outside.py");
		writeFileSync(outside, "print('outside')\n");
		const textFile = path.join(vault, "note.txt");
		writeFileSync(textFile, "not python\n");
		mkdirSync(path.join(vault, "directory.py"));
		const link = path.join(vault, "linked.py");
		symlinkSync(outside, link);

		for (const requested of [
			"",
			outside,
			"../outside.py",
			"missing.py",
			"note.txt",
			"directory.py",
			"linked.py",
		]) {
			const { manager, spawnedFile } = configureRunManager(vault);
			assert.equal(
				await manager.ensureRunServer(requested),
				null,
				requested
			);
			assert.equal(spawnedFile(), undefined, requested);
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("normalizes equivalent separators and Python extension case", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-path-"));
	try {
		const folder = path.join(vault, "folder");
		mkdirSync(folder);
		const notebook = path.join(folder, "Notebook.PY");
		writeFileSync(notebook, "print('ok')\n");

		const slashPath = resolveVaultNotebook(vault, "folder/Notebook.PY");
		const backslashPath = resolveVaultNotebook(vault, "folder\\Notebook.PY");

		assert.ok(slashPath);
		assert.ok(backslashPath);
		assert.equal(backslashPath.key, slashPath.key);
		assert.equal(backslashPath.absolutePath, slashPath.absolutePath);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("spawns a valid run notebook using its resolved absolute path", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-path-"));
	try {
		const folder = path.join(vault, "folder");
		mkdirSync(folder);
		const notebook = path.join(folder, "notebook.py");
		writeFileSync(notebook, "print('ok')\n");
		const { manager, spawnedFile } = configureRunManager(vault);

		assert.ok(await manager.ensureRunServer("folder/../folder/notebook.py"));
		assert.equal(spawnedFile(), realpathSync(notebook));
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});
