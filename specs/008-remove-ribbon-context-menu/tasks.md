# Tasks: Remove Ribbon Context Menu

**Input**: Design documents from `/specs/008-remove-ribbon-context-menu/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: None requested (UI behavior verified manually)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Paths assume single project structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation

- [x] T001 Verify development dependencies and environment setups

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core code structure inspection

- [x] T002 Inspect current ribbon registration implementation in src/main.ts

---

## Phase 3: User Story 1 - Left-Click Launches Marimo Home Directly (Priority: P1) 🎯 MVP

**Goal**: Verify left-click continues to open the marimo home dashboard.

**Independent Test**: Click the ribbon icon and verify that it opens the dashboard.

### Implementation for User Story 1

- [x] T003 [US1] Confirm the ribbon left-click handler logic in src/main.ts is unchanged and functions properly

---

## Phase 4: User Story 2 - Right-Click Shows No Custom Context Menu (Priority: P1)

**Goal**: Remove custom right-click context menu.

**Independent Test**: Right-click the ribbon icon and verify no custom context menu is displayed.

### Implementation for User Story 2

- [x] T004 [US2] Remove the contextmenu event listener registration on `ribbonIconEl` in src/main.ts

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and manual test

- [x] T005 [P] Run `npm run build` to verify clean typescript compilation
- [x] T006 [P] Run `npm run lint` to verify eslint compliance
- [x] T007 Manually verify ribbon left-click and right-click behaviors in Obsidian using quickstart.md steps
- [x] T008 Update walkthrough.md to document implementation results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Stories (Phase 3 & 4)**: Depend on Phase 2. US1 and US2 can be verified independently, but code changes are centralized in src/main.ts.
- **Polish (Phase 5)**: Depends on US1 and US2 implementation completion.

---

## Parallel Example: User Story 1 & 2

- Setup tasks and lint/build verification tasks marked with [P] can run in parallel where applicable.
