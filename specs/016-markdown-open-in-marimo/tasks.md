---
description: "Task list for feature implementation: Open Markdown Notebooks in marimo"
---

# Tasks: Open Markdown Notebooks in marimo

**Input**: Design documents from `specs/016-markdown-open-in-marimo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: TDD was not requested, so no new test tasks were generated. NOTE (corrected during implementation): the repository DOES have a `node:test` suite (`npm test`, `tests/run-tests.mjs`); adding the new required settings field obliged updating two fixtures (`tests/notebook-path.test.ts`, `tests/server-manager.test.ts`). Validation is performed via `npm run build`, `npm run lint`, `npm test`, and the manual scenarios in quickstart.md.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- All paths are repository-root-relative.

## Path Conventions

Single-project Obsidian plugin. Source under `src/`: `src/main.ts`, `src/settings.ts`, `src/constants.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a known-good baseline before changes.

- [X] T001 Confirm baseline builds clean: run `npm install` then `npm run build` and `npm run lint` on branch `016-markdown-open-in-marimo` with no changes; record that both pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared constants and the settings field that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `EXTENSION_MD: "md"` to the `RUNTIME_CONSTANTS` object in `src/constants.ts` (next to the existing `EXTENSION_PY: "py"`).
- [X] T003 Add `export const DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU = false;` to `src/constants.ts` (next to the existing `DEFAULT_SHOW_CONTEXT_MENU`).
- [X] T004 In `src/settings.ts`, add `showMarkdownContextMenu: boolean;` to the `MarimoBridgeSettings` interface (with a doc comment, e.g. "Add 'Open in marimo' to .md files in the file explorer."), and add `showMarkdownContextMenu: DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU,` to `DEFAULT_SETTINGS`, importing `DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU` from `./constants`. (Depends on T003.)

**Checkpoint**: Constant and persisted setting field exist; menu and settings-UI work can proceed.

---

## Phase 3: User Story 1 - Open a Markdown notebook in marimo from the file explorer (Priority: P1) 🎯 MVP

**Goal**: Right-clicking a `.md` file shows "Open in marimo" (when the setting is ON) and clicking it opens the file in the marimo editor.

**Independent Test**: With the setting enabled, right-click a `.md` file → "Open in marimo" appears → click → file opens in the marimo view. `.py` behavior unchanged.

### Implementation for User Story 1

- [X] T005 [US1] In `src/main.ts`, extend the existing `file-menu` handler (currently at ~lines 174-191, the `EXTENSION_PY` block) so it also adds an "Open in marimo" item for a `TFile` whose extension is `RUNTIME_CONSTANTS.EXTENSION_MD` **only when** `this.settings.showMarkdownContextMenu` is true. The new item uses `TITLE_OPEN_IN_MARIMO`, `ICON_MARIMO_LOGO`, and `onClick(() => void this.openMarimo(file.path))` — identical to the `.py` item. The `.py` branch MUST remain unconditional and unchanged (FR-009). Ensure at most one "Open in marimo" item is added per file.

**Checkpoint**: User Story 1 is functional — `.md` files open in marimo from the context menu (setting can be flipped manually in `data.json` until US2 adds the toggle UI).

---

## Phase 4: User Story 2 - Control the Markdown option from settings (Priority: P2)

**Goal**: A toggle in the plugin settings turns the `.md` "Open in marimo" item on/off, persisting and taking effect without reload.

**Independent Test**: Toggle OFF → `.md` right-click shows no item; toggle ON → item returns; value survives restart; no reload needed.

### Implementation for User Story 2

- [X] T006 [US2] Add `export const SETTING_MD_CONTEXT_MENU_NAME = "Open Markdown files in marimo";` and `export const SETTING_MD_CONTEXT_MENU_DESC = "...";` to `src/constants.ts` (next to `SETTING_CONTEXT_MENU_NAME`/`SETTING_CONTEXT_MENU_DESC`). The description placeholder will be finalized in T008 (US3).
- [X] T007 [US2] In `src/settings.ts` `MarimoBridgeSettingTab.display()`, add a new `new Setting(containerEl).setName(SETTING_MD_CONTEXT_MENU_NAME).setDesc(SETTING_MD_CONTEXT_MENU_DESC).addToggle(...)` block (next to the existing context-menu / take-over toggles, ~lines 271-329). Bind the toggle to `this.plugin.settings.showMarkdownContextMenu`; in `onChange(value)` set the setting and `await this.plugin.saveSettings()`. Import the two new constants. (Depends on T006.)

**Checkpoint**: User Stories 1 and 2 both work — the toggle controls the `.md` item, persists across restart (FR-007), and applies on the next menu invocation without reload (FR-008).

---

## Phase 5: User Story 3 - Understand the integration requirement (Priority: P3)

**Goal**: The setting's description makes clear that a marimo Markdown integration is required, and the plugin performs no detection/pre-validation.

**Independent Test**: Read the toggle description in settings → it names the required integration (e.g. `mkdocs-marimo`/`quarto-marimo`). Confirm no detection code gates the item.

### Implementation for User Story 3

- [X] T008 [US3] Finalize `SETTING_MD_CONTEXT_MENU_DESC` in `src/constants.ts` so it states that enabling adds "Open in marimo" to `.md` files AND that a marimo Markdown integration such as `mkdocs-marimo` or `quarto-marimo` must be installed for the file to render as a notebook (FR-010). While editing, confirm the T005 handler gates the `.md` item on the setting only — no package/runtime detection is present (FR-004). (Depends on T006; refines the constant used by T007.)

**Checkpoint**: All three user stories functional; requirement communicated; no detection logic added.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify correctness and run end-to-end validation.

- [X] T009 Run `npm run build` (tsc type-check + bundle); fix any type errors introduced in `src/main.ts`, `src/settings.ts`, `src/constants.ts`.
- [X] T010 Run `npm run lint` (eslint); resolve any new lint issues (tabs indentation, no removed comments per Constitution). Also ran `npm test` — all 43 tests pass. (eslint); resolve any new lint issues (tabs indentation, no removed comments per Constitution).
- [ ] T011 (PENDING MANUAL — requires Obsidian Desktop) Execute the manual validation scenarios A–F in `specs/016-markdown-open-in-marimo/quickstart.md` in Obsidian Desktop and confirm all pass (default OFF, enable+open, toggle-without-reload, persistence, `.py` non-regression, requirement notice). Not runnable headlessly; to be verified by the user.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. T004 depends on T003.
- **User Story 1 (Phase 3)**: Depends on Foundational (needs `EXTENSION_MD` + `showMarkdownContextMenu`).
- **User Story 2 (Phase 4)**: Depends on Foundational (needs `showMarkdownContextMenu`). T007 depends on T006. Independent of US1.
- **User Story 3 (Phase 5)**: Depends on US2's T006 (refines `SETTING_MD_CONTEXT_MENU_DESC`); verifies US1's T005 has no detection.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Independent of US2/US3 at runtime (menu behavior). MVP.
- **US2 (P2)**: Independent of US1; adds the UI control.
- **US3 (P3)**: Light dependency on US2 (shares the description constant).

### Parallel Opportunities

- T002 and T003 edit the same file (`src/constants.ts`) → run sequentially, not [P].
- After Foundational, **US1 (T005, `src/main.ts`)** and **US2 (T007, `src/settings.ts`)** touch different files and can proceed in parallel if staffed by two people; T006 (constants) should land before T007.
- T009 and T010 (build/lint) are sequential checks; T011 follows after both pass.

---

## Parallel Example

```bash
# After Phase 2 (Foundational) completes, two developers can split:
Developer A: T005 — .md branch in src/main.ts (US1)
Developer B: T006 then T007 — constants + toggle UI in src/settings.ts (US2)
# Then converge on T008 (US3 description) and Phase 6 validation.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (baseline build).
2. Phase 2: Foundational (constants + setting field).
3. Phase 3: US1 (`.md` menu item).
4. **STOP and VALIDATE**: enable the setting (via `data.json`) and confirm a `.md` file opens in marimo; confirm `.py` unchanged.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 → `.md` opens in marimo (MVP).
3. US2 → settings toggle controls it.
4. US3 → description states the integration requirement.
5. Polish → build, lint, full quickstart pass.

---

## Notes

- [P] tasks = different files, no incomplete-task dependencies. Most tasks here touch shared files, so [P] markers are sparse by design.
- All new string/number literals go in `src/constants.ts` per Constitution Principle VI (T002, T003, T006, T008).
- Use Tabs for indentation; do not remove existing comments/docstrings (Constitution Core Constraints).
- Commit after each task or logical group.
- The `.md` and `.py` extension branches are mutually exclusive per file, so no duplicate "Open in marimo" item can appear.
