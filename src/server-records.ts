/**
 * Persisted store of marimo servers this plugin *spawned*, used to clean up
 * orphans after an unclean shutdown (crash / force-quit / OS shutdown).
 *
 * Obsidian's `onunload` is not reliably invoked on a full application quit, and
 * Unix servers are spawned detached (their own process group), so they survive a
 * parent exit. The only robust guarantee is to record what we spawned and
 * reconcile on the next launch. Records are written synchronously so a server is
 * never running without a corresponding record (the orphan window), and the file
 * is kept separate from Obsidian's `data.json` (which `saveData` overwrites).
 *
 * See `specs/013-terminate-marimo-on-exit/contracts/server-records.md`.
 */
import * as fs from "fs";
import { ENCODING_UTF8, PORT_MAX } from "./constants";

/** One persisted entry per spawned marimo server. */
export interface SpawnedServerRecord {
	/** OS process id returned by `spawn`. */
	pid: number;
	/** Loopback port the server listens on. */
	port: number;
	/** Server kind, mirroring ServerManager's in-memory bookkeeping. */
	kind: "edit" | "run";
	/** Token passed to this server's `--token-password` option. */
	token: string;
}

/** On-disk shape of the record file. */
interface RecordFile {
	records: SpawnedServerRecord[];
}

/**
 * Synchronous, crash-safe store backed by a single JSON file. All mutations
 * flush immediately so the on-disk state always reflects running servers.
 */
export class ServerRecordStore {
	private filePath: string;
	private records: SpawnedServerRecord[] = [];

	constructor(filePath: string) {
		this.filePath = filePath;
	}

	/**
	 * Read + validate the file into memory. A missing, empty, or malformed file
	 * is treated as an empty store with no error surfaced (FR-008).
	 */
	load(): SpawnedServerRecord[] {
		try {
			const raw = fs.readFileSync(this.filePath, ENCODING_UTF8);
			const parsed = JSON.parse(raw) as Partial<RecordFile>;
			const list = Array.isArray(parsed.records) ? parsed.records : [];
			this.records = list.filter((r) => ServerRecordStore.isValid(r));
		} catch {
			// Missing/empty/corrupt file → start clean.
			this.records = [];
		}
		return this.list();
	}

	/** Add a record (unique by pid) and flush. */
	add(record: SpawnedServerRecord): void {
		if (!ServerRecordStore.isValid(record)) return;
		this.records = this.records.filter((r) => r.pid !== record.pid);
		this.records.push(record);
		this.flush();
	}

	/** Drop the record for `pid` (if present) and flush. */
	remove(pid: number): void {
		const before = this.records.length;
		this.records = this.records.filter((r) => r.pid !== pid);
		if (this.records.length !== before) this.flush();
	}

	/** Current in-memory records (a copy). */
	list(): SpawnedServerRecord[] {
		return [...this.records];
	}

	/** Replace the whole set (used to persist the pruned set after reconcile). */
	replaceAll(records: SpawnedServerRecord[]): void {
		this.records = records.filter((r) => ServerRecordStore.isValid(r));
		this.flush();
	}

	/** Persist the current records. Best-effort: never throws to the caller. */
	private flush(): void {
		const data: RecordFile = { records: this.records };
		try {
			fs.writeFileSync(this.filePath, JSON.stringify(data));
		} catch (e) {
			console.error("[MarimoBridge] Failed to write server records:", e);
		}
	}

	/** A record is usable only with a positive pid and a positive port. */
	private static isValid(r: unknown): r is SpawnedServerRecord {
		if (typeof r !== "object" || r === null) return false;
		const rec = r as Partial<SpawnedServerRecord>;
		const pidOk =
			typeof rec.pid === "number" &&
			Number.isInteger(rec.pid) &&
			rec.pid > 0;
		const portOk =
			typeof rec.port === "number" &&
			Number.isInteger(rec.port) &&
			rec.port > 0 &&
			rec.port <= PORT_MAX;
		const tokenOk =
			typeof rec.token === "string" && rec.token.trim().length > 0;
		return (
			pidOk &&
			portOk &&
			tokenOk &&
			(rec.kind === "edit" || rec.kind === "run")
		);
	}
}
