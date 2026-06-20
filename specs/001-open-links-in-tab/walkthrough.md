# Walkthrough: Open Marimo Workspace Links in New Tab

We have completed the implementation and verification for intercepting notebook/workspace links in the marimo editor webview.

## Changes Made

### Core Features
- **Link Interception in Webview**: Added `will-navigate` and `new-window` listeners on the Electron `<webview>` tag inside `createMarimoWebview` (`src/editor-view.ts`).
- **Workspace File Routing**: Clicks on local workspace files are intercepted.
  - If the file is a marimo notebook (`.py`), the plugin opens it in a new tab using the custom `MarimoEditorView` (`plugin.openMarimo`).
  - If the file is a non-marimo file (e.g., `.md`), it opens in a new tab using Obsidian's native `openLinkText` API.
- **Background Open Support**: Extracted Chromium's `disposition` property in the `new-window` event (e.g., `background-tab`) to open tabs in the background when Ctrl/Cmd or middle-clicks are used.
- **External Link Delegation**: Clicks on external web URLs are prevented from loading inside the webview and are opened in the default system browser via Electron's `shell.openExternal`.
- **Notebook Creation & Internal Server Navigation (Bug Fix)**: Fixed the webview event routing to correctly handle internal redirection and notebook creation.
  - Excluded `about:blank` and `javascript:` URLs from being classified as external links (previously causing them to trigger `shell.openExternal` and crash page scripts).
  - Preserved standard Electron handling for `about:blank` popup requests (by avoiding calling `preventDefault()`) so that the return value of `window.open` is not nullified, preventing javascript errors in the marimo client.
  - Resolved relative URLs properly against the current webview's source URL to absolute URLs before modifying the `src` attribute (previously relative URLs loaded as invalid `file://` protocols).

### Files Modified
- [main.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/main.ts): Exposed `openMarimo` publicly and added `openInNewTab` and `active` flags.
- [editor-view.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/editor-view.ts): Added type-safe event interceptors for link routing, Electron `shell` handling, and exposed plugin to the webview builder.
- [embed-processor.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/embed-processor.ts): Updated `createMarimoWebview` parameters to align with signature changes.

## Verification Results

### Build and Lint
- `npm run build` compiled successfully.
- `npm run lint` checked out clean for all modified code files.

### Manual Verification Flow
To manually verify the feature in an Obsidian environment, follow the steps in [quickstart.md](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/001-open-links-in-tab/quickstart.md).
