# Phase 1 Data Model: Open Markdown Notebooks in marimo

This feature introduces no domain entities or persistence schemas beyond a single plugin-settings field. "Data model" here describes that settings field and the menu-visibility decision rule.

## Entity: Markdown context-menu setting

A persisted user preference governing whether the `.md` "Open in marimo" file-menu item is offered.

| Property | Value |
|----------|-------|
| Field name | `showMarkdownContextMenu` |
| Type | `boolean` |
| Location | `MarimoBridgeSettings` interface in `src/settings.ts` |
| Default | `false` (constant `DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU` in `src/constants.ts`) |
| Persistence | Obsidian `saveData`/`loadData` (`data.json`), via existing `saveSettings()` |
| Validation | None beyond boolean; toggle UI guarantees valid values |

### Lifecycle / state transitions

- **Initial (fresh install)**: absent in `data.json` → resolves to `false` via the `DEFAULT_SETTINGS` merge in `loadSettings`.
- **Upgrade (existing user)**: key absent in saved data → same merge yields `false` (OFF). No migration code required.
- **User toggles in settings**: `onChange(value)` sets `settings.showMarkdownContextMenu = value` and calls `saveSettings()`. The new value is read on the next `file-menu` invocation (no reload needed — the handler reads the live setting).

## Decision rule: when is the `.md` item shown?

For a right-clicked file `f` in the file explorer:

```
isTFile(f) AND f.extension == EXTENSION_PY
    → add "Open in marimo" (ALWAYS; unchanged existing behavior)

isTFile(f) AND f.extension == EXTENSION_MD AND settings.showMarkdownContextMenu == true
    → add "Open in marimo" (NEW)

otherwise
    → no marimo "Open in marimo" item
```

- The two file-type branches are mutually exclusive for a single file (a file is either `.py` or `.md`, not both), so at most one "Open in marimo" item is added.
- The action for both branches is identical: `openMarimo(f.path)`.

## Traceability to requirements

| Requirement | Covered by |
|-------------|-----------|
| FR-001, FR-006 | `.md` branch adds the item when setting is ON |
| FR-002 | action = `openMarimo(f.path)` (same as `.py`) |
| FR-003 | `showMarkdownContextMenu` field + settings toggle |
| FR-004 | decision rule has no detection term |
| FR-005 | `.md` branch requires `showMarkdownContextMenu == true` |
| FR-007 | persisted via `saveSettings()` (`data.json`) |
| FR-008 | handler reads live setting each invocation |
| FR-009 | `.py` branch unconditional / unchanged |
| FR-011 | default `false` |
