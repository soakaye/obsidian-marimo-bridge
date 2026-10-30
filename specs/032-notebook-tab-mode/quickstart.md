# Quickstart & Verification Guide: Notebook Tab Edit/Run Mode Selection

**Feature**: Notebook Tab Edit/Run Mode Selection  
**Branch**: `032-notebook-tab-mode`  
**Date**: 2026-10-30  

## Prerequisites

- Node.js installed
- Dependencies installed (`npm install`)
- A Python environment with `marimo` installed (optional for automated unit tests, required for full manual verification)

## Automated Tests

Run the full automated test suite:

```bash
npm test
```

Specific test focus areas:
1. `tests/settings.test.ts`:
   - `defaultNotebookMode` default value is `"edit"`.
   - `getSettingDefinitions()` includes `defaultNotebookMode` with correct schema and options.
   - Persistence and updating of `defaultNotebookMode`.
2. `tests/editor-view.test.ts`:
   - View initialization with `defaultNotebookMode: "run"` acquires run server lease and loads run URL.
   - View initialization with no file (Home) always loads edit server.
   - Mode toggle from edit to run acquires run server lease.
   - Mode toggle from run to edit releases run server lease and acquires edit server.
   - Tab closure (`onClose`) releases held run server lease.
3. `tests/constants-policy.test.ts`:
   - Validates all new string and numeric literals are externalized in `src/constants.ts`.

## Code Quality & Linting

```bash
npm run lint
npm run build
```

## Manual Verification Scenarios

### Scenario 1: Default Mode Setting
1. Open Obsidian Settings -> **marimo Bridge**.
2. Locate **Default notebook mode** setting.
3. Verify default is **Edit mode (full editor)**.
4. Change setting to **Run mode (app view)**.
5. In the file explorer, click on a `.py` notebook to open it in a tab.
6. Verify the tab displays the interactive app view (no code editing cells).

### Scenario 2: In-place Toggle via Tab Header Action
1. With the notebook open in **Run mode**, locate the mode toggle action in the tab header (shows an edit icon with tooltip "Switch to edit mode").
2. Click the toggle action.
3. Verify the tab switches to **Edit mode**, displaying code cells.
4. Verify the toggle action in the tab header updates to show a play icon with tooltip "Switch to run mode".
5. Click the toggle action again and verify it returns to **Run mode**.

### Scenario 3: Process Termination on Close / Mode Switch
1. In Run mode, check running processes (e.g. `marimo run <notebook>` process exists).
2. Close the notebook tab.
3. Verify within 5 seconds that the background `marimo run` process has exited cleanly.
