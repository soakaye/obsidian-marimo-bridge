# Implementation Plan: Notebook Tab Edit/Run Mode Selection

**Branch**: `032-notebook-tab-mode` | **Date**: 2026-10-30 | **Spec**: [specs/032-notebook-tab-mode/spec.md](file:///F:/source/obsidian-marimo-bridge/.orca/workspaces/obsidian-marimo-bridge/devilray/specs/032-notebook-tab-mode/spec.md)

**Input**: Feature specification from `specs/032-notebook-tab-mode/spec.md`

## Summary

Add a user configuration setting (`defaultNotebookMode`) to control whether notebooks opened in workspace tabs launch by default in Edit mode (full editor) or Run mode (app view). In addition, allow users to seamlessly toggle between Edit and Run modes in an active notebook tab via a header action button and command palette command. Run server processes are acquired and released on demand using existing `ServerManager` reference counting, ensuring unused background processes are promptly terminated when tabs are closed or switched.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20+  
**Primary Dependencies**: Obsidian API, Electron (`<webview>`)  
**Storage**: Obsidian plugin data storage (`data.json`)  
**Testing**: Node.js built-in test runner (`npm test`), ESLint (`npm run lint`), TypeScript (`npm run build`)  
**Target Platform**: Obsidian Desktop (Windows, macOS, Linux)  
**Project Type**: Desktop application plugin  
**Performance Goals**: Tab mode switch takes effect immediately; background run server process terminates within 5 seconds when released.  
**Constraints**: Zero hardcoded strings or numeric literals (Principle VI); desktop-only architecture (Principle II); backward compatibility for existing users defaulting to Edit mode.  
**Scale/Scope**: 4 source files (`src/constants.ts`, `src/settings.ts`, `src/editor-view.ts`, `src/main.ts`) and test suites (`tests/settings.test.ts`, `tests/editor-view.test.ts`).  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Language Division** | **PASS** | Specification, plan, research, data model, contracts, and code changes are written in English. Communication with user in Japanese. |
| **II. Desktop-Only Architecture** | **PASS** | Uses desktop APIs (Node `child_process`, Electron `<webview>`) without mobile abstractions. |
| **III. Reliable Process Lifecycle Management** | **PASS** | Uses `ServerManager.ensureRunServer` and `ServerManager.releaseRunServer` to maintain lease counts and terminate idle processes on close, switch, or unload. |
| **IV. Safe Local Bindings** | **PASS** | Run servers bind to `127.0.0.1` with token authentication and dynamic port allocation. |
| **V. Virtual Environment Preference** | **PASS** | Leverages existing virtual environment detection in `ServerManager`. |
| **VI. Constant Externalization** | **PASS** | All new identifiers, keys, UI labels, icons, and error strings are defined in `src/constants.ts`. |

## Project Structure

### Documentation (this feature)

```text
specs/032-notebook-tab-mode/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 research and decisions
├── data-model.md        # Phase 1 data entities and transitions
├── quickstart.md        # Phase 1 validation scenarios
├── contracts/           # Phase 1 interface and schema contracts
│   ├── settings-contract.md
│   └── view-contract.md
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code Layout

```text
src/
├── constants.ts         # New configuration keys, setting labels, actions, command IDs
├── settings.ts          # defaultNotebookMode setting schema, getSettingDefinitions(), display()
├── editor-view.ts       # MarimoViewState mode, lease acquisition/release, toggle action
└── main.ts              # Command palette toggle command registration

tests/
├── settings.test.ts     # Settings default, declarative schema, and persistence tests
└── editor-view.test.ts  # Mode resolution, lease lifecycle, and switch tests
```

**Structure Decision**: Standard single-project Obsidian desktop plugin structure adhering to the established codebase pattern.

## Complexity Tracking

> *No constitutional violations requiring justification.*
