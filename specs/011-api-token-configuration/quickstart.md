# Quickstart Validation Guide: API Token Configuration

This guide provides step-by-step instructions to manually verify that the API Token Configuration feature is working as expected.

## Scenario 1: Default Secure Mode (Session Token)

### Prerequisites
- Clear the "API token" setting (leave it empty) in the plugin settings.
- Stop any currently running marimo servers.

### Steps
1. Enable/Restart the marimo-bridge plugin in Obsidian.
2. Open a marimo notebook in Obsidian.
3. Verify that the WebView loads successfully and the notebook is editable without showing a login prompt.
4. Verify the spawned CLI command in a terminal:
   ```bash
   ps aux | grep marimo
   ```
   Confirm that the process was launched with `--token-password <32-character-hex-token>` instead of `--no-token`.
5. Open a web browser outside of Obsidian and navigate to:
   ```
   http://127.0.0.1:2718/
   ```
   Verify that a login page or authentication dialog is shown, blocking unauthorized access.

---

## Scenario 2: Custom API Token Configuration

### Steps
1. Open the marimo Bridge settings tab in Obsidian.
2. Enter a custom token (e.g. `my-custom-vault-secret`) in the API Token field.
3. Save settings. Verify that a warning is displayed notifying you that a server restart is required.
4. Restart the marimo server (e.g., using the "Restart marimo server" Command Palette action).
5. Open a marimo notebook in Obsidian.
6. Verify that the WebView loads the notebook successfully without showing any authentication prompt.
7. Open a web browser outside Obsidian and navigate to:
   ```
   http://127.0.0.1:2718/
   ```
   Confirm that you are prompted for a token. Enter `my-custom-vault-secret` and verify that it successfully log in.
8. Verify that passing an incorrect token via URL query parameters, e.g. `http://127.0.0.1:2718/?access_token=wrong-token`, fails to authenticate.
