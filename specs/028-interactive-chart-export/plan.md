# Implementation Plan: Interactive Chart Image Export

**Branch**: `028-interactive-chart-export` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-interactive-chart-export/spec.md`

## Summary

When a marimo notebook is exported to Markdown while it is open in the live
marimo editor, rasterize each rendered interactive chart (Altair/Vega and Plotly)
to a static PNG inside the `<webview>` session, save it as a vault attachment, and
embed it at the chart's output position. Charts are correlated to their captured
images by the `object-id` attribute shared between the exported HTML payload and
the live editor DOM; any chart that cannot be captured or matched by identifier
falls back to the existing placeholder callout. This implements FR-007 of the
prior conversion-fidelity feature (027), which specified live-session
rasterization but left it unbuilt — only the placeholder fallback exists today
(`src/html-to-markdown.ts:600-603`).

The work extends three existing seams without new dependencies: the live-export
webview script (`formatLiveExportScript`), the live-export call
(`exportLiveHtml`), and the output converter (`renderOutput`). Captured PNGs flow
through the existing `CollectingImageSink` → vault-attachment pipeline already used
for `image/png` outputs.

## Technical Context

**Language/Version**: TypeScript (ES2018+ target), bundled with esbuild → `main.js`

**Primary Dependencies**: Obsidian plugin API; Electron `<webview>` (`executeJavaScript`); browser DOM APIs available inside the webview (`canvas.toDataURL`, `XMLSerializer`, `Image`, `window.Plotly`). No new npm dependencies.

**Storage**: Vault files — exported `.md` note + PNG image attachments via `app.vault.createBinary` and `fileManager.getAvailablePathForAttachment` (existing pipeline).

**Testing**: Node built-in test runner (`node --test`) via `npm test`; type-check via `npm run build` (tsc); `npm run lint` (eslint). The webview rasterization JS is not unit-testable under Node (no DOM); covered by manual end-to-end run.

**Target Platform**: Obsidian Desktop (Electron). Desktop-only by design.

**Project Type**: Single-project desktop Obsidian plugin (`src/` → `main.js`).

**Performance Goals**: Export remains interactive (seconds). Chart capture adds one DOM-snapshot pass per chart; negligible for typical notebooks (a handful of charts).

**Constraints**: Converter (`html-to-markdown.ts`) MUST stay dependency-free and DOM-free (Node-testable); all DOM/rasterization confined to the webview script. Must never abort the export — capture failures degrade to placeholder only. Feature stays behind the experimental Markdown-export toggle (default off).

**Scale/Scope**: ~4 source files touched; small additive changes. Notebooks with 0–N charts; each chart independently captured.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Language Division (言語区分)**: PASS — all spec/plan/code/commits in English; user communication in Japanese.
- **II. Desktop-Only Architecture**: PASS — relies on Electron `<webview>.executeJavaScript` and browser canvas APIs, consistent with the existing desktop-only export path; no mobile code introduced.
- **III. Reliable Process Lifecycle Management**: PASS — no new processes spawned; uses the already-running edit server via the existing authenticated request path.
- **IV. Safe Local Bindings**: PASS — reuses `formatLiveExportScript`'s `window.__marimoBridgeHeaders` (the active access token) against `127.0.0.1`; no new bindings or unauthenticated calls.
- **V. Virtual Environment Preference**: N/A — no Python invocation changes.
- **VI. Constant Externalization**: PASS (with action) — new selectors/attribute names live inside the webview script string in `src/constants.ts`; any new TS-side literals (e.g. the `object-id` attribute regex, MIME/format strings) MUST be declared as constants in `src/constants.ts`, not inlined in `src/html-to-markdown.ts`.

**Result**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/028-interactive-chart-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── live-export.md   # Phase 1 output (webview script result + renderOutput contract)
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── constants.ts         # formatLiveExportScript (extend → rasterize + return {html,charts});
│                        #   chart tag/kind constants (exist); new object-id regex/format constants
├── editor-view.ts       # exportLiveHtml (return type → LiveExportResult | null)
├── notebook-export.ts   # exportNotebookToMarkdown + buildMarkdown (thread charts map through)
└── html-to-markdown.ts  # renderOutput / chartKind (extract object-id, look up image, fallback)

tests/
├── html-to-markdown.test.ts   # add: chart map hit → image token; mismatch → placeholder
└── notebook-export.test.ts    # (existing integration coverage; extend if needed)

test/
├── 04_altair_chart.py   # manual E2E fixture (exists)
└── 05_plotly_chart.py   # manual E2E fixture (exists)
```

**Structure Decision**: Single-project desktop plugin. No new modules; changes are
additive edits to the four existing files above plus a new unit test. The
DOM-free converter boundary is preserved: rasterization lives only in the webview
script string in `src/constants.ts`; `src/html-to-markdown.ts` only consumes a
plain `{ objectId → dataUri }` map.

## Complexity Tracking

> No Constitution Check violations — section intentionally empty.
