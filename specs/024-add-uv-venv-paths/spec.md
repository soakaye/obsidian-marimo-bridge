# Feature Specification: Add uv Virtual Environment Search Paths

**Feature Branch**: `024-add-uv-venv-paths`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Add Linux/macOS `.venv/bin` and Windows `.venv\Scripts` to the uv search path."

## Clarifications

### Session 2026-06-26

- Q: Which empty-setting automatic uv discovery order should be used when both a vault-local uv command and PATH/global uv command are available? -> A: Vault-local `.venv` uv first, then `uv` on PATH, then existing default/common locations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find uv inside a vault-local virtual environment (Priority: P1)

As a user whose vault-local environment includes a uv command inside the environment's script directory,
I want the plugin to discover that local uv command automatically
so that marimo package operations work without requiring a separate uv path setting.

**Why this priority**: The plugin already treats vault-local virtual environments as preferred execution targets. If uv is available inside that same environment, users should not need to duplicate the path manually in settings.

**Independent Test**: Can be fully tested by placing a usable uv command only in the vault-local virtual environment command directory, leaving the uv path setting empty, and verifying that the plugin can complete uv-backed marimo detection or installation.

**Acceptance Scenarios**:

1. **Given** the vault has a uv-managed `.venv`, the uv path setting is empty, and a usable uv command exists in `.venv/bin` on Linux or macOS, **When** uv-backed marimo package detection or installation is required, **Then** the plugin finds and uses that local uv command.
2. **Given** the vault has a uv-managed `.venv`, the uv path setting is empty, and a usable uv command exists in `.venv\Scripts` on Windows, **When** uv-backed marimo package detection or installation is required, **Then** the plugin finds and uses that local uv command.
3. **Given** the vault has a uv-managed `.venv` and uv exists only in the virtual environment command directory, **When** the user triggers marimo installation, **Then** the plugin completes the operation without asking the user to configure a uv command path.

---

### User Story 2 - Preserve explicit uv path preference (Priority: P2)

As a user who has configured a specific uv command path,
I want the plugin to continue honoring that setting
so that automatic discovery never overrides my explicit choice.

**Why this priority**: Explicit settings must remain predictable. Adding local virtual environment search paths should improve automatic discovery only when no uv path has been configured.

**Independent Test**: Can be fully tested by configuring a usable uv command path while also placing another uv command in the vault-local virtual environment command directory, then verifying that the configured path is selected.

**Acceptance Scenarios**:

1. **Given** the uv command path setting contains a usable path and a uv command also exists in the vault-local virtual environment command directory, **When** uv-backed package operations are required, **Then** the plugin uses the configured uv command path.
2. **Given** the uv command path setting contains an unusable path and a uv command exists in the vault-local virtual environment command directory, **When** uv-backed package operations are required, **Then** the plugin reports the configured path problem and does not silently select the local candidate.

---

### User Story 3 - Preserve existing automatic discovery after local candidates (Priority: P3)

As a user whose uv command is installed globally or in a common user-level location,
I want the existing automatic discovery behavior to continue working
so that adding local virtual environment paths does not regress current uv installations.

**Why this priority**: The new candidates are additive. Users who already rely on PATH or known install locations should continue to work when no higher-priority vault-local uv command is available.

**Independent Test**: Can be fully tested by leaving the uv path setting empty, ensuring no uv command exists in the vault-local virtual environment command directory, and verifying that uv is still found through the existing automatic discovery locations.

**Acceptance Scenarios**:

1. **Given** the uv path setting is empty and no uv command exists in the vault-local virtual environment command directory, **When** uv-backed package operations are required, **Then** the plugin continues searching the previously supported automatic discovery locations.
2. **Given** both a vault-local uv command and a global uv command are discoverable, **When** uv-backed package operations are required with no configured uv path, **Then** the plugin selects the vault-local uv command before PATH or default/common candidates.

### Edge Cases

- **What happens when the vault-local `.venv` does not exist?**
  - The plugin must skip local virtual environment uv candidates and continue the existing automatic uv discovery behavior.
- **What happens when the platform-specific virtual environment command directory does not exist?**
  - The plugin must skip that candidate without surfacing an error by itself.
- **What happens when a file named uv exists in the local command directory but cannot run?**
  - The plugin must treat that candidate as unusable and continue only according to the established automatic discovery rules for empty settings.
- **What happens when the configured uv command path is invalid?**
  - The plugin must preserve the existing explicit-setting behavior and report the configured path problem instead of falling back to local or global candidates.
- **What happens when path separators differ from the host platform?**
  - The plugin must evaluate only the local virtual environment command path appropriate for the current operating system.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the uv command path setting is empty and uv-backed package operations are required, the plugin MUST include the vault-local virtual environment command directory in automatic uv discovery.
- **FR-002**: On Linux and macOS, the plugin MUST consider `.venv/bin` under the vault root as a candidate location for the uv command.
- **FR-003**: On Windows, the plugin MUST consider `.venv\Scripts` under the vault root as a candidate location for the uv command.
- **FR-004**: The plugin MUST only consider the platform-appropriate vault-local virtual environment command directory for the current operating system.
- **FR-005**: The plugin MUST preserve configured uv command path precedence over all automatic uv discovery candidates.
- **FR-006**: If a configured uv command path is present but unusable, the plugin MUST report that configured path problem and MUST NOT silently fall back to vault-local or global discovery candidates.
- **FR-007**: If the platform-appropriate vault-local virtual environment uv candidate is missing or unusable and no uv command path is configured, the plugin MUST continue evaluating the remaining automatic discovery candidates.
- **FR-008**: When no uv command path is configured, automatic uv discovery MUST evaluate the platform-appropriate vault-local `.venv` uv candidate before `uv` on PATH and existing default/common locations.
- **FR-009**: The plugin MUST keep the existing uv-created environment requirement for choosing uv-backed marimo package operations.
- **FR-010**: The plugin MUST show accurate user-facing success or failure feedback regardless of whether uv was discovered locally, globally, or through the configured setting.

### Key Entities *(include if feature involves data)*

- **uv Command Candidate**: A possible uv executable location considered during automatic discovery.
- **Vault Virtual Environment Command Directory**: The platform-specific command directory inside the vault-local `.venv`, represented as `.venv/bin` on Linux/macOS and `.venv\Scripts` on Windows.
- **uv Command Path Setting**: An optional user-configured uv command path that takes precedence over automatic discovery.
- **Automatic Discovery Order**: The deterministic order used to evaluate uv command candidates when no explicit uv command path is configured.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of uv-backed package operations with an empty uv path setting can discover uv from `.venv/bin` on Linux and macOS when that is the only usable uv command candidate.
- **SC-002**: 100% of uv-backed package operations with an empty uv path setting can discover uv from `.venv\Scripts` on Windows when that is the only usable uv command candidate.
- **SC-003**: 100% of uv-backed package operations use the configured uv command path when the setting is present and usable, even if a vault-local uv command also exists.
- **SC-004**: 100% of invalid configured uv command paths produce a clear failure without silently falling back to vault-local or global candidates.
- **SC-005**: Existing automatic uv discovery through previously supported locations continues to work when no platform-appropriate vault-local uv command is available.
- **SC-006**: The selected uv command is determined consistently across repeated checks with the same settings and filesystem state.
- **SC-007**: When both the platform-appropriate vault-local uv command and `uv` on PATH are usable with an empty uv path setting, 100% of uv-backed package operations select the vault-local uv command.

## Assumptions

- The existing uv package-manager feature already decides when uv-backed marimo package operations are required.
- The new search paths apply only when the uv command path setting is empty.
- The vault-local virtual environment is rooted at `.venv` under the vault root.
- uv command discovery should be additive and should not change non-uv package-manager behavior.
