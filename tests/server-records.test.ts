import assert from "node:assert/strict";
import {
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import { ServerRecordStore } from "../src/server-records";

test("drops legacy records that do not contain an ownership token", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "marimo-records-"));
	const file = path.join(dir, "records.json");
	try {
		writeFileSync(
			file,
			JSON.stringify({
				records: [
					{ pid: 1234, port: 2718, kind: "edit", vaultRoot: "/vault" },
				],
			})
		);

		const store = new ServerRecordStore(file);

		assert.deepEqual(store.load(), []);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("drops legacy records that do not contain a vault root", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "marimo-records-"));
	const file = path.join(dir, "records.json");
	try {
		writeFileSync(
			file,
			JSON.stringify({
				records: [
					{ pid: 1234, port: 2718, kind: "edit", token: "session-token" },
					{
						pid: 1235,
						port: 2719,
						kind: "edit",
						token: "session-token",
						vaultRoot: "   ",
					},
				],
			})
		);

		const store = new ServerRecordStore(file);

		assert.deepEqual(store.load(), []);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("loads records with a non-empty ownership token and vault root", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "marimo-records-"));
	const file = path.join(dir, "records.json");
	try {
		const record = {
			pid: 1234,
			port: 2718,
			kind: "edit",
			token: "session-token",
			vaultRoot: "/vault",
		};
		writeFileSync(file, JSON.stringify({ records: [record] }));

		const store = new ServerRecordStore(file);

		assert.deepEqual(store.load(), [record]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("drops malformed ownership records while retaining valid records", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "marimo-records-"));
	const file = path.join(dir, "records.json");
	try {
		const valid = {
			pid: 1234,
			port: 2718,
			kind: "run",
			token: "session-token",
		};
		writeFileSync(
			file,
			JSON.stringify({
				records: [
					valid,
					{ ...valid, pid: 0 },
					{ ...valid, port: 70000 },
					{ ...valid, kind: "other" },
					{ ...valid, token: " " },
					null,
				],
			})
		);

		const store = new ServerRecordStore(file);

		assert.deepEqual(store.load(), [valid]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
