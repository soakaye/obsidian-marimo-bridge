# Tasks: Add uv Virtual Environment Search Paths

**Input**: Design documents from `/specs/024-add-uv-venv-paths/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/uv-command-discovery.md, quickstart.md

**Tests**: Unit tests are included because the feature plan explicitly requires server-manager tests for discovery order, local candidate behavior, configured path precedence, and unchanged pip strategy.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source files live in `src/`
- Tests live in `tests/`
- Feature artifacts live in `specs/024-add-uv-venv-paths/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current discovery implementation and existing test surface before story work begins.

- [X] T001 [P] Inspect current uv command constants and discovery helper in `src/constants.ts` and `src/server-manager.ts`
- [X] T002 [P] Inspect existing uv package-manager tests and helper functions in `tests/server-manager.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared constants/helper structure needed by all user stories.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 Add or confirm reusable uv executable/path constants for vault-local candidate construction in `src/constants.ts`
- [X] T004 Add a vault-local uv candidate helper in `src/server-manager.ts` that returns `.venv/bin/uv` on Linux/macOS and `.venv/Scripts/uv.exe` on Windows

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Find uv inside a vault-local virtual environment (Priority: P1) MVP

**Goal**: With an empty uv command path setting, discover and use uv from the vault-local virtual environment command directory.

**Independent Test**: Place a usable uv command only in the platform-appropriate vault-local `.venv` command directory, leave `uvPath` empty, and verify uv-backed marimo detection or installation uses that local command.

### Tests for User Story 1

- [X] T005 [US1] Add a failing unit test for automatic discovery ordering with the platform-appropriate vault-local uv candidate before `uv` on PATH in `tests/server-manager.test.ts`
- [X] T006 [US1] Add a failing unit test that `resolveUvCommand()` selects a usable vault-local uv candidate when `uvPath` is empty in `tests/server-manager.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Update `buildUvDiscoveryCandidates()` in `src/server-manager.ts` to insert the platform-appropriate vault-local uv candidate before `uv` on PATH
- [X] T008 [US1] Update uv command source assignment in `resolveUvCommand()` in `src/server-manager.ts` so the vault-local candidate is validated as an automatic non-PATH candidate
- [X] T009 [US1] Run the User Story 1 tests in `tests/server-manager.test.ts` and confirm local uv discovery passes

**Checkpoint**: User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Preserve explicit uv path preference (Priority: P2)

**Goal**: Continue honoring a configured uv command path above all automatic candidates, including the new vault-local candidate.

**Independent Test**: Configure a usable `uvPath` while another uv command exists in the vault-local `.venv` command directory, then verify the configured path is selected; configure an invalid `uvPath` and verify no fallback occurs.

### Tests for User Story 2

- [X] T010 [US2] Extend configured uv path tests to include a competing vault-local uv candidate in `tests/server-manager.test.ts`
- [X] T011 [US2] Add or update the invalid configured uv path test to prove `runCapture()` is not called for vault-local or PATH fallback candidates in `tests/server-manager.test.ts`

### Implementation for User Story 2

- [X] T012 [US2] Confirm configured-path early return in `resolveUvCommand()` bypasses automatic vault-local discovery in `src/server-manager.ts`
- [X] T013 [US2] Run the User Story 2 tests in `tests/server-manager.test.ts` and confirm configured uv path precedence passes

**Checkpoint**: User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Preserve existing automatic discovery after local candidates (Priority: P3)

**Goal**: Preserve existing PATH and default/common uv discovery when no usable vault-local uv command is available.

**Independent Test**: Leave `uvPath` empty, ensure no usable vault-local uv command exists, and verify discovery continues to `uv` on PATH and then existing default/common locations.

### Tests for User Story 3

- [X] T014 [US3] Update the existing uv discovery candidate test to assert vault-local uv first, `uv` on PATH second, and existing `.local`/`.cargo` candidates afterward in `tests/server-manager.test.ts`
- [X] T015 [US3] Add a unit test proving discovery skips a missing vault-local uv candidate and validates `uv` on PATH next in `tests/server-manager.test.ts`

### Implementation for User Story 3

- [X] T016 [US3] Adjust missing-candidate skipping in `resolveUvCommand()` in `src/server-manager.ts` so missing vault-local uv falls through to PATH and default/common candidates
- [X] T017 [US3] Run the User Story 3 tests in `tests/server-manager.test.ts` and confirm fallback discovery passes

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature, documentation, and repository quality gates.

- [X] T018 [P] Update quickstart expectations if implementation reveals more precise validation steps in `specs/024-add-uv-venv-paths/quickstart.md`
- [X] T019 Run the full regression suite with `npm test` from `package.json`
- [X] T020 Run the production type-check/bundle with `npm run build` from `package.json`
- [X] T021 Run lint validation with `npm run lint` from `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - MVP scope
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can be implemented after or alongside US1 once helper shape is known
- **User Story 3 (Phase 5)**: Depends on Foundational completion and can be implemented after or alongside US1 once candidate order is defined
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Foundational
- **User Story 2 (P2)**: No behavior dependency on US1, but shares `resolveUvCommand()` edits in `src/server-manager.ts`
- **User Story 3 (P3)**: No behavior dependency on US1/US2, but shares `buildUvDiscoveryCandidates()` and `resolveUvCommand()` edits in `src/server-manager.ts`

### Within Each User Story

- Tests first, before implementation
- Candidate construction before resolution behavior
- Story-specific test run before moving to the next story

### Parallel Opportunities

- T001 and T002 can be investigated in parallel
- T003 and T004 are sequential if new constants are needed; otherwise T004 can proceed after T001
- T010/T011 can be written after T004 while US1 implementation is underway, but final merge touches `tests/server-manager.test.ts`
- T014/T015 can be written after T004 while US1 implementation is underway, but final merge touches `tests/server-manager.test.ts`
- T018 can run in parallel with final validation once behavior is known

---

## Parallel Example: User Story 1

```bash
Task: "Add a failing unit test for automatic discovery ordering with the platform-appropriate vault-local uv candidate before `uv` on PATH in tests/server-manager.test.ts"
Task: "Add a failing unit test that resolveUvCommand() selects a usable vault-local uv candidate when uvPath is empty in tests/server-manager.test.ts"
```

---

## Parallel Example: User Story 2

```bash
Task: "Extend configured uv path tests to include a competing vault-local uv candidate in tests/server-manager.test.ts"
Task: "Confirm configured-path early return in resolveUvCommand() bypasses automatic vault-local discovery in src/server-manager.ts"
```

---

## Parallel Example: User Story 3

```bash
Task: "Update the existing uv discovery candidate test to assert vault-local uv first, `uv` on PATH second, and existing .local/.cargo candidates afterward in tests/server-manager.test.ts"
Task: "Add a unit test proving discovery skips a missing vault-local uv candidate and validates `uv` on PATH next in tests/server-manager.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate local uv discovery independently with the US1 tests

### Incremental Delivery

1. Add User Story 1 so vault-local uv is discovered automatically
2. Add User Story 2 to protect explicit uv path precedence
3. Add User Story 3 to protect existing fallback discovery
4. Run full validation after all selected stories are complete

### Notes

- Keep all new non-empty string literals in `src/constants.ts` or build them from existing constants.
- Keep indentation as tabs in TypeScript files.
- Do not change marimo server lifecycle, token handling, or package-manager strategy selection beyond uv command discovery.
