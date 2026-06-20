# Feature Specification: Open Marimo Workspace Links in New Tab

**Feature Branch**: `001-open-links-in-tab`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "webview上に表示されたmarimoワークペース内のリンク(marimoファイル)をクリックした場合にobsidianの新しいタブにクリックしたページを表示する。"

## Clarifications

### Session 2026-06-18
- Q: Should the newly opened tab receive immediate focus? → A: Focus the new tab by default, but open in the background (keep focus on current tab) if Ctrl/Cmd (or middle-click) is pressed.
- Q: How should the system handle clicked workspace links where the target local file does not exist? → A: Open a new tab and delegate to Obsidian's default behavior for handling non-existent files (e.g., prompting to create the file).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Click Marimo Link in Editor Webview (Priority: P1)
As a user editing a marimo notebook inside the plugin's webview, when I click on a link that points to another marimo notebook (`.py` file) in the workspace, I want that notebook to open in a new tab inside Obsidian so that I can keep my current editing context open.

**Why this priority**: Opening links is the primary user navigation path between files in a marimo project.

**Independent Test**:
Can be fully tested by clicking a link to `another_notebook.py` in the marimo editor webview and verifying a new Obsidian tab opens with `another_notebook.py` parsed by the marimo plugin.

**Acceptance Scenarios**:
1. **Given** a marimo editor webview open for `notebook_A.py` containing a link to `notebook_B.py` (which is within the vault/workspace),
   **When** the user clicks the link to `notebook_B.py`,
   **Then** a new Obsidian tab opens containing `notebook_B.py` in the marimo editor view.
2. **Given** a marimo run/embed view,
   **When** the user clicks a link to another notebook inside the workspace,
   **Then** it also opens in a new Obsidian tab.

### User Story 2 - Handle Non-Marimo Workspace Links (Priority: P2)
As a user, when I click a link pointing to a non-marimo file (like `.md` or `.txt`) inside the workspace, I want it to open natively in Obsidian in a new tab.

**Why this priority**: Keeps the workflow integrated; users expect markdown or other workspace links to open within Obsidian.

**Independent Test**:
Click a link to `README.md` or a native Obsidian note within the webview and verify it opens in a new Obsidian tab.

**Acceptance Scenarios**:
1. **Given** a webview containing a link to a markdown file (`docs/notes.md`) in the workspace,
   **When** the user clicks the link,
   **Then** Obsidian opens `docs/notes.md` in a new tab using the native markdown editor.

### User Story 3 - Ignore or Handle External Links (Priority: P3)
As a user, when I click an external link (like `https://marimo.io`), I want it to open in the system default browser rather than opening inside Obsidian or hijacking the webview.

**Why this priority**: Prevents external websites from loading inside the Obsidian UI or hijacking the webview context.

**Independent Test**:
Click an external link (e.g., `https://google.com`) and verify it opens in the default system browser.

**Acceptance Scenarios**:
1. **Given** a marimo webview with a link to an external website,
   **When** the user clicks the link,
   **Then** the default system web browser opens the URL, and the webview remains unaffected.

### Edge Cases
- **Non-existent workspace files**: If a clicked link points to a workspace file that does not yet exist, the system MUST open a new tab and delegate to Obsidian's default behavior (e.g., offering to create the file) to preserve the standard wiki-link creation workflow.
- **Malformed target URLs**: If the intercepted link contains a malformed target URL, the system MUST prevent navigation within the active webview and display a non-intrusive warning notification using the application's native system notices.
- **about:blank or javascript: Popups**: Popups targeting `about:blank` or executing `javascript:` code MUST NOT be intercepted or blocked. They must be allowed to propagate to Electron's default popup handling to prevent page script crashes (avoiding `window.open` returning `null`).
- **Internal Server Relative Redirects (e.g. Notebook Creation)**: Relative or query-less navigations (such as `/new` notebook creation routes) MUST NOT open a new Obsidian tab or open in the default browser. Instead, they must be resolved against the active webview's source URL and loaded within the same webview.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST detect and intercept link clicks and navigation attempts within the embedded notebook view.
- **FR-002**: The system MUST parse the target URL of the clicked link. If it points to a local file within the workspace (e.g., another marimo notebook or relative workspace path), the system MUST resolve it to the corresponding local file.
- **FR-003**: If the resolved file is a marimo notebook (`.py`), the system MUST open it in a new tab using the plugin's notebook editor view. By default, the system MUST focus the new tab, but if modifier keys (Ctrl/Cmd) or a middle-click are used, it MUST open in the background without shifting focus.
- **FR-004**: If the resolved file is a non-marimo workspace file (e.g., `.md`), the system MUST open it in a new tab using the native editor of the hosting application (Obsidian), applying the same focus behavior as defined in FR-003.
- **FR-005**: If the target URL is external (not part of the local workspace/marimo server context), the system MUST open it using the operating system's default web browser and prevent any navigation within the notebook view itself.
- **FR-006**: The system MUST NOT prevent default handling for empty target URLs or URLs targeting `about:blank`/`javascript:`, permitting page scripts to spawn native popup windows successfully.
- **FR-007**: The system MUST resolve relative paths triggered inside the webview against the active webview's `src` attribute. If the route does not target a specific workspace file, the system MUST load the resolved URL in the same webview container.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: 100% of workspace-internal notebook link clicks from the marimo editor successfully open in a new tab.
- **SC-002**: External link clicks never navigate the notebook editor away from the active notebook; they open in the default web browser.
- **SC-003**: Opening a notebook from a link takes less than 1.5 seconds to initialize the new editor tab.
- **SC-004**: Internal redirections (such as creating a new notebook from dashboard) successfully load in the same webview without spawning empty browser pages or throwing javascript runtime errors.

## Assumptions
- The webview runs inside Electron (Obsidian Desktop), which provides standard webview events such as `will-navigate` or `new-window` or allows handling clicking via injected scripts if necessary.
- Marimo server serves links using standard anchor tags or changes the URL in a way that can be intercepted via webview event listeners.
- The path to the file is encoded in the URL (e.g., `?file=...` parameter in marimo edit mode URLs).
