# Feature Specification: Left-Click Ribbon Menu Notebook Creation

**Feature Branch**: `003-left-click-create-notebook`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "マウス左ボタンメニューにノートブックの作成を追加する。設定メニューによりマウス左ボタンメニューにノートブック作成を追加するか否かを指定し、有効の場合のみ追加する。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Ribbon Action when Menu is Disabled (Priority: P1)

By default, the ribbon icon behaves exactly as before. When the user left-clicks the marimo ribbon icon, it directly opens the marimo home dashboard in a new tab without showing any menu.

**Why this priority**: Preserves backward compatibility and provides a fast, one-click access path for users who prefer the direct open behavior.

**Independent Test**:
1. Go to settings, verify "Show ribbon context menu" is disabled.
2. Click the marimo ribbon icon.
3. Verify that the marimo home tab opens immediately.

**Acceptance Scenarios**:

1. **Given** the ribbon menu setting is disabled, **When** the user clicks the ribbon icon, **Then** the marimo home dashboard opens in a new tab.

---

### User Story 2 - Ribbon Left-Click Menu with Notebook Creation (Priority: P2)

When the user enables the ribbon menu option in settings, clicking the marimo ribbon icon no longer opens the home dashboard immediately. Instead, it displays a pop-up context menu at the mouse cursor position containing options to "Open marimo home" and "Create new marimo notebook".

**Why this priority**: Provides a quick workflow for creating new notebooks from anywhere within Obsidian.

**Independent Test**:
1. Go to settings, enable "Show ribbon context menu".
2. Click the marimo ribbon icon.
3. Verify that a menu appears with "Open marimo home" and "Create new marimo notebook".
4. Select "Create new marimo notebook" and verify a new notebook is created and opened.

**Acceptance Scenarios**:

1. **Given** the ribbon menu setting is enabled, **When** the user clicks the ribbon icon, **Then** a context menu appears with options: "Open marimo home" and "Create new marimo notebook".
2. **Given** the ribbon menu is displayed, **When** the user clicks "Create new marimo notebook", **Then** a new notebook `untitled_marimo.py` is created and opened.

---

### Edge Cases

- **No active file when creating a notebook via menu**:
  - The notebook is created at the vault root directory (uses fallback in `createNotebook`).
- **Rapid clicks on the ribbon**:
  - The menu should close and reopen or focus correctly without creating multiple menus or crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin settings MUST include a new toggle option: "Enable ribbon left-click menu" (default: `false`).
- **FR-002**: When the setting is disabled, left-clicking the ribbon icon MUST execute the default action (open marimo home dashboard).
- **FR-003**: When the setting is enabled, left-clicking the ribbon icon MUST show an Obsidian `Menu` showing:
  - "Open marimo home" (icon: `notebook-pen` or similar)
  - "Create new marimo notebook" (icon: `plus` or similar)
- **FR-004**: Clicking "Open marimo home" in the menu MUST open the marimo home dashboard.
- **FR-005**: Clicking "Create new marimo notebook" in the menu MUST call the existing notebook creation logic (`createNotebook()`).
- **FR-006**: The setting description and labels MUST be clear in the plugin settings tab.

### Key Entities

- **Settings**: Plugin configuration model (`MarimoBridgeSettings`) containing the toggle state.
- **Ribbon Menu**: An Obsidian context-aware `Menu` popped up at the ribbon icon click coordinates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can toggle the ribbon menu setting on and off, and the change takes effect immediately without reloading the plugin.
- **SC-002**: With the setting enabled, clicking the ribbon icon displays the menu instantly (under 100ms) and options function correctly.

## Assumptions

- Desktop environment (Electron/Node) where Obsidian's `Menu` and coordinate-based event handling function properly.
