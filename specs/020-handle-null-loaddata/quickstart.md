# Quickstart & Verification: Handle Null LoadData in LoadSettings

This guide provides steps to verify that the settings loader handles a null data payload gracefully without crash on fresh installs.

## Prerequisites
- Node.js installed.
- Dependencies installed: `npm install`.

## Verification Steps

### Automated Test
1. Run the test suite:
   ```bash
   npm test
   ```
2. Verify that the new test `"loads defaults when no settings were ever persisted (loadData null)"` passes successfully.

### Manual Verification
1. Build the plugin:
   ```bash
   npm run build
   ```
2. Install the plugin in a fresh Obsidian vault (or delete the vault's `.obsidian/plugins/obsidian-marimo-bridge/data.json` file if it exists).
3. Enable the plugin.
4. Verify that the plugin starts up and loads default settings without throwing console errors.
