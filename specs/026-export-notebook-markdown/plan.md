# Implementation Plan: Export marimo notebook to static Obsidian Markdown

**Branch**: `026-export-notebook-markdown` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-export-notebook-markdown/spec.md`

## Summary

Add two commands (and two `.py` file-menu items) that export the active marimo
notebook to a static Obsidian Markdown note: one including source code, one
outputs-only. The plugin runs `marimo export html` (reusing the existing
execution-environment resolution in `ServerManager`), then reads the
`__MARIMO_MOUNT_CONFIG__` object embedded in the produced HTML to obtain
per-cell code (`notebook.cells`) and rendered outputs (`session.cells`). Outputs
are converted to Markdown, embedded raster images are saved as vault attachments
via Obsidian's attachment API, interactive widgets and console output are
ignored, and the result is written next to the notebook under a non-colliding
name and opened. No headless browser, no external static-HTML tool, no new
runtime dependency.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES modules), bundled with esbuild to `main.js`; runtime is Obsidian Desktop on Electron (Node + Chromium).

**Primary Dependencies**: Obsidian API (`Vault`, `FileManager`, `Notice`, `Plugin`, `TFile`); Node `child_process` (already used via `ServerManager.runCapture`), `fs`, `path`. No new npm runtime dependency — HTML→Markdown conversion is a small in-house converter (see research.md). All Node/Electron/Obsidian modules stay in the esbuild `external` list.

**Storage**: Vault filesystem only — writes one `.md` file plus image attachments; reads/writes a temporary `.html` file that is always deleted.

**Testing**: Node built-in flow via `npm test` (`tests/run-tests.mjs` bundles `*.test.ts` with esbuild and runs `node --test`); Obsidian API is stubbed in `tests/stubs/obsidian.ts`. New pure modules (config extraction, HTML→Markdown, output→Markdown) are unit-tested with fixtures captured from real `marimo export html` output.

**Target Platform**: Obsidian Desktop (macOS/Windows/Linux). Desktop-only per Constitution II.

**Project Type**: Single-project Obsidian plugin (`src/` → `main.js`).

**Performance Goals**: Interactive, single-notebook, on-demand export. No throughput target; export of a typical notebook completes in the time `marimo export html` itself takes (seconds). UI must not block beyond the export subprocess.

**Constraints**: No new user-facing settings; no selection modal during export (FR-015/FR-016). Never overwrite an existing file (FR-011). Always delete the temp HTML on success and failure (FR-013/FR-014). Constitution VI: every new string/number literal goes in `src/constants.ts`. Tabs for indentation.

**Scale/Scope**: ~2 new source modules + wiring in `main.ts` and a new public method on `ServerManager`; a handful of new constants; 3–4 new test files with fixtures. Output mime coverage: `text/markdown`, `text/html`, `image/png` (direct + inside `application/vnd.marimo+mimebundle` + `<img src="data:">`), `text/plain`; ignore `<marimo-ui-element>`/`<marimo-*>`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Language Division**: PASS — spec/plan/tasks/code/commits in English; user communication in Japanese.
- **II. Desktop-Only Architecture**: PASS — uses `child_process`/`fs`; no mobile APIs introduced; no `<webview>` needed for this feature.
- **III. Reliable Process Lifecycle**: PASS — export runs a short-lived subprocess captured via the existing `runCapture` (spawn → exit), not a long-lived server; nothing new to tear down on unload.
- **IV. Safe Local Bindings**: N/A — export does not open a network server; it is a one-shot CLI invocation writing a local file. No token/port surface added.
- **V. Virtual Environment Preference**: PASS — export reuses `ServerManager.resolveCommand()`, which already prefers the vault `.venv` before PATH.
- **VI. Constant Externalization**: PASS (enforced in tasks) — all new literals (command ids/names, CLI args `export`/`html`/`--no-include-code`/`-o`, mime types, tag names, file suffixes, notices) defined in `src/constants.ts`. `tests/constants-policy.test.ts` guards this.
- **Core Constraints**: PASS — TypeScript only; no new bundled dependency; Node/Electron/Obsidian remain `external`; Tabs; existing comments preserved.

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/026-export-notebook-markdown/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── exporter.md      # Internal interface contracts (no network API)
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/
├── main.ts                  # MODIFIED: register 2 commands + 2 file-menu items; orchestrate export
├── server-manager.ts        # MODIFIED: add public exportNotebookHtml() (resolveCommand + runCapture)
├── notebook-export.ts       # NEW: orchestration — run export, parse config, build markdown, write files
├── marimo-mount-config.ts   # NEW (pure): extract & parse __MARIMO_MOUNT_CONFIG__ from HTML text
├── html-to-markdown.ts      # NEW (pure): minimal HTML→Markdown converter + output-cell rendering
├── constants.ts             # MODIFIED: new command ids/names, CLI args, mime/tag/suffix literals, notices
└── (editor-view.ts, embed-processor.ts, settings.ts, notebook-path.ts unchanged)

tests/
├── marimo-mount-config.test.ts   # NEW: extraction/normalization (trailing commas), missing/empty config
├── html-to-markdown.test.ts      # NEW: md/html/text conversion, image extraction, widget ignore, console ignore
├── notebook-export.test.ts       # NEW: end-to-end build from fixture config → markdown + attachment calls
├── server-manager.test.ts        # MODIFIED: exportNotebookHtml arg/command construction
└── fixtures/
    ├── export-basic.html         # NEW: real `marimo export html` output (md + value cells)
    ├── export-image.html         # NEW: matplotlib mimebundle + mo.image
    └── export-widget.html        # NEW: mo.ui.slider + derived value cell
```

**Structure Decision**: Single-project layout (existing). Logic is split into two
**pure, dependency-free** modules (`marimo-mount-config.ts`, `html-to-markdown.ts`)
that are trivially unit-testable under the existing esbuild+`node --test` harness,
plus one **orchestration** module (`notebook-export.ts`) that touches the Obsidian
`Vault`/`FileManager` and the new `ServerManager.exportNotebookHtml()`. `main.ts`
only wires commands/menu items and calls the orchestrator, mirroring how it
currently wires `openMarimo`/`createNotebook`.

## Complexity Tracking

> No Constitution violations; section intentionally empty.
