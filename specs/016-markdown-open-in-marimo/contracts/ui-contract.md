# UI Contract: Open Markdown Notebooks in marimo

This plugin exposes its behavior through the Obsidian settings tab and the file-explorer context menu. The contracts below define the observable interface for this feature.

## Contract 1 — Settings entry

**Location**: Plugin settings tab (`MarimoBridgeSettingTab.display()` in `src/settings.ts`), placed alongside the existing context-menu / take-over toggles.

| Aspect | Contract |
|--------|----------|
| Control type | Toggle (`Setting.addToggle`) |
| Name | `SETTING_MD_CONTEXT_MENU_NAME` — concise, e.g. "Open Markdown files in marimo" |
| Description | `SETTING_MD_CONTEXT_MENU_DESC` — MUST state that enabling adds "Open in marimo" to `.md` files AND that a marimo Markdown integration (e.g. `mkdocs-marimo` or `quarto-marimo`) must be installed for the file to render as a notebook (FR-010) |
| Bound to | `settings.showMarkdownContextMenu` |
| Initial value shown | `false` on fresh install / upgrade (FR-011) |
| On change | Persist immediately via `saveSettings()`; no reload required (FR-008) |

## Contract 2 — File-explorer context-menu item (`.md`)

**Trigger**: `Workspace.on("file-menu")` for a `TFile` whose extension is `EXTENSION_MD` (`"md"`).

| Condition | Behavior |
|-----------|----------|
| `settings.showMarkdownContextMenu == true` | Add one menu item: title `TITLE_OPEN_IN_MARIMO` ("Open in marimo"), icon `ICON_MARIMO_LOGO` |
| `settings.showMarkdownContextMenu == false` | Add no marimo "Open in marimo" item for the file |

**Item action**: on click → `openMarimo(file.path)` — identical to the `.py` item; opens the file in the marimo view (`VIEW_TYPE_MARIMO`) in a new tab.

**Non-goals / guarantees**:
- The plugin does NOT inspect file contents or detect installed packages before showing or invoking the item.
- The plugin does NOT pre-validate that the file will render as a notebook; the result is whatever marimo produces (FR-004, spec User Story 3 scenario 2).

## Contract 3 — `.py` non-regression

The existing `.py` "Open in marimo" item MUST remain:
- Shown unconditionally for `TFile` with extension `EXTENSION_PY` (independent of `showMarkdownContextMenu`).
- Wired to the same `openMarimo(file.path)` action as before.

This is a regression guard (FR-009): no observable change to `.py` behavior.

## Contract verification

These contracts are validated manually per [quickstart.md](../quickstart.md). There is no automated UI test harness in the repository; `npm run build` and `npm run lint` verify type-safety and style.
