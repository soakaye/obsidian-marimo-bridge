# Feature Specification: Remove Ribbon Context Menu

**Feature Branch**: `008-remove-ribbon-context-menu`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "リボンの右ボタンメニューを削除"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Left-Click Launches Marimo Home Directly (Priority: P1)

When the user left-clicks the marimo ribbon icon, the marimo home dashboard opens directly in a new tab.

**Why this priority**: Core behavior. Left-clicking remains the primary way to access the marimo dashboard.

**Independent Test**:
1. Left-click the marimo ribbon icon.
2. Verify that the marimo home dashboard opens immediately in a new tab.

**Acceptance Scenarios**:

1. **Given** the plugin is loaded, **When** the user left-clicks the ribbon icon, **Then** the marimo home dashboard opens directly in a new tab.

---

### User Story 2 - Right-Click Shows No Custom Context Menu (Priority: P1)

When the user right-clicks the marimo ribbon icon, no custom marimo context menu is displayed.

**Why this priority**: Core request. Removing the custom right-click context menu simplifies the ribbon interaction and removes the custom context menu entirely.

**Independent Test**:
1. Right-click the marimo ribbon icon.
2. Verify that no custom marimo context menu appears.

**Acceptance Scenarios**:

1. **Given** the plugin is loaded, **When** the user right-clicks the ribbon icon, **Then** no custom marimo context menu is displayed.

---

## Edge Cases

- **Native Context Menu Handling**:
  - Since we remove the custom contextmenu handler, we no longer need to call `preventDefault()`. Right-clicking will trigger default OS/Electron/Obsidian behavior, which is typically showing no menu or standard Electron context menu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The marimo ribbon icon left-click handler MUST continue to open the marimo home dashboard directly.
- **FR-002**: The plugin MUST NOT register a `contextmenu` (right-click) event listener on the ribbon icon element.
- **FR-003**: Any custom ribbon menu creation logic or menu templates associated with the ribbon right-click menu MUST be removed or cleaned up.

### Key Entities

- **Ribbon Icon Element**: The HTML element representing the marimo ribbon icon.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Left-clicking opens the home dashboard tab under 200ms.
- **SC-002**: Right-clicking does not trigger any custom menu layout or UI processing (0ms overhead).

## Assumptions

- Removing the right-click menu does not impact any other views or ways to create notebooks (e.g. from the command palette or file explorer).
- The "showRibbonMenu" setting and related configuration were already handled or are unrelated to this specific context menu removal.
