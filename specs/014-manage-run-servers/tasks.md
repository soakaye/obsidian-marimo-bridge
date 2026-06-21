---

description: "Dependency-ordered tasks for run-server lifecycle and consistency remediation"

---

# Tasks: Run-Server Lifecycle and Consistency Remediation

**Input**: Design documents from `specs/014-manage-run-servers/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/run-server-lifecycle.md`, `quickstart.md`

**Tests**: The specification and plan require automated regression coverage.
Write each story's tests first and confirm the new assertions fail before
changing implementation code.

**Organization**: Tasks are grouped by user story so each behavior can be
implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes a different file and has no
  dependency on an unfinished task.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Every task names the exact repository path it changes or validates.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the active feature and prepare reusable test infrastructure.

- [X] T001 Verify the active feature and plan references in `.specify/feature.json` and `AGENTS.md`
- [X] T002 [P] Ensure all `tests/*.test.ts` files are bundled and the Obsidian module is redirected to test doubles in `tests/run-tests.mjs`
- [X] T003 [P] Add the settings, notice, vault, render-child, and webview test capabilities required by this feature to `tests/stubs/obsidian.ts`
- [X] T004 [P] Add controllable process arguments, stdout/stderr, exit, close, and error behavior to `tests/fixtures/fake-marimo.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared runtime-value and process-ownership boundaries
required by every story.

**⚠️ CRITICAL**: Complete this phase before starting user-story implementation.

- [X] T005 Define the fixed host, retry limit, notebook-name limit, process arguments, messages, events, and reusable formatting helpers in `src/constants.ts`
- [X] T006 [P] Add token-required, malformed-record, and valid-record regression tests in `tests/server-records.test.ts`
- [X] T007 Implement token-bearing spawned-process record validation and synchronous persistence in `src/server-records.ts`

**Checkpoint**: Shared constants, test infrastructure, and ownership records are
ready.

---

## Phase 3: User Story 1 - Reuse One Run Server Across Matching Embeds (Priority: P1) 🎯 MVP

**Goal**: Concurrent and equivalent requests for one notebook share one startup
and one ready run server while each caller acquires its own reference.

**Independent Test**: Request the same notebook concurrently through two
equivalent paths and verify one process starts, both requests receive the same
endpoint, and the reference count becomes two.

### Tests for User Story 1

- [X] T008 [P] [US1] Add failing concurrent-acquisition, canonical-path-equivalence, one-spawn, same-endpoint, and per-caller-reference tests in `tests/server-manager.test.ts`

### Implementation for User Story 1

- [X] T009 [US1] Implement one in-flight startup promise per canonical notebook and reference-neutral startup in `src/server-manager.ts`
- [X] T010 [US1] Integrate canonical notebook keys and resolved absolute run targets from `src/notebook-path.ts` into run-server acquisition in `src/server-manager.ts`

**Checkpoint**: User Story 1 starts exactly one server for matching concurrent
embeds and grants one reference to each successful caller.

---

## Phase 4: User Story 2 - Stop an Unused Run Server (Priority: P1)

**Goal**: Keep a shared run server while references remain and terminate it after
the final reference, including asynchronous teardown and notebook removal cases.

**Independent Test**: Acquire two references, release them one at a time, and
verify the server survives the first release and terminates after the second;
repeat a complete acquire/release cycle ten times with zero lingering servers.

### Tests for User Story 2

- [X] T011 [P] [US2] Add failing one-by-one release, startup-failure cleanup, deleted-or-renamed notebook release, plugin-wide cleanup, and ten-cycle leak tests in `tests/server-manager.test.ts`
- [X] T012 [P] [US2] Add failing late-acquisition release, exactly-once unload, and edit-mode neutrality tests in `tests/embed-processor.test.ts`

### Implementation for User Story 2

- [X] T013 [US2] Implement disposed and acquired lease state with immediate late-result release in `src/embed-processor.ts`
- [X] T014 [US2] Implement canonical release aliases, guarded reference decrement, final-reference untracking, and alias cleanup in `src/server-manager.ts`
- [X] T015 [US2] Clear startup, alias, reference, and run-server state while terminating self-started processes during global cleanup in `src/server-manager.ts` and `src/main.ts`

**Checkpoint**: User Story 2 leaves no idle run server after the final embed or
plugin-wide cleanup.

---

## Phase 5: User Story 6 - Keep Every Local Server Safely Bound and Authenticated (Priority: P1)

**Goal**: Make `127.0.0.1` non-configurable, require headless token-authenticated
servers and token-bearing URLs, and resolve edit-port conflicts safely.

**Independent Test**: Load a legacy non-loopback host, exercise free,
compatible, replaceable, and unreleasable edit-port states, and verify fixed-host
URLs and arguments, compatible adoption, replacement, or safe abort as
appropriate.

### Tests for User Story 6

- [X] T016 [P] [US6] Add failing host-setting absence and legacy persisted-host migration tests in `tests/settings.test.ts`
- [X] T017 [P] [US6] Add failing fixed edit/run URL, headless/token/host spawn-argument, compatible adoption, incompatible and foreign eviction, and unreleasable-port no-spawn tests in `tests/server-manager.test.ts`

### Implementation for User Story 6

- [X] T018 [US6] Remove host from the active settings schema and UI and discard legacy persisted host data in `src/settings.ts` and `src/main.ts`
- [X] T019 [US6] Use `127.0.0.1` and the active token for server URLs, health/auth requests, port probes, and headless process arguments in `src/server-manager.ts`
- [X] T020 [US6] Implement compatible listener adoption, listening-PID eviction, bounded release confirmation, conflict notice, and no-spawn abort in `src/server-manager.ts`

**Checkpoint**: User Story 6 exposes no configurable host and never knowingly
starts an edit server on an occupied or non-loopback binding.

---

## Phase 6: User Story 3 - Reject Unsafe or Invalid Notebook Paths (Priority: P2)

**Goal**: Start run servers only for existing regular Python files whose real
targets remain inside the real Vault, and skip occupied run-server ports.

**Independent Test**: Try empty, absolute, traversal, symlink-escape, missing,
non-Python, equivalent, and valid paths plus an occupied candidate port; verify
only valid in-Vault notebooks start and the occupied port is skipped.

### Tests for User Story 3

- [X] T021 [P] [US3] Add failing empty, absolute, traversal, separator-normalization, symlink-escape, missing, non-file, non-Python, canonical-equivalence, and valid-path tests in `tests/notebook-path.test.ts`
- [X] T022 [P] [US3] Add failing occupied run-port, edit-port exclusion, and tracked-run-port exclusion tests in `tests/server-manager.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Implement realpath containment, regular-file validation, case-insensitive Python extension validation, and normalized Vault-relative identity in `src/notebook-path.ts`
- [X] T024 [US3] Reject invalid run targets without tracked state and allocate only an available loopback run port in `src/server-manager.ts`

**Checkpoint**: User Story 3 starts zero processes for unsafe paths and never
selects a known occupied run port.

---

## Phase 7: User Story 4 - Receive Clear Failure Guidance Instead of a Blank View (Priority: P2)

**Goal**: Bound embedded-page recovery to three reloads and replace an exhausted
or unusable page with one explanatory message.

**Independent Test**: Prevent readiness, execute all watchdog callbacks, and
verify exactly three reloads, one terminal guidance message, and no action after
the embedded page is detached.

### Tests for User Story 4

- [X] T025 [US4] Add failing three-retry maximum, explicit load-failure, terminal-guidance-once, detached-page no-op, and successful-readiness cancellation tests in `tests/editor-view.test.ts`

### Implementation for User Story 4

- [X] T026 [US4] Implement attachment-aware readiness watchdogs, capped reloads, cancellation on readiness, and terminal failure rendering in `src/editor-view.ts`

**Checkpoint**: User Story 4 never leaves an indefinitely blank page or an
unbounded recovery loop.

---

## Phase 8: User Story 5 - Create Notebooks Without Overwriting Existing Files (Priority: P2)

**Goal**: Select the first free generated notebook name within 1,000 candidates
and stop safely with one notice after exhaustion.

**Independent Test**: Verify the first free candidate is created without
overwriting earlier files, then occupy all 1,000 candidates and verify zero file
changes and one notice.

### Tests for User Story 5

- [X] T027 [US5] Add failing first-available candidate, existing-file preservation, 1,000-collision exhaustion, zero-write, and single-notice tests in `tests/notebook-creation.test.ts`

### Implementation for User Story 5

- [X] T028 [US5] Implement bounded deterministic notebook-name selection, nullable exhaustion handling, and user notice behavior in `src/main.ts`

**Checkpoint**: User Story 5 cannot overwrite an existing notebook or search
beyond the configured limit.

---

## Phase 9: User Story 7 - Prevent Operational Value Drift During Maintenance (Priority: P3)

**Goal**: Reject runtime string, template-fragment, and non-zero numeric literals
outside the approved constants boundary while excluding compile-time contexts.

**Independent Test**: Introduce one representative violation and verify the
policy test reports its file, line, and column; restore the centralized value and
verify the test passes.

### Tests for User Story 7

- [X] T029 [US7] Add failing AST policy coverage for string literals, interpolated template fragments, non-zero numeric literals, source locations, and type/module/property exclusions in `tests/constants-policy.test.ts`

### Implementation for User Story 7

- [X] T030 [US7] Move remaining runtime values and formatting fragments into `src/constants.ts` and replace inline usages in `src/editor-view.ts`, `src/embed-processor.ts`, `src/main.ts`, `src/notebook-path.ts`, `src/server-manager.ts`, `src/server-records.ts`, `src/settings.ts`, and `src/url-utils.ts`

**Checkpoint**: User Story 7 reports zero unmanaged runtime values.

---

## Phase 10: Polish & Cross-Cutting Validation

**Purpose**: Synchronize documentation and prove the full feature across
automated, static, Electron, and operating-system boundaries.

- [X] T031 [P] Update fixed-host, recovery, naming-limit, and lifecycle behavior in `README.md` and `CHANGELOG.md`
- [X] T032 [P] Synchronize requirement traceability and validation scenarios in `specs/014-manage-run-servers/spec.md`, `specs/014-manage-run-servers/plan.md`, `specs/014-manage-run-servers/research.md`, `specs/014-manage-run-servers/data-model.md`, `specs/014-manage-run-servers/contracts/run-server-lifecycle.md`, and `specs/014-manage-run-servers/quickstart.md`
- [X] T033 Run `npm test`, `npm run build`, `npm run lint`, and `git diff --check` using `package.json`, `tests/run-tests.mjs`, `esbuild.config.mjs`, and `eslint.config.mts`
- [X] T034 Execute and record all Obsidian Desktop scenarios, including ten lifecycle cycles and full-exit reconciliation, in `specs/014-manage-run-servers/quickstart.md`
- [X] T035 Re-run prerequisite and cross-artifact consistency checks and resolve remaining findings in `specs/014-manage-run-servers/spec.md`, `specs/014-manage-run-servers/plan.md`, and `specs/014-manage-run-servers/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No dependencies.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks every user story.
- **Phase 3 — US1**: Depends on Phase 2.
- **Phase 4 — US2**: Depends on US1's acquisition/reference primitive.
- **Phase 5 — US6**: Depends only on Phase 2 and may run in parallel with US1 or
  US2.
- **Phase 6 — US3**: Depends only on Phase 2; its hardened resolver must be
  integrated before final US1/US2 validation.
- **Phase 7 — US4**: Depends only on Phase 2.
- **Phase 8 — US5**: Depends only on Phase 2.
- **Phase 9 — US7**: Depends on Phase 2 and should complete after other source
  changes so its policy test sees the final implementation.
- **Phase 10 — Polish**: Depends on all selected user stories.

### User Story Dependency Graph

```text
Setup → Foundation ─┬─→ US1 → US2 ─┐
                    ├─→ US6 ───────┤
                    ├─→ US3 ───────┤
                    ├─→ US4 ───────┤→ US7 → Polish
                    └─→ US5 ───────┘
```

US3 is independently testable but must be complete before final validation of
run-server stories. US7 deliberately runs after behavior changes because it
enforces the final source tree.

### Within Each User Story

1. Add the story's tests and confirm the new assertions fail.
2. Implement the minimum behavior required for those tests.
3. Run the story-specific tests through `tests/run-tests.mjs`.
4. Confirm the story's independent test criterion before moving on.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T006 can run in parallel with T005.
- After Phase 2, US1, US6, US3, US4, and US5 can be developed in parallel.
- T011 and T012 can run in parallel.
- T016 and T017 can run in parallel.
- T021 and T022 can run in parallel.
- T031 and T032 can run in parallel after story implementation.

---

## Parallel Execution Examples

### User Story 1

```text
Task T008: Add concurrent run-server tests in tests/server-manager.test.ts
```

### User Story 2

```text
Task T011: Add release and leak tests in tests/server-manager.test.ts
Task T012: Add render-child lease tests in tests/embed-processor.test.ts
```

### User Story 6

```text
Task T016: Add host-setting migration tests in tests/settings.test.ts
Task T017: Add binding, authentication, and conflict tests in tests/server-manager.test.ts
```

### User Story 3

```text
Task T021: Add Vault path-boundary tests in tests/notebook-path.test.ts
Task T022: Add run-port allocation tests in tests/server-manager.test.ts
```

### User Stories 4, 5, and 7

```text
Task T025: Add webview recovery tests in tests/editor-view.test.ts
Task T027: Add notebook naming tests in tests/notebook-creation.test.ts
Task T029: Add runtime-value policy tests in tests/constants-policy.test.ts
```

---

## Implementation Strategy

### Technical MVP

1. Complete Setup and Foundational phases.
2. Complete User Story 1.
3. Verify one shared run server and one reference per concurrent caller.

### Release-Ready P1 Scope

1. Complete US1 shared acquisition.
2. Complete US2 final-reference release and cleanup.
3. Complete US6 fixed loopback binding, authentication, and edit-port safety.
4. Re-run the P1 automated and manual checks before adding P2 stories.

### Incremental Delivery

1. Setup + Foundation establish reusable test and policy boundaries.
2. US1 delivers shared run-server startup.
3. US2 closes lifecycle leaks.
4. US6 establishes the required local security boundary.
5. US3 hardens run targets and port allocation.
6. US4 and US5 add bounded user-facing failure behavior.
7. US7 locks the final source tree to the constitution's consistency policy.
8. Polish validates the complete feature in Obsidian Desktop.

## Notes

- `[P]` tasks change different files and have no dependency on an unfinished
  task.
- Story labels map directly to `spec.md` User Stories.
- Keep all project artifacts and code in English; communicate with the user in
  Japanese.
- Preserve desktop-only APIs and cross-platform process-tree behavior.
- Commit only after the user requests it.
