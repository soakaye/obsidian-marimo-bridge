# Quickstart / Validation Guide: Open Markdown Notebooks in marimo

Manual end-to-end validation for the feature. Maps directly to the spec's acceptance scenarios. There is no automated test harness; correctness gates are `npm run build` and `npm run lint`, plus the manual steps below.

## Prerequisites

- Obsidian Desktop with the marimo bridge plugin built from this branch.
- A vault with at least one `.md` file and one `.py` file in the file explorer.
- (For full notebook rendering) a marimo Markdown integration such as `mkdocs-marimo` or `quarto-marimo` installed in the marimo environment. Not required to validate menu visibility — only to validate that the `.md` file opens as a notebook.

## Build & load

```bash
npm install
npm run build      # tsc type-check + production bundle (must pass)
npm run lint       # eslint (must pass)
```

Reload the plugin in Obsidian (toggle off/on, or restart Obsidian).

## Scenario A — Default is OFF (FR-011, SC-002)

1. On a fresh profile (or after upgrade), open plugin settings.
2. **Expected**: the "Open Markdown files in marimo" toggle is present and OFF.
3. Right-click a `.md` file in the file explorer.
4. **Expected**: no "Open in marimo" item appears for the `.md` file.

## Scenario B — Enable and open (User Story 1, FR-001/002/006, SC-001)

1. In settings, turn the toggle ON. (No reload should be required.)
2. Right-click the same `.md` file.
3. **Expected**: an "Open in marimo" item appears with the marimo icon.
4. Click it.
5. **Expected**: the `.md` file opens in the marimo editor view in a new tab (two interactions total: right-click → click).

## Scenario C — Toggle takes effect without reload (FR-008, SC-005)

1. With the toggle ON and the item visible, turn the toggle OFF in settings.
2. Right-click the `.md` file again (no plugin reload).
3. **Expected**: the "Open in marimo" item is gone.
4. Turn it back ON; right-click again → item returns.

## Scenario D — Persistence across restart (FR-007)

1. Set the toggle to ON; fully restart Obsidian.
2. **Expected**: the toggle is still ON and the `.md` item is still offered.

## Scenario E — `.py` non-regression (User Story 1 scenario 3, FR-009, SC-004)

1. With the Markdown toggle in either state, right-click a `.py` file.
2. **Expected**: the "Open in marimo" item is present and opens the `.py` file in marimo exactly as before — unaffected by the Markdown toggle.

## Scenario F — No detection / requirement notice (User Story 3, FR-004/010)

1. Read the toggle's settings description.
2. **Expected**: it states that a marimo Markdown integration (e.g. `mkdocs-marimo`/`quarto-marimo`) is required.
3. With the toggle ON but no integration installed, the `.md` item still appears and clicking it still launches marimo (the rendered result is whatever marimo produces — the plugin does not block or pre-validate).

## Pass criteria

All scenarios A–F behave as expected, and `npm run build` + `npm run lint` complete without errors.
