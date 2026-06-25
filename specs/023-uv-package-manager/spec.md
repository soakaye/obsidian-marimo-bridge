# Feature Specification: Support uv Package Manager for marimo Installation

**Feature Branch**: `023-uv-package-manager`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Support package detection and installation via `uv pip` in addition to package detection and installation via `pip`. Detect whether the `.venv` directory was created by uv, add a uv command path input to the settings screen, and when the uv path is not specified, search PATH and default install locations before using uv to install marimo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detect marimo in a uv-created vault environment (Priority: P1)

As a user whose vault-local `.venv` was created by uv,
I want the plugin to detect whether `marimo` is installed through uv's package interface
so that the plugin reports availability accurately for my environment.

**Why this priority**: Detection decides whether the plugin shows install guidance, enables server startup, or performs an upgrade. It must match the package manager that owns the environment.

**Independent Test**: Can be fully tested by creating a vault-local `.venv` with uv, installing or omitting `marimo`, and verifying that the plugin reports installed and not-installed states correctly without relying on the legacy pip path.

**Acceptance Scenarios**:

1. **Given** the vault contains a `.venv/pyvenv.cfg` file with a `uv` entry and `marimo` is installed there, **When** the plugin checks marimo availability, **Then** it detects `marimo` through the uv-managed environment and reports the installed version.
2. **Given** the vault contains a `.venv/pyvenv.cfg` file with a `uv` entry and `marimo` is not installed there, **When** the plugin checks marimo availability, **Then** it reports `marimo` as not installed and keeps the install target bound to that uv-created `.venv`.

---

### User Story 2 - Install or upgrade marimo with uv in a uv-created vault environment (Priority: P1)

As a user whose vault-local `.venv` was created by uv,
I want the plugin's install action to use uv's package manager
so that marimo is installed or upgraded in the same way as the rest of my environment.

**Why this priority**: This is the primary requested behavior. A uv-created environment should not be mutated through the legacy pip flow when uv is available as the package manager.

**Independent Test**: Can be fully tested with a uv-created `.venv` by triggering the plugin's install action when `marimo` is absent and when an older `marimo` is present, then verifying that `marimo` is installed or upgraded through uv and remains available to the plugin.

**Acceptance Scenarios**:

1. **Given** the vault contains a uv-created `.venv` and `marimo` is not installed, **When** the user triggers "Install marimo", **Then** the plugin installs `marimo` into that `.venv` using uv and reports success with the detected version.
2. **Given** the vault contains a uv-created `.venv` and `marimo` is already installed, **When** the user triggers "Reinstall / upgrade", **Then** the plugin upgrades `marimo` in that `.venv` using uv's upgrade behavior and reports success with the detected version.
3. **Given** the vault contains a uv-created `.venv` and the user has configured a uv command path in settings, **When** the user triggers installation or upgrade, **Then** the plugin uses the configured uv command path for the package operation.
4. **Given** the vault contains a uv-created `.venv`, no uv command path is configured, and uv is installed on PATH or in a default install location, **When** the user triggers installation or upgrade, **Then** the plugin automatically finds uv and uses it for the package operation.
5. **Given** the vault contains a uv-created `.venv` but no usable uv command is available through the configured path or automatic discovery, **When** the user triggers installation or upgrade, **Then** the plugin does not silently fall back to the legacy pip installer and instead shows a clear failure message explaining that uv is required for this environment.

---

### User Story 3 - Preserve existing pip behavior for non-uv environments (Priority: P2)

As a user whose environment was not created by uv,
I want the existing pip-based detection and installation behavior to remain unchanged
so that current workflows keep working.

**Why this priority**: uv support should be additive and must not regress users who rely on a configured Python interpreter, a non-uv virtual environment, or system Python.

**Independent Test**: Can be fully tested by using a non-uv `.venv` or configured Python interpreter and verifying that the plugin still detects, installs, and upgrades `marimo` through the existing pip flow.

**Acceptance Scenarios**:

1. **Given** the resolved environment is not identified as uv-created, **When** the plugin checks marimo availability, **Then** it uses the existing detection behavior.
2. **Given** the resolved environment is not identified as uv-created, **When** the user triggers installation or upgrade, **Then** the plugin uses the existing pip install or pip upgrade behavior.

---

### User Story 4 - Configure uv command path in settings (Priority: P2)

As a user whose uv executable is outside the plugin process PATH and default install locations,
I want to enter the uv command path in the settings screen
so that uv-managed environments work without changing my shell or Obsidian launch environment.

**Why this priority**: Desktop apps often launch with a different PATH than an interactive shell. A settings field gives users a reliable override while keeping automatic discovery as the default.

**Independent Test**: Can be fully tested by configuring a valid uv command path, leaving it empty, and configuring an invalid path, then verifying the selected command source and the resulting user feedback.

**Acceptance Scenarios**:

1. **Given** the user enters a valid uv command path in settings, **When** uv package operations are required, **Then** the plugin uses that configured path before any automatic discovery candidate.
2. **Given** the uv command path setting is empty, **When** uv package operations are required, **Then** the plugin searches PATH and default install locations for uv.
3. **Given** the user enters an invalid uv command path in settings, **When** uv package operations are required, **Then** the plugin reports that the configured uv command path is unusable and does not silently use another uv executable.

---

### Edge Cases

- **What happens when `.venv/pyvenv.cfg` is missing or unreadable?**
  - The plugin must treat the environment as not positively identified as uv-created and use the existing non-uv behavior, unless the Python executable itself is missing or broken.
- **What happens when `.venv/pyvenv.cfg` exists but does not contain a `uv` entry?**
  - The plugin must not assume uv ownership; it must use the existing pip behavior.
- **What happens when uv-created `.venv` exists but the uv executable is unavailable or cannot run?**
  - The plugin must report an installation or detection failure that names uv as the missing requirement for that environment. It must not mutate the uv-created environment with the legacy pip installer as a fallback.
- **What happens when the configured uv command path is invalid?**
  - The plugin must report that the configured uv command path is unusable and prompt the user to fix or clear the setting. It must not ignore the explicit setting and silently use another uv executable.
- **What happens when uv is installed outside the plugin process PATH?**
  - If no uv command path is configured, the plugin must attempt automatic uv command discovery from known local command locations before declaring uv unavailable.
- **What happens when multiple uv executables are discoverable?**
  - The plugin must prefer the configured uv command path when present. Otherwise, it must use a deterministic discovery order and report/log which uv command path was selected for package operations.
- **What happens when uv installation or upgrade fails due to network, index, permission, cache, or resolver errors?**
  - The plugin must log the captured stderr and show a user-friendly failure notification while leaving any existing `marimo` installation usable.
- **What happens when the configured Python path points outside the vault-local `.venv`?**
  - The configured Python path remains the selected target, and uv-created `.venv` detection does not override the explicit user configuration.
- **What happens when the configured marimo executable points outside the vault-local `.venv`?**
  - The configured marimo path remains the selected executable for launching. Package installation still targets the resolved Python environment according to existing settings precedence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST positively identify a vault-local `.venv` as uv-created before using uv-specific package operations.
- **FR-002**: The plugin MUST detect a uv-created `.venv` by reading `.venv/pyvenv.cfg` and confirming that it contains a `uv` entry such as `uv = <version>`.
- **FR-003**: When the selected install target is a uv-created vault-local `.venv`, the plugin MUST check whether `marimo` is installed using uv's package inspection behavior for that same environment.
- **FR-004**: When the selected install target is a uv-created vault-local `.venv` and `marimo` is not installed, the plugin MUST install `marimo` using uv for that same environment.
- **FR-005**: When the selected install target is a uv-created vault-local `.venv` and `marimo` is already installed, the plugin MUST upgrade `marimo` using uv's upgrade behavior for that same environment.
- **FR-006**: The settings screen MUST provide a uv command path input that users can leave empty for automatic discovery.
- **FR-007**: When a uv command path is configured, the plugin MUST use that configured path before any automatic discovery candidate.
- **FR-008**: When the uv command path setting is empty and uv-specific package operations are required, the plugin MUST automatically search PATH and default install locations for the uv command.
- **FR-009**: When multiple uv command candidates are discoverable and no uv command path is configured, the plugin MUST select one using a deterministic precedence order.
- **FR-010**: When the configured uv command path is invalid or not executable, the plugin MUST show a clear failure and MUST NOT silently use another uv executable.
- **FR-011**: When the selected install target is not positively identified as a uv-created vault-local `.venv`, the plugin MUST preserve the existing pip-based detection, install, and upgrade behavior.
- **FR-012**: The plugin MUST NOT silently fall back from uv to pip for a positively identified uv-created `.venv` when uv is unavailable or fails.
- **FR-013**: The plugin MUST refresh its marimo availability and version details after a successful uv or pip package operation.
- **FR-014**: The plugin MUST show user-facing success and failure notifications that remain accurate for both uv and pip package-manager paths.
- **FR-015**: The plugin MUST log package-manager stderr for failed uv and pip operations without exposing unnecessary implementation noise in the user notification.

### Key Entities *(include if feature involves data)*

- **Package Manager Strategy**: The selected package-management path for marimo detection and installation. Values are uv-managed vault `.venv` or existing pip behavior.
- **uv Command Path Setting**: An optional user-configured executable path for uv package operations.
- **uv Command Location**: The configured or automatically discovered executable path used for uv package operations.
- **Vault Virtual Environment**: The vault-local `.venv` directory and `.venv/pyvenv.cfg` contents used to decide whether uv owns the environment.
- **Marimo Installation Status**: Represents whether `marimo` is installed in the selected environment and, when available, its version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of package detection attempts for positively identified uv-created vault `.venv` environments use uv's package inspection behavior.
- **SC-002**: 100% of install or upgrade attempts for positively identified uv-created vault `.venv` environments use uv's package installation behavior.
- **SC-003**: 100% of non-uv install targets continue to use the existing pip behavior.
- **SC-004**: After a successful uv install or upgrade, the plugin detects the installed `marimo` version within 5 seconds under normal local process conditions.
- **SC-005**: 100% of uv package operations use the configured uv command path when it is present and usable.
- **SC-006**: 100% of uv package operations search PATH and default install locations when the uv command path setting is empty.
- **SC-007**: If uv is unavailable for a uv-created vault `.venv`, the install action fails with a clear notification and performs no pip fallback.

## Assumptions

- A uv-created virtual environment records a `uv` entry in its `pyvenv.cfg` file.
- The plugin continues to prefer explicit user configuration over vault-local `.venv` auto-detection.
- uv support is scoped to the vault-local `.venv` detection path and adds only the uv command path setting.
- uv itself is installed separately from this plugin and can be found either on PATH or in a common local command location.
- The user has network or package-index access when attempting to install or upgrade `marimo`.
