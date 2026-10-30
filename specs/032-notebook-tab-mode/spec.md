# Feature Specification: Notebook Tab Edit/Run Mode Selection

**Feature Branch**: `032-notebook-tab-mode`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "次を実装 @[notebook_tab_mode_plan.md]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Default Tab Mode to Run App View (Priority: P1)

As an Obsidian user who edits notebooks in external editors (e.g. VS Code) and uses Obsidian primarily as a dashboard and interactive viewer, I want notebooks opened in tabs to launch by default in Run (App) mode so that I immediately see the rendered interactive application without editor clutter.

**Why this priority**: This addresses the primary user need for viewing notebooks as interactive apps directly in workspace tabs without manually converting or toggling every time.

**Independent Test**:
1. Open the plugin settings tab.
2. Change the "Default notebook mode" setting from "Edit mode" to "Run mode".
3. Open any `.py` notebook from the file navigator into a tab.
4. Verify that the tab loads the interactive Run (App) interface instead of the code editor.

**Acceptance Scenarios**:

1. **Given** the default notebook mode setting is set to "Run mode", **When** a user opens a notebook file in a new tab, **Then** the notebook opens in interactive Run mode.
2. **Given** a fresh install or default configuration, **When** a user checks the settings, **Then** "Edit mode" is selected by default to ensure backward compatibility.
3. **Given** the default notebook mode is "Edit mode", **When** a user opens a notebook file in a new tab, **Then** the notebook opens in full editor mode as before.

---

### User Story 2 - Toggle Tab Mode Between Edit and Run In-Place (Priority: P2)

As a user viewing a notebook in a tab, I want an easily accessible toggle button on the tab view so that I can quickly switch between Run mode and Edit mode without changing my global default setting or reopening the file.

**Why this priority**: Users frequently need to inspect or modify code while viewing an interactive app, or test the app view while editing code, making seamless in-place switching high value.

**Independent Test**:
1. Open a notebook in a tab in Run mode.
2. Click the mode toggle button on the tab header.
3. Verify the tab reloads into Edit mode with code cells visible.
4. Click the toggle button again and verify it returns to Run mode.

**Acceptance Scenarios**:

1. **Given** a notebook tab open in Run mode, **When** the user clicks the toggle action in the tab header, **Then** the view switches to Edit mode for that notebook.
2. **Given** a notebook tab open in Edit mode, **When** the user clicks the toggle action in the tab header, **Then** the view switches to Run mode for that notebook.
3. **Given** a notebook tab whose mode was manually switched, **When** the user switches away and back to the tab, **Then** the tab retains its explicitly selected mode.

---

### User Story 3 - Clean Process Resource Management on Mode Switch and Close (Priority: P3)

As a user working with multiple notebooks and toggling modes, I want background server resources for Run mode to be cleanly started on demand and released when the tab is closed or switched to Edit mode, so that unused background processes do not accumulate or consume system resources.

**Why this priority**: Stability and system resource conservation are essential for a desktop application running local background processes.

**Independent Test**:
1. Open a notebook tab in Run mode. Verify a dedicated run process is running.
2. Switch the tab to Edit mode or close the tab.
3. Verify that the dedicated run process terminates when no other view references that notebook.

**Acceptance Scenarios**:

1. **Given** an open notebook tab in Run mode, **When** the tab is closed, **Then** the dedicated run server for that notebook is released and terminated if no longer used.
2. **Given** an open notebook tab in Run mode, **When** the user toggles the tab to Edit mode, **Then** the previous run server reference is released and the edit server view is displayed.

---

### Edge Cases

- **Opening Marimo Home without a file**: When opening the marimo home dashboard (no file specified), the system MUST always open in Edit mode, even if the default notebook mode setting is "Run mode", because Run mode requires a specific notebook file.
- **Switching mode on an unsaved notebook**: If a user is in Edit mode and switches to Run mode, changes should be saved before the Run mode displays the latest notebook content.
- **Multiple tabs opening the same notebook in different modes**: One tab can be in Edit mode while another is in Run mode; each tab operates independently and resource references are tracked accurately.
- **Plugin unload or Obsidian restart**: Any active Run mode tab server resources must be cleaned up properly on app shutdown or plugin unload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a configuration setting ("Default notebook mode") allowing users to choose between "Edit mode (full editor)" and "Run mode (app view)".
- **FR-002**: The default value of "Default notebook mode" MUST be "Edit mode" to preserve backward compatibility.
- **FR-003**: When a notebook file is opened in a tab and no explicit mode state is specified, the system MUST use the configured "Default notebook mode".
- **FR-004**: If the Marimo home screen is opened without an associated notebook file, the system MUST always use Edit mode regardless of the default setting.
- **FR-005**: The system MUST provide a view action button in the notebook tab header to toggle the current view between Edit mode and Run mode.
- **FR-006**: The mode toggle action button MUST indicate the target mode or current state clearly (e.g. displaying an action to "Switch to run mode" when currently in Edit mode, and "Switch to edit mode" when currently in Run mode).
- **FR-007**: The system MUST provide a palette command to toggle the notebook mode between Edit and Run when a notebook tab is active.
- **FR-008**: When a tab switches from Run mode to Edit mode, or when a Run mode tab is closed, the system MUST release the associated run server reference.
- **FR-009**: The tab view state MUST preserve the explicitly selected mode across workspace view reloads or tab navigation within the session.

### Key Entities

- **Notebook Tab Mode Setting**: The user preference governing the initial launch mode for notebook tabs (`edit` or `run`).
- **Notebook Tab View State**: The runtime state associated with an individual tab leaf, containing the active notebook file reference and the currently active mode (`edit` or `run`).
- **Run Server Reference**: A tracked lease on an on-demand notebook application process, incremented when a tab or embed views the notebook in Run mode and decremented when closed or toggled away.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can toggle between Edit mode and Run mode in an active tab in a single click or command invocation.
- **SC-002**: 100% of notebook tabs opened with "Run mode" default setting display the interactive application without showing code cells or editor controls.
- **SC-003**: 100% of dedicated notebook run processes are terminated within 5 seconds after their last referencing tab or embed is closed or switched away.
- **SC-004**: Existing users upgrading the plugin experience zero breaking changes in default notebook opening behavior.

## Assumptions

- Marimo's existing Run server capability supports interactive app viewing for any valid notebook file.
- The home dashboard view requires the full server environment and does not support standalone Run mode.
- Standard tab view states in Obsidian can persist simple mode identifiers within the active workspace session.
