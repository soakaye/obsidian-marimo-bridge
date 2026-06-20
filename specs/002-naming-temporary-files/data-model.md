# Data Model: Naming Marimo Temporary Files

## Entities

### Notebook File
- **Description**: A local Python (`.py`) file stored in the Obsidian Vault.
- **Attributes**:
  - `path`: The absolute or vault-relative file path (e.g., `folder/untitled_marimo_1.py`).
  - `content`: Python code matching the default marimo notebook template.
- **State Transitions**:
  - **Created**: Dynamically generated when the user clicks "New Notebook".
  - **Saved**: Automatically managed by the marimo backend server during editing.
- **Identity Rules**:
  - Uniqueness is strictly enforced via suffix checking (`untitled_marimo.py` -> `untitled_marimo_1.py` -> ... -> `untitled_marimo_1000.py`).
