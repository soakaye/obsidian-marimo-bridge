---

description: "Task list for feature 027 — Improve marimo → Obsidian Markdown conversion fidelity"
---

# Tasks: Improve marimo → Obsidian Markdown conversion fidelity

**Input**: Design documents from `/specs/027-export-conversion-fidelity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/converter-contract.md, quickstart.md

**Tests**: INCLUDED. The spec's Success Criteria (SC-001..SC-007) are tied to the
`test/` notebooks and asserted via the Node unit suite; the project treats
`npm test` as a gate. Unit tests per construct are therefore part of each story.

**Organization**: Tasks are grouped by user story (US1..US5) so each can be
implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1..US5 from spec.md
- Exact file paths are included in each task

## Path Conventions

Single-project Obsidian plugin. Source under `src/`, tests under `tests/`,
fixtures under `tests/fixtures/`. All conversion logic lives in
`src/html-to-markdown.ts`; all literals in `src/constants.ts` (constitution VI).

> **Shared-file note**: Most stories edit the same two files
> (`src/html-to-markdown.ts`, `src/constants.ts`), so cross-story parallelism is
> limited. Stories remain independently *testable*, but implement them
> sequentially to avoid merge conflicts. `[P]` is marked only where files are
> genuinely distinct.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture real conversion inputs so tests assert against marimo's
actual output shapes (research.md was derived from these captures).

- [X] T001 [P] Add HTML fixtures captured from `marimo export html` for the new constructs under `tests/fixtures/`: `export-admonitions.html`, `export-details.html`, `export-mermaid.html`, `export-tabs.html`, `export-accordion.html`, `export-media.html`, and (if altair/plotly deps available) `export-chart.html`. Source notebooks: `test/01,03,10,12` (and `test/04,05`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared constants, formatters, and dispatch hooks every story builds on.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [X] T002 Add shared emit constants to `src/constants.ts`: `MD_CALLOUT_PREFIX` (`> [!`), `MD_CALLOUT_OPEN_SUFFIX` (`] `), `MD_CALLOUT_COLLAPSE` (`-`), `MD_QUOTE_PREFIX` (`> `), `MD_LANG_MERMAID` (`mermaid`), and the chart-placeholder text constant.
- [X] T003 Add shared formatter helpers to `src/constants.ts`: `formatCallout(type, title, collapsed)`, `formatMermaidBlock(source)`, `formatChartPlaceholder(kind)` (reuse existing `formatHeadingPrefix` for tab labels).
- [X] T004 Add reusable converter helpers to `src/html-to-markdown.ts`: a "quote a block as callout body" helper (prefix each line with `MD_QUOTE_PREFIX`) and a generic "extract entity-encoded JSON attribute" helper, factored from the existing `decodeTableData`/`parseTableRows` so mermaid/tabs/accordion can reuse it.
- [X] T005 Add dispatch hook points in `src/html-to-markdown.ts`: in `renderOutput()` insert a widget "rescue" branch slot (evaluated before the blanket `<marimo-ui-element>` drop, mirroring the existing `tableSource()` branch) and a chart-detection slot; in `htmlToMarkdown()` reserve the documented pass order (custom/container passes before generic paragraph/strip passes).

**Checkpoint**: Shared helpers + hooks ready — stories can be implemented.

---

## Phase 3: User Story 1 — Admonitions & collapsible details → callouts (Priority: P1) 🎯 MVP

**Goal**: Map marimo admonitions and `<details>` to Obsidian callouts (FR-001, FR-002, FR-003).

**Independent Test**: Convert `tests/fixtures/export-admonitions.html` and `export-details.html`; assert note/tip/warning/danger → matching `> [!type]` callout and details → `> [!note]-` collapsed callout, body quoted.

- [X] T006 [US1] Add admonition/details constants to `src/constants.ts`: `CLASS_ADMONITION`, `CLASS_ADMONITION_TITLE`, `TAG_DETAILS`, `TAG_SUMMARY`, and the admonition-type→callout-type map (note/tip/warning/danger; default note).
- [X] T007 [US1] Implement `convertAdmonitions()` in `src/html-to-markdown.ts`: match `<div class="admonition T">`, read the `admonition-title`, convert inner paragraphs, emit `formatCallout(T, title, false)` with body quoted.
- [X] T008 [US1] Implement `convertDetails()` in `src/html-to-markdown.ts`: match `<details><summary>T</summary>…`, emit `formatCallout('note', T, true)` with body quoted.
- [X] T009 [US1] Wire `convertAdmonitions` and `convertDetails` into the `htmlToMarkdown()` pass order in `src/html-to-markdown.ts` (before paragraph/strip passes).
- [X] T010 [US1] Add unit tests in `tests/html-to-markdown.test.ts` for all 4 admonition types and details (per contracts/converter-contract.md), incl. f-string-resolved body preservation (FR-003 acceptance scenario 4).

**Checkpoint**: US1 fully functional and independently testable (delivers MVP).

---

## Phase 4: User Story 2 — Mermaid diagrams → native fences (Priority: P1)

**Goal**: Convert `<marimo-mermaid>` outputs to ` ```mermaid ` fences (FR-004).

**Independent Test**: Convert `tests/fixtures/export-mermaid.html`; assert each diagram becomes a ` ```mermaid ` fence containing the decoded source, in order.

- [X] T011 [US2] Add mermaid constants to `src/constants.ts`: `TAG_MARIMO_MERMAID`, `ATTR_DATA_DIAGRAM` (`MD_LANG_MERMAID` already added in T002).
- [X] T012 [US2] Implement `convertMermaid()` in `src/html-to-markdown.ts` (extract `data-diagram`, entity-decode + JSON-parse via the T004 helper, emit `formatMermaidBlock(source)`) and wire it into the `htmlToMarkdown()` pass order.
- [X] T013 [US2] Add unit tests in `tests/html-to-markdown.test.ts` for graph and sequence diagrams, asserting verbatim source preservation and that no raw `<marimo-mermaid>` remains.

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Layout containers keep their content (Priority: P2)

**Goal**: Preserve tabs/accordion/stack content (FR-005).

**Independent Test**: Convert `tests/fixtures/export-tabs.html` and `export-accordion.html`; assert tabs → `#### label` + content, accordion → `> [!note]- label` per section, stack children render in order.

- [X] T014 [US3] Add layout constants to `src/constants.ts`: `TAG_MARIMO_TABS`, `TAG_MARIMO_ACCORDION`, `ATTR_DATA_TABS`, `ATTR_DATA_LABELS`, `ATTR_DATA_KIND_TAB`.
- [X] T015 [US3] Implement `convertTabs()` in `src/html-to-markdown.ts`: parse `data-tabs` labels (strip tags), iterate `<div data-kind='tab'>` panels, emit `formatHeadingPrefix(4) + label` + converted panel per tab.
- [X] T016 [US3] Implement `convertAccordion()` in `src/html-to-markdown.ts`: parse `data-labels`, iterate child `<div>` sections, emit `> [!note]- label` + quoted converted content per section.
- [X] T017 [US3] Implement stack handling in `src/html-to-markdown.ts`: ensure `mo.hstack`/`mo.vstack` children render as separate blocks (blank-line separated), linearized vertically; preserve nested rich outputs (tables/charts) inside containers.
- [X] T018 [US3] Implement the renderOutput rescue branch (T005 slot) in `src/html-to-markdown.ts`: a `<marimo-ui-element>` containing `<marimo-tabs>`/`<marimo-accordion>` is converted, not dropped; widgets with none of these stay dropped.
- [X] T019 [US3] Wire `convertTabs`/`convertAccordion`/stack passes into the `htmlToMarkdown()` pass order in `src/html-to-markdown.ts`.
- [X] T020 [US3] Add unit tests in `tests/html-to-markdown.test.ts` for tabs (3 tabs), accordion (2 sections), and an hstack/vstack of Markdown children; assert no content lost and no raw `<marimo-tabs>`/`<marimo-accordion>` remains.

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Audio & video preserved (Priority: P2)

**Goal**: Preserve `<audio>`/`<video>` outputs (FR-006).

**Independent Test**: Convert `tests/fixtures/export-media.html`; assert audio and video survive as HTML5 elements (or labeled link when src unresolved).

- [X] T021 [US4] Add media constants to `src/constants.ts`: `TAG_AUDIO`, `TAG_VIDEO`, and media-link label tokens for the fallback.
- [X] T022 [US4] Implement `convertMedia()` in `src/html-to-markdown.ts` to preserve `<audio controls src>`/`<video controls src>` (and `<source>` children) verbatim instead of stripping them, with a `[audio](src)`/`[video](src)` fallback when src is unresolvable; wire it into the `htmlToMarkdown()` pass order ahead of the generic strip pass.
- [X] T023 [US4] Add unit tests in `tests/html-to-markdown.test.ts` for audio and video (preserved element + link fallback path).

**Checkpoint**: US1–US4 independently functional.

---

## Phase 7: User Story 5 — Interactive charts → static image or placeholder (Priority: P3)

**Goal**: Rasterize Altair/Plotly charts to a static image via the live session; placeholder fallback (FR-007, FR-008; clarified in scope on 2026-06-28).

**Independent Test**: Convert chart outputs; assert each yields either an embedded static image attachment or a visible placeholder callout — never a silent drop.

- [X] T024 [US5] Add chart constants to `src/constants.ts`: chart-element marker(s) for Altair/Plotly detection (chart-placeholder text already added in T002).
- [X] T025 [US5] Implement chart detection + placeholder in `src/html-to-markdown.ts` `renderOutput()` (T005 chart slot): a recognized chart widget with no rasterized image emits `formatChartPlaceholder(kind)`; never returns `null`.
- [ ] T026 [US5] Implement live-session chart rasterization in `src/editor-view.ts`: in the export script run inside the `<webview>`, locate rendered chart canvases/SVGs and serialize them to PNG data URIs, attaching them to the exported payload so they can be routed as attachments.
- [ ] T027 [US5] Route rasterized chart PNGs through the existing `ImageSink`/`CollectingImageSink` flow in `src/notebook-export.ts` so charts are saved as vault attachments and linked at the chart position; fall back to the placeholder when no image is present.
- [X] T028 [US5] Add unit tests in `tests/html-to-markdown.test.ts` for the chart placeholder path, and (where feasible without chart deps) a fixture-based test that a rasterized PNG is routed via the sink.

**Checkpoint**: All user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Scope-boundary regressions, no-leak guarantee, gates, and doc sync.

- [X] T029 [P] Add regression tests in `tests/html-to-markdown.test.ts` asserting pure UI input widgets (slider/text/checkbox/dropdown/etc.) and progress/spinner outputs are omitted (FR-013, FR-014).
- [X] T030 Add an integration assertion in `tests/notebook-export.test.ts` that exported Markdown contains zero raw `<marimo-*>` substrings across the new fixtures (SC-006, FR-010), and that feature-026 outputs are unchanged (FR-009, SC-007).
- [X] T031 Ensure all new literals are externalized: run `npm test` (incl. `tests/constants-policy.test.ts`), `npm run lint`, and `npm run build`; fix any hardcoded-literal or type violations.
- [X] T032 [P] Update status columns in `specs/026-export-notebook-markdown/conversion-rules.md` (and link from this feature) to reflect the now-implemented constructs.
- [ ] T033 Run the `specs/027-export-conversion-fidelity/quickstart.md` end-to-end validation (manual smoke in Obsidian per its step 3) and record results.
- [X] T034 Gate the export feature behind an experimental settings toggle (FR-015): add `enableMarkdownExport` (default `false`) to `MarimoBridgeSettings`/`DEFAULT_SETTINGS` and the `DEFAULT_ENABLE_MARKDOWN_EXPORT` + setting name/desc + `Experimental` header constants in `src/constants.ts`; render an "Experimental" section with the toggle in `src/settings.ts` (description states it does not reproduce marimo's live rendering); gate both export commands and the file-explorer context-menu export items on the toggle in `src/main.ts`; update the test settings fixtures (`tests/notebook-path.test.ts`, `tests/server-manager.test.ts`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all stories (shared helpers/constants/hooks).
- **User Stories (Phase 3–7)**: each depends on Foundational. Because they edit the
  shared files `src/html-to-markdown.ts` and `src/constants.ts`, implement them
  **sequentially in priority order** (US1 → US2 → US3 → US4 → US5) to avoid
  conflicts; each remains independently testable.
- **Polish (Phase 8)**: depends on the desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on other stories.
- **US2 (P1)**: after Foundational. Independent of US1.
- **US3 (P2)**: after Foundational. Uses the T005 rescue hook; independent of US1/US2.
- **US4 (P2)**: after Foundational. Independent.
- **US5 (P3)**: after Foundational. Touches `editor-view.ts`/`notebook-export.ts`
  in addition to the converter; independent of US1–US4.

### Within Each Story

- Constants (constants.ts) before the converter that references them.
- Converter implementation before its `htmlToMarkdown()` wiring.
- Implementation before unit tests pass (write tests alongside; they must fail first).

### Parallel Opportunities

- T001 (fixtures) is independent — `[P]`.
- T026 (`editor-view.ts`) and T027 (`notebook-export.ts`) are different files but
  T027 consumes T026's payload shape — sequential.
- Polish T029/T032 touch different files than the gates — `[P]`.
- Cross-story parallelism is intentionally limited by the shared converter file;
  prefer sequential story delivery.

---

## Parallel Example: Setup / Polish

```bash
# Setup: capture fixtures while reviewing research.md
Task: "T001 Add HTML fixtures for new constructs under tests/fixtures/"

# Polish: independent files
Task: "T029 Regression tests for omitted UI inputs/progress in tests/html-to-markdown.test.ts"
Task: "T032 Update conversion-rules.md status columns"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational (CRITICAL, blocks all stories).
2. Phase 3 US1 (admonitions/details → callouts).
3. **STOP and VALIDATE**: convert the admonition/details fixtures; confirm callouts.
4. Demo: export `test/01_markdown.py` and view callouts in Obsidian.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 (callouts) → test → demo (MVP).
3. US2 (mermaid) → test → demo.
4. US3 (layout) → test → demo.
5. US4 (media) → test → demo.
6. US5 (charts) → test → demo.
7. Polish: no-leak + scope regressions + gates + quickstart.

---

## Notes

- `[P]` = different files, no incomplete dependency.
- `[Story]` label maps each task to its user story for traceability.
- Every new string/number literal MUST be a constant in `src/constants.ts`
  (constitution VI; enforced by `tests/constants-policy.test.ts`).
- Keep the converter dependency-free and DOM-free; chart rasterization that needs
  a DOM is confined to the live `<webview>` path in `editor-view.ts`.
- Commit after each task or logical group; stop at any checkpoint to validate.
