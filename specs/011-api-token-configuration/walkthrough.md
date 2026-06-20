# Walkthrough: API Token Configuration

This document summarizes the changes implemented to support secure, token-based authentication between the Obsidian plugin and the local `marimo` server.

## Changes Made

### 1. Configuration & Constants (`src/constants.ts`)
- Added default configuration setting `DEFAULT_API_TOKEN` (empty string).
- Added UI labels and descriptions for the settings tab (`SETTING_API_TOKEN_NAME`, `SETTING_API_TOKEN_DESC`, `SETTING_API_TOKEN_WARN`).
- Added the `--token-password` command-line argument constant `CMD_ARG_TOKEN_PASSWORD`.

### 2. Settings Management (`src/settings.ts`)
- Updated `MarimoBridgeSettings` interface and `DEFAULT_SETTINGS` to include the `apiToken` setting.
- Added a text input field in the settings tab for configuring a custom API token, complete with placeholder warning text indicating that server restarts are required.

### 3. Server Lifecycle & Token Handling (`src/server-manager.ts`)
- Added `crypto` module import to handle secure random token generation.
- Implemented `getActiveToken()` method, which resolves to the user-configured custom token if present, or dynamically generates and caches a secure 32-character random session token on startup.
- Modified `spawnServer` to use the `--token-password <token>` parameter, replacing the insecure `--no-token` parameter for both edit and run servers.
- Updated `editFileUrl`, `editHomeUrl`, and `ensureRunServer` URL construction methods to append the `access_token` query parameter with the resolved active token.

### 4. WebView Integration (`src/editor-view.ts`)
- Added `addTokenToUrl` helper function.
- Applied `addTokenToUrl` to all `setAttribute(ATTR_SRC)` calls in `MarimoEditorView` (render method, popup handling, IPC open handler, window event listeners) to ensure the `access_token` query parameter persists across WebView state transitions, page reloads, and internal navigations (such as creating a new notebook).

## Verification Results

### Build and Lint Checks
- Run command: `npm run build && npm run lint`
- **Result**: Successfully completed. TypeScript compilation succeeded without errors and ESLint analysis passed with 0 issues.

### Verification Scenarios (See [quickstart.md](./quickstart.md) for full instructions)
1. **Session Token Mode**: Start the server with an empty API token. Verify that `ps aux | grep marimo` shows it running with `--token-password <32-character-hex-token>` and the Obsidian WebView opens it seamlessly without any authentication prompt. Verify that external access directly to the port is blocked.
2. **Custom API Token**: Configure a custom token in the settings, restart the server, verify Obsidian continues to load the editor seamlessly, and check that external access is successfully authenticated only with the custom token.
