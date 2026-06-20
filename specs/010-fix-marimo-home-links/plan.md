# Implementation Plan: Fix Marimo Home Links

**Branch**: `010-fix-marimo-home-links` | **Date**: 2026-06-19 | **Spec**: [spec.md](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/010-fix-marimo-home-links/spec.md)

**Input**: Feature specification from `/specs/010-fix-marimo-home-links/spec.md`

## Summary

Fix the issue where local Marimo notebooks clicked from the Marimo Home dashboard open in the external system browser rather than inside Obsidian editor tabs. The fix will involve refining the click event interception in the injected script within the webview.

## Technical Context

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Obsidian API, Electron Webview

**Storage**: N/A

**Testing**: Manual verification on Obsidian Desktop, eslint, tsc compilation

**Target Platform**: Obsidian Desktop (Electron)

**Project Type**: Desktop app plugin

**Performance Goals**: N/A

**Constraints**:
- Must not block external links (e.g., docs, GitHub) from opening in default browser.
- Indentation must use Tabs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Language Division (言語区分)**: Project artifacts in English. (PASS)
- **II. Desktop-Only Architecture**: Relying on webview IPC. (PASS)
- **III. Process Lifecycle**: N/A for this UI-only fix. (PASS)
- **IV. Safe Local Bindings**: Intercepted local URLs will check loopback structure. (PASS)
- **V. Virtual Environment Preference**: N/A. (PASS)
- **VI. Constant Externalization**: Reusing existing IPC and event constants. (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/010-fix-marimo-home-links/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
└── editor-view.ts
```

**Structure Decision**: Single project, modifying the existing `src/editor-view.ts`.

## Proposed Changes

### Webview Interception

#### [MODIFY] [editor-view.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/editor-view.ts)
Update the injected click listener to check for target attributes that represent any new window or iframe target (not `_self`, `_parent`, or `_top`), forwarding them through the IPC bridge message `MarimoBridge-Open`.

## Verification Plan

### Automated Tests
- `npm run build` to verify compilation.
- `npm run lint` to verify eslint check.

### Manual Verification
1. Launch Marimo Home.
2. Click `.py` files under Recent/Running. Verify they open in Obsidian editor tabs.
3. Click external links. Verify they open in external system browsers.
