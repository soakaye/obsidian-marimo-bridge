# Feature Specification: Naming Marimo Temporary Files

**Feature Branch**: `002-naming-temporary-files`

**Created**: 2026-06-18

**Status**: Approved

**Input**: User description: "marimoホームから生成される新しいページの一時ファイル名を marimo を連想させるファイル名とする"

## Clarifications

### Session 2026-06-18
- Q: What should be the maximum search limit for sequential numbering to avoid filename collisions? → A: Option A - A maximum search limit of 1000 iterations (e.g. up to `untitled_marimo_1000.py`), after which a system notice error is shown.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apply Naming Convention for New Notebooks from Marimo Home (Priority: P1)

When a user clicks the "New Notebook" button on the marimo home dashboard, the plugin prevents the server from creating an obscure temporary file in the OS temp directory (e.g. `marimo_*.py`). Instead, it automatically creates a new notebook file directly in the Obsidian Vault with a clear, recognizable name (`untitled_marimo_*.py`), allowing the user to start editing immediately.

**Why this priority**: Core value of the feature, ensuring users can track the location and name of their created notebooks.

**Independent Test**: Click "New Notebook" from the marimo home dashboard. Verify that a new file named `untitled_marimo.py` is created in the active folder (or vault root) and opened in a new editor tab.

**Acceptance Scenarios**:

1. **Given** the user is on the marimo home dashboard, **When** they click "New Notebook", **Then** `untitled_marimo.py` is created in the vault and opened in a new tab.
2. **Given** `untitled_marimo.py` already exists in the folder, **When** the user clicks "New Notebook", **Then** `untitled_marimo_1.py` (or the next available sequential number) is created and opened.

---

### Edge Cases

- **No active file or parent folder**:
  - The file is created directly under the Vault root directory.
- **Multiple colliding files exist**:
  - The suffix `_N` is incremented starting from 1 until a non-colliding name is found, up to a maximum of 1000 iterations (e.g. up to `untitled_marimo_1000.py`). If the limit is reached, a system notice error is displayed to the user and file creation is halted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The webview MUST detect and intercept navigations to `/__new__` (triggered by the "New Notebook" button).
- **FR-002**: The intercepted navigation MUST be routed to the plugin's `openMarimo` method with `filePath` mapped to `__new__`.
- **FR-003**: When `openMarimo` receives `__new__`, it MUST determine the parent folder of the active file (or use vault root if none).
- **FR-004**: It MUST generate a unique path like `untitled_marimo.py` or `untitled_marimo_N.py` within that folder, up to a maximum search limit of 1000 iterations.
- **FR-005**: It MUST create the file using the default marimo notebook template and proceed to load this file in the editor view.
- **FR-006**: If the search limit of 1000 iterations is exceeded without finding a unique name, the system MUST show an error notification and halt the file creation process.

### Key Entities

- **Notebook File**: A `.py` file created in the Obsidian Vault, initialized with the default marimo app template.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Notebooks created from the home dashboard avoid OS temp folder generation and are saved directly in the Obsidian Vault with the `untitled_marimo_*.py` scheme.
- **SC-002**: The user can start typing in the new notebook immediately, and edits are automatically saved to the vault file.

## Assumptions

- Desktop environment (Electron webview and Node fs access are available).
- The user has write access to the Vault.
