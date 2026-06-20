---

description: "Task list for Terminate Self-Spawned marimo Servers on Obsidian Exit"
---

# Tasks: Terminate Self-Spawned marimo Servers on Obsidian Exit

**Input**: Design documents from `specs/013-terminate-marimo-on-exit/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-records.md](./contracts/server-records.md), [quickstart.md](./quickstart.md)

**Tests**: No automated test framework exists in this repo (scripts: `dev`, `build`, `lint`) and the spec did not request TDD. Validation is `npm run build` + `npm run lint` + the manual scenarios in [quickstart.md](./quickstart.md). No test tasks are generated.

**Organization**: Tasks are grouped by user story. US1 (P1) is the MVP. US2 (P2) hardens the shared cleanup code with the conservative-safety guarantees.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 (maps to spec.md user stories)
- Exact file paths are included in each task

## Path Conventions

Single-project Obsidian plugin: source under `src/` at repository root. Constitution Principle VI requires all new string/number literals to live in `src/constants.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Externalize all new literals before they are referenced anywhere (Principle VI).

- [X] T001 Add feature constants to `src/constants.ts`: records file name (e.g. `FILE_SERVER_RECORDS`), process-existence probe signal (`SIGNAL_PROBE = 0`), reconcile per-record confirmation timeout (`RECONCILE_CONFIRM_TIMEOUT_MS`), and any new log/notice strings used by cleanup. No hardcoded literals elsewhere.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The record store and the PID-based termination helper that BOTH user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `src/server-records.ts` implementing the spawned-server record store per [contracts/server-records.md](./contracts/server-records.md) and [data-model.md](./data-model.md): synchronous `load()`, `add(record)`, `remove(pid)`, `list()`, `replaceAll(records)` using `fs.readFileSync`/`fs.writeFileSync`; tolerant load (missing/empty/malformed file → empty store, no error); validate `pid>0` and `port` in range; `SpawnedServerRecord = { pid, port, kind }`.
- [X] T003 Resolve the records file path and inject the store into `ServerManager`: compute the plugin-directory path (separate from `data.json`) in `src/main.ts` and pass it into the `ServerManager` constructor in `src/server-manager.ts`; instantiate the record store there.
- [X] T004 Refactor termination into a PID-capable helper in `src/server-manager.ts`: extend/extract `killProcess` so it can terminate from a bare `pid` as well as a `ChildProcess` — Unix: `process.kill(-pid, SIGTERM)` (detached process group) with `proc.kill()` fallback; Windows: `taskkill /PID <pid> /T /F` (recursive tree). Single graceful signal, no escalation/wait (FR-004, FR-010, FR-011).

**Checkpoint**: Record store + PID termination helper available — user stories can proceed.

---

## Phase 3: User Story 1 - No orphaned marimo processes after closing Obsidian (Priority: P1) 🎯 MVP

**Goal**: Every server the plugin spawns is terminated on app exit and on plugin unload/reload; crash-orphaned servers are reconciled on the next launch.

**Independent Test**: Open an edit notebook + a `mode: run` embed (one edit + one run server), quit Obsidian → 0 plugin-started marimo processes remain and ports are free ([quickstart.md](./quickstart.md) Scenarios 1, 2, 3, 5, 6, 7).

### Implementation for User Story 1

- [X] T005 [US1] Record on spawn in `src/server-manager.ts`: in `spawnServer`, after `spawn` returns and `proc.pid` is known, call `store.add({ pid, port, kind })` BEFORE `waitForReady` so a server is never running without a record (FR-007). Covers mid-startup case (FR-006).
- [X] T006 [US1] Unrecord on clean kill in `src/server-manager.ts`: call `store.remove(pid)` wherever a spawned process is terminated — `stopEditServer`, `restartEditServer`, the failed-`ensureRunServer` cleanup, and per-server inside `stopAll` (FR-007).
- [X] T007 [US1] Add `stopAllSync()` to `src/server-manager.ts`: synchronously terminate every spawned edit + run server via the T004 PID helper, with NO awaits (use `execSync`/`spawnSync` for Windows `taskkill`); prune records where possible (FR-001, FR-003, FR-011).
- [X] T008 [US1] Register exit handlers in `src/main.ts` `onload`: add a `window` `unload`/`beforeunload` listener that calls `this.servers.stopAllSync()` (registered for teardown), and keep `onunload()` → `this.servers.stopAll()` for plugin disable/reload (FR-001, FR-002).
- [X] T009 [US1] Implement `reconcileOrphans()` in `src/server-manager.ts` per [contracts/server-records.md](./contracts/server-records.md) §4: for each loaded record, confirm liveness via `process.kill(pid, SIGNAL_PROBE)` AND identity via the existing `serverAcceptsOurAuth(port)` (bounded by `RECONCILE_CONFIRM_TIMEOUT_MS`); terminate confirmed orphans with the T004 helper; then `store.replaceAll(remaining)` (FR-007a).
- [X] T010 [US1] Call `reconcileOrphans()` during `src/main.ts` `onload` before/around `ensureEditServer` (after the `ServerManager` is constructed) so orphans from a prior session are cleared at startup (FR-007a).
- [X] T011 [US1] Verify no-op safety paths in `src/server-records.ts` and `src/server-manager.ts`: `stopAll`, `stopAllSync`, and `reconcileOrphans` complete cleanly when the store is empty / no servers were started, surfacing no error to the user (FR-008).

**Checkpoint**: US1 fully functional — normal quit, plugin reload, and next-launch reconciliation all leave 0 orphans.

---

## Phase 4: User Story 2 - Servers the plugin did not start are left untouched (Priority: P2)

**Goal**: Only plugin-spawned servers are ever terminated; adopted servers and unrelated processes are never killed, even when a recorded PID/port is ambiguous.

**Independent Test**: Pre-start a marimo server so the plugin adopts it; use it via Obsidian; quit → the adopted server is still running ([quickstart.md](./quickstart.md) Scenarios 4, 8).

### Implementation for User Story 2

- [X] T012 [US2] Guard record-writing to spawned servers only in `src/server-manager.ts`: confirm the adopt paths in `ensureEditServer` (and the startup-race adopt) set `process: null` and DO NOT call `store.add` — only `spawnServer` records. Adopted (`process === null`) servers are never recorded, reconciled, or killed (FR-005).
- [X] T013 [US2] Harden the conservative posture in `reconcileOrphans` (`src/server-manager.ts`): when liveness is false (PID gone/reused) OR the port does not present a token-accepting marimo server, MUST NOT terminate — drop the stale record and leave any process running. Explicitly covers the recycled-PID and port-reassignment edge cases (FR-009).

**Checkpoint**: US1 + US2 both hold — orphans are cleaned, adopted/unrelated processes are preserved.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T014 [P] Audit for Principle VI compliance: confirm no hardcoded string/number literals were introduced across `src/server-records.ts`, `src/server-manager.ts`, `src/main.ts`; all live in `src/constants.ts`.
- [X] T015 [P] Update `CHANGELOG.md` (if present) with a note on reliable termination of self-spawned servers on exit + next-launch orphan reconciliation.
- [X] T016 Run `npm run build` (tsc type-check + esbuild) and `npm run lint`; resolve any new errors/warnings.
- [ ] T017 Run the [quickstart.md](./quickstart.md) validation scenarios 1–8 and confirm expected outcomes (normal quit, reload, force-quit+relaunch, adopted-server survival, mid-startup, no-servers, no-accumulation, conservative safety).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1 / T001)**: No dependencies — start immediately.
- **Foundational (Phase 2 / T002–T004)**: Depends on T001 (uses the new constants). BLOCKS all user stories.
- **User Story 1 (Phase 3 / T005–T011)**: Depends on Phase 2.
- **User Story 2 (Phase 4 / T012–T013)**: Depends on Phase 2; T013 hardens `reconcileOrphans` from T009, so it follows US1's T009. T012 only depends on Phase 2. US2 is independently *testable* (adopted-server survival) even though it builds on US1's shared code.
- **Polish (Phase 5 / T014–T017)**: Depends on all desired user stories being complete.

### Within User Story 1

- T005/T006 (record/unrecord) and T007 (`stopAllSync`) build on T002–T004.
- T008 depends on T007. T010 depends on T009. T011 verifies T002/T006/T007/T009.

### Parallel Opportunities

- T002 is `[P]` (new file) and can be built alongside T001's constant additions.
- T014 and T015 are `[P]` (independent audit/doc files).
- US1 and US2 cannot be staffed fully in parallel because both edit `src/server-manager.ts`; sequence US1 → US2 to avoid same-file conflicts.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (T001) → Phase 2 (T002–T004) → Phase 3 (T005–T011).
2. **STOP and VALIDATE**: quickstart Scenarios 1, 2, 3, 5, 6, 7 → 0 orphans.
3. This already delivers the core promise of the feature.

### Incremental Delivery

1. Setup + Foundational → record store + PID kill helper ready.
2. US1 → reliable termination + reconciliation (MVP).
3. US2 → conservative-safety hardening (never kill adopted/unrelated).
4. Polish → constant audit, changelog, build/lint, full quickstart pass.

---

## Notes

- [P] = different files, no dependencies on incomplete tasks.
- Most changes concentrate in `src/server-manager.ts`; keep US1 and US2 edits sequential there.
- Commit after each task or logical group.
- Constitution Principle III is the north star: kill all spawned servers on unload/exit; Windows tree kill; Unix process-group kill; never orphan, never over-reach.
