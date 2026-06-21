# Phase 1 Data Model: Vault-Scoped Server Adoption

This feature is internal to the plugin; the "data model" is the in-memory and persisted bookkeeping the `ServerManager` uses to decide adoption, fallback, and reconciliation.

## Entity: SpawnedServerRecord (persisted)

The per-vault crash-recovery record, **extended** with a vault identity. Stored in `<vault>/.obsidian/plugins/<id>/<RECORDS_FILE>` as `{ "records": [ ... ] }`.

| Field | Type | Required | New? | Description |
|-------|------|----------|------|-------------|
| `pid` | integer > 0 | yes | — | OS process id returned by `spawn`. |
| `port` | integer in `(0, PORT_MAX]` | yes | — | Loopback port the server listens on (configured or fallback). |
| `kind` | `"edit"` \| `"run"` | yes | — | Server kind. |
| `token` | non-empty string | yes | — | Token passed to `--token-password`. |
| `vaultRoot` | non-empty string | **yes** | **NEW** | Canonical absolute path of the vault this server serves (the spawn `cwd`). |

**Validation (`ServerRecordStore.isValid`)**:
- All previous rules still apply.
- `vaultRoot` MUST be a non-empty string. A record missing or with empty `vaultRoot` is **invalid** → dropped on load, never used to adopt/kill (legacy-record rule, research R6).

**Lifecycle**: unchanged from feature 013 — `add` on successful spawn (before `waitForReady`), `remove` only on confirmed child `exit`/`close`, `replaceAll` at end of reconciliation.

## Entity: ManagedServer (in-memory)

Per-session bookkeeping for one running/adopted server. **No schema change**, but the meaning of `port` for the edit server is clarified:

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"edit"` \| `"run"` | Server kind. |
| `port` | integer | The **actually-bound** port. For the edit server this may differ from `settings.port` when a fallback occurred. |
| `process` | `ChildProcess \| null` | Spawned child, or `null` if adopted. |
| `ready` | boolean | True once `/health` responded. |

## Entity: Vault identity (in-memory, ServerManager)

| Field | Type | Description |
|-------|------|-------------|
| `vaultRoot` (existing `vaultPath`) | string | Canonical absolute vault root, computed once at construction via `realpath` of `adapter.getBasePath()` (fallback to raw path on error). Used as `cwd` for spawns, written into each record, and compared during adoption/reconciliation. |

## Derived values

- **`editBaseUrl`**: derived from the running edit server's bound port (`this.edit.port`) when present, else `settings.port`. `editFileUrl` / `editHomeUrl` inherit this.

## State transitions — edit server startup (with vault scoping + fallback)

```text
ensureEditServer():
  await reconcilePromise            # prior-session same-vault orphans cleaned first
  if this.edit?.ready: return true  # same-session reuse (in-memory handle)

  port = settings.port
  if healthOk(port):
      if adoptableSameVault(port):  # NEW: matched by a same-vault record (R1)
          adopt(port); return true
      else:
          # occupied by another vault's / foreign server → DO NOT adopt, DO NOT kill
          port = allocateEditFallbackPort()   # NEW: next free port (R4)

  if not checkAvailable(): notify; return false
  spawn edit server on `port`; record{...vaultRoot}; waitForReady
  this.edit.port = port             # URLs now follow this port (R5)
```

**`adoptableSameVault(port)`** (record-based, R1/R3):
```text
records = recordStore.load()
r = records.find(rec => rec.port == port && rec.kind == "edit"
                       && rec.vaultRoot == this.vaultRoot)
return r != null
       && findPidsOnPort(port).includes(r.pid)
       && serverAcceptsOurAuth(port, r.token)
```

## State transitions — reconciliation (vault-gated)

```text
runReconcile():
  for r in recordStore.load():      # already this-vault-only (per-vault file)
     ours = r.vaultRoot == this.vaultRoot     # NEW gate (defense-in-depth, R3)
            && isProcessAlive(r.pid)
            && findPidsOnPort(r.port).includes(r.pid)
            && confirmOurServer(r.port, r.token)
     if ours: killByPid(r.pid); wait; keep if still alive
     else: drop r (never kill an unconfirmed / different-vault record)
  replaceAll(remaining)
```

## Requirement traceability

| Requirement | Covered by |
|-------------|-----------|
| FR-001 / FR-001a (record-based same-vault adoption; reject token-matching foreign vault) | `adoptableSameVault`; `vaultRoot` in record |
| FR-002 (never adopt/kill non-ours occupant) | adoption returns false → fallback; reconcile drops unconfirmed |
| FR-003 (edit free-port fallback) | `allocateEditFallbackPort` |
| FR-004 (edit URLs use bound port) | `editBaseUrl` derived from `this.edit.port` |
| FR-005 (records carry vault identity) | `vaultRoot` field + `isValid` |
| FR-006 (reconcile vault-gated) | `runReconcile` vault-root gate |
| FR-007 (same-vault reuse/reconcile preserved) | in-memory `this.edit` reuse; record match across reload; vault-gated reconcile |
| FR-008 (clear message when no port found) | reuse existing not-ready / port notices |
| FR-009 (verify + document residual processes) | quickstart verification steps + docs note |
