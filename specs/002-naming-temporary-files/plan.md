# Implementation Plan: Naming Marimo Temporary Files

**Branch**: `002-naming-temporary-files` | **Date**: 2026-06-18 | **Spec**: [spec.md](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/002-naming-temporary-files/spec.md)

**Input**: Feature specification from `specs/002-naming-temporary-files/spec.md`

## Summary
When a user creates a new notebook from the marimo home dashboard, the plugin intercepts the `/__new__` navigation, creates a new `untitled_marimo_*.py` file directly in the Obsidian Vault under the active directory (or vault root), initialized with the default marimo app template, and opens it instead of creating obscure files in the OS temp directory.

## Technical Context
- **Language/Version**: TypeScript / ES2021
- **Primary Dependencies**: Obsidian API, Electron, Node.js (`child_process`, `fs`)
- **Storage**: Vault files (.py)
- **Testing**: Manual verification in Obsidian Desktop app
- **Target Platform**: Obsidian Desktop
- **Project Type**: Obsidian Plugin

## Constitution Check
- **Principle I (Language Division)**: ✅ Spec, plan, tasks, and code changes are in English. User chat is in Japanese.
- **Principle II (Desktop-Only)**: ✅ Relies on Electron `<webview>` and Node filesystem APIs, which matches desktop-only targets.
- **Principle III (Lifecycle)**: ✅ Unaffected.
- **Principle IV (Safe Bindings)**: ✅ Localhost routing and local server parameters are respected.
- **Principle V (Venv)**: ✅ Unaffected.

## Project Structure

### Documentation (this feature)
```text
specs/002-naming-temporary-files/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
└── tasks.md             # Task list
```

### Source Code (repository root)
```text
src/
├── main.ts              # Intercept "__new__" file parameter and generate the file in vault
└── editor-view.ts       # Detect "/__new__" routing in webview and pass as file="__new__"
```

## Proposed Changes

### WebView & Plugin Core

#### [MODIFY] [editor-view.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/editor-view.ts)
- Modify `shouldIntercept` to return `true` for local `/__new__` path navigations.
- Update `handleLinkClick` to map query-less `/___new__` routes to `filePath = "__new__"` before calling `openMarimo`.

#### [MODIFY] [main.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/main.ts)
- Intercept `file === "__new__"` (or starting with it) in `openMarimo`.
- Identify the parent folder of the active file (default to Vault root if not available).
- Incrementally search for a free name: `untitled_marimo.py`, `untitled_marimo_1.py`, ..., `untitled_marimo_N.py` up to a maximum of 1000 iterations.
- If the limit is reached, show a Notice error. Otherwise, create the file with the default marimo template and proceed to load the new file path.

---

## Verification Plan

### Automated Tests
- N/A (Obsidian plugins are validated manually within the runtime application).

### Manual Verification
1. Run `npm run build` to verify tsc type check and esbuild succeed.
2. Run `npm run lint` to verify ESLint passes without errors on modified files.
3. Open marimo home in the plugin, click "New Notebook", and verify that a new file named `untitled_marimo.py` is created in the active folder and opened.
4. Click "New Notebook" again, and verify that it increments correctly (e.g. `untitled_marimo_1.py` is created and opened).
