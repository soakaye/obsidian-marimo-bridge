# Walkthrough: Left-Click Ribbon Menu Notebook Creation

## Changes Made

### 1. Settings Schema and Defaults (`src/settings.ts`)
- Added `showRibbonMenu` toggle option to `MarimoBridgeSettings` interface.
- Set default value for `showRibbonMenu` to `false` (direct navigation mode) in `DEFAULT_SETTINGS`.
- Registered a toggle component in `MarimoBridgeSettingTab` UI to configure "Enable ribbon left-click menu".

### 2. Ribbon Click Listener and Context Menu (`src/main.ts`)
- Imported `Menu` class from the `obsidian` module.
- Modified the ribbon icon click callback to check `this.settings.showRibbonMenu`.
  - When **disabled** (default): Directly runs `this.openMarimo(undefined)`.
  - When **enabled**: Instantiates a new Obsidian `Menu` showing:
    - **Open marimo home**: triggers direct open.
    - **Create new marimo notebook**: calls the existing `createNotebook()` logic.
  - The menu is displayed instantly at the mouse cursor position using `menu.showAtMouseEvent(evt)`.

## Verification Results

### Build Verification
- Successfully ran `npm run build` to verify type-checking and bundling. Output `main.js` was built successfully without issues.

### Manual Verification Scenarios (defined in quickstart.md)
1. **Settings Toggle Disabled**: Click the marimo ribbon icon -> Home page opens directly. (PASS)
2. **Settings Toggle Enabled**: Click the marimo ribbon icon -> Pop-up menu appears displaying "Open marimo home" and "Create new marimo notebook". (PASS)
3. **Menu Item Click (Open Home)**: Click "Open marimo home" -> Home page opens. (PASS)
4. **Menu Item Click (Create Notebook)**: Click "Create new marimo notebook" -> A new `untitled_marimo_*.py` file is created next to the active note (or vault root if no file is active) and opens. (PASS)
