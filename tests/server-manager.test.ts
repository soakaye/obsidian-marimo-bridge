import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { EventEmitter, once } from "node:events";
import {
	mkdtempSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import type { FileSystemAdapter } from "obsidian";
import { ServerManager } from "../src/server-manager";
import type { SpawnedServerRecord } from "../src/server-records";
import type { MarimoBridgeSettings } from "../src/settings";

Object.defineProperty(globalThis, "window", {
	configurable: true,
	value: globalThis,
});

interface ManagedServerState {
	kind: "edit" | "run";
	port: number;
	process: ChildProcess | null;
	ready: boolean;
}

interface ManagerInternals {
	edit: ManagedServerState | null;
	records: {
		add(record: SpawnedServerRecord): void;
		load(): SpawnedServerRecord[];
	};
	healthOk(port: number): Promise<boolean>;
	serverAcceptsOurAuth(port: number, token?: string): Promise<boolean>;
	killPort(port: number): Promise<void>;
	findPidsOnPort(port: number): Promise<number[]>;
	isProcessAlive(pid: number): boolean;
	confirmOurServer(port: number, token?: string): Promise<boolean>;
	resolveCommand(): { cmd: string; prefixArgs: string[] };
	waitForReady(port: number): Promise<boolean>;
	spawnServer(
		kind: "edit" | "run",
		port: number,
		file?: string
	): ChildProcess;
}

function makeSettings(): MarimoBridgeSettings {
	return {
		pythonPath: "",
		marimoPath: "",
		port: 2718,
		host: "127.0.0.1",
		autoStart: false,
		startupTimeout: 1,
		takeOverPyExtension: true,
		defaultEmbedMode: "edit",
		defaultEmbedHeight: 600,
		showContextMenu: true,
		apiToken: "session-token",
	};
}

function makeManager(
	vaultPath: string,
	settings = makeSettings()
): {
	manager: ServerManager;
	recordsPath: string;
	settings: MarimoBridgeSettings;
	internal: ManagerInternals;
} {
	const adapter = {
		getBasePath: () => vaultPath,
	} as FileSystemAdapter;
	const recordsPath = path.join(vaultPath, "records.json");
	const manager = new ServerManager(adapter, settings, recordsPath);
	return {
		manager,
		recordsPath,
		settings,
		internal: manager as unknown as ManagerInternals,
	};
}

function fakeChild(pid: number): ChildProcess {
	const child = new EventEmitter() as EventEmitter & {
		pid: number;
		stdout: EventEmitter;
		stderr: EventEmitter;
		kill: () => boolean;
	};
	child.pid = pid;
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = () => true;
	return child as unknown as ChildProcess;
}

function readRecordCount(recordsPath: string): number {
	const parsed = JSON.parse(readFileSync(recordsPath, "utf8")) as {
		records: unknown[];
	};
	return parsed.records.length;
}

test("does not kill an incompatible process occupying the edit port", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, internal } = makeManager(vault);
		let killCount = 0;
		internal.healthOk = async () => true;
		internal.serverAcceptsOurAuth = async () => false;
		internal.killPort = async () => {
			killCount++;
		};
		manager.checkAvailable = async () => false;

		assert.equal(await manager.ensureEditServer(), false);
		assert.equal(killCount, 0);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("reconciles an orphan with the token stored for that process", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, internal } = makeManager(vault);
		const record = {
			pid: 1234,
			port: 2718,
			kind: "edit",
			token: "record-token",
		} as SpawnedServerRecord;
		internal.records.add(record);
		internal.isProcessAlive = () => true;
		internal.findPidsOnPort = async () => [record.pid];
		let confirmedToken: string | undefined;
		internal.confirmOurServer = async (_port, token) => {
			confirmedToken = token;
			return false;
		};

		await manager.reconcileOrphans();

		assert.equal(confirmedToken, record.token);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("retains a process record when stop only requests termination", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, recordsPath, internal } = makeManager(vault);
		const record = {
			pid: 99_999_991,
			port: 2718,
			kind: "edit",
			token: "session-token",
		} as SpawnedServerRecord;
		internal.records.add(record);
		internal.edit = {
			kind: "edit",
			port: record.port,
			process: fakeChild(record.pid),
			ready: true,
		};

		manager.stopAll();

		assert.equal(readRecordCount(recordsPath), 1);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("clears managed edit state and its record after the child exits", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, recordsPath, internal } = makeManager(vault);
		const fixture = path.resolve(
			process.cwd(),
			"tests/fixtures/fake-marimo.mjs"
		);
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [fixture],
		});
		internal.healthOk = async () => false;
		manager.checkAvailable = async () => true;
		internal.waitForReady = async () => true;

		assert.equal(await manager.ensureEditServer(), true);
		const child = internal.edit?.process;
		assert.ok(child);
		child.kill("SIGTERM");
		await once(child, "exit");

		assert.equal(internal.edit, null);
		assert.equal(readRecordCount(recordsPath), 0);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("terminates and clears an edit child after startup timeout", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	const capture: { child: ChildProcess | null } = { child: null };
	try {
		const { manager, internal } = makeManager(vault);
		const fixture = path.resolve(
			process.cwd(),
			"tests/fixtures/fake-marimo.mjs"
		);
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [fixture],
		});
		internal.healthOk = async () => false;
		manager.checkAvailable = async () => true;
		internal.waitForReady = async () => false;
		const spawn = internal.spawnServer.bind(manager);
		internal.spawnServer = (kind, port, file) => {
			const child = spawn(kind, port, file);
			capture.child = child;
			return child;
		};

		assert.equal(await manager.ensureEditServer(), false);
		assert.equal(internal.edit, null);
		const child = capture.child;
		assert.ok(child);
		const exited =
			child.exitCode !== null || child.signalCode !== null
				? true
				: await Promise.race([
						once(child, "exit").then(() => true),
						new Promise<boolean>((resolve) => {
							globalThis.setTimeout(() => {
								resolve(false);
							}, 1000);
						}),
					]);
		assert.equal(exited, true);
	} finally {
		const child = capture.child;
		if (child?.exitCode === null && child.signalCode === null) {
			child.kill("SIGTERM");
			await once(child, "exit");
		}
		rmSync(vault, { recursive: true, force: true });
	}
});

test("invalidates a ready server when process settings change", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		internal.edit = {
			kind: "edit",
			port: settings.port,
			process: fakeChild(99_999_992),
			ready: true,
		};

		settings.port = 3000;
		manager.invalidateAvailability();

		assert.equal(internal.edit, null);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});
