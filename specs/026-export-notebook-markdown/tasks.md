---
description: "Task list for Export marimo notebook to static Obsidian Markdown"
---

# Tasks: Export marimo notebook to static Obsidian Markdown

**Input**: Design documents from `/specs/026-export-notebook-markdown/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/exporter.md, quickstart.md

**Tests**: Included — the spec defines a Test Plan and the project ships a Node-based regression suite (`npm test`). New pure modules are unit-tested against fixtures captured from real `marimo export html` output.

**Organization**: Tasks are grouped by user story. The three stories share one export engine (Foundational phase); per-story phases add the command/menu entry points and story-specific output tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (with-code export), US2 (outputs-only export), US3 (file context menu)
- All paths are repo-root relative.

## Path Conventions

Single-project Obsidian plugin: source in `src/`, tests in `tests/` (bundled by `tests/run-tests.mjs`, run with `node --test`). Obsidian API stubbed in `tests/stubs/obsidian.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture real-world fixtures and declare all new literals before any logic is written.

- [X] T001 [P] Capture three `marimo export html` fixtures into `tests/fixtures/`: `export-basic.html` (a `mo.md` cell + a value cell), `export-image.html` (matplotlib figure + `mo.image(url)`, generated with `uvx --with matplotlib`), and `export-widget.html` (`mo.ui.slider` + a cell referencing its `.value`). Use `--no-include-code` for outputs and a second `export-basic-code.html` with code included. See `quickstart.md` "Generating fixtures".
- [X] T002 Add all new constants to `src/constants.ts` (Constitution VI): command ids/names (`export-marimo-notebook-markdown` / `Export active marimo notebook to Markdown`, `export-marimo-notebook-outputs-markdown` / `Export active marimo notebook outputs only to Markdown`), CLI args (`export`, `html`, `-o`, `--no-include-code`), mime-type strings (`text/markdown`, `text/html`, `application/vnd.marimo+mimebundle`, `image/png`, `text/plain`), the `__MARIMO_MOUNT_CONFIG__` marker + `Object.freeze(` anchor, custom-element tag markers (`marimo-ui-element`, `marimo-` prefix), the `.md` extension/suffix template, temp-file suffix `.html`, and success/failure `Notice` strings.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared export engine. All three user stories depend on this; no story phase can begin until these are done.

**⚠️ CRITICAL**: Complete this phase before any user-story phase.

### Config extraction

- [X] T003 [P] Implement `src/marimo-mount-config.ts`: `extractMountConfig(html): MarimoMountConfig | null` — locate the `__MARIMO_MOUNT_CONFIG__` marker and the following `Object.freeze({`, brace-match with string/escape awareness, normalize trailing commas (`,}`→`}`, `,]`→`]`), `JSON.parse`, and return `{ notebook.cells[], session.cells[] }`; return `null` on missing/unparseable. No `eval`. (contracts §3, research R2)
- [X] T004 [P] Add `tests/marimo-mount-config.test.ts`: parse `export-basic.html` fixture (asserts code + outputs present), trailing-comma normalization, and `null` for HTML without the marker / truncated object.

### HTML → Markdown + output rendering

- [X] T005 [P] Implement `src/html-to-markdown.ts` with a dependency-free HTML tokenizer/converter `htmlToMarkdown(html, imageSink)` covering marimo's tag subset (`h1`–`h6`, `strong`/`b`, `em`/`i`, `code`, `pre`, `a`, `img`, `ul`/`ol`/`li`, `p`/`span`, `br`, basic `table`); unknown tags unwrap to text; `<img src="data:">` routed to `imageSink`; `<img src="http(s)">` kept as a Markdown image link. Must be pure and runnable under `node --test` without new dependencies. (contracts §4, research R7)
- [X] T006 [P] In `src/html-to-markdown.ts` add `classifyOutput(output)` and `renderOutput(output, imageSink): string | null` dispatching by mime (data-model "Classification"): `text/markdown`/`text/html`→convert; `application/vnd.marimo+mimebundle` inner `image/png` and direct `image/png`→`imageSink` data URI; `text/plain`→text; output whose HTML contains `<marimo-ui-element>`/`<marimo-*>`→return `null` (ignore, FR-010); unsupported→`null`/brief note.
- [X] T007 [P] Add `tests/html-to-markdown.test.ts`: markdown/html conversion fidelity (headings/bold/lists/table), data-URI image goes to the sink and yields a link token, external `<img>` stays a link, widget output returns `null`, console is never read (FR-018). Drive image cases from `export-image.html`/`export-widget.html` fixtures via `extractMountConfig`.

### Export subprocess

- [X] T008 Add public `exportNotebookHtml(notebookAbsPath, includeCode, outHtmlPath)` to `src/server-manager.ts`, reusing private `resolveCommand()` + `runCapture()` to spawn `[...prefixArgs, "export", "html", notebookAbsPath, "-o", outHtmlPath, (!includeCode ? "--no-include-code")]` with `cwd` = vault path; resolve `{ code, stdout, stderr }`, never throw on non-zero. (contracts §2, research R8)
- [X] T009 [P] Extend `tests/server-manager.test.ts`: assert `exportNotebookHtml` builds the correct argv for both `includeCode` values and omits `--no-include-code` when `includeCode` is true (use the existing fake-marimo/spawn harness in `tests/fixtures/fake-marimo.mjs`).

### Orchestration engine

- [X] T010 Implement `src/notebook-export.ts`: `exportNotebookToMarkdown(plugin, notebookPath, includeCode)` — resolve notebook via `resolveVaultNotebook`, create a temp `.html`, call `ServerManager.exportNotebookHtml`, `extractMountConfig`, then for each index-paired `(NotebookCell, SessionCell)` emit a ```python``` fence only when `includeCode && code && !isMarkdownCell` (a cell is a Markdown cell when an output is `text/markdown` — FR-006 exception), append rendered outputs via `renderOutput`, collect images through an `ImageSink`. (contracts §5, data-model flow)
- [X] T011 In `src/notebook-export.ts` implement the `ImageSink` using Obsidian APIs: decode base64 → `Uint8Array`, `app.fileManager.getAvailablePathForAttachment(name, markdownPath)`, `app.vault.createBinary(path, bytes)`, embed via `app.fileManager.generateMarkdownLink(file, markdownPath)` (FR-008).
- [X] T012 In `src/notebook-export.ts` implement destination + atomicity: choose `<folder>/<base>.md`, else next non-colliding `-1`, `-2`… (reuse the `createUntitledNotebook` collision idiom; never overwrite — FR-011); `vault.create` the note; delete the temp `.html` in a `finally` on success and failure; on any failure create/modify no `.md` and surface a failure `Notice`; on success open the note and show a success `Notice` (FR-012/FR-013/FR-014).
- [X] T013 [P] Add `tests/notebook-export.test.ts`: from `export-basic.html`/`export-image.html` fixtures (stubbing `exportNotebookHtml` to copy the fixture to `outHtmlPath`), assert the built Markdown, that `getAvailablePathForAttachment` is called with the markdown path as `sourcePath` and the `generateMarkdownLink` return value appears in output, non-colliding naming when the target exists, and temp cleanup on both success and a simulated failure.

**Checkpoint**: Export engine complete and unit-tested. User-story phases only wire entry points + story-level output assertions.

---

## Phase 3: User Story 1 - Export with code and results (Priority: P1) 🎯 MVP

**Goal**: A command that exports the active `.py` notebook's code + results to a Markdown note that opens automatically.

**Independent Test**: With a `.py` notebook active, run "Export active marimo notebook to Markdown" → `notebook.md` is created beside it and opens, code cells appear as `python` fences followed by outputs, `mo.md` cells render as native Markdown (no fence), no temp `.html` remains.

- [X] T014 [US1] Register the with-code command in `src/main.ts` (`addCommand`, id/name from constants) using a `checkCallback` gated on active file `extension === "py"` (mirror `CMD_OPEN_ACTIVE_FILE`), invoking `exportNotebookToMarkdown(this, file.path, /*includeCode*/ true)`. (FR-001, FR-003, FR-015)
- [X] T015 [P] [US1] Add a with-code rendering test to `tests/notebook-export.test.ts` using `export-basic-code.html`: every non-markdown code cell yields a `python` fence + output; a `mo.md` cell yields native Markdown with **no** fence (FR-006 exception); no `<marimo-…>` markup present.

**Checkpoint**: US1 fully functional and independently testable — MVP.

---

## Phase 4: User Story 2 - Export outputs only (Priority: P2)

**Goal**: A command that exports only execution results, omitting source code.

**Independent Test**: Run "Export active marimo notebook outputs only to Markdown" → resulting `.md` has outputs but no `python` code fences; widget-derived values reflect export-time snapshot.

- [X] T016 [US2] Register the outputs-only command in `src/main.ts` (id/name from constants), same `.py` `checkCallback`, invoking `exportNotebookToMarkdown(this, file.path, /*includeCode*/ false)`. (FR-002)
- [X] T017 [P] [US2] Add an outputs-only test to `tests/notebook-export.test.ts` using a `--no-include-code` fixture: outputs present, **zero** `python` fences, widget output omitted, derived `mo.md(f"value is {x.value}")` snapshot line present. (FR-006, FR-010)

**Checkpoint**: US1 and US2 both work; they differ only by code blocks (SC-006).

---

## Phase 5: User Story 3 - Trigger from file context menu (Priority: P3)

**Goal**: Both export operations available from the `.py` right-click menu in the file explorer.

**Independent Test**: Right-click a `.py` file → both "Export … to Markdown" and "Export … outputs only to Markdown" items appear and produce the same result as the palette commands.

- [X] T018 [US3] In the existing `EVENT_FILE_MENU` handler in `src/main.ts`, for a `.py` `TFile` add two `menu.addItem` entries (titles from constants, marimo icon) invoking `exportNotebookToMarkdown(this, file.path, true)` and `(…, false)` respectively. (FR-004)

**Checkpoint**: All three entry points share one engine; outcomes identical across palette and menu.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 Verify `tests/constants-policy.test.ts` passes with the new literals (no hardcoded strings/numbers left in `src/notebook-export.ts`, `src/marimo-mount-config.ts`, `src/html-to-markdown.ts`, or the new `main.ts`/`server-manager.ts` code — Constitution VI).
- [ ] T020 [P] Run `quickstart.md` scenarios A–I manually in Obsidian Desktop against a real notebook (images, math, widgets, never-overwrite, failure atomicity, enablement, live values, not-open warning).
- [X] T021 Run the full gate: `npm test`, `npm run build`, `npm run lint` — all green.

---

## Phase 7: Live-session export, math, and not-open warning (post-MVP)

**Purpose**: Reflect the user's live interactive values (slider, etc.) instead of
re-running with initial values, render math, and warn before the initial-values
fallback. Added after manual testing showed CLI export reverts widget values.
Maps to FR-005 (amended), FR-010/FR-010a (math vs widget), FR-019–FR-022, SC-007–SC-009.

- [X] T022 Narrow widget detection to `<marimo-ui-element>` (not any `<marimo-*>`) and convert `<marimo-tex>` math (`||(...||)`/`||[...||]` → `$...$`/`$$...$$`) in `src/html-to-markdown.ts`; add tests in `tests/html-to-markdown.test.ts`. (research R5/R5a)
- [X] T023 Add `MarimoEditorView.exportLiveHtml()` / `getCurrentFile()` in `src/editor-view.ts`, and the `window.fetch` header-capture + `formatLiveExportScript()` in `src/constants.ts` (live `POST /api/export/html`). (contracts §6, research R12)
- [X] T024 Add `MarimoBridgePlugin.findOpenNotebookView()` in `src/main.ts`; make `src/notebook-export.ts` prefer the live HTML and fall back to CLI; add live-vs-CLI tests in `tests/notebook-export.test.ts`. (contracts §5/§6)
- [X] T025 Add `src/export-warning-modal.ts` (`confirmExportWithoutLiveSession`) + `MarimoBridgePlugin.confirmExportWithoutLiveSession()`; warn before the CLI fallback only when the notebook is not open; cancel aborts. Add proceed/cancel/no-warn-when-live tests; add `Modal` to `tests/stubs/obsidian.ts`. (contracts §7, research R13)
- [X] T026 Bump `manifest.json` `minAppVersion` to 1.5.7 (for `getAvailablePathForAttachment`) and update `tests/review-compliance.test.ts`.

**Checkpoint**: Live values reflected when the editor is open; math rendered;
not-open exports warn first. Full gate green (116 tests).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 and T002 can run in parallel; both precede Foundational.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
  - T003→T004; T005→T006→T007; T008→T009 (chains); T010 depends on T002/T003/T005/T006/T008; T011/T012 depend on T010; T013 depends on T010–T012.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
  - US1 (T014–T015), US2 (T016–T017), US3 (T018) are mutually independent and can proceed in parallel once Phase 2 is done. T014/T016/T018 all edit `src/main.ts` → serialize those three edits (not [P] against each other).
- **Polish (Phase 6)**: After all desired stories. T021 is the final gate.

### Within Each User Story

- Command/menu wiring (impl) then its [P] output test.
- Each story is independently testable; none breaks another.

### Parallel Opportunities

- Setup: T001 ∥ T002.
- Foundational pure modules: T003 ∥ T005 ∥ (T008 after env knowledge); their tests T004 ∥ T007 ∥ T009 once each module exists.
- Story output tests T015 ∥ T017 (different test cases) once the engine exists.
- main.ts edits (T014, T016, T018) must be sequential.

---

## Parallel Example: Foundational pure modules

```bash
# After T002 (constants), implement the dependency-free modules in parallel:
Task: "Implement src/marimo-mount-config.ts (extractMountConfig)"   # T003
Task: "Implement src/html-to-markdown.ts (htmlToMarkdown)"          # T005
# Then their tests in parallel:
Task: "tests/marimo-mount-config.test.ts"                           # T004
Task: "tests/html-to-markdown.test.ts"                              # T007
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational (the whole engine) → 3. Phase 3 US1 → 4. Validate quickstart Scenario A → MVP shippable.

### Incremental Delivery

US1 (with-code) → US2 (outputs-only, one command + one test) → US3 (context menu, one handler). Each adds an entry point over the same engine without altering prior behavior.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- The three `src/main.ts` registrations (T014/T016/T018) share a file — do them sequentially.
- All new literals live in `src/constants.ts` (Constitution VI); `tests/constants-policy.test.ts` enforces this.
- No new runtime dependency: HTML→Markdown is in-house (research R7); Node/Electron/Obsidian stay `external`.
- Commit after each task or logical group.
