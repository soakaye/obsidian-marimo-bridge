# Tasks: Left-Click Ribbon Menu Notebook Creation

**Input**: Design documents from `/specs/003-left-click-create-notebook/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Paths shown below assume single project structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify development environment and install dependencies with npm install

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Update plugin settings schema and defaults in src/settings.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Direct Ribbon Action when Menu is Disabled (Priority: P1) 🎯 MVP

**Goal**: Click ribbon icon when disabled, verify it opens home.

**Independent Test**: Verify that clicking the ribbon icon immediately opens the marimo home dashboard in a new tab when settings toggle is disabled.

### Implementation for User Story 1

- [x] T003 [P] [US1] Update ribbon icon click listener to read showRibbonMenu setting in src/main.ts
- [x] T004 [US1] Add Show ribbon context menu toggle to settings tab in src/settings.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Ribbon Left-Click Menu with Notebook Creation (Priority: P2)

**Goal**: Click ribbon icon when enabled, verify menu pops up, and items function correctly.

**Independent Test**: Click ribbon icon when enabled, verify native Menu pops up, select "Create new marimo notebook", and verify notebook is created and opened.

### Implementation for User Story 2

- [x] T005 [US2] Implement Menu logic in ribbon click event listener in src/main.ts

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T006 [P] Verify linting and build correctness using npm run lint and npm run build
- [x] T007 Run manual verification steps defined in specs/003-left-click-create-notebook/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1) blocks User Story 2 (P2) since the menu requires the settings toggle to be exposed.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### Within Each User Story

- Settings and listener changes can be done in parallel where marked with [P].
- Core implementation before validation and polish.

### Parallel Opportunities

- T003 (main.ts listener update) and T004 (settings toggle) can run in parallel since they touch different files.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (settings schema update)
3. Complete Phase 3: User Story 1 (ribbon listener fallback & toggle UI)
4. **STOP and VALIDATE**: Verify that ribbon icon click still directly opens marimo home.

### Incremental Delivery

1. Foundation ready (T002)
2. Add User Story 1 (T003, T004) -> Verify direct path (MVP)
3. Add User Story 2 (T005) -> Verify menu path
4. Verify overall system (T006, T007)
