# Feature Specification: Resolve Code Review Fixes

**Feature Branch**: `019-code-review-fixes`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Resolve the eight implementation defects found in the full source review without changing the plugin's intended user-facing workflow."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure and robust server ownership (Priority: P1)

As a plugin user, I want the plugin to only manage and terminate servers it actually spawned, so that other processes occupying the same port are not accidentally killed.

**Why this priority**: Preventing data loss or termination of unrelated applications sharing local ports is critical to user confidence and system stability.

**Independent Test**: Can be fully tested by spawning a server record with/without tokens and attempting port-conflict operations.

**Acceptance Scenarios**:

1. **Given** a port is occupied by an unowned process, **When** the server manager starts or reconciles, **Then** it does not terminate the process.
2. **Given** a server is spawned by the plugin, **When** the server exits, **Then** the plugin removes the ownership record and updates its managed state.

---

### User Story 2 - Vault boundary enforcement for notebooks (Priority: P2)

As a vault owner, I want the plugin to only open python files within the active vault boundary, so that files outside the vault are not executed or accessed.

**Why this priority**: Enforcing execution boundaries within the vault prevents directory traversal attacks and symbolic link exploits.

**Independent Test**: Test by attempting to pass absolute paths, traversal paths, symlink escapes, and non-python files, confirming they are rejected.

**Acceptance Scenarios**:

1. **Given** a relative notebook path, **When** resolving its absolute path, **Then** it resolves to an existing `.py` file inside the Vault.
2. **Given** a path attempting symlink traversal outside the Vault, **When** validating the path, **Then** it is rejected.

---

### User Story 3 - URL query safety (Priority: P3)

As a developer, I want percent-containing file names to load correctly without double-decoding errors in the editor URL.

**Why this priority**: Double-decoding causes URLs with literal percent signs (e.g. `foo%20bar`) to break, affecting user experience when editing files containing special characters.

**Independent Test**: Test by opening files containing `%` in their names and ensuring they render and are editable without failure.

**Acceptance Scenarios**:

1. **Given** a notebook file name with a `%` character, **When** loading in the editor view, **Then** the correct path is passed and loaded without double-decoding.

### Edge Cases

- Legacy server records without a token are treated as unconfirmable and discarded without terminating any process.
- Startup timeout of edit-mode servers must clean up and terminate the child process to avoid dangling server processes.
- Process-affecting settings change (executable paths, host, port, API token) must immediately stop managed servers and reset relevant cached state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Validate that every persisted server record contains a valid process ownership token.
- **FR-002**: Never terminate processes occupying ports unless the record, PID, and stored token all identify it as spawned by this plugin.
- **FR-003**: Resolve run-mode notebook paths through a Vault-boundary validation helper.
- **FR-004**: Read URL query parameters exactly once via `URLSearchParams` without secondary `decodeURIComponent` calls.
- **FR-005**: Reset ready server state and stop running servers if process-affecting settings change (executable path, host, port, API token).
- **FR-006**: Clean up and terminate edit-mode servers on startup timeout.

### Key Entities

- **SpawnedServerRecord**: Represents a server process spawned by the plugin. Attributes:
  - `pid`: positive integer process identifier.
  - `port`: integer from 1 through 65535.
  - `kind`: `edit` or `run`.
  - `token`: non-empty token passed to `marimo --token-password`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Node built-in regression tests for the 8 defects pass successfully.
- **SC-002**: Unowned port occupants are never killed during health checks or lifecycle events.
- **SC-003**: Notebook path validation successfully rejects out-of-vault traversal and non-Python files.
- **SC-004**: Percent-containing filenames are processed with a single decoding step and load without errors.

## Assumptions

- Node.js built-in test runner is used for regression testing.
- Port conflict resolution does not blindly kill processes.
