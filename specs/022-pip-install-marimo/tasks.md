# Tasks: Upgrade Existing marimo Installations

**Input**: Design documents from `/specs/022-pip-install-marimo/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define required constants for the upgrade command

- [x] T001 Define CMD_ARG_UPGRADE = "--upgrade" constant in src/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configure testing setup for the installation logic

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Configure test mock setup for installMarimo in tests/server-manager.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Fresh Installation of marimo (Priority: P1) 🎯 MVP

**Goal**: Install marimo without the `--upgrade` option when it is not already installed

**Independent Test**: Mock `getMarimoVersion` to return `null`, call `installMarimo()`, and verify `runCapture` is invoked without the `--upgrade` option.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] [US1] Add test for fresh install (without --upgrade) in tests/server-manager.test.ts

### Implementation for User Story 1

- [x] T004 [US1] Implement conditional branch to install without --upgrade in src/server-manager.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Upgrade Existing marimo Installation (Priority: P1)

**Goal**: Install marimo with the `--upgrade` option when it is already installed

**Independent Test**: Mock `getMarimoVersion` to return a version string, call `installMarimo()`, and verify `runCapture` is invoked with the `--upgrade` option.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US2] Add test for upgrade install (with --upgrade) in tests/server-manager.test.ts

### Implementation for User Story 2

- [x] T006 [US2] Implement conditional branch to install with --upgrade in src/server-manager.ts

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify the quality, styles, and correctness of the feature

- [x] T007 Run all automated tests via npm test
- [x] T008 Run linting and type-checking via npm run build and npm run lint
- [x] T009 [P] Perform manual verification according to specs/022-pip-install-marimo/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) and User Story 2 (P2) can run sequentially or in parallel if needed
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- T003 and T005 can be implemented in parallel (in the test file)
- T009 can be run in parallel with polish tasks once code is built

---

## Parallel Example: User Story 1

```bash
# Writing and running the test for US1:
Task: "Add test for fresh install (without --upgrade) in tests/server-manager.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundation → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
