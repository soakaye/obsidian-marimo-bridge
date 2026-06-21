# Phase 0 Research: Vault-Scoped Server Adoption & Edit-Server Port Fallback

All open questions from the spec's Clarifications were resolved during `/speckit-clarify`. This document records the design decisions and the rationale behind them.

## R1. How to confirm a running server's vault identity

- **Decision**: Record-based only (spec Clarification, Session 2026-06-21). A running server is treated as "this vault's" **only** when a current crash-recovery record matches it — the record's stored `vaultRoot` equals this vault's root, the record's PID is the LISTENer on the record's port, and the server accepts the record's token. The plugin does **not** query a running server for its working directory.
- **Rationale**: marimo's `/health` is unauthenticated and exposes no working directory, and there is no documented, stable endpoint that returns a server's launch `cwd`. Depending on marimo internals would be fragile and violate the conservative posture of Constitution IV. The record store is already per-vault and already persisted synchronously at spawn time, so it is the natural source of truth for "did *this vault* start this server."
- **Alternatives considered**:
  - *Authenticated working-directory query* (Option B): rejected — no reliable marimo API; couples us to internal behavior.
  - *Record + query hybrid* (Option C): rejected — adds the same fragility as B for a case (record missing) that is acceptably handled by spawning a fresh server on a fallback port.
- **Accepted consequence**: A same-vault server that is *missing from the records* (records file deleted, or a manually launched marimo) is not adopted; the plugin falls back to a free port and spawns a second server. This is safe (never wrong-vault data) and is documented as an edge-case tradeoff.

## R2. What value identifies a vault

- **Decision**: The vault root **absolute path**, canonicalized once at construction via `fs.realpathSync` (falling back to the raw `adapter.getBasePath()` if canonicalization throws). Comparison is exact string equality of the canonical paths.
- **Rationale**: The plugin already launches marimo with the vault root as the process `cwd`, so the vault root is the de-facto "which vault this server serves." Canonicalizing resolves the symlink-vs-real-path edge case (spec Edge Cases) so the same on-disk vault always compares equal. A single canonicalization at construction keeps it off any hot path.
- **Alternatives considered**:
  - *Raw `getBasePath()` without realpath*: rejected — symlinked vault locations would spuriously fail same-vault reuse.
  - *A hashed/opaque vault id*: rejected — adds indirection with no benefit; the path is already stable and human-debuggable in the records file.
- **Note**: Records are stored inside the vault, so a record's `vaultRoot` should normally always match the current vault. The explicit comparison is defense-in-depth and additionally guards the "vault folder was moved/renamed between sessions" case (stale path → record not trusted → left untouched, fresh start).

## R3. Where cross-vault contamination actually occurs

- **Decision**: Treat the **live adoption path** (`ensureEditServer` adopting a healthy server found on the configured port) as the only place that can serve another vault's files; harden it. The reconciliation path reads a per-vault record store and cannot see another vault's records, so its vault-root gate is defense-in-depth rather than the primary fix.
- **Rationale**: Two vaults share the default configured port (e.g., 2718) but each writes records into its **own** vault directory. Reconciliation therefore only ever sees its own records. The danger is purely that vault B, starting while vault A's server holds the port, *adopts that live server*. Fixing adoption to require a same-vault record closes the hole.
- **Alternatives considered**: A shared cross-vault record store (system temp / user config) was discussed for the residual-process problem but is **out of scope** here; it is unnecessary for vault-scoped adoption.

## R4. Edit-server free-port fallback strategy

- **Decision**: Reuse the existing run-server allocation approach. When the configured port is occupied by a server that is not adoptable, scan upward for the next bindable port (skipping ports already tracked and OS-busy ports, bounded by `PORT_MAX`) and spawn the edit server there. The **actually-bound port** becomes the edit server's port for the session.
- **Rationale**: The run-server allocator (`allocateRunPort` + `isPortFree`) already implements exactly this probe with the right safety bounds; reusing it keeps behavior consistent and avoids new tunables. No new configuration option is introduced (spec Assumption).
- **Alternatives considered**:
  - *Fail with a notice (status quo)*: rejected — that is the very availability bug this feature removes.
  - *Killing the occupying server*: rejected — it may belong to another vault or be foreign; Constitution IV / spec FR-002 forbid terminating non-ours servers.

## R5. Routing edit URLs to the bound port

- **Decision**: Derive `editBaseUrl` (and thus `editFileUrl` / `editHomeUrl`) from the **running edit server's bound port** when an edit server is active, falling back to `settings.port` only when none is running yet.
- **Rationale**: Today these getters hardcode `settings.port`. If the server fell back to an alternate port, every notebook/home/embed URL would point at the wrong (occupied) port and render blank. The view and embed processor already `await ensureEditServer()` before requesting URLs, so the bound port is known by the time a URL is built.
- **Alternatives considered**: Persisting the fallback port back into settings — rejected; the fallback is a per-session runtime decision and must not mutate user configuration.

## R6. Legacy records without `vaultRoot`

- **Decision**: A record lacking a non-empty `vaultRoot` is **invalid/unconfirmable** and is dropped by `isValid` (same treatment as the existing legacy "no token" rule). It is never used to adopt or to kill any process.
- **Rationale**: Mirrors the established conservative contract from feature 013 (§1 "Legacy records … MUST be discarded without terminating any process"). A one-time loss of crash-recovery for pre-upgrade orphans is acceptable and safe.

## R7. Testing approach

- **Decision**: Extend the existing Node `node:test` suites. `server-records.test.ts` gains cases for `vaultRoot` validation and legacy-record rejection. `server-manager.test.ts` gains cases (using its existing stubbed `healthOk` / `serverAcceptsOurAuth` / `findPidsOnPort` internals and the fake-marimo fixture) for: (a) a foreign-vault server on the configured port is not adopted, (b) a matching same-vault record is adopted, (c) the edit server falls back to a free port when the configured port is occupied, and (d) edit URLs follow the bound port.
- **Rationale**: A real test runner already exists (contrary to feature 013's note); reusing its stubs keeps the new tests deterministic and offline.
