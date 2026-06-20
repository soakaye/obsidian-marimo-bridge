# Tasks: Open Marimo Workspace Links in New Tab

**Input**: Design documents from `/specs/001-open-links-in-tab/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths assume single project: `src/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Configure development environment and verify current codebase status

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Refactor `openMarimo` method signature in `src/main.ts` to be public and accept `openInNewTab` and `active` parameters to support background tab opening

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Click Marimo Link in Editor Webview (Priority: P1) 🎯 MVP

**Goal**: Intercept navigation events within the webview, parse local `.py` workspace links, and open them in a new Obsidian tab (focused or background based on disposition).

**Independent Test**: Click on a local marimo notebook link in the editor webview. Verify it opens in a new focused tab, or a background tab if Ctrl/Cmd + click is used.

### Implementation for User Story 1

- [x] T003 [P] Update `createMarimoWebview` function signature to accept `plugin: MarimoBridgePlugin` as the first argument in `src/editor-view.ts`
- [x] T004 Update `createMarimoWebview` invocation in `render()` of `src/editor-view.ts` to pass `this.plugin`
- [x] T005 [P] Update `createMarimoWebview` invocation in `createMarimoEmbedProcessor` of `src/embed-processor.ts` to pass `plugin`
- [x] T006 Implement `will-navigate` interception and local `.py` link handler (opening in new focused tab) in `createMarimoWebview` inside `src/editor-view.ts`
- [x] T007 Implement `new-window` interception, check `disposition` (open in background if `disposition === 'background-tab'`), and handle local `.py` links in `createMarimoWebview` inside `src/editor-view.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Handle Non-Marimo Workspace Links (Priority: P2)

**Goal**: Detect clicks on workspace links pointing to non-`.py` files (e.g., markdown) and open them natively in Obsidian.

**Independent Test**: Click a workspace link to a markdown file or non-existent file inside the webview. Verify it opens natively in a new Obsidian tab (supporting both focused and background dispositions).

### Implementation for User Story 2

- [x] T008 Implement handling of non-`.py` workspace files in URL interception using `plugin.app.workspace.openLinkText` in `src/editor-view.ts`

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Ignore or Handle External Links (Priority: P3)

**Goal**: Prevent external links from loading inside the webview, delegating them to the operating system's default browser instead.

**Independent Test**: Click an external link (e.g. `https://marimo.io`) inside the webview. Verify it opens in the default system browser and the webview does not navigate away.

### Implementation for User Story 3

- [x] T009 [P] Import `shell` from `electron` in `src/editor-view.ts`
- [x] T010 Implement external link interception calling `shell.openExternal` in `src/editor-view.ts`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build confirmation, linting, and final validation of user-facing scenarios.

- [x] T011 Run build, type-check, and lint using `npm run build` and `npm run lint`
- [x] T012 Run quickstart.md validation to manually verify all link types and behaviors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks US1.
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion. MVP goal.
- **User Story 2 (Phase 4)**: Depends on US1 completion.
- **User Story 3 (Phase 5)**: Depends on US1 completion. Can run in parallel with US2.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities

- T003, T005, and T009 can be prepared in parallel as they touch different files/areas without code conflicts.
- Once Phase 3 is completed, Phase 4 (US2) and Phase 5 (US3) can technically be developed in parallel since they handle mutually exclusive link types inside the dispatcher logic.

---

## Parallel Example: User Story 1

```bash
# Launch signature updates:
Task: "Update createMarimoWebview function signature to accept plugin in src/editor-view.ts"
Task: "Update createMarimoWebview invocation in src/embed-processor.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently in a test vault.

### Incremental Delivery

1. Foundation ready (Setup + Foundational).
2. Add US1 (MVP) -> Test -> Ready.
3. Add US2 -> Test -> Ready.
4. Add US3 -> Test -> Ready.
5. Polish, run linters, and document.
