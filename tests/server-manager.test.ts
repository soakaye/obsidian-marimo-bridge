import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { EventEmitter, once } from "node:events";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	unlinkSync,
	writeFileSync,
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
	vaultPath: string;
	runServers: Map<string, ManagedServerState>;
	runServerRefs: Map<string, number>;
	runServerAliases: Map<string, string>;
	runSpawning: Map<string, Promise<string | null>>;
	nextRunPort: number;
	records: {
		add(record: SpawnedServerRecord): void;
		load(): SpawnedServerRecord[];
	};
	healthOk(port: number): Promise<boolean>;
	serverAcceptsOurAuth(port: number, token?: string): Promise<boolean>;
	adoptableSameVault(port: number): Promise<boolean>;
	allocateEditPort(): Promise<number>;
	findPidsOnPort(port: number): Promise<number[]>;
	isProcessAlive(pid: number): boolean;
	confirmOurServer(port: number, token?: string): Promise<boolean>;
	isPortFree(port: number): Promise<boolean>;
	resolveCommand(): { cmd: string; prefixArgs: string[] };
	waitForReady(port: number): Promise<boolean>;
	spawnServer(
		kind: "edit" | "run",
		port: number,
		file?: string,
		serverKey?: string
	): ChildProcess;
	killProcess(proc: ChildProcess | null): void;
	allocateRunPort(): Promise<number>;
	runServerUrl(port: number): string;
}

function makeSettings(): MarimoBridgeSettings {
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

test("always builds edit URLs on the fixed loopback host", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const legacySettings = makeSettings() as MarimoBridgeSettings & {
			host: string;
		};
		legacySettings.host = "0.0.0.0";
		const { manager } = makeManager(vault, legacySettings);

		assert.equal(manager.editBaseUrl, "http://127.0.0.1:2718");
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("builds token-bearing run URLs on the fixed loopback host", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { internal } = makeManager(vault);

		assert.equal(
			internal.runServerUrl(2719),
			"http://127.0.0.1:2719/?access_token=session-token"
		);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// Vault-scoped policy (015): a server on the configured port that even accepts
// our token but is NOT confirmed by a same-vault record (e.g. another vault
// sharing the token) is neither adopted nor terminated — we spawn our own on a
// free port instead.
test("does not adopt or terminate an authenticated server lacking a same-vault record", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		let spawnCount = 0;
		internal.isPortFree = async (p) => p !== settings.port; // configured busy
		internal.healthOk = async () => true;
		internal.serverAcceptsOurAuth = async () => true;
		internal.findPidsOnPort = async () => [];
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [FIXTURE],
		});
		manager.checkAvailable = async () => true;
		internal.waitForReady = async () => true;
		const realSpawn = internal.spawnServer.bind(manager);
		internal.spawnServer = (kind, port, file) => {
			spawnCount++;
			return realSpawn(kind, port, file);
		};

		assert.equal(await manager.ensureEditServer(), true);
		assert.equal(spawnCount, 1); // spawned our own, not adopted
		const edit = internal.edit;
		assert.ok(edit);
		assert.notEqual(edit.port, settings.port); // fell back off the busy port
		assert.notEqual(edit.process, null);

		const child = edit.process;
		if (child) {
			child.kill("SIGTERM");
			await once(child, "exit");
		}
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// US2 / 015: a NON-marimo process holding the configured port (not free, not
// healthy) must also trigger fallback — the `isPortFree` guard, not a health
// check, gates this so we never try to bind an occupied port.
test("falls back to a free port when a non-marimo process occupies the edit port", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		internal.isPortFree = async (p) => p !== settings.port; // configured busy
		internal.healthOk = async () => false; // not marimo
		internal.serverAcceptsOurAuth = async () => false;
		internal.findPidsOnPort = async () => [];
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [FIXTURE],
		});
		manager.checkAvailable = async () => true;
		internal.waitForReady = async () => true;

		assert.equal(await manager.ensureEditServer(), true);
		const edit = internal.edit;
		assert.ok(edit);
		assert.equal(edit.port, settings.port + 1); // next free port
		assert.notEqual(edit.process, null);

		const child = edit.process;
		if (child) {
			child.kill("SIGTERM");
			await once(child, "exit");
		}
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("counts every concurrent run-server acquisition before releasing it", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const folder = path.join(vault, "notebooks");
		mkdirSync(folder);
		writeFileSync(path.join(folder, "shared.py"), "print('shared')\n");
		const { manager, internal } = makeManager(vault);
		const child = fakeChild(99_999_994);
		let resolveReady: ((ready: boolean) => void) | undefined;
		internal.allocateRunPort = async () => 2719;
		internal.spawnServer = () => child;
		internal.waitForReady = () =>
			new Promise<boolean>((resolve) => {
				resolveReady = resolve;
			});
		let killCount = 0;
		internal.killProcess = () => {
			killCount++;
		};

		const first = manager.ensureRunServer("notebooks/shared.py");
		const second = manager.ensureRunServer("notebooks/../notebooks/shared.py");
		await new Promise<void>((resolve) => {
			setImmediate(resolve);
		});
		assert.ok(resolveReady);
		resolveReady(true);
		const firstUrl = await first;
		const secondUrl = await second;
		assert.ok(firstUrl);
		assert.equal(secondUrl, firstUrl);

		assert.equal(internal.runServerRefs.get("notebooks/shared.py"), 2);
		await manager.releaseRunServer("notebooks/shared.py");
		assert.equal(killCount, 0);
		assert.equal(internal.runServers.has("notebooks/shared.py"), true);
		await manager.releaseRunServer("notebooks/shared.py");
		assert.equal(killCount, 1);
		assert.equal(internal.runServers.has("notebooks/shared.py"), false);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("cleans all run-server state when startup fails", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		writeFileSync(path.join(vault, "failed.py"), "print('failed')\n");
		const { manager, internal } = makeManager(vault);
		internal.allocateRunPort = async () => 2719;
		internal.spawnServer = () => fakeChild(99_999_998);
		internal.waitForReady = async () => false;
		internal.killProcess = () => { };

		assert.equal(await manager.ensureRunServer("failed.py"), null);
		assert.equal(internal.runServers.size, 0);
		assert.equal(internal.runServerRefs.size, 0);
		assert.equal(internal.runServerAliases.size, 0);
		assert.equal(internal.runSpawning.size, 0);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("clears in-flight run startup tracking during global cleanup", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, internal } = makeManager(vault);
		internal.runSpawning.set("pending.py", Promise.resolve(null));

		manager.stopAll();

		assert.equal(internal.runSpawning.size, 0);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("leaves no tracked run server after ten acquire-release cycles", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		writeFileSync(path.join(vault, "cycles.py"), "print('cycles')\n");
		const { manager, internal } = makeManager(vault);
		internal.allocateRunPort = async () => 2719;
		internal.spawnServer = () => fakeChild(99_999_990);
		internal.waitForReady = async () => true;
		internal.killProcess = () => { };

		for (let cycle = 0; cycle < 10; cycle++) {
			assert.ok(await manager.ensureRunServer("cycles.py"));
			await manager.releaseRunServer("cycles.py");
			assert.equal(internal.runServers.size, 0);
			assert.equal(internal.runServerRefs.size, 0);
			assert.equal(internal.runServerAliases.size, 0);
		}
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("skips occupied and already-tracked run-server ports", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { internal } = makeManager(vault);
		internal.nextRunPort = 2718;
		internal.runServers.set("tracked.py", {
			kind: "run",
			port: 2719,
			process: null,
			ready: true,
		});
		internal.isPortFree = async (port) => port === 2721;

		assert.equal(await internal.allocateRunPort(), 2721);
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("spawns run servers headlessly with token authentication on loopback", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const notebook = path.join(vault, "spawn.py");
		writeFileSync(notebook, "print('spawn')\n");
		const { manager, internal } = makeManager(vault);
		const fixture = path.resolve(
			process.cwd(),
			"tests/fixtures/fake-marimo.mjs"
		);
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [fixture],
		});
		internal.allocateRunPort = async () => 2719;
		internal.waitForReady = async () => true;

		assert.ok(await manager.ensureRunServer("spawn.py"));
		const child = internal.runServers.get("spawn.py")?.process;
		assert.ok(child);
		assert.ok(child.spawnargs.includes("run"));
		assert.ok(child.spawnargs.includes(realpathSync(notebook)));
		assert.ok(child.spawnargs.includes("--headless"));
		assert.ok(child.spawnargs.includes("--token-password"));
		assert.ok(child.spawnargs.includes("--host"));
		assert.equal(
			child.spawnargs[child.spawnargs.indexOf("--host") + 1],
			"127.0.0.1"
		);
		assert.equal(
			child.spawnargs[child.spawnargs.indexOf("--token-password") + 1],
			"session-token"
		);

		child.kill("SIGTERM");
		await once(child, "exit");
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

test("releases a run server after its notebook file is deleted", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const notebookPath = path.join(vault, "deleted.py");
		writeFileSync(notebookPath, "print('deleted')\n");
		const { manager, internal } = makeManager(vault);
		internal.allocateRunPort = async () => 2719;
		internal.spawnServer = () => fakeChild(99_999_996);
		internal.waitForReady = async () => true;
		let killCount = 0;
		internal.killProcess = () => {
			killCount++;
		};

		assert.ok(await manager.ensureRunServer("deleted.py"));
		unlinkSync(notebookPath);
		await manager.releaseRunServer("deleted.py");

		assert.equal(killCount, 1);
		assert.equal(internal.runServers.size, 0);
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
			vaultRoot: internal.vaultPath,
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
			vaultRoot: internal.vaultPath,
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
		internal.isPortFree = async () => true;
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
		internal.isPortFree = async () => true;
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

const FIXTURE = path.resolve(process.cwd(), "tests/fixtures/fake-marimo.mjs");

// US1: a healthy server with no matching same-vault record (e.g. another vault
// sharing our token) must NOT be adopted; we fall back and spawn our own.
// US1: a healthy server confirmed by a same-vault record IS adopted (reused).
test("adopts a healthy server confirmed by a same-vault record", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		internal.records.add({
			pid: 4242,
			port: settings.port,
			kind: "edit",
			token: "session-token",
			vaultRoot: internal.vaultPath,
		});
		internal.isPortFree = async () => false; // configured port occupied by it
		internal.healthOk = async () => true;
		internal.findPidsOnPort = async () => [4242];
		internal.serverAcceptsOurAuth = async () => true;

		assert.equal(await manager.ensureEditServer(), true);
		const edit = internal.edit;
		assert.ok(edit);
		assert.equal(edit.port, settings.port);
		assert.equal(edit.process, null); // adopted, not spawned
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// US1: reconciliation must not confirm/kill a record from a different vault.
test("reconciliation leaves a different-vault record untouched and prunes it", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, recordsPath, internal } = makeManager(vault);
		internal.records.add({
			pid: 5555,
			port: 2718,
			kind: "edit",
			token: "record-token",
			vaultRoot: "/some/other/vault",
		});
		internal.isProcessAlive = () => true;
		internal.findPidsOnPort = async () => [5555];
		let confirmCalled = false;
		internal.confirmOurServer = async () => {
			confirmCalled = true;
			return true;
		};

		await manager.reconcileOrphans();

		assert.equal(confirmCalled, false); // vault gate short-circuits before confirm
		assert.equal(readRecordCount(recordsPath), 0); // unconfirmed record pruned
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// US1 / FR-007: same-session reuse uses the in-memory fast path (no re-probe).
test("reuses the in-session edit server via the fast path (FR-007)", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		const child = fakeChild(99_999_994);
		internal.edit = {
			kind: "edit",
			port: settings.port,
			process: child,
			ready: true,
		};
		let healthCalls = 0;
		internal.healthOk = async () => {
			healthCalls++;
			return true;
		};

		assert.equal(await manager.ensureEditServer(), true);
		const edit = internal.edit;
		assert.ok(edit);
		assert.equal(edit.process, child); // unchanged
		assert.equal(healthCalls, 0); // fast path, no adoption probing
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// US1 / FR-007: restart brings a fresh same-vault server ready on the port.
test("restartEditServer brings a fresh server ready (FR-007)", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [FIXTURE],
		});
		internal.isPortFree = async () => true; // configured port is free
		internal.healthOk = async () => false;
		manager.checkAvailable = async () => true;
		internal.waitForReady = async () => true;

		assert.equal(await manager.restartEditServer(), true);
		const edit = internal.edit;
		assert.ok(edit);
		assert.notEqual(edit.process, null);
		assert.equal(edit.port, settings.port);

		const child = edit.process;
		if (child) {
			child.kill("SIGTERM");
			await once(child, "exit");
		}
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// US2: edit server falls back to the next free port when configured is occupied.
test("edit server falls back to the next free port via isPortFree scan", async () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		internal.healthOk = async (p) => p === settings.port;
		internal.serverAcceptsOurAuth = async () => true;
		internal.isPortFree = async (p) => p !== settings.port; // configured busy
		internal.resolveCommand = () => ({
			cmd: process.execPath,
			prefixArgs: [FIXTURE],
		});
		manager.checkAvailable = async () => true;
		internal.waitForReady = async () => true;

		assert.equal(await manager.ensureEditServer(), true);
		const edit = internal.edit;
		assert.ok(edit);
		assert.equal(edit.port, settings.port + 1);

		const child = edit.process;
		if (child) {
			child.kill("SIGTERM");
			await once(child, "exit");
		}
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});

// US2 / FR-004: edit URLs target the bound port, else the configured port.
test("edit URLs follow the bound edit-server port", () => {
	const vault = mkdtempSync(path.join(tmpdir(), "marimo-manager-"));
	try {
		const { manager, settings, internal } = makeManager(vault);
		// No edit server yet → configured port.
		assert.ok(manager.editBaseUrl.includes(`:${settings.port.toString()}`));
		assert.ok(
			manager.editFileUrl("a.py").includes(`:${settings.port.toString()}`)
		);

		internal.edit = {
			kind: "edit",
			port: 2725,
			process: null,
			ready: true,
		};
		assert.ok(manager.editBaseUrl.includes(":2725"));
		assert.ok(manager.editHomeUrl().includes(":2725"));
		assert.ok(manager.editFileUrl("a.py").includes(":2725"));
	} finally {
		rmSync(vault, { recursive: true, force: true });
	}
});
