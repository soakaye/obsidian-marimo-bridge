# Feature Specification: Fix Marimo Home Links

**Feature Branch**: `010-fix-marimo-home-links`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "marimo home で Running notebooks, Recent notebooks, workspaceからの選択で .py ファイルをクリックしても別ブラウザで表示され obsidian内のtabに表示されないのを修正"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Opening Marimo Home links in Obsidian Tabs (Priority: P1)

As a user, when I click on a notebook file (a `.py` file) from the Marimo Home dashboard (under "Running notebooks", "Recent notebooks", or by selecting a file in the workspace browser inside the home dashboard), it should open as a new tab inside Obsidian rather than opening in an external system browser.

**Why this priority**: Opening notebooks from the Marimo home dashboard is a core navigation path. If links open in an external browser, the plugin loses its integrated feel, and users cannot edit those files within Obsidian.

**Independent Test**: Start the Marimo server, open Marimo Home inside Obsidian, click a notebook link under "Recent notebooks", and verify that a new Obsidian tab opens with the Marimo editor instead of launching a system web browser.

**Acceptance Scenarios**:

1. **Given** Marimo Home is open in Obsidian, **When** I click a notebook under "Running notebooks" or "Recent notebooks", **Then** the plugin intercepts the link and opens it in a new Obsidian editor tab.
2. **Given** Marimo Home is open in Obsidian, **When** I select a `.py` file from the workspace file browser on the home dashboard, **Then** the plugin intercepts the link and opens it in a new Obsidian editor tab.

### Edge Cases

- **Links to non-notebook local files**: If the user clicks on a local non-python file in the workspace browser, it should open natively in Obsidian if supported, or do nothing, but it must not launch an external browser or crash the view.
- **External links**: If Marimo home contains external web links (e.g. documentation or GitHub links), these should still open in the default external system browser.
- **Custom targets**: Marimo dynamically generates iframe targets (e.g. `s_d71rnw-...`). The link interception must handle these arbitrary targets, not just `_blank`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The link click event listener in the injected script MUST intercept link clicks where the `target` attribute is not `_self`, `_parent`, or `_top` (specifically targeting dynamically generated target names).
- **FR-002**: For any intercepted link click pointing to a local marimo notebook (`.py` file), the script MUST dispatch the `MarimoBridge-Open` IPC message.
- **FR-003**: The plugin's webview console listener MUST intercept the `MarimoBridge-Open` IPC message and call the internal link handler (`handleLinkClick`).
- **FR-004**: The plugin MUST open the targeted `.py` file in a new Obsidian tab when the intercepted URL refers to a local Marimo notebook.
- **FR-005**: The plugin MUST delegate external URLs (non-local) to the system's default browser.

### Key Entities

- **Marimo Home Dashboard**: The starting interface displayed when the Marimo server is running without a specific file.
- **Injected Script**: The JavaScript code injected into the Electron `<webview>` to hook events like `window.open` and link clicks.
- **IPC Message**: A message formatted as a string logged to `console.log` with a specific prefix (`[MarimoBridge-Open] `) to communicate from the webview to the host Obsidian plugin.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of local `.py` file links clicked within the Marimo Home dashboard open in a new Obsidian editor tab.
- **SC-002**: 0% of local `.py` file links clicked within the Marimo Home dashboard trigger an external system browser window.
- **SC-003**: External web links (e.g., links to marimo.io documentation) continue to open in the system's default browser.

## Assumptions

- The Electron webview `allowpopups` attribute remains enabled to allow the click events to bubble or trigger appropriate hooks if click interception fails.
- The `shouldIntercept` utility function correctly identifies local marimo server URLs and separates them from external links.
