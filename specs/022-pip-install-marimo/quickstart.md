# Quickstart Validation Guide: Upgrade Existing marimo Installations

This guide details the scenarios to manually validate that the `--upgrade` option is correctly applied.

## Setup & Prerequisites

1. Ensure you have Node.js and npm installed.
2. Initialize and build the plugin:
   ```bash
   npm install
   npm run build
   ```
3. Open Obsidian with the plugin installed.

## Validation Scenarios

### Scenario 1: Fresh Installation (No marimo installed)

1. Set your python interpreter path to an environment where `marimo` is **not** installed (e.g. a clean virtual environment).
2. Go to Plugin Settings -> marimo Bridge settings.
3. Observe that the status displays "Not installed" and the button says "Install marimo".
4. Click "Install marimo".
5. Verify (via logs or console) that the command run is:
   ```bash
   <python-path> -m pip install marimo
   ```
   (No `--upgrade` option present).
6. Verify that a success notice is shown after installation.

### Scenario 2: Upgrade (marimo already installed)

1. Ensure the resolved python interpreter has `marimo` installed.
2. Go to Plugin Settings -> marimo Bridge settings.
3. Observe that the status displays "Installed (version x.y.z)" and the button says "Reinstall marimo".
4. Click "Reinstall marimo".
5. Verify (via logs or console) that the command run is:
   ```bash
   <python-path> -m pip install --upgrade marimo
   ```
   (The `--upgrade` option is present).
6. Verify that the success notice shows the new/updated version of marimo.
