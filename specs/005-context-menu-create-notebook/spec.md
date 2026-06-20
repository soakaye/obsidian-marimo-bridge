# Feature Specification: Context Menu Notebook Creation

**Feature Branch**: `005-context-menu-create-notebook`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "コンテキストメニューにnotebookの作成を追加する。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Notebook in Folder via File Explorer Context Menu (Priority: P1)

Users can right-click any folder in the Obsidian file explorer to open the context menu and select "Create new marimo notebook" to quickly instantiate a new notebook directly inside that folder.

**Why this priority**: Core workflow enhancement. Creating notebooks in specific folders is a fundamental file organization need for users.

**Independent Test**:
1. Right-click on a folder (e.g., `workbooks`) in the file explorer.
2. Select "Create new marimo notebook" from the context menu.
3. Verify that `workbooks/untitled_marimo.py` is created and immediately opens in the marimo editor tab.

**Acceptance Scenarios**:

1. **Given** a folder `workbooks` exists in the vault, **When** the user right-clicks the folder and selects "Create new marimo notebook", **Then** a new file `workbooks/untitled_marimo.py` is created with the default marimo notebook template and opened in the editor.

---

### User Story 2 - Create Notebook in Parent Directory of File via Context Menu (Priority: P2)

Users can right-click any file in the file explorer and select "Create new marimo notebook" to create a new notebook in the same directory as the target file.

**Why this priority**: Convenience feature. Allows users to create a notebook next to an existing active note or script without navigating back to the folder level.

**Independent Test**:
1. Right-click on an existing file (e.g., `docs/report.md`).
2. Select "Create new marimo notebook" from the context menu.
3. Verify that a new notebook `docs/untitled_marimo.py` is created next to `report.md` and opened.

**Acceptance Scenarios**:

1. **Given** a file `docs/report.md` exists, **When** the user right-clicks it and selects "Create new marimo notebook", **Then** a new file `docs/untitled_marimo.py` is created and opened in the editor.

---

### Edge Cases

- **Creating notebook at Vault Root**:
  - Right-clicking the vault root or files at the vault root should create the notebook at the root directory of the vault.
- **File Name Collisions**:
  - If `untitled_marimo.py` already exists in the target folder, the system must search for the next available filename using sequential numbering (e.g., `untitled_marimo_1.py`, `untitled_marimo_2.py`) to prevent overwriting existing notebooks.
- **Rapid clicks / double click**:
  - Clicking the menu item multiple times quickly should not spawn multiple notebooks simultaneously or crash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST integrate with Obsidian's file explorer context menu system.
- **FR-002**: A menu option "Create new marimo notebook" (with a plus icon) MUST be added to the context menu when right-clicking folders and files in the file explorer.
- **FR-003**: The plugin MUST determine the target creation directory:
  - If a folder was right-clicked, use that folder.
  - If a file was right-clicked, use its parent folder.
  - If no parent folder can be resolved, fall back to the vault root.
- **FR-004**: Selecting the menu option MUST create a new notebook file named `untitled_marimo.py` (or a sequentially numbered alternative if it already exists) using the default marimo notebook template.
- **FR-005**: The newly created notebook MUST be opened immediately in a new marimo editor view.

### Key Entities

- **Context Menu Item**: The UI element labeled "Create new marimo notebook" added to the Obsidian context menu.
- **Target Folder**: The destination folder resolved from the right-clicked file or folder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clicking "Create new marimo notebook" in the context menu successfully creates and opens a notebook in under 200ms.
- **SC-002**: Sequential naming avoids collisions in 100% of cases, even when numerous `untitled_marimo*.py` files already exist in the target folder.

## Assumptions

- Desktop-only environment where standard Obsidian context menu behaviors and file creation function as expected.
- The file explorer plugin is enabled in Obsidian.
