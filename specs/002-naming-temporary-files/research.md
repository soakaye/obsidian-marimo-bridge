# Research: Naming Marimo Temporary Files

## Context & Objectives
When a user clicks "New Notebook" inside the marimo dashboard, the marimo server creates a temporary python file with a random suffix (e.g. `marimo_xxxxxx.py`) in the OS temporary directory. Since this file is located outside the Obsidian vault, it is difficult for users to track, and the editor view is directed to a local filesystem temp path. The objective is to intercept this request and instead create an `untitled_marimo_*.py` file within the Obsidian Vault.

## Research Findings
- **Navigation Interception**: In Electron `<webview>`, clicking "New Notebook" triggers a navigation to `http://localhost:<port>/__new__` or a redirection to `/__new__`.
- **Custom Event Routing**: The `editor-view.ts` WebView event listeners capture URL changes. Specifically, `shouldIntercept` can be updated to return `true` for `/__new__` and redirect paths.
- **Obsidian File API**: We can use `this.app.vault.create` to create a blank marimo notebook.
- **Increment Logic**: To prevent filename collisions, we can loop through `untitled_marimo.py`, `untitled_marimo_1.py`, etc., using `app.vault.getAbstractFileByPath` until a free path is found. We will cap this search at 1000 iterations to avoid infinite loops.

## Decisions
- **Decision**: Intercept `/__new__` inside the Webview, map it to `__new__` and route to `openMarimo`, where the plugin will generate `untitled_marimo_*.py` in the active folder (or vault root) and load the newly created path.
- **Alternatives considered**: Let the marimo server handle it and then intercept the `did-navigate` event to move the file from the OS temp directory into the vault. This was rejected because moving files asynchronously can cause file locks and marimo client connection dropouts.
