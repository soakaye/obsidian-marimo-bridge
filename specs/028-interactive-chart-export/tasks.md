---
description: "Task list for Interactive Chart Image Export"
---

# Tasks: Interactive Chart Image Export

**Input**: Design documents from `/specs/028-interactive-chart-export/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/live-export.md, quickstart.md

**Tests**: Unit tests ARE included — plan.md and quickstart.md explicitly require coverage in `tests/html-to-markdown.test.ts`, and the project ships a `npm test` suite.

**Organization**: Grouped by user story. Both stories are P1 and share the same code path; the Foundational phase installs the plumbing both depend on, then US1 adds image capture/embedding and US2 hardens the placeholder fallback.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 (Setup, Foundational, Polish have no story label)
- Exact file paths are included in each task.

## Path Conventions

Single-project desktop Obsidian plugin: source in `src/`, tests in `tests/`, manual fixtures in `test/`. Paths below are repo-relative per plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a known-good baseline before changes.

- [X] T001 Verify baseline is green: run `npm install`, `npm test`, `npm run build`, `npm run lint` and confirm the existing chart placeholder test (US5 in `tests/html-to-markdown.test.ts`) passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data-flow plumbing that BOTH user stories require — the `charts` map threaded from the live export down to `renderOutput`, with safe empty-map defaults so existing behavior is preserved.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add constants in `src/constants.ts` for chart correlation: an `object-id` attribute regex (capturing single/double-quoted values, mirroring the `data-diagram`/`data-tabs` patterns) and any image MIME/format string needed by `renderOutput`. Keep DOM selectors inside the `formatLiveExportScript` string. (Constitution VI)
- [X] T003 Add `LiveExportResult` type (`{ html: string; charts: Record<string, string> }`) and change `MarimoEditorView.exportLiveHtml` in `src/editor-view.ts` to return `Promise<LiveExportResult | null>`: validate `html` is a string, copy only string-valued `charts` entries, return `null` on any failure (preserve CLI fallback trigger).
- [X] T004 Add a `charts: Record<string, string> = {}` parameter to `renderOutput` (and pass it from `buildMarkdown`) in `src/html-to-markdown.ts`, defaulting to `{}` so the chart branch still emits the placeholder — no behavior change yet.
- [X] T005 Thread the map through `src/notebook-export.ts`: in `exportNotebookToMarkdown` consume the new `LiveExportResult` (`live.html` / `live.charts`), pass `charts` (or `{}` on the CLI-fallback path) into `buildMarkdown`, and forward it to `renderOutput`.

**Checkpoint**: Project type-checks (`npm run build`) and `npm test` still passes with the placeholder unchanged (empty map ⇒ placeholder).

---

## Phase 3: User Story 1 - See the chart as an image (Priority: P1) 🎯 MVP

**Goal**: A chart in a live-session notebook exports as an embedded static PNG (Altair and Plotly), saved as a vault attachment.

**Independent Test**: Open `test/04_altair_chart.py` in marimo, export to Markdown, and confirm the note embeds a chart image (not the placeholder) plus a saved PNG attachment.

### Tests for User Story 1 ⚠️

- [X] T006 [P] [US1] Add unit test in `tests/html-to-markdown.test.ts`: `renderOutput` with a `charts` map containing the payload's `object-id` returns an image token (not the placeholder) and the fake sink received the PNG data URI — cover both `<marimo-vega>` (Altair) and `<marimo-plotly>` (Plotly).

### Implementation for User Story 1

- [X] T007 [US1] Extend `formatLiveExportScript` in `src/constants.ts` to rasterize charts and return `{ html, charts }`: for `marimo-vega[object-id]` use child `<canvas>.toDataURL("image/png")` with an `XMLSerializer`-based SVG→canvas fallback; for `marimo-plotly[object-id]` prefer `window.Plotly.toImage(el,{format:"png"})` then canvas/SVG; look in `element.shadowRoot` as well; size captures by `devicePixelRatio` (FR-010); wrap each capture in try/catch (omit on failure); `await Promise.all` async captures; keep the `__marimoBridgeHeaders`/`null`-on-error contract.
- [X] T008 [US1] In `renderOutput` (`src/html-to-markdown.ts`), replace `chartKind` with logic that also extracts the chart's `object-id` (using the T002 regex); when `charts[objectId]` is a non-empty string return `sink.addDataUri(charts[objectId])` (embed), else fall through to `formatChartPlaceholder(kind)`.
- [ ] T009 [US1] Run quickstart Scenarios A (Altair), B (Plotly), and D (multiple charts map correctly) in Obsidian; confirm embedded images, saved attachments, correct per-chart mapping, and HiDPI sharpness.

**Checkpoint**: With a live session, Altair/Plotly charts embed as images; `npm test` (T006) passes.

---

## Phase 4: User Story 2 - Graceful fallback when no image is produced (Priority: P1)

**Goal**: The export never aborts or silently drops a chart: no live session, capture failure, or unmatched `object-id` each degrade to the placeholder callout.

**Independent Test**: Export a notebook that is NOT open in marimo and confirm the chart shows the placeholder callout and the export completes.

### Tests for User Story 2 ⚠️

- [X] T010 [P] [US2] Add unit tests in `tests/html-to-markdown.test.ts`: (a) empty `charts` map → placeholder (existing US5 preserved); (b) `charts` map whose key does NOT match the payload's `object-id` → placeholder (no positional matching).

### Implementation for User Story 2

- [X] T011 [US2] Confirm/finish the fallback paths: in `src/notebook-export.ts` the CLI-fallback branch passes `charts = {}`; in `src/html-to-markdown.ts` an absent `object-id` or a map miss returns `formatChartPlaceholder(kind)`; verify a single chart's capture failure (omitted map entry) does not affect other outputs or abort the export (FR-006/FR-007).
- [ ] T012 [US2] Run quickstart Scenario C (notebook not open in marimo → placeholder, export succeeds via CLI fallback).

**Checkpoint**: Both stories work — images when capturable, placeholder otherwise; full export always completes.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across both stories.

- [X] T013 [P] Run `npm run build`, `npm test`, `npm run lint` — all green.
- [ ] T014 Run the full `quickstart.md` validation (Scenarios A–D) end-to-end in Obsidian as a final acceptance pass; spot-check that re-running export does not overwrite the prior note/attachments (non-colliding names).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories. T002 is independent ([P]); T003 → T004 → T005 are sequential along the data flow (T005 consumes the T003 type and the T004 signature).
- **US1 (Phase 3)**: Depends on Foundational. T007 (`constants.ts`) and T008 (`html-to-markdown.ts`) are different files but together deliver embedding; T006 test can be written in parallel.
- **US2 (Phase 4)**: Depends on Foundational; overlaps US1 because the placeholder branch is the `else` of the same `renderOutput` chart logic. Independently testable via the no-live-session path.
- **Polish (Phase 5)**: After US1 and US2.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on US2.
- **US2 (P1)**: After Foundational. Shares `renderOutput` with US1 but is independently testable (no-live-session / map-miss).

### Parallel Opportunities

- T002 [P] (constants) can run alongside T003 (editor-view) — different files.
- T006 [P] (US1 test) and T010 [P] (US2 test) can be authored in parallel.
- T007 (`constants.ts`) and T008 (`html-to-markdown.ts`) touch different files and can be done in parallel once Foundational is complete, then integrated.

---

## Parallel Example: Foundational + US1

```bash
# Foundational: constants + type change in parallel (different files)
Task: "T002 Add object-id regex + format constants in src/constants.ts"
Task: "T003 Add LiveExportResult type + change exportLiveHtml in src/editor-view.ts"

# US1: test and the two implementation edits (different files)
Task: "T006 Chart-map-hit unit tests in tests/html-to-markdown.test.ts"
Task: "T007 Rasterization in formatLiveExportScript (src/constants.ts)"
Task: "T008 object-id lookup/embed in renderOutput (src/html-to-markdown.ts)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → green baseline.
2. Phase 2 Foundational → plumbing in place, existing tests still pass.
3. Phase 3 US1 → charts embed as images. **STOP and VALIDATE** Scenarios A/B/D.
4. Demo: exported notes now show real charts.

### Incremental Delivery

1. Setup + Foundational → foundation ready (placeholder preserved).
2. US1 → image embedding (MVP) → validate → demo.
3. US2 → harden fallbacks → validate Scenario C → demo.
4. Polish → full build/test/lint + complete quickstart pass.

---

## Notes

- [P] = different files, no dependencies. The change set is small and clusters in
  4 source files, so parallelism is limited but real (constants vs editor-view vs
  html-to-markdown vs tests).
- The rasterization JavaScript (T007) runs only inside the Electron `<webview>`
  and is NOT covered by Node unit tests — Scenarios A–D (T009/T012/T014) are its
  authoritative checks.
- Preserve the DOM-free converter boundary: only the `formatLiveExportScript`
  string touches the DOM; `renderOutput` consumes a plain `{ objectId → dataUri }`
  map.
- Commit after each task or logical group; keep all artifacts/commits in English.
