# Implementation Plan: Remove Ribbon Context Menu

**Branch**: `008-remove-ribbon-context-menu` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-remove-ribbon-context-menu/spec.md`

## Summary
Remove the custom right-click context menu from the marimo ribbon icon in `src/main.ts`. Left-clicking will continue to open the marimo home dashboard directly.

## Technical Context

**Language/Version**: TypeScript

**Primary Dependencies**: Obsidian API

**Storage**: N/A

**Testing**: Manual verification (no unit tests for UI registration)

**Target Platform**: Obsidian Desktop

**Project Type**: desktop-app

**Performance Goals**: N/A

**Constraints**: N/A

**Scale/Scope**: Small (1 file modified)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Language Division**: All artifacts written in English. Chat in Japanese. (✅ Passed)
- **II. Desktop-Only Architecture**: Uses Obsidian/Electron desktop APIs. No mobile support. (✅ Passed)
- **III. Process Lifecycle**: No changes to python server lifecycle. (✅ Passed)
- **IV. Safe Local Bindings**: No changes to ports or bindings. (✅ Passed)
- **V. Virtual Environment**: No changes to environment path detection. (✅ Passed)

## Project Structure

### Documentation (this feature)

```text
specs/008-remove-ribbon-context-menu/
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # Data model specification (No changes)
├── quickstart.md        # Verification quickstart guide
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
└── main.ts              # Modify to remove the contextmenu event listener
```

**Structure Decision**: Standard single project structure with TypeScript source files in `src/`.

## Proposed Changes

### `src/main.ts`

- Remove the `contextmenu` event listener registered on `ribbonIconEl` inside `onload()`.
- Ensure `addRibbonIcon` left-click handler remains intact.

## Verification Plan

### Automated Tests
- None (UI interaction).

### Manual Verification
- Build plugin using `npm run build` or `npm run dev`.
- Reload/re-enable plugin in Obsidian.
- Left-click the marimo ribbon icon: Verify it opens the marimo home dashboard.
- Right-click the marimo ribbon icon: Verify no custom context menu appears.
