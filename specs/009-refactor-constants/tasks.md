# Tasks: Refactor Literals to Constants

**Input**: Design documents from `/specs/009-refactor-constants/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create centralized constants registry file `src/constants.ts` to manage all externalized configurations.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Define settings defaults (Port, Host, EmbedMode, Timeout) in `src/constants.ts`
- [x] T003 [P] Define UI class names and loading message constants in `src/constants.ts`
- [x] T004 [P] Define Python virtual environment detection paths and binary names as constants in `src/constants.ts`

**Checkpoint**: Foundation ready - constants registry initialized and populated with core configurations.

---

## Phase 3: User Story 1 - Centralized Constant Management (Priority: P1) 🎯 MVP

**Goal**: Establish settings defaults and reference them from the setting tab UI.

**Independent Test**: Verify that default plugin settings and setting tab inputs function normally using constant references.

### Implementation for User Story 1

- [x] T005 [US1] Export setting key mappings and utility constants in `src/constants.ts`
- [x] T006 [US1] Update settings defaults and references in `src/settings.ts` to import and use constants from `src/constants.ts`
- [x] T007 [US1] Verify that settings tab and defaults load correctly after configuration constant extraction

**Checkpoint**: User Story 1 is complete. Settings configuration is successfully externalized and functional.

---

## Phase 4: User Story 2 - String Literal Externalization (Priority: P2)

**Goal**: Replace all raw non-empty string literals inside the execution code.

**Independent Test**: Verify that command registration, ribbon icons, and HTML views load and behave exactly as before.

### Implementation for User Story 2

- [x] T008 [US2] Extract all remaining non-empty string literals (commands, icons, templates, error messages) from `src/main.ts` into `src/constants.ts`
- [x] T009 [US2] Update `src/main.ts` execution blocks to import and use constants from `src/constants.ts`
- [x] T010 [US2] Extract all remaining non-empty string literals (CLI args, paths, health URLs) from `src/server-manager.ts` into `src/constants.ts`
- [x] T011 [US2] Update `src/server-manager.ts` execution blocks to import and use constants from `src/constants.ts`
- [x] T012 [US2] Extract all remaining non-empty string literals (view classnames, partition IDs, DOM events) from `src/editor-view.ts` into `src/constants.ts`
- [x] T013 [US2] Update `src/editor-view.ts` execution blocks to import and use constants from `src/constants.ts`
- [x] T014 [US2] Extract all remaining non-empty string literals (fenced keys, error texts) from `src/embed-processor.ts` into `src/constants.ts`
- [x] T015 [US2] Update `src/embed-processor.ts` execution blocks to import and use constants from `src/constants.ts`

**Checkpoint**: User Story 2 is complete. String literals in execution code are replaced with constants.

---

## Phase 5: User Story 3 - Numeric Literal Externalization (Priority: P3)

**Goal**: Replace all raw non-zero numeric literals inside the execution code.

**Independent Test**: Verify that Notice timeout durations, process timeout variables, and sleep delays operate properly.

### Implementation for User Story 3

- [x] T016 [US3] Extract all remaining non-zero numeric literals (Notice durations, process timeouts, polling sleeps) from `src/server-manager.ts` into `src/constants.ts`
- [x] T017 [US3] Update `src/server-manager.ts` execution blocks to import and use constants from `src/constants.ts`
- [x] T018 [US3] Extract all remaining non-zero numeric literals from `src/editor-view.ts` and `src/settings.ts` into `src/constants.ts`
- [x] T019 [US3] Update `src/editor-view.ts` and `src/settings.ts` execution blocks to import and use constants from `src/constants.ts`

**Checkpoint**: User Story 3 is complete. Numeric literals are replaced with constants.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, formatting, and linting checks.

- [x] T020 [P] Run code-style lint checks `npm run lint` and fix any formatting or import conflicts in `src/`
- [x] T021 Run TypeScript compiler check `npm run build` to verify clean build compilation
- [x] T022 Perform manual verification of marimo server startup, notebook editing, and embeds inside Obsidian

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities
- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Models within a story marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery
1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently (MVP!)
3. Add User Story 2 → Test independently
4. Add User Story 3 → Test independently
