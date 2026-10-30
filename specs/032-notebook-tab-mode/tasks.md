# Tasks: Notebook Tab Edit/Run Mode Selection

**Input**: Design documents from `specs/032-notebook-tab-mode/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/settings-contract.md`, `contracts/view-contract.md`

**Tests**: Included as specified in verification plan and quickstart guide.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Mapped to user story (e.g. `[US1]`, `[US2]`, `[US3]`)

---

## Phase 1: Setup (Constants & Shared Definitions)

**Purpose**: Define all configuration keys, labels, action names, icons, and command identifiers in accordance with Principle VI (Constant Externalization).

- [x] T001 Define configuration keys, setting strings, action labels, icons, and command identifiers in `src/constants.ts`

---

## Phase 2: Foundational (Settings Schema & Defaults)

**Purpose**: Core settings schema updates that prerequisite view mode resolution and settings UI.

- [x] T002 Add `defaultNotebookMode: "edit" | "run"` to `MarimoBridgeSettings` interface and `DEFAULT_SETTINGS` in `src/settings.ts`

**Checkpoint**: Foundation ready — User Story implementation can begin.

---

## Phase 3: User Story 1 - Configure Default Tab Mode to Run App View (Priority: P1) 🎯 MVP

**Goal**: Allow users to set "Default notebook mode" to "Run mode (app view)" so that opening `.py` notebooks in workspace tabs defaults to the interactive app view, while Home screen remains in Edit mode and default remains Edit mode for backward compatibility.

**Independent Test**:
Set `defaultNotebookMode` to `"run"`. Open a notebook in a tab; verify it requests a run server and displays the app view. Open Marimo Home (no file); verify it opens in edit mode.

### Tests for User Story 1

- [x] T003 [P] [US1] Add unit tests for `defaultNotebookMode` setting defaults, declarative schema, and persistence in `tests/settings.test.ts`
- [x] T004 [P] [US1] Add unit tests for initial tab mode resolution (edit vs run) and Marimo Home fallback in `tests/editor-view.test.ts`

### Implementation for User Story 1

- [x] T005 [US1] Add `defaultNotebookMode` dropdown control to `getSettingDefinitions()` and `display()` in `src/settings.ts`
- [x] T006 [US1] Update `MarimoViewState` interface and `setState` / `executeRender` in `src/editor-view.ts` to resolve `currentMode` from `defaultNotebookMode` and load run server URL for notebook files

**Checkpoint**: User Story 1 is functional and testable independently. Notebooks open in the user's preferred mode by default.

---

## Phase 4: User Story 2 - Toggle Tab Mode Between Edit and Run In-Place (Priority: P2)

**Goal**: Provide a view action button in the tab header and a command palette command to toggle between Edit mode and Run mode in an active notebook tab without modifying global settings.

**Independent Test**:
Open a notebook tab in Run mode. Click the header toggle action (or invoke command palette command); verify view reloads in Edit mode with code cells. Click toggle action again; verify view reloads in Run mode.

### Tests for User Story 2

- [x] T007 [P] [US2] Add unit tests for `toggleMode()` and view state preservation across mode switches in `tests/editor-view.test.ts`

### Implementation for User Story 2

- [x] T008 [US2] Implement `toggleMode()`, view action button (`this.addAction`), and dynamic icon/tooltip updates in `src/editor-view.ts`
- [x] T009 [US2] Register command `CMD_TOGGLE_NOTEBOOK_MODE` in `src/main.ts` with `checkCallback` verifying an active `MarimoEditorView` leaf

**Checkpoint**: User Story 2 is functional and testable independently. Users can seamlessly switch modes in-place.

---

## Phase 5: User Story 3 - Clean Process Resource Management on Mode Switch and Close (Priority: P3)

**Goal**: Ensure dedicated `marimo run` server processes are cleanly acquired and released when tabs toggle mode or close, preventing orphaned processes.

**Independent Test**:
Open a notebook tab in Run mode (run server acquired). Toggle to Edit mode; verify run server is released. Switch back to Run mode and close the tab; verify run server is released and terminated.

### Tests for User Story 3

- [x] T010 [P] [US3] Add unit tests verifying `releaseRunServer` is called when switching from run to edit mode, changing notebook files, and on `onClose` in `tests/editor-view.test.ts`

### Implementation for User Story 3

- [x] T011 [US3] Implement `acquiredRunServerFile` tracking and release invocations in `executeRender` and `onClose` in `src/editor-view.ts`

**Checkpoint**: User Story 3 is functional. Background processes are reliably managed with zero resource leaks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation across the entire feature, regression testing, linting, and quickstart verification.

- [x] T012 Run constant policy test in `tests/constants-policy.test.ts` to confirm no raw string/numeric literals exist
- [x] T013 [P] Validate code quality via ESLint in `.eslintrc` / `package.json` and verify typechecking in `tsconfig.json`
- [x] T014 Execute quickstart validation scenarios defined in `specs/032-notebook-tab-mode/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (requires constants). Blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Delivers MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (builds upon mode resolution in `editor-view.ts`).
- **User Story 3 (Phase 5)**: Depends on Phase 4 (refines lease cleanup for toggle and close).
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities

- Within Phase 3: T003 (`tests/settings.test.ts`) and T004 (`tests/editor-view.test.ts`) can run in parallel.
- Within Phase 4: T007 (`tests/editor-view.test.ts`) can be written in parallel with test updates.
- Within Phase 6: T013 (`lint` + `build`) can run in parallel with T012.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (Setup: constants) and T002 (Foundational: settings schema).
2. Complete T003 - T006 (User Story 1: tests and implementation).
3. Validate User Story 1 independently (tabs open according to `defaultNotebookMode`).

### Incremental Delivery

1. Foundation + US1 (MVP) -> Notebooks can launch directly in Run mode.
2. Add US2 -> Users can toggle between Edit and Run modes via tab header and command palette.
3. Add US3 -> Comprehensive run server process lifecycle management and leak prevention.
4. Polish -> Linting, constants policy verification, and test suite green.
