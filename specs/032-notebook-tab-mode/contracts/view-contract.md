# Contract: View State, Actions & Commands

**Feature**: Notebook Tab Edit/Run Mode Selection  
**Branch**: `032-notebook-tab-mode`  
**Date**: 2026-10-30  

## View State Contract

```typescript
export interface MarimoViewState {
    file?: string;
    mode?: "edit" | "run";
}
```

- When serialized via `getState()`:
  ```typescript
  getState(): Record<string, unknown> {
      return {
          file: this.currentFile,
          mode: this.currentMode,
      };
  }
  ```

## View Action Contract

- Registered via `this.addAction(icon, title, callback)` on `MarimoEditorView`.
- Behavior:
  - When `currentMode === "edit"`:
    - Icon: `ICON_PLAY` (`"play"`)
    - Title / Tooltip: `ACTION_SWITCH_TO_RUN` (`"Switch to run mode"`)
  - When `currentMode === "run"`:
    - Icon: `ICON_EDIT` (`"edit"`)
    - Title / Tooltip: `ACTION_SWITCH_TO_EDIT` (`"Switch to edit mode"`)
  - Hidden or disabled when `currentFile` is not defined (Marimo Home).
- Callback executes toggle logic:
  ```typescript
  toggleMode(): Promise<void>
  ```

## Command Palette Contract

- Command ID: `CMD_TOGGLE_NOTEBOOK_MODE_ID` (`"toggle-notebook-mode"`)
- Command Name: `CMD_TOGGLE_NOTEBOOK_MODE_NAME` (`"Toggle notebook mode between edit and run"`)
- Check Callback:
  - Enabled when the active workspace leaf hosts a `MarimoEditorView` and `view.currentFile` is non-empty.
  - Invokes `view.toggleMode()`.
