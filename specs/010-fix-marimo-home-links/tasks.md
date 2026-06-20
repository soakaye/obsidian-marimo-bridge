# Tasks: Fix Marimo Home Links

**Input**: Design documents from `/specs/010-fix-marimo-home-links/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Configure development environment and verify current workspace segment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Verify `src/editor-view.ts` is compilable and central constants are imported

---

## Phase 3: User Story 1 - Opening Marimo Home links in Obsidian Tabs (Priority: P1) 🎯 MVP

**Goal**: Intercept dynamically targeted link clicks in Marimo Home and open them in Obsidian tabs.

**Independent Test**: Click a notebook link from Marimo Home and verify it opens in Obsidian without calling the system browser.

### Implementation for User Story 1

- [x] T003 [US1] Update the injected click listener in `src/editor-view.ts` to detect dynamic targets.
- [x] T004 [US1] Build the plugin using `npm run build` to output `main.js`.
- [x] T005 [US1] Lint the updated files with `npm run lint`.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and clean up

- [x] T006 [P] Update documentation and release logs if applicable.
- [x] T007 [P] Verify quickstart.md manual test flow in Obsidian.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3)**: Depends on Foundational phase completion
- **Polish (Phase 4)**: Depends on all user stories being complete

---

## Parallel Opportunities

- Polish tasks (T006, T007) can be run in parallel once the core story is verified.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently in Obsidian.
