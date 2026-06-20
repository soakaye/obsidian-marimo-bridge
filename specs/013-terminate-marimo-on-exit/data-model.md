# Phase 1 Data Model: Terminate Self-Spawned marimo Servers on Obsidian Exit

This feature is process/lifecycle-oriented; the only persisted data is the record store used for crash recovery.

## Entity: SpawnedServerRecord

One entry per marimo server the plugin **spawned** (never for adopted servers). Persisted synchronously so a crash cannot leave a running server without a record.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pid` | integer | yes | OS process identifier returned by `spawn`. Used for liveness probe and termination. |
| `port` | integer | yes | Loopback port the server listens on. Used for the token-acceptance identity check during reconciliation. |
| `kind` | `"edit" \| "run"` | yes | Server kind, for logging/diagnostics and to mirror the in-memory `ManagedServer.kind`. |
| `token` | string | yes | Token passed to this process's `--token-password`; used to identify an orphan after a restart. |

**Notes**
- The per-process token is stored because an auto-generated session token changes
  on every Obsidian launch.
- No timestamps are required for correctness; an optional `startedAt` may be added for diagnostics but is not load-bearing.

### Validation rules

- `pid` MUST be a positive integer; entries with a non-positive or missing `pid` are discarded on load.
- `port` MUST be within the plugin's valid port range; out-of-range entries are discarded on load.
- Records are unique by `pid`. A re-spawn that reuses a freed port creates a new record keyed by the new `pid`.

### Lifecycle / state transitions

```text
(spawn succeeds, pid known)
        │  writeFileSync add record
        ▼
   [Recorded] ──────────────► (signal: stopAll / restart / failed-ready)
        │                              │
        │                              ▼
        │                       [Termination requested]
        │                              │ child exit/close
        │                              ▼  writeFileSync remove record
        │                         [Removed]
        │
        └─(crash / force-quit: no clean removal)─► [Orphan record persists]
                                                          │
                                          next launch: reconcileOrphans()
                                                          │
                          ┌───────────────────────────────┴───────────────────────────────┐
                          │ confirm: process.kill(pid,0) live  AND                         │
                          │          serverAcceptsOurAuth(port, storedToken) true          │
                          ▼                                                                 ▼
                   [Confirmed]  → terminate (platform kill) → remove record       [Unconfirmed] → leave process,
                                                                                                  remove stale record
```

## Persisted Store: server records file

- A single JSON file in the plugin directory (separate from `data.json`).
- Shape: a JSON array of `SpawnedServerRecord`, or `{ "records": SpawnedServerRecord[] }` — the contract is defined in [contracts/server-records.md](./contracts/server-records.md).
- Written with `fs.writeFileSync` on every add/remove; read once with `fs.readFileSync` during `onload`.
- A missing or malformed file is treated as an empty store (no error surfaced to the user; FR-008).

## Relationship to existing `ManagedServer` (in-memory)

`ManagedServer` (in `server-manager.ts`) already distinguishes a spawned process (`process !== null`) from an adopted one (`process === null`). A `SpawnedServerRecord` is persisted **only** for `ManagedServer` instances where `process !== null`. Adopted servers are never recorded and therefore never reconciled/killed (FR-005).
