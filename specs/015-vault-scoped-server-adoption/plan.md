# Implementation Plan: Vault-Scoped Server Adoption & Edit-Server Port Fallback

**Branch**: `015-vault-scoped-server-adoption` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-vault-scoped-server-adoption/spec.md`

## Summary

Two related correctness/availability fixes for the case where more than one Obsidian vault uses the marimo bridge:

1. **Vault-scoped adoption (P1, safety).** Today a server's identity is only `port + token`, so a second vault that shares the same configured access token silently *adopts* the first vault's already-running edit server and then serves a **different vault's notebooks**. The fix adds the **vault root** to server identity. Per the clarification (record-based confirmation, Option A), a running server on the configured port is adopted only when it matches a same-vault crash-recovery record (the record now carries the vault root); the plugin never queries a running server for its working directory.

2. **Edit-server free-port fallback (P2, availability).** Once a foreign / other-vault server holding the configured port is (correctly) not adopted, today the edit server fails to start ("port in use", blank view). The fix makes the edit server fall back to the next free port — mirroring the existing run-server port allocation — and routes all edit URLs to the actually-bound port.

The **residual-process problem ("問題②")** — a marimo server left alive by a *closed* vault — is explicitly **out of scope**; it is only to be verified and, if observed, documented as a known limitation (FR-009 / SC-005).

## Technical Context

**Language/Version**: TypeScript, bundled by esbuild for the Electron renderer of Obsidian Desktop; type-checked with `tsc --noEmit`.

**Primary Dependencies**: Obsidian API; Node.js `child_process`, `fs`, `path`, `http`, `net`, `crypto` (kept in the esbuild `external` list); Electron `<webview>`. No new third-party dependencies.

**Storage**: The existing per-vault JSON record store at `<vault>/.obsidian/plugins/<id>/<RECORDS_FILE>` (separate from `data.json`). This feature **adds a `vaultRoot` field** to each record. The store is inherently per-vault (it lives inside the vault), which is why cross-vault contamination can only happen on the *live adoption* path, not in the record store.

**Testing**: Node's built-in test runner via `npm run test` (`tests/run-tests.mjs`; existing `tests/server-manager.test.ts`, `tests/server-records.test.ts`). Validation also includes `npm run build` (tsc) + `npm run lint` + the manual scenarios in [quickstart.md](./quickstart.md).

**Target Platform**: Obsidian Desktop on Windows and Unix-like systems (macOS/Linux). Mobile out of scope (Principle II).

**Project Type**: Single-project desktop Obsidian plugin (`src/*.ts`).

**Performance Goals**: No hot path. Port-fallback probing and the extra vault-root comparison add negligible startup latency; the free-port scan reuses the bounded probe already used for run servers.

**Constraints**: Vault-root comparison must be stable across symlink vs. real path (canonicalize). Confirmation must stay conservative — never adopt or kill a server that cannot be positively confirmed as this vault's.

**Scale/Scope**: Small. One edit server + a handful of run servers per vault; record store holds a few entries. Two or three vaults may contend for one configured port.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Language Division | PASS | All spec-kit artifacts and code/commits in English; user chat in Japanese. |
| II. Desktop-Only Architecture | PASS | Uses Node `fs.realpathSync`/`net` only; no mobile code paths added. |
| III. Reliable Process Lifecycle Management | PASS | No regression to spawn/teardown. Reconciliation becomes *more* conservative (adds a vault-root gate). The residual-process item ② is out of scope and concerns servers owned by a *different* vault (invisible to this instance), not this plugin's own spawned servers, so Principle III's guarantee is unaffected. |
| IV. Safe Local Bindings | PASS (advances) | Strengthens "only reuse a server that accepts the active token" by additionally requiring same-vault identity, preventing wrong-vault reuse. Fallback port still binds `127.0.0.1`; this directly serves "port bindings do not conflict and are bound safely." |
| V. Virtual Environment Preference | PASS | Interpreter resolution unchanged. |
| VI. Constant Externalization | PASS (gated in tasks) | Any new literal (e.g., a records-schema version marker, if used) MUST live in `src/constants.ts`; the port scan reuses existing `PORT_MAX`/probe constants. |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/015-vault-scoped-server-adoption/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── server-identity.md   # Vault-scoped adoption, records schema, port-fallback contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── server-records.ts    # ADD vaultRoot to SpawnedServerRecord + isValid; legacy (no vaultRoot) discarded
├── server-manager.ts    # Capture canonical vaultRoot; record it; vault-scoped adoption; edit free-port fallback; edit URLs use bound port
├── constants.ts         # Any new literals (e.g., schema marker) — reuse PORT_MAX / probe constants
└── main.ts              # No behavioral change expected (vaultRoot derived inside ServerManager from the adapter base path)

tests/
├── server-records.test.ts   # vaultRoot validation; legacy-record rejection
└── server-manager.test.ts   # adoption rejects foreign-vault server; same-vault record adopted; edit port fallback; edit URLs follow bound port
```

**Structure Decision**: Single-project plugin. The change is localized to `server-records.ts` (schema) and `server-manager.ts` (adoption + fallback + URL routing). `main.ts` already passes the `FileSystemAdapter`; the canonical vault root is derived inside `ServerManager` from `adapter.getBasePath()`, so no new wiring is required.

## Complexity Tracking

> No constitution violations; this section intentionally left empty.
