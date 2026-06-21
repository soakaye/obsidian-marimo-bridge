# Implementation Plan: Open Markdown Notebooks in marimo

**Branch**: `016-markdown-open-in-marimo` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-markdown-open-in-marimo/spec.md`

## Summary

Add an "Open in marimo" file-explorer context-menu item for `.md` files, alongside the existing `.py` support, so users who keep marimo notebooks in Markdown format can open them in the marimo editor with a single right-click. A new plugin setting toggles the `.md` item on or off; it defaults to OFF and is the sole gate (no runtime detection of `mkdocs-marimo`/`quarto-marimo`, per the 2026-06-21 clarification). The technical approach reuses the existing `openMarimo(path)` flow — which opens any vault-relative path in the marimo view via `setViewState` — so `.md` files require no new launch path, server type, or view registration. The change is confined to three existing files.

## Technical Context

**Language/Version**: TypeScript (ES2018+ target via esbuild), Obsidian Plugin API

**Primary Dependencies**: Obsidian API (`Plugin`, `PluginSettingTab`, `Setting`, `Menu`, `TFile`, `TFolder`, `Workspace.on("file-menu")`); existing internal modules `src/main.ts`, `src/settings.ts`, `src/constants.ts`

**Storage**: Plugin settings persisted via Obsidian `loadData`/`saveData` (`data.json`)

**Testing**: Manual validation via the marimo bridge plugin in Obsidian Desktop (no automated test harness in repo); `npm run build` (tsc type-check) and `npm run lint` (eslint) gate correctness

**Target Platform**: Obsidian Desktop (Electron + Node.js); desktop-only per Constitution Principle II

**Project Type**: Single-project desktop Obsidian plugin

**Performance Goals**: Context menu must render without perceptible delay — trivially met because gating is a single boolean check (no subprocess, no I/O)

**Constraints**: Tabs for indentation; all new string/number literals externalized to `src/constants.ts` (Principle VI); do not remove existing comments/docstrings; keep Node/Electron/Obsidian modules in esbuild `external`

**Scale/Scope**: ~3 files touched, 1 new setting, 1 new menu condition; no new modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Language Division | PASS | All artifacts (spec/plan/tasks/code/commits) in English; chat replies in Japanese. |
| II. Desktop-Only Architecture | PASS | No mobile code; uses existing desktop-only menu + view path. No new platform APIs. |
| III. Reliable Process Lifecycle | PASS | No new server process. `.md` reuses the existing edit-server flow already governed by lifecycle management. |
| IV. Safe Local Bindings | PASS | No change to server binding, token handling, or port logic. |
| V. Virtual Environment Preference | PASS | No change to executable resolution. The supporting Markdown integration lives in the same environment marimo already uses. |
| VI. Constant Externalization | PASS (enforced in tasks) | New setting key/labels/description, the `md` extension literal, and the default value MUST be added to `src/constants.ts`, not hardcoded. |

**Result**: No violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-markdown-open-in-marimo/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify + /speckit-clarify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-contract.md   # Settings + context-menu behavior contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
src/
├── main.ts        # Plugin entry; file-menu ("file-menu") handlers, openMarimo(path)
├── settings.ts    # MarimoBridgeSettings interface, DEFAULT_SETTINGS, MarimoBridgeSettingTab.display()
└── constants.ts   # Externalized literals: defaults, RUNTIME_CONSTANTS, setting names/descriptions
```

**Structure Decision**: Single-project Obsidian plugin (existing layout). The feature touches only `src/main.ts` (menu condition), `src/settings.ts` (new setting + toggle UI), and `src/constants.ts` (new constants). No new files in `src/`.

### Touch points (concrete)

- `src/main.ts:174-191` — the existing `file-menu` handler that adds "Open in marimo" for `EXTENSION_PY`. Extend its predicate so the item is also added for `EXTENSION_MD` when the new setting is enabled. The `.py` branch MUST remain unconditional and unchanged (FR-009).
- `src/settings.ts:80-103` — add `showMarkdownContextMenu: boolean` to `MarimoBridgeSettings` and to `DEFAULT_SETTINGS` (default sourced from a constant).
- `src/settings.ts:283-329` — add a new `Setting(...).addToggle(...)` block (next to the existing context-menu / takeover toggles) bound to `showMarkdownContextMenu`, persisting via `saveSettings()`.
- `src/constants.ts` — add `DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU = false`, `RUNTIME_CONSTANTS.EXTENSION_MD = "md"`, `SETTING_MD_CONTEXT_MENU_NAME`, `SETTING_MD_CONTEXT_MENU_DESC`.

## Phase 0 — Research

See [research.md](./research.md). All Technical Context items are known; no NEEDS CLARIFICATION remain. Research confirms `openMarimo(path)` is extension-agnostic and documents the decision to gate by setting only.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md): the single `showMarkdownContextMenu` setting field, its default, lifecycle, and the menu-visibility decision rule.
- [contracts/ui-contract.md](./contracts/ui-contract.md): the settings entry contract and the file-menu item contract (when shown, label, action, `.py` non-regression).
- [quickstart.md](./quickstart.md): manual end-to-end validation steps mapped to the spec's acceptance scenarios.

### Agent context

`CLAUDE.md` contains no `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` markers, so there is no plan reference to update in this step. The optional `agent-context` post-plan hook may refresh agent context if run.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1: design introduces no new modules, processes, or platform dependencies and centralizes all new literals in `src/constants.ts`. All gates remain **PASS**. No violations; Complexity Tracking remains empty.

## Complexity Tracking

No constitution violations; no entries required.
