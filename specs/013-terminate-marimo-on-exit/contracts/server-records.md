# Contract: Spawned-Server Record Store & Reconciliation

This plugin is an internal Obsidian application; it exposes no public API. The relevant "contract" is the persisted record store and the lifecycle operations that read/write it. This document fixes those so implementation and validation agree.

## 1. Persisted file

- **Location**: plugin directory, separate from `data.json` (e.g. `<vault>/.obsidian/plugins/marimo-bridge/<RECORDS_FILE>`). The exact filename is a constant in `src/constants.ts`.
- **Format**: UTF-8 JSON.
- **Schema**:

```json
{
  "records": [
    { "pid": 12345, "port": 2718, "kind": "edit" },
    { "pid": 12346, "port": 2719, "kind": "run" }
  ]
}
```

- `records`: array (possibly empty) of objects with:
  - `pid` (integer > 0, required)
  - `port` (integer in valid range, required)
  - `kind` (`"edit"` | `"run"`, required)
- **Tolerance**: a missing file, empty file, or JSON that fails to parse/validate MUST be treated as `{ "records": [] }` with no user-facing error (FR-008).

## 2. Store operations (synchronous)

| Operation | When called | Behavior |
|-----------|-------------|----------|
| `load()` | once during `onload` (before/at server bootstrap) | Read + validate file → in-memory list; drop invalid entries. |
| `add(record)` | immediately after a successful `spawn` yields a `pid`, before `waitForReady` | Append record (unique by `pid`) and `writeFileSync` the whole store. |
| `remove(pid)` | immediately after a clean kill of that process (`stopAll`, `stopEditServer`, `restartEditServer`, failed `ensureRunServer`) | Drop the entry by `pid` and `writeFileSync`. |
| `list()` | during reconciliation | Return current in-memory records. |
| `replaceAll(records)` | end of reconciliation | Persist the pruned set (only confirmed-and-still-running entries). |

**Invariant**: At no point may a plugin-spawned server be running without a corresponding persisted record. (Add the record before the child can be orphaned.)

## 3. Termination contract (from a bare PID)

Given a `pid` (no `ChildProcess` handle):

- **Unix-like**: `process.kill(-pid, SIGTERM)` to signal the detached process group; fall back to `process.kill(pid, SIGTERM)` on failure.
- **Windows**: synchronous `taskkill /PID <pid> /T /F` (recursive tree kill).
- Errors (process already gone, not permitted) are swallowed — termination is best-effort and idempotent.

## 4. Reconciliation contract (`reconcileOrphans`, next launch)

Run during `onload`, before/around `ensureEditServer`:

```text
for each record r in store.list():
    live    = isProcessAlive(r.pid)        # process.kill(pid, 0), false on ESRCH
    ours    = live && await serverAcceptsOurAuth(r.port)   # reuse existing auth probe
    if live && ours:
        terminate(r.pid)                   # §3
        drop r                             # confirmed orphan killed
    else:
        drop r                             # stale/unconfirmable → leave any process, prune record
store.replaceAll(remaining-after-drops)    # = [] in the common case
```

- **MUST NOT** terminate when `live` is false (PID gone or reused → cannot confirm) or when the port does not present a token-accepting marimo server (FR-009, conservative posture).
- Per-record confirmation MUST be bounded by a short timeout constant so a hung port cannot stall startup.

## 5. In-session teardown contract

| Trigger | Handler | Requirement |
|---------|---------|-------------|
| Plugin disable/reload | `onunload` → `stopAll()` | Kill every spawned edit + run server and remove each record. (FR-002, FR-003) |
| App quit (best-effort) | `window` `unload`/`beforeunload` → `stopAllSync()` | Synchronously signal every spawned server (§3) without awaiting; records pruned where possible. Survivors handled by §4 next launch. (FR-001) |
| Restart command | `restartEditServer()` | Kill + remove record for the old edit server before spawning a new one. |
| Adopted server | — | Never recorded, never killed by any path above. (FR-005) |

## 6. Requirement traceability

| Requirement | Covered by |
|-------------|-----------|
| FR-001 (kill on app exit) | §5 app-quit handler + §4 next-launch net |
| FR-002 (kill on unload/reload) | §5 `onunload` |
| FR-003 (edit + all run servers) | §2 add/remove for both kinds; `stopAll` |
| FR-004 (descendant subprocesses) | §3 Windows `/T`, Unix process-group signal |
| FR-005 (never kill adopted) | §2 record only when `process !== null`; §5 |
| FR-006 (kill mid-startup server) | record added before `waitForReady`; `stopAll` kills not-yet-ready |
| FR-007 / FR-007a (persist + confirmed next-launch cleanup) | §1, §2, §4 |
| FR-008 (safe when nothing started) | §1 tolerance; empty store no-ops |
| FR-009 (no false-positive kill) | §4 two-gate confirmation |
| FR-010 (cross-platform) | §3 platform branches |
