/**
 * ServerManager — owns the lifecycle of marimo server processes and exposes
 * the detection / installation helpers used by the settings tab.
 *
 * There are two kinds of server:
 *   - "edit": a single, always-on `marimo edit` server rooted at the vault.
 *     Every full-editor view and every `mode: edit` embed points at it.
 *   - "run":  a per-notebook `marimo run` server, started lazily for read-only
 *     `mode: run` embeds (marimo's app view is a separate process from edit).
 */
import { FileSystemAdapter, Notice, requestUrl } from "obsidian";
import { spawn, exec, execSync, type ChildProcess } from "child_process";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { MarimoBridgeSettings } from "./settings";
import { ServerRecordStore, type SpawnedServerRecord } from "./server-records";
import {
	PLATFORM_WIN32,
	DIR_VENV,
	DIR_SCRIPTS_WIN,
	DIR_SCRIPTS_UNIX,
	EXE_MARIMO_WIN,
	EXE_MARIMO_UNIX,
	EXE_PYTHON_WIN,
	EXE_PYTHON_UNIX,
	FALLBACK_PYTHON_UNIX,
	CMD_MARIMO,
	NOTICE_TIMEOUT_MS,
	PIP_INSTALL_TIMEOUT_MS,
	SLEEP_DELAY_MS,
	METHOD_GET,
	PATH_HEALTH,
	PATH_AUTH_LOGIN,
	QUERY_FILE,
	SCHEME_HTTP,
	CMD_ARG_M,
	CMD_ARG_PIP,
	CMD_ARG_INSTALL,
	CMD_ARG_VERSION,
	CMD_ARG_HEADLESS,
	CMD_ARG_TOKEN_PASSWORD,
	CMD_ARG_PORT,
	CMD_ARG_HOST,
	SIGNAL_SIGTERM,
	MS_PER_SEC,
	TEXT_NOT_INSTALLED_ERROR,
	TEXT_VENV_BROKEN_ERROR,
	SIGNAL_PROBE,
	RECONCILE_CONFIRM_TIMEOUT_MS
} from "./constants";

type ServerKind = "edit" | "run";

/** Bookkeeping for one running (or attached) marimo server. */
interface ManagedServer {
	kind: ServerKind;
	port: number;
	/** The child process we spawned, or `null` if we attached to an existing one. */
	process: ChildProcess | null;
	/** True once the health endpoint has responded. */
	ready: boolean;
}

export class ServerManager {
	private settings: MarimoBridgeSettings;
	/** Absolute path to the vault root; used as the server working directory. */
	private vaultPath: string;
	private edit: ManagedServer | null = null;
	/** Map of vault-relative notebook path → its dedicated "run" server. */
	private runServers = new Map<string, ManagedServer>();
	/** Next candidate port for a "run" server (incremented as ports are taken). */
	private nextRunPort: number;
	/** Cached marimo availability; `null` means "not checked yet". */
	private available: boolean | null = null;
	private sessionToken: string | null = null;
	private editSpawning: Promise<boolean> | null = null;
	/** Crash-recovery store of servers we spawned (PID/port/kind). */
	private records: ServerRecordStore;
	/** Set once {@link reconcileOrphans} starts; `ensure*` await it before spawning. */
	private reconcilePromise: Promise<void> | null = null;

	constructor(
		adapter: FileSystemAdapter,
		settings: MarimoBridgeSettings,
		recordsPath: string
	) {
		this.settings = settings;
		this.vaultPath = adapter.getBasePath();
		this.nextRunPort = settings.port + 1;
		this.records = new ServerRecordStore(recordsPath);
	}

	/** Gets the active token, generating a session token dynamically if custom token is empty. */
	getActiveToken(): string {
		if (this.settings.apiToken && this.settings.apiToken.trim() !== "") {
			return this.settings.apiToken.trim();
		}
		this.sessionToken ??= crypto.randomBytes(16).toString("hex");
		return this.sessionToken;
	}

	// ---------------------------------------------------------------------
	// Executable / interpreter resolution
	// ---------------------------------------------------------------------

	/**
	 * Resolve how to invoke marimo, in priority order:
	 *   1. configured marimo executable path
	 *   2. `<vault>/.venv/Scripts/marimo.exe`
	 *   3. configured Python interpreter, run as `python -m marimo`
	 *   4. `<vault>/.venv/Scripts/python.exe -m marimo`
	 *   5. `marimo` on PATH (last resort)
	 */
	private resolveCommand(): { cmd: string; prefixArgs: string[] } {
		const configured = this.settings.marimoPath;
		if (configured && fs.existsSync(configured)) {
			return { cmd: configured, prefixArgs: [] };
		}
		const isWin = process.platform === PLATFORM_WIN32;
		const scriptsDir = isWin ? DIR_SCRIPTS_WIN : DIR_SCRIPTS_UNIX;
		const marimoBin = isWin ? EXE_MARIMO_WIN : EXE_MARIMO_UNIX;
		const pythonBin = isWin ? EXE_PYTHON_WIN : EXE_PYTHON_UNIX;

		const scripts = path.join(this.vaultPath, DIR_VENV, scriptsDir);
		const marimoPath = path.join(scripts, marimoBin);
		const venvPython = path.join(scripts, pythonBin);
		// Only prefer the vault venv's marimo if the venv's Python is actually
		// runnable. A venv whose base interpreter was removed (e.g. a Homebrew /
		// pyenv upgrade) leaves `marimo` as a real file whose shebang execs a
		// now-missing python: `existsSync(marimoPath)` is true, yet launching it
		// fails and detection silently reports "not installed". `existsSync`
		// follows symlinks, so a dangling venv python returns false here.
		if (fs.existsSync(marimoPath) && fs.existsSync(venvPython)) {
			return { cmd: marimoPath, prefixArgs: [] };
		}
		const configuredPy = this.settings.pythonPath;
		if (configuredPy) {
			return { cmd: configuredPy, prefixArgs: [CMD_ARG_M, CMD_MARIMO] };
		}
		if (fs.existsSync(venvPython)) {
			return { cmd: venvPython, prefixArgs: [CMD_ARG_M, CMD_MARIMO] };
		}
		return { cmd: CMD_MARIMO, prefixArgs: [] };
	}

	/**
	 * Resolve the Python interpreter that `pip install marimo` targets.
	 * Prefers the configured path, then the vault's `.venv`, then PATH.
	 */
	resolvePython(): string {
		const configured = this.settings.pythonPath;
		if (configured) return configured;
		const isWin = process.platform === PLATFORM_WIN32;
		const scriptsDir = isWin ? DIR_SCRIPTS_WIN : DIR_SCRIPTS_UNIX;
		const pythonBin = isWin ? EXE_PYTHON_WIN : EXE_PYTHON_UNIX;

		const venvPy = path.join(
			this.vaultPath,
			DIR_VENV,
			scriptsDir,
			pythonBin
		);
		if (fs.existsSync(venvPy)) return venvPy;
		if (this.settings.marimoPath) {
			// Try a python binary sitting next to the configured marimo binary.
			const sib = path.join(
				path.dirname(this.settings.marimoPath),
				pythonBin
			);
			if (fs.existsSync(sib)) return sib;
		}
		return isWin ? EXE_PYTHON_UNIX : FALLBACK_PYTHON_UNIX;
	}

	/**
	 * True when the vault has a `.venv` whose marimo launcher is present but
	 * whose Python interpreter is not runnable — e.g. the base interpreter was
	 * removed by a Homebrew/pyenv upgrade, leaving the venv's python a dangling
	 * symlink. Lets callers distinguish "broken venv" from "marimo simply not
	 * installed" and show actionable guidance. `existsSync` follows symlinks, so
	 * a dangling venv python returns false.
	 */
	vaultVenvBroken(): boolean {
		const isWin = process.platform === PLATFORM_WIN32;
		const scriptsDir = isWin ? DIR_SCRIPTS_WIN : DIR_SCRIPTS_UNIX;
		const scripts = path.join(this.vaultPath, DIR_VENV, scriptsDir);
		const marimoBin = isWin ? EXE_MARIMO_WIN : EXE_MARIMO_UNIX;
		const pythonBin = isWin ? EXE_PYTHON_WIN : EXE_PYTHON_UNIX;
		const marimoPresent = fs.existsSync(path.join(scripts, marimoBin));
		const pythonRunnable = fs.existsSync(path.join(scripts, pythonBin));
		return marimoPresent && !pythonRunnable;
	}

	// ---------------------------------------------------------------------
	// Detection / installation
	// ---------------------------------------------------------------------

	/**
	 * Spawn a command, capture stdout/stderr, and resolve with the exit info.
	 * Never rejects: spawn errors and timeouts resolve with `code: -1` so
	 * callers can treat "couldn't run" uniformly.
	 */
	private runCapture(
		cmd: string,
		args: string[],
		timeoutMs: number
	): Promise<{ code: number | null; stdout: string; stderr: string }> {
		return new Promise((resolve) => {
			let stdout = "";
			let stderr = "";
			let proc: ChildProcess;
			try {
				proc = spawn(cmd, args, {
					cwd: this.vaultPath,
					windowsHide: true,
					env: process.env,
				});
			} catch (e) {
				resolve({ code: -1, stdout: "", stderr: String(e) });
				return;
			}
			const timer = window.setTimeout(() => {
				this.killProcess(proc);
				resolve({ code: -1, stdout, stderr: stderr + "\n[timeout]" });
			}, timeoutMs);
			proc.stdout?.on("data", (d: Buffer | string) => (stdout += d.toString()));
			proc.stderr?.on("data", (d: Buffer | string) => (stderr += d.toString()));
			proc.on("error", (err) => {
				window.clearTimeout(timer);
				resolve({ code: -1, stdout, stderr: stderr + String(err) });
			});
			proc.on("close", (code) => {
				window.clearTimeout(timer);
				resolve({ code, stdout, stderr });
			});
		});
	}

	/** Return marimo's version string, or `null` if it is not installed/usable. */
	async getMarimoVersion(): Promise<string | null> {
		const { cmd, prefixArgs } = this.resolveCommand();
		const { code, stdout, stderr } = await this.runCapture(
			cmd,
			[...prefixArgs, CMD_ARG_VERSION],
			NOTICE_TIMEOUT_MS
		);
		if (code !== 0) return null;
		// `marimo --version` prints e.g. "0.23.9"; be lenient about format.
		const out = (stdout || stderr).trim();
		const m = /(\d+\.\d+\.\d+\S*)/.exec(out);
		return m?.[1] ?? (out || "installed");
	}

	/**
	 * Drop the cached availability so the next {@link checkAvailable} call
	 * re-detects. Call this after the interpreter/marimo path changes.
	 */
	invalidateAvailability(): void {
		this.available = null;
	}

	/** Cached check for whether marimo can be launched. */
	async checkAvailable(force = false): Promise<boolean> {
		if (this.available !== null && !force) return this.available;
		this.available = (await this.getMarimoVersion()) !== null;
		return this.available;
	}

	/** Install marimo into the resolved Python via `pip install marimo`. */
	async installMarimo(): Promise<{ ok: boolean; message: string }> {
		const python = this.resolvePython();
		new Notice("Installing marimo… this may take a minute.");
		const { code, stderr } = await this.runCapture(
			python,
			[CMD_ARG_M, CMD_ARG_PIP, CMD_ARG_INSTALL, CMD_MARIMO],
			PIP_INSTALL_TIMEOUT_MS
		);
		this.available = null; // force re-detection next time
		if (code === 0) {
			const version = await this.getMarimoVersion();
			const msg = `marimo installed${version ? ` (${version})` : ""}.`;
			new Notice(msg);
			return { ok: true, message: msg };
		}
		const msg = `marimo install failed (exit ${String(code)}). Check the console.`;
		console.error("[marimo-bridge] pip install failed:", stderr);
		new Notice(msg, NOTICE_TIMEOUT_MS);
		return { ok: false, message: msg };
	}

	// ---------------------------------------------------------------------
	// URL helpers (consumed by the view and embed processor)
	// ---------------------------------------------------------------------

	get editBaseUrl(): string {
		return `${SCHEME_HTTP}${this.settings.host}:${this.settings.port.toString()}`;
	}

	/** URL that opens a specific notebook in the edit server. */
	editFileUrl(vaultRelativePath: string): string {
		return `${this.editBaseUrl}${QUERY_FILE}${encodeURIComponent(
			vaultRelativePath
		)}&access_token=${encodeURIComponent(this.getActiveToken())}`;
	}

	/** URL of the edit server's home page (notebook browser). */
	editHomeUrl(): string {
		return `${this.editBaseUrl}/?access_token=${encodeURIComponent(this.getActiveToken())}`;
	}

	// ---------------------------------------------------------------------
	// Server lifecycle
	// ---------------------------------------------------------------------

	/** True if the marimo `/health` endpoint on `port` returns HTTP 200. */
	private async healthOk(port: number): Promise<boolean> {
		try {
			const res = await requestUrl({
				url: `${SCHEME_HTTP}${this.settings.host}:${port.toString()}${PATH_HEALTH}`,
				method: METHOD_GET,
				throw: false,
			});
			return res.status === 200;
		} catch {
			return false;
		}
	}

	/**
	 * Decide whether the server already running on `port` is one we can use: a
	 * marimo server started the way we start ours (`--token-password`) AND
	 * accepting our current token.
	 *
	 * `/health` is unauthenticated (always 200), so it cannot tell a usable
	 * server from a leftover. Instead we look at how the root redirects (a
	 * correct token still 303-redirects — to `/`, not to the login page — so a
	 * plain 200 check is wrong):
	 *   - no token  → a `--token-password` server bounces to `/auth/login`; a
	 *                 `--no-token`/foreign leftover serves 200. The latter is not
	 *                 ours (it strips our token and renders blank) — evict it.
	 *   - our token → the right token redirects away from `/auth/login`; a
	 *                 wrong/stale token still lands on `/auth/login`. The latter
	 *                 is unusable — evict it.
	 */
	private async serverAcceptsOurAuth(port: number): Promise<boolean> {
		const enforcesAuth = await this.redirectsToLogin(port, null);
		if (!enforcesAuth) return false;
		const ourTokenRejected = await this.redirectsToLogin(port, this.getActiveToken());
		return !ourTokenRejected;
	}

	/**
	 * GET the root (optionally with `?access_token=`) WITHOUT following redirects
	 * and report whether the server bounced us to its login page. Uses Node's
	 * `http` directly because Obsidian's `requestUrl` silently follows redirects.
	 */
	private redirectsToLogin(port: number, token: string | null): Promise<boolean> {
		return new Promise((resolve) => {
			const path = token
				? `/?access_token=${encodeURIComponent(token)}`
				: "/";
			const req = http.request(
				{ host: this.settings.host, port, path, method: METHOD_GET },
				(res) => {
					res.resume(); // drain so the socket can close
					const status = res.statusCode ?? 0;
					const location = res.headers.location ?? "";
					resolve(
						status >= 300 && status < 400 && location.includes(PATH_AUTH_LOGIN)
					);
				}
			);
			req.on("error", () => { resolve(false); });
			req.setTimeout(SLEEP_DELAY_MS * 6, () => {
				req.destroy();
				resolve(false);
			});
			req.end();
		});
	}

	/** Find PIDs of processes listening on `port` (best-effort, cross-platform). */
	private findPidsOnPort(port: number): Promise<number[]> {
		return new Promise((resolve) => {
			const isWin = process.platform === PLATFORM_WIN32;
			// Restrict to LISTENING sockets only. A bare `lsof -ti tcp:<port>`
			// also matches *client* connections to that port — including our own
			// host process's connections (health checks, the webview) and any
			// TIME_WAIT sockets — so killing those PIDs could terminate Obsidian
			// itself or unrelated processes. The Windows branch already filters
			// for LISTENING below.
			const cmd = isWin
				? `netstat -ano | findstr :${port.toString()}`
				: `lsof -ti tcp:${port.toString()} -sTCP:LISTEN`;
			exec(cmd, (err, stdout) => {
				if (!stdout) {
					resolve([]);
					return;
				}
				const pids = new Set<number>();
				for (const line of stdout.split(/\r?\n/)) {
					const n = isWin
						? Number(/LISTENING\s+(\d+)/.exec(line)?.[1])
						: Number(line.trim());
					if (Number.isInteger(n) && n > 0) pids.add(n);
				}
				resolve([...pids]);
			});
		});
	}

	/**
	 * Kill whatever is listening on `port`. Used to evict a leftover/foreign
	 * marimo server that we can't authenticate against before spawning a fresh
	 * one we control.
	 */
	private async killPort(port: number): Promise<void> {
		const pids = await this.findPidsOnPort(port);
		const isWin = process.platform === PLATFORM_WIN32;
		for (const pid of pids) {
			if (isWin) {
				exec(`taskkill /PID ${pid.toString()} /T /F`, () => {
					// No-op: ignore taskkill errors/output
				});
			} else {
				try {
					process.kill(pid, "SIGKILL");
				} catch {
					// Process already gone or not killable; ignore.
				}
			}
		}
		if (pids.length > 0) await sleep(SLEEP_DELAY_MS);
	}

	/** Poll the health endpoint until it responds or the timeout elapses. */
	private async waitForReady(port: number): Promise<boolean> {
		const deadline = Date.now() + this.settings.startupTimeout * MS_PER_SEC;
		while (Date.now() < deadline) {
			if (await this.healthOk(port)) return true;
			await sleep(SLEEP_DELAY_MS);
		}
		return false;
	}

	/** Ensure the always-on edit server is running and healthy. */
	async ensureEditServer(): Promise<boolean> {
		// Never spawn/adopt before prior-session orphans have been reconciled.
		if (this.reconcilePromise) await this.reconcilePromise;
		if (this.edit?.ready) return true;
		if (this.editSpawning) return this.editSpawning;

		this.editSpawning = (async () => {
			try {
				const port = this.settings.port;

				// Reuse a pre-existing server on this port (e.g. one we started before
				// a reload, or one launched manually) — but only if it accepts our
				// token. A leftover server with different auth (an old `--no-token`
				// instance, or one expecting a now-stale session token) answers
				// `/health` with 200 yet redirects our token URLs, rendering blank.
				// Evict such a server and spawn a fresh one we control.
				if (await this.healthOk(port)) {
					if (await this.serverAcceptsOurAuth(port)) {
						this.edit = { kind: "edit", port, process: null, ready: true };
						return true;
					}
					console.warn(
						`[MarimoBridge] An incompatible marimo server is holding port ${port.toString()}; evicting it and starting a fresh one.`
					);
					await this.killPort(port);
				}

				// Don't attempt to spawn if marimo isn't installed — fail fast instead
				// of waiting out the full startup timeout.
				if (!(await this.checkAvailable())) {
					new Notice(
						this.vaultVenvBroken()
							? TEXT_VENV_BROKEN_ERROR
							: TEXT_NOT_INSTALLED_ERROR,
						NOTICE_TIMEOUT_MS
					);
					return false;
				}

				// Final guard against a startup race: another caller (auto-start vs.
				// a restored view/embed) may have brought the server up between our
				// health check above and here. Adopt it instead of spawning a second
				// process that would only fail with EADDRINUSE.
				if (await this.healthOk(port) && await this.serverAcceptsOurAuth(port)) {
					this.edit = { kind: "edit", port, process: null, ready: true };
					return true;
				}

				const proc = this.spawnServer("edit", port);
				this.edit = { kind: "edit", port, process: proc, ready: false };

				const ready = await this.waitForReady(port);
				this.edit.ready = ready;
				if (ready) {
					new Notice(`marimo server ready on :${port.toString()}`);
				} else {
					new Notice(
						`marimo server did not become ready within ${this.settings.startupTimeout.toString()}s. Check the marimo path in settings.`,
						NOTICE_TIMEOUT_MS
					);
				}
				return ready;
			} catch (e) {
				console.error("[MarimoBridge] Exception in ensureEditServer:", e);
				return false;
			} finally {
				this.editSpawning = null;
			}
		})();

		return this.editSpawning;
	}

	/**
	 * Ensure a read-only "run" server exists for a notebook and return its URL.
	 * Returns `null` if the server failed to become ready.
	 */
	async ensureRunServer(vaultRelativePath: string): Promise<string | null> {
		// Never spawn before prior-session orphans have been reconciled.
		if (this.reconcilePromise) await this.reconcilePromise;
		const existing = this.runServers.get(vaultRelativePath);
		if (existing?.ready) {
			return `http://${this.settings.host}:${existing.port.toString()}/?access_token=${encodeURIComponent(this.getActiveToken())}`;
		}

		const port = this.allocateRunPort();
		const proc = this.spawnServer("run", port, vaultRelativePath);
		const server: ManagedServer = {
			kind: "run",
			port,
			process: proc,
			ready: false,
		};
		this.runServers.set(vaultRelativePath, server);

		const ready = await this.waitForReady(port);
		server.ready = ready;
		if (!ready) {
			this.runServers.delete(vaultRelativePath);
			this.killProcess(proc);
			return null;
		}
		return `http://${this.settings.host}:${port.toString()}/?access_token=${encodeURIComponent(this.getActiveToken())}`;
	}

	/** Pick the next free port for a run server, avoiding ones already in use. */
	private allocateRunPort(): number {
		const used = new Set<number>([this.settings.port]);
		for (const s of this.runServers.values()) used.add(s.port);
		let p = this.nextRunPort;
		while (used.has(p)) p++;
		this.nextRunPort = p + 1;
		return p;
	}

	/** Spawn a marimo `edit`/`run` server, wiring its output to the console. */
	private spawnServer(
		kind: ServerKind,
		port: number,
		file?: string
	): ChildProcess {
		const { cmd, prefixArgs } = this.resolveCommand();
		const args = [...prefixArgs, kind];
		if (kind === "run" && file) {
			args.push(file);
		}
		// --headless: don't open a browser; --token-password: authenticate.
		args.push(
			CMD_ARG_HEADLESS,
			CMD_ARG_TOKEN_PASSWORD,
			this.getActiveToken(),
			CMD_ARG_PORT,
			String(port),
			CMD_ARG_HOST,
			this.settings.host
		);

		const isWin = process.platform === PLATFORM_WIN32;
		const proc = spawn(cmd, args, {
			cwd: this.vaultPath,
			windowsHide: true,
			env: process.env,
			detached: !isWin,
		});

		// Persist a crash-recovery record BEFORE the server can be orphaned, so a
		// force-quit/crash leaves a trail for next-launch reconciliation. Only
		// servers we spawn are recorded — adopted servers are never recorded.
		if (proc.pid !== undefined) {
			this.records.add({ pid: proc.pid, port, kind });
		}

		proc.stdout.on("data", (d: Buffer | string) => {
			// eslint-disable-next-line obsidianmd/rule-custom-message
			console.log(`[marimo:${kind}:${port.toString()}] ${d.toString().trim()}`);
		});
		proc.stderr.on("data", (d: Buffer | string) => {
			// eslint-disable-next-line obsidianmd/rule-custom-message
			console.log(`[marimo:${kind}:${port.toString()}] ${d.toString().trim()}`);
		});
		proc.on("exit", (code) => {
			// eslint-disable-next-line obsidianmd/rule-custom-message
			console.log(`[marimo:${kind}:${port.toString()}] exited (${String(code)})`);
		});
		proc.on("error", (err) => {
			console.error(`[marimo:${kind}:${port.toString()}] spawn error`, err);
			new Notice(
				`marimo failed to start: ${err.message}. Check the marimo path in settings.`,
				NOTICE_TIMEOUT_MS
			);
		});
		return proc;
	}

	/**
	 * Kill a process we spawned and drop its crash-recovery record. On Windows we
	 * kill the whole tree (`taskkill /T`) because marimo spawns worker
	 * subprocesses that `child.kill()` would orphan.
	 */
	private killProcess(proc: ChildProcess | null): void {
		if (proc?.pid === undefined) return;
		const pid = proc.pid;
		if (process.platform === PLATFORM_WIN32) {
			exec(`taskkill /PID ${pid.toString()} /T /F`, () => {
				// No-op: ignore taskkill errors/output
			});
		} else {
			try {
				process.kill(-pid, SIGNAL_SIGTERM);
			} catch {
				proc.kill(SIGNAL_SIGTERM);
			}
		}
		this.records.remove(pid);
	}

	/**
	 * Terminate a process tree given only its PID (no `ChildProcess` handle) —
	 * used by the exit handler and next-launch reconciliation. A single graceful
	 * signal per process, no escalation/wait (FR-011). On Unix we signal the
	 * detached process group; on Windows we kill the tree. `sync` uses blocking
	 * calls for exit-time handlers that cannot await async `exec` callbacks.
	 */
	private killByPid(pid: number, sync: boolean): void {
		if (process.platform === PLATFORM_WIN32) {
			const cmd = `taskkill /PID ${pid.toString()} /T /F`;
			if (sync) {
				try {
					execSync(cmd, { windowsHide: true });
				} catch {
					// Process already gone / not killable; ignore.
				}
			} else {
				exec(cmd, () => {
					// No-op: ignore taskkill errors/output
				});
			}
		} else {
			try {
				process.kill(-pid, SIGNAL_SIGTERM);
			} catch {
				try {
					process.kill(pid, SIGNAL_SIGTERM);
				} catch {
					// Process already gone; ignore.
				}
			}
		}
	}

	/** True if `pid` still references a live process (probe via signal 0). */
	private isProcessAlive(pid: number): boolean {
		try {
			process.kill(pid, SIGNAL_PROBE);
			return true;
		} catch (e) {
			// EPERM: it exists but we may not signal it — still "alive".
			return (e as NodeJS.ErrnoException).code === "EPERM";
		}
	}

	/**
	 * Confirm the server on `port` is one of ours (a `--token-password` server
	 * that accepts the active token), bounded by a short timeout so a hung port
	 * cannot stall startup.
	 */
	private confirmOurServer(port: number): Promise<boolean> {
		const timeout = new Promise<boolean>((resolve) => {
			window.setTimeout(() => {
				resolve(false);
			}, RECONCILE_CONFIRM_TIMEOUT_MS);
		});
		return Promise.race([this.serverAcceptsOurAuth(port), timeout]);
	}

	/** Stop and restart the edit server (exposed as a command). */
	async restartEditServer(): Promise<boolean> {
		this.stopEditServer();
		return this.ensureEditServer();
	}

	private stopEditServer(): void {
		if (this.edit?.process) this.killProcess(this.edit.process);
		this.edit = null;
	}

	/** Stop every server we started. Called on plugin unload. */
	stopAll(): void {
		this.stopEditServer();
		for (const s of this.runServers.values()) {
			this.killProcess(s.process);
		}
		this.runServers.clear();
	}

	/**
	 * Synchronous, best-effort teardown for the application-exit handler, which
	 * cannot reliably await async work. Signals every server we spawned and
	 * prunes its record; anything that does not die in time is caught by
	 * {@link reconcileOrphans} on the next launch (FR-001, FR-011). Safe to call
	 * when nothing was started (FR-008).
	 */
	stopAllSync(): void {
		const pids: number[] = [];
		if (this.edit?.process?.pid !== undefined) {
			pids.push(this.edit.process.pid);
		}
		for (const s of this.runServers.values()) {
			if (s.process?.pid !== undefined) pids.push(s.process.pid);
		}
		for (const pid of pids) {
			this.killByPid(pid, true);
			this.records.remove(pid);
		}
		this.edit = null;
		this.runServers.clear();
	}

	/**
	 * On startup, clean up servers we spawned in a prior session that a crash or
	 * force-quit left running. Idempotent: the work runs once and later callers
	 * (and the `ensure*` methods) await the same promise so no server is spawned
	 * before reconciliation finishes. Safe/no-op when the store is empty (FR-008).
	 */
	reconcileOrphans(): Promise<void> {
		this.reconcilePromise ??= this.runReconcile();
		return this.reconcilePromise;
	}

	/**
	 * Conservative reconciliation (FR-007a / FR-009): a leftover is terminated
	 * only when we can positively confirm it is BOTH still alive AND our marimo
	 * server (accepts the active token). Records we cannot confirm are dropped
	 * without touching any process — guarding against recycled PIDs and
	 * reassigned ports.
	 */
	private async runReconcile(): Promise<void> {
		const records: SpawnedServerRecord[] = this.records.load();
		for (const r of records) {
			const live = this.isProcessAlive(r.pid);
			if (live && (await this.confirmOurServer(r.port))) {
				this.killByPid(r.pid, false);
				console.warn(
					`[MarimoBridge] Reconciled orphaned marimo server from a prior session (pid ${r.pid.toString()}, :${r.port.toString()}).`
				);
			}
			// Unconfirmed → leave any process untouched (conservative posture).
			// Either way the prior-session record is now resolved; drop it.
			this.records.remove(r.pid);
		}
	}
}

/** Promise-based delay helper. */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
