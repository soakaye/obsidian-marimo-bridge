# Research: Notebook Tab Edit/Run Mode Selection

**Feature**: Notebook Tab Edit/Run Mode Selection  
**Branch**: `032-notebook-tab-mode`  
**Date**: 2026-10-30  

## Research Topics & Decisions

### 1. Settings Schema and Declarative Definitions Integration

- **Decision**: Add `defaultNotebookMode: "edit" | "run"` to `MarimoBridgeSettings` interface with default `"edit"`. Add dropdown entries in both `getSettingDefinitions()` (Obsidian 1.13+ declarative API) and `display()` (legacy settings tab) directly beneath the embed mode setting.
- **Rationale**: 
  - `specs/031-declarative-settings-api` established that settings must support both `getSettingDefinitions()` and `display()`.
  - Setting `"edit"` as the default preserves backward compatibility for existing users who expect the full editor view when opening notebooks.
  - Positioning the setting next to `defaultEmbedMode` groups notebook mode preferences logically.
- **Alternatives Considered**:
  - *Only updating `display()`*: Would violate the requirement that `getSettingDefinitions()` must expose all available plugin settings for global search and Obsidian 1.13+ support.
  - *Defaulting to `"run"`*: Would break expected behavior for users who edit notebooks within Obsidian by default.

### 2. View State Mode Representation and Resolution

- **Decision**: Extend `MarimoViewState` to include an optional `mode?: "edit" | "run"`. In `MarimoEditorView.setState()`, resolve the effective mode using:
  - If `state.file` is absent (Marimo Home): force mode to `"edit"`.
  - Else if `state.mode` is explicitly set to `"edit"` or `"run"`: use `state.mode`.
  - Else: fall back to `this.plugin.settings.defaultNotebookMode` (defaulting to `"edit"`).
  Store the resolved mode in a view field `currentMode: "edit" | "run"` and return `{ file: this.currentFile, mode: this.currentMode }` in `getState()`.
- **Rationale**:
  - `MarimoHome` requires the edit server and cannot run in app-only mode.
  - Explicit mode in `ViewState` allows individual tabs to override the global setting (e.g. via toggle button) and persist this override across workspace reloads or tab navigation.
  - Returning `mode` from `getState()` ensures Obsidian's layout persistence preserves the user's manual mode choice.
- **Alternatives Considered**:
  - *Global-only mode without per-tab state*: Users would not be able to toggle one notebook to Edit mode while keeping another in Run mode.
  - *Inferring mode from URL*: Fragile and harder to serialize/restore through Obsidian's workspace leaf state.

### 3. Run Server Lease Lifecycle Management in Tab Views

- **Decision**: In `MarimoEditorView`, maintain `acquiredRunServerFile: string | null = null`.
  - When rendering in `run` mode:
    - If `acquiredRunServerFile` is already held for a different file, release it via `await this.plugin.servers.releaseRunServer(this.acquiredRunServerFile)`.
    - If not already holding a lease for the current file, call `const runUrl = await this.plugin.servers.ensureRunServer(this.currentFile)`.
    - If `runUrl` is obtained, record `this.acquiredRunServerFile = this.currentFile`.
    - Load `runUrl` into the webview.
  - When rendering in `edit` mode:
    - If `acquiredRunServerFile` is held, release it via `await this.plugin.servers.releaseRunServer(this.acquiredRunServerFile)` and reset `acquiredRunServerFile = null`.
    - Ensure edit server via `await this.plugin.servers.ensureEditServer()` and load edit URL.
  - In `onClose()`:
    - If `acquiredRunServerFile` is held, call `await this.plugin.servers.releaseRunServer(this.acquiredRunServerFile)` and reset `acquiredRunServerFile = null`.
- **Rationale**:
  - Aligns with the reference-counting infrastructure implemented in `ServerManager` (`ensureRunServer` and `releaseRunServer`).
  - Guarantees that switching from `run` to `edit` or closing the tab drops the ref count, terminating the background `marimo run` process when ref count reaches 0.
  - Prevents resource leaks and orphan background processes.
- **Alternatives Considered**:
  - *Keep run server alive until plugin unload*: Wastes system memory and ports when user switches back to edit mode or closes tabs.

### 4. Tab Header View Action and Command Palette Toggle

- **Decision**: 
  - In `MarimoEditorView`, register a view action button using Obsidian's `this.addAction(icon, title, callback)` during initialization (`onload` / constructor).
  - Maintain a reference to the action element. Whenever `currentMode` or `currentFile` updates, update the action's icon (e.g. `play` or `lucide-play` when in Edit mode to switch to Run, `edit` or `lucide-edit` when in Run mode to switch to Edit) and tooltip/aria-label ("Switch to run mode" / "Switch to edit mode").
  - Clicking the action toggles mode: `this.currentMode = this.currentMode === "edit" ? "run" : "edit"`, updates view state `this.leaf.setViewState({ type: VIEW_TYPE_MARIMO, state: { file: this.currentFile, mode: this.currentMode } })`, and triggers `this.render()`.
  - In `src/main.ts`, add a command `CMD_TOGGLE_NOTEBOOK_MODE` with `checkCallback`:
    - Checks if active leaf view is an instance of `MarimoEditorView` and has an active notebook file (`view.currentFile`).
    - If `checking` is true, returns true.
    - If false, executes the toggle method on the active view.
- **Rationale**:
  - Provides intuitive one-click switching directly in the tab header as requested by users.
  - Exposes keyboard shortcut capability through the standard Obsidian command palette.
  - Keeps toggle logic encapsulated within `MarimoEditorView`.
- **Alternatives Considered**:
  - *Only command palette, no header button*: Harder to discover and requires more clicks/keystrokes for standard viewing.

### 5. Constants Policy Compliance

- **Decision**: Define all UI text strings, identifiers, icon names, and configuration keys in `src/constants.ts`:
  - `DEFAULT_NOTEBOOK_MODE`: `"edit"`
  - `SETTINGS_KEY_DEFAULT_NOTEBOOK_MODE`: `"defaultNotebookMode"`
  - `SETTING_NOTEBOOK_MODE_NAME`: `"Default notebook mode"`
  - `SETTING_NOTEBOOK_MODE_DESC`: `"Mode used when opening notebooks in their own tab (edit for full editor, run for read-only app view)."`
  - `TEXT_NOTEBOOK_MODE_EDIT`: `"Edit mode (full editor)"`
  - `TEXT_NOTEBOOK_MODE_RUN`: `"Run mode (app view)"`
  - `ACTION_SWITCH_TO_RUN`: `"Switch to run mode"`
  - `ACTION_SWITCH_TO_EDIT`: `"Switch to edit mode"`
  - `CMD_TOGGLE_NOTEBOOK_MODE_ID`: `"toggle-notebook-mode"`
  - `CMD_TOGGLE_NOTEBOOK_MODE_NAME`: `"Toggle notebook mode between edit and run"`
  - `ICON_PLAY`: `"play"`
  - `ICON_EDIT`: `"edit"`
- **Rationale**:
  - Principle VI (Constant Externalization) of the constitution strictly forbids hardcoded string and numeric literals in execution code.
  - `tests/constants-policy.test.ts` scans the codebase and fails if literals are left in runtime code.
