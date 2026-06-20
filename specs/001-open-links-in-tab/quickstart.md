# Quickstart: Workspace Link Interception

This feature intercepts navigation links inside marimo `<webview>`s.

## How to Test
1. Set up a test vault with at least two marimo notebooks (`A.py`, `B.py`) and one markdown note (`notes.md`).
2. Add a markdown cell in `A.py` with the following links:
   - `[Other Notebook](/?file=B.py)`
   - `[Markdown Docs](/notes.md)`
   - `[External Link](https://marimo.io)`
3. Open `A.py` in Obsidian using the plugin.
4. Try clicking the links:
   - Click "Other Notebook" -> opens `B.py` in a new active tab.
   - Ctrl/Cmd + click "Other Notebook" -> opens `B.py` in a new background tab.
   - Click "Markdown Docs" -> opens `notes.md` in a new Obsidian tab.
   - Click "External Link" -> launches default OS browser.
