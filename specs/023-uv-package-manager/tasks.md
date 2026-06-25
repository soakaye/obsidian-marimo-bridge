# Tasks: Support uv Package Manager for marimo Installation

**Input**: Design documents from `/specs/023-uv-package-manager/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/package-manager-resolution.md, quickstart.md

**Tests**: Unit and regression tests are required by the implementation plan and quickstart.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches a different file or does not depend on an incomplete task.
- **[Story]**: Maps a task to the user story from spec.md.
- Every task names the exact file path it changes or validates.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare constants and shared test scaffolding used by all uv package-manager work.

- [X] T001 Add uv command names, uv package args, pyvenv.cfg filename, default uv candidate constants, setting labels, and notice/log text constants in src/constants.ts
- [X] T002 [P] Add reusable vault `.venv` and command-capture test helpers for package-manager scenarios in tests/server-manager.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared settings shape and package-manager resolution types before user-story behavior is implemented.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `uvPath` to `MarimoBridgeSettings` and `DEFAULT_SETTINGS` with default `""` in src/settings.ts
- [X] T004 Update server-manager test settings factories to include `uvPath` in tests/server-manager.test.ts
- [X] T005 Add package-manager strategy and uv command resolution internal types in src/server-manager.ts
- [X] T006 Add constants-policy coverage for newly introduced uv literals if required by the existing literal scanner in tests/constants-policy.test.ts

**Checkpoint**: Settings data and shared package-manager types are ready for story implementation.

---

## Phase 3: User Story 1 - Detect marimo in a uv-created vault environment (Priority: P1) MVP

**Goal**: Detect marimo package presence for a vault-local `.venv` created by uv using uv package inspection.

**Independent Test**: Create test vaults with `.venv/pyvenv.cfg` containing or lacking a `uv` entry, simulate `uv pip show marimo --python <venv-python>`, and verify installed and missing states without using the legacy pip path.

### Tests for User Story 1

- [X] T007 [P] [US1] Add tests for `.venv/pyvenv.cfg` uv-entry detection, missing config, unreadable config, and non-uv config in tests/server-manager.test.ts
- [X] T008 [P] [US1] Add tests that uv-created vault `.venv` package inspection runs `uv pip show marimo --python <venv-python>` and maps found/missing marimo states in tests/server-manager.test.ts

### Implementation for User Story 1

- [X] T009 [US1] Implement vault-local `.venv` path resolution and pyvenv.cfg uv-entry parsing in src/server-manager.ts
- [X] T010 [US1] Implement package-manager strategy selection that chooses uv only for the auto-detected vault-local `.venv` with a uv entry in src/server-manager.ts
- [X] T011 [US1] Implement marimo package inspection through `uv pip show marimo --python <venv-python>` for uv strategies in src/server-manager.ts
- [X] T012 [US1] Integrate uv package inspection into install-status decisions while preserving `getMarimoVersion()` for launch availability in src/server-manager.ts

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Install or upgrade marimo with uv in a uv-created vault environment (Priority: P1)

**Goal**: Install or upgrade marimo with uv when the selected install target is a uv-created vault-local `.venv`.

**Independent Test**: Simulate uv-created vault `.venv` installs and upgrades with configured, discovered, missing, and failing uv commands; verify command args, notices, stderr logging, and no pip fallback.

### Tests for User Story 2

- [X] T013 [P] [US2] Add tests that configured `uvPath` is validated, preferred, and not bypassed when invalid in tests/server-manager.test.ts
- [X] T014 [P] [US2] Add tests for deterministic uv discovery candidates when `uvPath` is empty in tests/server-manager.test.ts
- [X] T015 [P] [US2] Add tests that uv install and upgrade run `uv pip install [--upgrade] marimo --python <venv-python>` in tests/server-manager.test.ts
- [X] T016 [P] [US2] Add tests that missing or failing uv produces a clear failure, logs stderr, refreshes availability only after success, and never runs pip fallback in tests/server-manager.test.ts

### Implementation for User Story 2

- [X] T017 [US2] Implement configured uv command validation with no auto-discovery fallback after invalid configured paths in src/server-manager.ts
- [X] T018 [US2] Implement empty-setting uv discovery across PATH and deterministic default locations in src/server-manager.ts
- [X] T019 [US2] Implement uv install and upgrade command construction for `installMarimo()` in src/server-manager.ts
- [X] T020 [US2] Implement uv failure handling, stderr logging, user notices, and post-success version refresh in src/server-manager.ts

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Preserve existing pip behavior for non-uv environments (Priority: P2)

**Goal**: Keep configured Python, configured marimo, non-uv `.venv`, and system fallback behavior on the existing pip path.

**Independent Test**: Use non-uv `.venv` and configured Python scenarios to verify detection, install, and upgrade still use existing pip behavior.

### Tests for User Story 3

- [X] T021 [P] [US3] Add tests that non-uv `.venv` and missing pyvenv.cfg keep package strategy on pip in tests/server-manager.test.ts
- [X] T022 [P] [US3] Add tests that configured Python paths outside the vault keep existing `python -m pip install` and upgrade args in tests/server-manager.test.ts

### Implementation for User Story 3

- [X] T023 [US3] Guard package-manager strategy selection so configured Python and configured marimo paths are never overridden by vault uv detection in src/server-manager.ts
- [X] T024 [US3] Preserve existing pip install and upgrade behavior for non-uv targets after uv strategy integration in src/server-manager.ts

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Configure uv command path in settings (Priority: P2)

**Goal**: Let users enter an optional uv command path in settings while empty values continue to mean automatic discovery.

**Independent Test**: Verify default and migrated settings include `uvPath`, settings UI trims and saves the field, invalidates install status, and places the field after Python path and before marimo installation status.

### Tests for User Story 4

- [X] T025 [P] [US4] Add settings tests for `uvPath` defaulting and migration from persisted settings that lack `uvPath` in tests/settings.test.ts
- [X] T026 [P] [US4] Add settings-tab tests or focused regression coverage for trimming and saving `uvPath` if the current test harness supports settings UI behavior in tests/settings.test.ts

### Implementation for User Story 4

- [X] T027 [US4] Add uv command path setting name and description constants in src/constants.ts
- [X] T028 [US4] Render the `uv command path` text input after Python interpreter path and before marimo installation status in src/settings.ts
- [X] T029 [US4] Trim and persist `uvPath`, invalidate marimo availability, and refresh install status on uv path blur in src/settings.ts

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration validation and documentation alignment across all stories.

- [X] T030 [P] Update any quickstart wording needed after implementation details settle in specs/023-uv-package-manager/quickstart.md
- [X] T031 Run `npm test` and fix any uv package-manager regressions in tests/server-manager.test.ts
- [X] T032 Run `npm run build` and fix any TypeScript regressions in src/server-manager.ts
- [X] T033 Run `npm run lint` and fix any lint regressions in src/settings.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on other stories.
- **User Story 2 (P1)**: Starts after Foundational. Uses the strategy and inspection shape from User Story 1 for best integration.
- **User Story 3 (P2)**: Starts after Foundational. Can be validated independently, but final confidence improves after User Story 2 changes install flow.
- **User Story 4 (P2)**: Starts after Foundational. Can be implemented independently of package command execution.

### Within Each User Story

- Write tests first and confirm they fail for the missing behavior.
- Implement the story behavior in the named source files.
- Run the focused test file before moving to the next story.
- Stop at each checkpoint to validate the story independently.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T006 can run in parallel after T001 if constants-policy changes are needed.
- US1 test tasks T007 and T008 can run in parallel.
- US2 test tasks T013, T014, T015, and T016 can run in parallel.
- US3 test tasks T021 and T022 can run in parallel.
- US4 test tasks T025 and T026 can run in parallel.
- Documentation polish T030 can run in parallel with final validation tasks after implementation is complete.

---

## Parallel Example: User Story 1

```bash
Task: "T007 [P] [US1] Add tests for `.venv/pyvenv.cfg` uv-entry detection, missing config, unreadable config, and non-uv config in tests/server-manager.test.ts"
Task: "T008 [P] [US1] Add tests that uv-created vault `.venv` package inspection runs `uv pip show marimo --python <venv-python>` and maps found/missing marimo states in tests/server-manager.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T013 [P] [US2] Add tests that configured `uvPath` is validated, preferred, and not bypassed when invalid in tests/server-manager.test.ts"
Task: "T014 [P] [US2] Add tests for deterministic uv discovery candidates when `uvPath` is empty in tests/server-manager.test.ts"
Task: "T015 [P] [US2] Add tests that uv install and upgrade run `uv pip install [--upgrade] marimo --python <venv-python>` in tests/server-manager.test.ts"
Task: "T016 [P] [US2] Add tests that missing or failing uv produces a clear failure, logs stderr, refreshes availability only after success, and never runs pip fallback in tests/server-manager.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T025 [P] [US4] Add settings tests for `uvPath` defaulting and migration from persisted settings that lack `uvPath` in tests/settings.test.ts"
Task: "T026 [P] [US4] Add settings-tab tests or focused regression coverage for trimming and saving `uvPath` if the current test harness supports settings UI behavior in tests/settings.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate uv-created `.venv` detection and package inspection independently.

### Incremental Delivery

1. Add User Story 1 for uv package detection.
2. Add User Story 2 for uv install and upgrade.
3. Add User Story 3 to prove non-uv pip behavior remains unchanged.
4. Add User Story 4 to expose the uv command path setting in the UI.
5. Run the full validation commands from quickstart.md.

### Parallel Team Strategy

1. Complete Setup and Foundational tasks together.
2. Split tests by story while avoiding simultaneous edits to the same file.
3. Merge server-manager changes in story order: US1, US2, US3.
4. Merge settings UI changes from US4 after the shared `uvPath` settings shape is in place.

## Notes

- All new runtime strings, command arguments, filenames, and default candidate paths belong in src/constants.ts.
- uv support is scoped to the auto-detected vault-local `.venv` with a `uv` entry in `.venv/pyvenv.cfg`.
- Explicit `pythonPath` and `marimoPath` settings preserve existing precedence.
- Invalid configured `uvPath` must fail clearly and must not fall back to discovery or pip.
