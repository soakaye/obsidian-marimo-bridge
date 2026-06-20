# Quickstart: Remove Ribbon Context Menu

This guide outlines how to verify the implementation of the Ribbon Context Menu removal.

## Verification Steps

### 1. Build the Plugin
Run the build script to compile the changes:
```bash
npm run build
```

### 2. Reload the Plugin in Obsidian
- Open Obsidian.
- Go to **Settings** > **Community plugins**.
- Disable and then re-enable **marimo Bridge** (or reload it via a developer command if you use Hot Reload).

### 3. Verify Ribbon Behavior
- **Left-Click Test**: Click the marimo ribbon icon (pen and notebook icon) on the left sidebar.
  - *Expected result*: The marimo home dashboard opens immediately in a new tab.
- **Right-Click Test**: Right-click the same ribbon icon.
  - *Expected result*: No custom menu (with "Open marimo home" / "Create new marimo notebook") appears. Default OS/Electron behavior occurs (typically nothing or standard Electron context menu).
