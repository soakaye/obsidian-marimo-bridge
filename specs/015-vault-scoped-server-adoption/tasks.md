---
description: "Task list for Vault-Scoped Server Adoption & Edit-Server Port Fallback"
---

# Tasks: Vault-Scoped Server Adoption & Edit-Server Port Fallback

**Input**: Design documents from `specs/015-vault-scoped-server-adoption/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-identity.md](./contracts/server-identity.md)

**Tests**: Included. The repo has a Node `node:test` suite (`npm run test`) and research R7 / quickstart require extending it; test tasks are therefore part of each story.

**Organization**: Tasks are grouped by user story (US1=P1, US2=P2, US3=P3) for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (Setup, Foundational, Polish have no story label)
- All paths are repo-root relative.

## Path Conventions

- Single-project Obsidian plugin: source in `src/`, tests in `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a green baseline before changes.

- [ ] T001 Confirm baseline is green: run `npm install` then `npm run build && npm run lint && npm run test` and note current pass state (no source change).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the per-vault record store carry vault identity. Every spawned server (edit AND run) is recorded, so this schema/validation change is cross-cutting and MUST land before the user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add required `vaultRoot: string` field to `SpawnedServerRecord` and enforce a non-empty `vaultRoot` in `ServerRecordStore.isValid` (records missing/empty `vaultRoot` are invalid → dropped on load, never used to adopt/kill) in `src/server-records.ts`.
- [ ] T003 In `ServerManager` constructor, compute the canonical vault root via `fs.realpathSync(adapter.getBasePath())` with a raw-path fallback on error, and use that canonical value as `this.vaultPath` (spawn `cwd` + identity) in `src/server-manager.ts`. Add a brief comment that this canonical value is the same one persisted as each record's `vaultRoot`, so the two names refer to one concept.
- [ ] T004 Write `vaultRoot: this.vaultPath` into every record created in `spawnServer` (both `edit` and `run` kinds) in `src/server-manager.ts` (depends on T002, T003).
- [ ] T005 [P] Update `tests/server-records.test.ts`: a record with a valid `vaultRoot` passes validation; a record missing or with empty `vaultRoot` is rejected/pruned on load.

**Checkpoint**: Records persist vault identity; foundation ready for user stories.

---

## Phase 3: User Story 1 - Two vaults never cross-wire notebooks (Priority: P1) 🎯 MVP

**Goal**: A second vault sharing the same access token must never adopt another vault's running edit server; it serves only its own notebooks, and never terminates the other vault's server.

**Independent Test**: With the same token in vaults A and B, start A (port 2718), then start B with A running — B shows B's notebooks and A's server on 2718 is untouched.

### Tests for User Story 1

> Write these FIRST and ensure they FAIL before implementation.

- [ ] T006 [P] [US1] Test in `tests/server-manager.test.ts`: a healthy server on the configured port with NO matching same-vault record is NOT adopted (and not killed) — `ensureEditServer` declines adoption.
- [ ] T007 [P] [US1] Test in `tests/server-manager.test.ts`: a healthy server matching a same-vault record (vaultRoot + PID-on-port + token) IS adopted; and `runReconcile` leaves a record whose `vaultRoot` differs from the current vault untouched (no kill) while pruning it.
- [ ] T008 [P] [US1] Test in `tests/server-manager.test.ts`: FR-007 regression guard — same-vault same-session reuse (the `this.edit` fast path) AND `restartEditServer()` both return ready and continue serving this vault after the adoption/reconcile changes.

### Implementation for User Story 1

- [ ] T009 [US1] Implement record-based `adoptableSameVault(port)` (find an `edit` record with `vaultRoot === this.vaultPath`, confirm its PID is LISTENing on the port via `findPidsOnPort`, and that the server accepts the record token) and gate the `ensureEditServer` adoption branch on it so a non-adoptable occupant is neither adopted nor terminated, in `src/server-manager.ts` (depends on T004).
- [ ] T010 [US1] Add a vault-root gate (`r.vaultRoot === this.vaultPath`) as a required confirmation in `runReconcile`, alongside the existing alive/PID-on-port/token checks, in `src/server-manager.ts`.

**Checkpoint**: Cross-vault adoption and cross-vault kills are eliminated (MVP).

---

## Phase 4: User Story 2 - Second vault starts on a free port instead of failing (Priority: P2)

**Goal**: When the configured port is held by a non-adoptable (other-vault/foreign) server, the edit server falls back to the next free port and all edit URLs target it.

**Independent Test**: Occupy the configured port with a foreign server, start the edit server, and confirm it becomes ready on an alternate port with notebooks/home/embeds loading.

### Tests for User Story 2

> Write these FIRST and ensure they FAIL before implementation.

- [ ] T011 [P] [US2] Test in `tests/server-manager.test.ts`: when the configured port is occupied by a non-ours server, `ensureEditServer` spawns the edit server on a different free port and reports ready.
- [ ] T012 [P] [US2] Test in `tests/server-manager.test.ts`: `editBaseUrl`/`editFileUrl`/`editHomeUrl` resolve to the running edit server's bound (fallback) port, and fall back to `settings.port` only when no edit server is active.

### Implementation for User Story 2

- [ ] T013 [US2] Implement edit-server free-port allocation reusing the run-server probe (`isPortFree` + upward scan from `settings.port`, skipping in-session ports, bounded by `PORT_MAX`) and use it in `ensureEditServer` when the configured port is occupied but not adoptable; store the actually-bound port on the `edit` `ManagedServer`, in `src/server-manager.ts` (depends on T009).
- [ ] T014 [US2] Route `editBaseUrl` (and thus `editFileUrl`/`editHomeUrl`) to `this.edit?.port` when an edit server is active, falling back to `settings.port` otherwise, in `src/server-manager.ts`. Confirm consumers in `src/embed-processor.ts` and `src/editor-view.ts` build URLs per use (not cached at load) so the bound port is always reflected.
- [ ] T015 [US2] Ensure the no-free-port-found path surfaces the existing clear, user-facing notice (no silent blank view) in `src/server-manager.ts`. Verify by reusing the existing "did not become ready" / port-in-use `Notice` rather than adding a new code path; if practical, assert this branch in `tests/server-manager.test.ts`.

**Checkpoint**: Both vaults run concurrently — US1 (safety) and US2 (availability) hold together.

---

## Phase 5: User Story 3 - Verify vault switch/close & document residuals (Priority: P3)

**Goal**: Confirm vault-switch/close behaves cleanly and capture any residual-process/socket behavior as documentation (fixing it is out of scope).

**Independent Test**: Open vault A (server starts), close A, open vault B (no marimo); inspect for leftover marimo processes / lingering sockets.

### Implementation for User Story 3

- [ ] T016 [US3] Execute quickstart Scenario 5 (vault switch/close) and record observations: run `lsof -nP -iTCP:<port>` and `pgrep -fa marimo` after the switch; note any surviving marimo process or `CLOSE_WAIT`/`TIME_WAIT` sockets persisting beyond ~1–2 minutes (per [quickstart.md](./quickstart.md)).
- [ ] T017 [US3] If residual processes/sockets are observed in T016, add a "Known limitations" note describing the deferred residual-process behavior (cross-vault orphan not reclaimed until that vault is reopened) to `README.md`; if nothing residual is observed, record that result in [quickstart.md](./quickstart.md) Scenario 5 instead (satisfies FR-009/SC-005).

**Checkpoint**: Switch/close behavior verified and documented.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and constitution compliance.

- [ ] T018 [P] Run quickstart Scenarios 1–4 manually against two real vaults and confirm all Expected outcomes (zero cross-vault adoption, zero cross-vault kills, working fallback, unchanged single-vault behavior).
- [ ] T019 Run `npm run build && npm run lint && npm run test` and confirm all green.
- [ ] T020 [P] Verify Constitution VI: any new string/number literal introduced (e.g., schema markers) lives in `src/constants.ts`, not hardcoded; reuse existing `PORT_MAX`/probe constants for the fallback scan.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Setup; BLOCKS US1 and US2 (record schema/identity is shared).
- **US1 (Phase 3)**: depends on Foundational. Delivers the MVP safety fix.
- **US2 (Phase 4)**: depends on Foundational; its fallback wiring (T013) also depends on US1's adoption gate (T009) because both live in the same `ensureEditServer` decision point (spec: P2 builds on P1).
- **US3 (Phase 5)**: depends on US1+US2 being implemented (verification target).
- **Polish (Phase 6)**: depends on all desired stories complete.

### User Story Dependencies

- **US1 (P1)**: independent after Foundational.
- **US2 (P2)**: logically independent behavior, but shares `ensureEditServer`/`server-manager.ts` with US1; sequence US1 → US2 to avoid same-file conflict.
- **US3 (P3)**: pure verification + docs; run last.

### Within Each User Story

- Tests written first and observed failing, then implementation.
- `server-records.ts` (Foundational) before `server-manager.ts` adoption logic.

### Parallel Opportunities

- T005 (records test) is [P], sequential after the interface change in T002.
- Within US1: T006, T007, and T008 ([P]) can be authored together. T009 and T010 touch the same file (`server-manager.ts`) → sequential.
- Within US2: T011 and T012 ([P]) can be authored together. T013–T015 touch the same file → sequential.
- Across stories: limited parallelism because US1 and US2 both edit `src/server-manager.ts`.

---

## Parallel Example: User Story 1 tests

```bash
# Author the US1 test cases together (same file, distinct cases — add then run):
Task: "T006 foreign-vault server not adopted (tests/server-manager.test.ts)"
Task: "T007 same-vault record adopted; reconcile vault gate (tests/server-manager.test.ts)"
Task: "T008 FR-007 reuse/restart regression (tests/server-manager.test.ts)"
# Then run: npm run test  (expect new cases to FAIL before T009/T010)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 (T006–T010).
4. **STOP and VALIDATE**: quickstart Scenario 1 (zero cross-vault adoption). This alone removes the highest-severity data-confusion bug and is shippable.

### Incremental Delivery

1. Foundational ready (record carries vault identity).
2. US1 → validate Scenario 1 → ship (MVP safety).
3. US2 → validate Scenarios 2–4 → ship (availability).
4. US3 → run Scenario 5, document residuals → close out FR-009/SC-005.

---

## Requirement → Task Coverage

| Requirement | Tasks |
|-------------|-------|
| FR-001 / FR-001a | T002–T004, T006, T009 |
| FR-002 | T009, T010 |
| FR-003 | T011, T013 |
| FR-004 | T012, T014 |
| FR-005 | T002, T004, T005 |
| FR-006 | T007, T010 |
| FR-007 | T008, T018 |
| FR-008 | T015 |
| FR-009 | T016, T017 |
| SC-001 | T006, T009, T018 |
| SC-002 | T011, T013, T018 |
| SC-003 | T008, T018 |
| SC-004 | T006, T009, T010 |
| SC-005 | T016, T017 |

---

## Notes

- [P] = different files / independent; most `server-manager.ts` tasks are sequential by necessity.
- Verify new tests FAIL before implementing.
- Residual-process termination (問題②) is explicitly out of scope — US3 only verifies and documents it.
- Commit after each task or logical group.
