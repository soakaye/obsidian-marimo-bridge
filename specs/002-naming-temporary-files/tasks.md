# Tasks: Naming Marimo Temporary Files

**Input**: Design documents from `/specs/002-naming-temporary-files/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize branch `002-naming-temporary-files` per workflow plan

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Verify project build and lint settings are configured at repository root

---

## Phase 3: User Story 1 - Apply Naming Convention for New Notebooks (Priority: P1) 🎯 MVP

**Goal**: Click "New Notebook" inside the marimo dashboard to create a temporary python file with the name `untitled_marimo_*.py` within the vault under the active directory (or vault root) and load it instead of a random OS temporary file.

**Independent Test**: Verify by clicking "New Notebook" from the marimo home dashboard and checking if a new file named `untitled_marimo.py` is created in the active folder and opened in a new tab.

### Implementation for User Story 1

- [x] T003 [P] [US1] Update `shouldIntercept` in `src/editor-view.ts` to intercept `/__new__` navigations
- [x] T004 [P] [US1] Update `handleLinkClick` in `src/editor-view.ts` to route query-less `/__new__` requests to `filePath = "__new__"`
- [x] T005 [US1] Implement `file === "__new__"` interception logic in `openMarimo` within `src/main.ts`
- [x] T006 [US1] Implement incremental name search with a maximum limit of 1000 iterations in `src/main.ts`
- [x] T007 [US1] Handle error notification when name search limit is exceeded in `src/main.ts`
- [x] T008 [US1] Write template content into the newly created file and load the new file path in `src/main.ts`

**Checkpoint**: User Story 1 is fully functional and testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T009 [P] Update documentation including walkthrough.md, spec.md, and plan.md under `specs/002-naming-temporary-files/`
- [x] T010 Validate build and formatting via `npm run build` and `npm run lint`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion.
- **Polish (Final Phase)**: Depends on User Story 1 completion.

### Parallel Opportunities

- T003 and T004 can run in parallel (different areas of `src/editor-view.ts`).
- T009 and T010 can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy if ready
