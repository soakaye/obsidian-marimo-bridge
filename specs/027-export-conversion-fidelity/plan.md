# Implementation Plan: Improve marimo → Obsidian Markdown conversion fidelity

**Branch**: `027-export-conversion-fidelity` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-export-conversion-fidelity/spec.md`

## Summary

Extend the existing dependency-free HTML→Markdown converter
(`src/html-to-markdown.ts`) so the constructs marimo emits but the converter
currently drops — admonitions, collapsible details, mermaid diagrams, layout
containers (tabs/accordion/stacks), audio/video, and interactive charts — map to
native Obsidian representations (callouts, ` ```mermaid ` fences, HTML5 media,
static-image-or-placeholder). The export pipeline (`src/notebook-export.ts`)
and image-attachment flow are largely unchanged; the main additions are
conversion rules plus their constants and tests, with one extension to the
live-export path (`src/editor-view.ts`) to rasterize interactive charts to PNG
in the webview (per the Session 2026-06-28 clarification, chart rasterization is
in scope, with a placeholder fallback).

Empirical capture of real `marimo export html` output (see research.md) showed
admonitions/details already render as clean, structured HTML that resolves
f-string values, so they are mapped from the **rendered output**; the
source-extraction path contemplated in the spec (FR-003) is therefore not needed.

Because the conversion is best-effort and not a faithful reproduction of marimo's
live rendering, the whole export feature is gated behind an experimental settings
toggle (`enableMarkdownExport`, OFF by default) under an "Experimental" section of
the settings tab whose description states this caveat (FR-015). The toggle gates
the export commands and file-explorer context-menu items in `src/main.ts`; the
schema/UI live in `src/settings.ts` with literals in `src/constants.ts`.

## Technical Context

**Language/Version**: TypeScript (ES2020+), bundled with esbuild to `main.js`

**Primary Dependencies**: Obsidian API, Node/Electron built-ins (`fs`, `os`,
`path`). No new runtime dependency (FR-012).

**Storage**: Obsidian vault files (Markdown note + image attachments via
`fileManager`); no database.

**Testing**: Node built-in test runner via `tests/run-tests.mjs`
(`npm test`); unit tests under `tests/*.test.ts`, HTML fixtures under
`tests/fixtures/`.

**Target Platform**: Obsidian desktop (Electron), macOS/Windows/Linux.

**Project Type**: Single-project desktop plugin.

**Performance Goals**: Conversion runs synchronously per export on already-loaded
HTML; no specific throughput target. Must stay O(n) over output size as today.

**Constraints**: Dependency-free, browser-DOM-free (unit-testable under Node);
all new literals externalized to `src/constants.ts` (constitution VI).

**Scale/Scope**: ~6 new converter functions + dispatch tweaks in one module, new
constants, and unit/integration tests keyed to the 13 `test/` notebooks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Language Division**: All artifacts (spec/plan/research/code/commits) in
  English; user communication in Japanese. ✅ Compliant.
- **II. Desktop-Only Architecture**: No mobile APIs added; reuses existing
  desktop export path. ✅ Compliant.
- **III. Process Lifecycle / IV. Safe Local Bindings / V. Virtual Environment**:
  No server/process/network changes in this feature. ✅ Not affected.
- **VI. Constant Externalization**: New tag names, attribute names, class names,
  callout prefixes, and fence/language tokens MUST be added to `src/constants.ts`
  and pass `tests/constants-policy.test.ts`. ✅ Planned; enforced by existing test.

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/027-export-conversion-fidelity/
├── plan.md              # This file
├── research.md          # Phase 0: empirical HTML capture + decisions
├── data-model.md        # Phase 1: converter entities
├── quickstart.md        # Phase 1: end-to-end validation guide
├── contracts/
│   └── converter-contract.md   # renderOutput / htmlToMarkdown behavior contract
├── checklists/
│   └── requirements.md  # spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── html-to-markdown.ts   # PRIMARY: add admonition/details/mermaid/tabs/
│                         #   accordion/stack/media/chart conversion + dispatch
├── constants.ts          # new tag/attr/class/callout/fence constants + helpers
├── editor-view.ts        # live-export: rasterize chart DOM → PNG in webview
├── notebook-export.ts    # route chart PNG via ImageSink; placeholder fallback
├── settings.ts           # experimental "Enable Markdown export" toggle + section
└── main.ts               # gate export commands / context-menu items on the toggle

tests/
├── html-to-markdown.test.ts   # unit tests per new converter
├── notebook-export.test.ts    # integration: no raw <marimo-*> leaks
├── constants-policy.test.ts   # enforces externalized literals (existing gate)
└── fixtures/                   # add captured HTML fragments for new constructs
```

**Structure Decision**: Single-project plugin. All conversion logic stays in
`src/html-to-markdown.ts` (the established home), with literals in
`src/constants.ts`. No new modules are required; the change is additive functions
plus dispatch ordering in the existing `htmlToMarkdown()` and `renderOutput()`.

## Complexity Tracking

No constitution violations; section intentionally empty.
