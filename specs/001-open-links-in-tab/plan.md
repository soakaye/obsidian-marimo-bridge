# Implementation Plan: Open Marimo Workspace Links in New Tab

**Branch**: `001-open-links-in-tab` | **Date**: 2026-06-18 | **Spec**: [specs/001-open-links-in-tab/spec.md](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/001-open-links-in-tab/spec.md)

**Input**: Feature specification from `specs/001-open-links-in-tab/spec.md`

## Summary
Add link interception capabilities to the marimo Electron `<webview>` containers to intercept navigations. Clicking a notebook (`.py`) link will open it in a new Obsidian tab running the marimo editor. Clicking a non-marimo workspace link will open it natively in a new Obsidian tab. Clicking external links will delegate to the default system browser. Tab focus will shift to the new tab by default, but remain in the background if modifier keys (Ctrl/Cmd) or middle-clicks are used.

## Technical Context
- **Language/Version**: TypeScript / ES2021
- **Primary Dependencies**: Obsidian API, Electron, Node.js (`child_process`, `fs`)
- **Storage**: N/A (Vault files only)
- **Testing**: Manual validation in Obsidian Desktop app
- **Target Platform**: Obsidian Desktop (Electron container)
- **Project Type**: Obsidian Plugin
- **Performance Goals**: Tab opening within 1.5 seconds
- **Constraints**: Tabs for indentation, esbuild externalization of Electron/Obsidian
- **Scale/Scope**: Local vault workspace files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Language Division): ✅ All plans, tasks, specs, code, and commit messages are in English. Direct user chat is in Japanese.
- Principle II (Desktop-Only): ✅ Webview and Electron standard APIs (`shell`) are desktop-only, which aligns with project core constraints.
- Principle III (Lifecycle): ✅ Spawning and termination logic is unaffected.
- Principle IV (Safe Bindings): ✅ Bindings to local localhost/127.0.0.1 are respected during URL filtering.
- Principle V (Venv): ✅ Unaffected.

## Project Structure

### Documentation (this feature)
```text
specs/001-open-links-in-tab/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)
```text
src/
├── main.ts              # Modify: Expose openMarimo publicly and expand parameters
├── editor-view.ts       # Modify: Update createMarimoWebview to support link interception
└── embed-processor.ts   # Modify: Update createMarimoWebview call arguments
```

**Structure Decision**: Option 1: Single project (Standard Obsidian Plugin structure).

## Proposed Changes

### Plugin Core

#### [MODIFY] [main.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/main.ts)
- Change `openMarimo` from `private` to `public`.
- Add arguments: `openInNewTab: boolean = true`, `active: boolean = true`.
- Pass these variables down to `getLeaf` and `setViewState`.

#### [MODIFY] [editor-view.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/editor-view.ts)
- Import `shell` from `electron`.
- Add `plugin` as the first argument to `createMarimoWebview`.
- Update `createMarimoWebview` to register event listeners on the `<webview>` component:
  - `will-navigate`: calls common handler with `disposition = "default"`.
  - `new-window`: calls common handler with `disposition = event.disposition`.
- Implement a common URL handler:
  - Parse URL via `new URL(url)`.
  - If URL points to `127.0.0.1` or `localhost`, extract the `file` query parameter.
  - If `file` is found, resolve path. If file ends with `.py`, call `plugin.openMarimo(file, true, active)`. If not, call `plugin.app.workspace.openLinkText(file, "", "tab", { active })`.
  - If URL is external, prevent default and call `shell.openExternal(url)`.
- Implement relative URL and popup handling fixes:
  - Exclude `about:blank` and `javascript:` URLs from link interception to avoid runtime script failures.
  - Bypass interception (`preventDefault()`) for `about:blank` popups so Electron allows standard window generation.
  - Resolve relative URLs internally against the webview's current `src` attribute to absolute URLs before loading inside the same webview.

#### [MODIFY] [embed-processor.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/embed-processor.ts)
- Pass `plugin` as the first argument to `createMarimoWebview`.

---

## Verification Plan

### Automated Tests
- N/A (Obsidian plugins are tested manually within the runtime application).

### Manual Verification
- Deploy plugin locally to a test vault.
- Open a marimo notebook containing:
  - A link to another marimo notebook (`/?file=other.py`).
  - A link to a markdown file (`docs/readme.md`).
  - An external link (`https://marimo.io`).
- Verify link click behavior:
  - Regular click on marimo link -> new tab opened and focused.
  - Ctrl/Cmd click on marimo link -> new tab opened in background (focused remains on current tab).
  - Click on markdown link -> opens natively in new tab.
  - Click on external link -> opens default web browser (no webview navigation).
