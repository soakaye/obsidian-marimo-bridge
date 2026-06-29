# Tasks: Enhance Package Manager Path Resolution for Spawned Processes

**Input**: Design documents from `/specs/025-package-manager-spawn-path/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/spawn-path-resolution.md, quickstart.md

**Tests**: Unit tests are included because the feature plan explicitly requires server-manager tests for candidate selection, ordering, dedup, and inherited-environment pass-through.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source files live in `src/`
- Tests live in `tests/`
- Feature artifacts live in `specs/025-package-manager-spawn-path/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current spawn sites and existing test surface before story work begins.

- [X] T001 [P] Inspect current marimo server spawn sites and the `env: process.env` usage in `src/server-manager.ts`
- [X] T002 [P] Inspect existing server-manager spawn/discovery tests and helper functions in `tests/server-manager.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared constants and helper structure needed by all user stories.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 Add `ENV_PATH = "PATH"` to `src/constants.ts` and confirm reuse of `DIR_VENV`, `DIR_SCRIPTS_WIN`, `DIR_SCRIPTS_UNIX`, `DIR_UV_LOCAL`, `DIR_UV_CARGO`, `UV_HOMEBREW_ARM_PATH`, `UV_HOMEBREW_INTEL_PATH`, `ENV_USERPROFILE`, `PLATFORM_WIN32`
- [X] T004 Add a `packageManagerPathDirs()` helper in `src/server-manager.ts` that returns the ordered, deduplicated list of existing absolute candidate directories

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Install packages from marimo's UI when the GUI PATH is minimal (Priority: P1) MVP

**Goal**: Inject the standard package-manager install directories that exist on disk into the spawned process `PATH` so marimo's in-UI installer can locate its manager.

**Independent Test**: Spawn the marimo server from an environment whose `PATH` omits a known existing package-manager directory and verify that directory is present on the spawned process `PATH`.

### Tests for User Story 1

- [X] T005 [US1] Add a failing unit test asserting that existing standard install directories are injected into the spawned process `PATH` in `tests/server-manager.test.ts`
- [X] T006 [US1] Add a failing unit test asserting that missing and non-absolute candidate directories are skipped in `tests/server-manager.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Implement candidate collection in `packageManagerPathDirs()` covering the vault-local `.venv` command directory, `~/.local/bin`, `~/.cargo/bin`, and Homebrew directories with existence and absolute-path checks in `src/server-manager.ts`
- [X] T008 [US1] Add a `buildSpawnEnv(extraPathDirs)` helper in `src/server-manager.ts` that clones `process.env` and prepends new directories to `PATH`
- [X] T009 [US1] Wire `env: this.buildSpawnEnv(this.packageManagerPathDirs())` into every marimo server spawn site in `src/server-manager.ts`
- [X] T010 [US1] Run the User Story 1 tests in `tests/server-manager.test.ts` and confirm directory injection passes

**Checkpoint**: User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Respect configured and environment-local managers first (Priority: P2)

**Goal**: Order the configured uv directory and the vault-local/interpreter directories ahead of the standalone install directories in the injected `PATH`.

**Independent Test**: Configure a uv path and a vault-local `.venv`, then verify the configured uv directory and the environment directories precede the standalone install locations.

### Tests for User Story 2

- [X] T011 [US2] Add a failing unit test asserting the configured uv directory is ordered ahead of vault-local, interpreter, and standalone directories in `tests/server-manager.test.ts`
- [X] T012 [US2] Add a failing unit test asserting the vault-local and interpreter directories precede the standalone install directories, and that Homebrew directories are omitted on Windows, in `tests/server-manager.test.ts`

### Implementation for User Story 2

- [X] T013 [US2] Add the configured uv directory and the active interpreter directory to the front of `packageManagerPathDirs()` ordering, and gate Homebrew directories on non-Windows, in `src/server-manager.ts`
- [X] T014 [US2] Run the User Story 2 tests in `tests/server-manager.test.ts` and confirm ordering precedence passes

**Checkpoint**: User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Preserve existing PATH and avoid duplication (Priority: P3)

**Goal**: Preserve inherited `PATH` entries and their order while avoiding duplicate injected directories.

**Independent Test**: Start from a `PATH` already containing a standard directory and verify it is not duplicated and the inherited entries keep their order; with no new directories, verify the environment is unchanged.

### Tests for User Story 3

- [X] T015 [US3] Add a failing unit test asserting an already-present directory is not duplicated and inherited entries keep their relative order in `tests/server-manager.test.ts`
- [X] T016 [US3] Add a failing unit test asserting an empty candidate list returns the inherited environment unchanged in `tests/server-manager.test.ts`

### Implementation for User Story 3

- [X] T017 [US3] Implement dedup-against-inherited-`PATH` and the empty-candidate pass-through in `buildSpawnEnv()` in `src/server-manager.ts`
- [X] T018 [US3] Run the User Story 3 tests in `tests/server-manager.test.ts` and confirm preservation and dedup pass

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature, documentation, and repository quality gates.

- [X] T019 [P] Update quickstart expectations if implementation reveals more precise validation steps in `specs/025-package-manager-spawn-path/quickstart.md`
- [X] T020 Run the full regression suite with `npm test` from `package.json`
- [X] T021 Run the production type-check/bundle with `npm run build` from `package.json`
- [X] T022 Run lint validation with `npm run lint` from `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - MVP scope
- **User Story 2 (Phase 4)**: Depends on Foundational completion; shares `packageManagerPathDirs()` ordering edits with US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion; shares `buildSpawnEnv()` edits with US1
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Foundational
- **User Story 2 (P2)**: No behavior dependency on US1, but shares `packageManagerPathDirs()` edits in `src/server-manager.ts`
- **User Story 3 (P3)**: No behavior dependency on US1/US2, but shares `buildSpawnEnv()` edits in `src/server-manager.ts`

### Within Each User Story

- Tests first, before implementation
- Candidate construction before spawn-environment composition
- Story-specific test run before moving to the next story

### Parallel Opportunities

- T001 and T002 can be investigated in parallel
- T005/T006 can be written before US1 implementation while sharing `tests/server-manager.test.ts`
- T011/T012 and T015/T016 can be written after T004 while US1 implementation is underway, but final merge touches `tests/server-manager.test.ts`
- T019 can run in parallel with final validation once behavior is known

---

## Parallel Example: User Story 1

```bash
Task: "Add a failing unit test asserting existing standard install directories are injected into the spawned process PATH in tests/server-manager.test.ts"
Task: "Add a failing unit test asserting missing and non-absolute candidate directories are skipped in tests/server-manager.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate directory injection independently with the US1 tests

### Incremental Delivery

1. Add User Story 1 so existing standard directories are injected into the spawn `PATH`
2. Add User Story 2 to order configured and environment-local directories first
3. Add User Story 3 to preserve and deduplicate the inherited `PATH`
4. Run full validation after all selected stories are complete

### Notes

- Keep all new non-empty string literals in `src/constants.ts` or build them from existing constants.
- Keep indentation as tabs in TypeScript files.
- Do not change marimo server lifecycle, token handling, package-manager strategy selection, or uv command discovery beyond the spawn environment.
