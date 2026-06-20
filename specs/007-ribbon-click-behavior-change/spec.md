# Feature Specification: Ribbon Button Click Behavior Modification

**Feature Branch**: `007-ribbon-click-behavior-change`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "リボンボタンの右クリックは: marimo home, create marimo notebook。リボンボタン左クリック: launch marimo home"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Left-Click Launches Marimo Home Directly (Priority: P1)

When the user left-clicks the marimo ribbon icon, the marimo home dashboard opens directly in a new tab, bypassing any menus.

**Why this priority**: Fast access. Ensures that left-clicking continues to behave as a quick entry point to the marimo dashboard.

**Independent Test**:
1. Left-click the marimo ribbon icon.
2. Verify that the marimo home dashboard opens immediately in a new tab without showing any context menus.

**Acceptance Scenarios**:

1. **Given** the plugin is loaded, **When** the user left-clicks the ribbon icon, **Then** the marimo home dashboard opens directly in a new tab.

---

### User Story 2 - Right-Click Displays Ribbon Menu (Priority: P1)

When the user right-clicks the marimo ribbon icon, a menu containing "Open marimo home" and "Create new marimo notebook" is displayed at the cursor position.

**Why this priority**: Core integration change. Reorganizes ribbon menu options to be triggered via right-click (contextmenu) rather than left-click, aligning with standard OS/browser context actions.

**Independent Test**:
1. Right-click the marimo ribbon icon.
2. Verify that the context menu appears with options: "Open marimo home" and "Create new marimo notebook".

**Acceptance Scenarios**:

1. **Given** the plugin is loaded, **When** the user right-clicks the ribbon icon, **Then** a context menu appears with the options "Open marimo home" and "Create new marimo notebook".

---

### User Story 3 - Clean Up Obsolete Settings (Priority: P2)

Since the click behavior is now standardized (left-click for direct open, right-click for menu), the deprecated setting "Enable ribbon left-click menu" (`showRibbonMenu`) is removed from the settings tab and configuration schema.

**Why this priority**: Code cleanliness and user experience. Prevents confusing users with redundant setting items.

**Independent Test**:
1. Open the plugin settings tab.
2. Verify that the "Enable ribbon left-click menu" toggle option is removed.

**Acceptance Scenarios**:

1. **Given** the settings tab is displayed, **When** the user views the settings, **Then** the "Enable ribbon left-click menu" toggle is not present.

---

### Edge Cases

- **Default Context Menu Suppression**:
  - The right-click event (`contextmenu`) on the ribbon icon must call `preventDefault()` to prevent the native Electron/OS context menu from showing over the custom marimo ribbon menu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The marimo ribbon icon left-click handler MUST always open the marimo home dashboard directly.
- **FR-002**: The plugin MUST register a `contextmenu` (right-click) event listener on the ribbon icon element.
- **FR-003**: The `contextmenu` listener MUST call `preventDefault()` to suppress default context menus.
- **FR-004**: The `contextmenu` listener MUST display the Obsidian `Menu` showing "Open marimo home" and "Create new marimo notebook".
- **FR-005**: The `showRibbonMenu` configuration property and its corresponding UI toggle in the settings tab MUST be removed.

### Key Entities

- **Ribbon Icon Element**: The HTML element representing the marimo ribbon icon.
- **Ribbon Menu**: The menu popped up on right-click.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Left-clicking opens the home dashboard tab under 200ms.
- **SC-002**: Right-clicking displays the menu instantly under 100ms.

## Assumptions

- Desktop environment where contextmenu events on DOM elements can be captured and handled.
