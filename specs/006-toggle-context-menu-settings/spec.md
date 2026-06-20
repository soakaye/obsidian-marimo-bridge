# Feature Specification: Settings Toggle for Explorer Context Menu

**Feature Branch**: `006-toggle-context-menu-settings`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "設定にコンテキストメニューの追加有無の切り替え項目追加"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Disable Context Menu Option in Settings (Priority: P1)

Users who want a cleaner context menu can disable the "Create new marimo notebook" option in settings. Once disabled, the item is completely hidden from right-click menus on folders and files.

**Why this priority**: Core toggle behavior. Ensures that users have control over context menu clutter.

**Independent Test**:
1. Open the marimo Bridge plugin settings.
2. Toggle "Enable file explorer context menu" to **off**.
3. Right-click any folder or file in the file explorer.
4. Verify that "Create new marimo notebook" does not appear in the context menu.

**Acceptance Scenarios**:

1. **Given** the setting "Enable file explorer context menu" is disabled, **When** the user right-clicks a folder, **Then** the option "Create new marimo notebook" is not shown in the context menu.

---

### User Story 2 - Enable Context Menu Option in Settings (Priority: P1)

By default or when explicitly enabled, right-clicking files and folders displays the "Create new marimo notebook" context menu option, allowing users to create notebooks in their active directories.

**Why this priority**: Ensures standard notebook creation features are discoverable and available for users who want them.

**Independent Test**:
1. Open the plugin settings.
2. Toggle "Enable file explorer context menu" to **on**.
3. Right-click a folder.
4. Verify "Create new marimo notebook" is displayed and creates a notebook successfully when clicked.

**Acceptance Scenarios**:

1. **Given** the setting "Enable file explorer context menu" is enabled, **When** the user right-clicks a folder and selects "Create new marimo notebook", **Then** a new notebook is created in that folder and opened.

---

### Edge Cases

- **Immediate Application**:
  - The behavior must change instantly after toggling the setting in the settings tab, without requiring a plugin reload or Obsidian application restart.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin settings MUST include a new toggle: "Enable file explorer context menu" (default: `true`).
- **FR-002**: When enabled, the context menu item "Create new marimo notebook" MUST be added on file and folder right-clicks.
- **FR-003**: When disabled, the context menu item MUST NOT be added.
- **FR-004**: The toggle state MUST be persisted in the plugin settings and loaded on startup.
- **FR-005**: Setting changes MUST take effect immediately.

### Key Entities

- **Settings**: Plugin configuration model (`MarimoBridgeSettings`) containing the toggle state (`showContextMenu`).
- **Settings Tab**: The user interface where the toggle option is presented to the user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The setting toggle applies instantly: immediately after turning it off/on in settings, right-clicking in the explorer respects the new setting (under 100ms latency).

## Assumptions

- Standard Obsidian data saving mechanisms persist the setting correctly.
