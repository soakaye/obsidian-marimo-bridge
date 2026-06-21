# Phase 0 Research: Open Markdown Notebooks in marimo

All Technical Context fields are known (existing, well-understood codebase). No NEEDS CLARIFICATION markers remained after `/speckit-clarify`. The items below record the design-relevant decisions.

## R1. Can the existing open path handle `.md`?

- **Decision**: Reuse `MarimoBridgePlugin.openMarimo(path)` unchanged for `.md` files.
- **Rationale**: `openMarimo(file: string)` (`src/main.ts:263`) takes any vault-relative path and opens it via `leaf.setViewState({ type: VIEW_TYPE_MARIMO, state: { file } })`. It is extension-agnostic — it does not branch on `.py`. The existing `.py` menu item already calls `openMarimo(file.path)`. A `.md` path flows through identically; the marimo edit server receives the file like any other.
- **Alternatives considered**: A dedicated Markdown open function — rejected as needless duplication; nothing about `.md` requires different handling at the plugin layer.

## R2. How is the menu item gated? (no runtime detection)

- **Decision**: Gate the `.md` item solely on the new `showMarkdownContextMenu` boolean setting. Do not probe for `mkdocs-marimo`/`quarto-marimo`.
- **Rationale**: Per the 2026-06-21 clarification (spec → Clarifications), runtime package detection would require spawning a Python/pip subprocess, which is unacceptable on every right-click and would risk delaying menu rendering. The toggle's description states the integration requirement, making enabling it the user's assertion that they have it. A boolean check is O(1) and satisfies the "no perceptible delay" requirement trivially.
- **Alternatives considered**: (a) Detect installed packages at startup and cache — rejected: adds a detection subsystem and staleness handling for marginal benefit. (b) Detect at click time — rejected: subprocess latency in the menu path. Both were explicitly declined in clarification.

## R3. Extend the existing handler vs. register a second `file-menu` listener?

- **Decision**: Extend the existing `file-menu` handler at `src/main.ts:174-191` to also add the item for `.md` (guarded by the setting), keeping the unconditional `.py` branch intact.
- **Rationale**: One handler that adds a single "Open in marimo" item per eligible file keeps behavior coherent and avoids a duplicate item if both branches ever matched (they cannot for one file, but a single handler is clearer). The `.py` branch stays unconditional to guarantee FR-009 (no `.py` regression).
- **Alternatives considered**: A separate `registerEvent(... "file-menu" ...)` block dedicated to `.md` — acceptable and equally valid; chosen approach is preferred only for locality and to read the setting in one place. Implementation may use either as long as `.py` stays unconditional and `.md` is setting-gated.

## R4. Default value and migration

- **Decision**: `showMarkdownContextMenu` defaults to `false` via `DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU` in `src/constants.ts`; existing users upgrade to OFF because the key is absent in their saved `data.json` and `Object.assign(DEFAULT_SETTINGS, loadData())` fills the default.
- **Rationale**: Matches the 2026-06-21 clarification (default OFF, opt-in). Most users will not have a Markdown integration installed, so offering the item by default would surface a potentially non-working action. The standard `loadSettings` merge pattern already in the plugin yields OFF for upgraders without explicit migration code.
- **Alternatives considered**: Default ON — rejected by clarification.

## R5. Constant externalization (Principle VI)

- **Decision**: Add all new literals to `src/constants.ts`: `DEFAULT_SHOW_MARKDOWN_CONTEXT_MENU` (false), `RUNTIME_CONSTANTS.EXTENSION_MD` (`"md"`), `SETTING_MD_CONTEXT_MENU_NAME`, `SETTING_MD_CONTEXT_MENU_DESC`.
- **Rationale**: Constitution Principle VI requires non-empty string and non-zero numeric literals to be centralized. The existing `EXTENSION_PY`, `DEFAULT_SHOW_CONTEXT_MENU`, and `SETTING_CONTEXT_MENU_NAME/_DESC` establish the exact pattern to mirror. (Note: `false`/`0` are exempt by the principle's "non-zero/non-empty" wording, but defining the default as a named constant is kept for symmetry with `DEFAULT_SHOW_CONTEXT_MENU` and clarity.)
- **Alternatives considered**: Inline literals — rejected (violates Principle VI / house style).

## R6. Note on the integration itself (out of plugin scope)

- **Observation**: Whether `marimo edit file.md` renders as a notebook depends on the user's marimo environment (the `mkdocs-marimo`/`quarto-marimo` family). This is intentionally outside the plugin's responsibility per the toggle-only decision; the settings description carries the requirement notice (FR-010). No plugin code validates it.
