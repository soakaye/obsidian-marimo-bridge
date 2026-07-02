# Feature Specification: Enhance Package Manager Path Resolution for Spawned Processes

**Feature Branch**: `025-package-manager-spawn-path`

**Created**: 2026-06-28

**Status**: Implemented

**Input**: User description: "On macOS, Obsidian launches with a minimal `PATH`, so marimo's in-UI package installer cannot find the package manager (pip, uv, poetry, pixi, rye, …). Inject the standard package-manager install directories into the spawned marimo server's `PATH` so its installer works."

## Clarifications

### Session 2026-06-28

- Q: Should path injection gate on a single package-manager binary or cover every manager marimo supports? -> A: Inject the standard install directories themselves when they exist, which covers every manager marimo supports, rather than detecting any one binary.
- Q: When the configured uv path, the active environment, and the standard install locations all exist, which takes precedence in the injected `PATH`? -> A: The configured uv path's directory first, then the vault-local `.venv` command directory and the active interpreter directory, then the standard standalone install locations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install packages from marimo's UI when the GUI PATH is minimal (Priority: P1)

As a user who launches Obsidian as a desktop GUI application on macOS,
I want marimo's in-UI package installer to find my package manager even though Obsidian inherits a minimal `PATH`,
so that I can add packages from inside a marimo notebook without configuring environment variables.

**Why this priority**: macOS GUI applications launch with a reduced `PATH` that omits the directories where pip, uv, and other managers live. Without injecting those directories, marimo's own `shutil.which(...)` lookups fail and the in-UI installer is unusable for most users.

**Independent Test**: Can be fully tested by launching the marimo server from an environment whose `PATH` omits a known package-manager install directory, then verifying the spawned server process receives that directory on its `PATH`.

**Acceptance Scenarios**:

1. **Given** Obsidian launched with a minimal `PATH` that omits the standard package-manager install directories, **When** the plugin spawns the marimo server, **Then** the spawned process `PATH` includes the standard package-manager install directories that exist on disk.
2. **Given** a package manager is installed in one of the standard install directories, **When** marimo's in-UI installer runs its package-manager lookup, **Then** the manager is found through the injected `PATH`.
3. **Given** none of the standard package-manager install directories exist on disk, **When** the plugin spawns the marimo server, **Then** the spawned process inherits the unmodified `PATH` without spurious entries.

---

### User Story 2 - Respect configured and environment-local managers first (Priority: P2)

As a user who has configured a uv command path or who relies on a vault-local virtual environment,
I want those locations to take precedence in the spawned process's `PATH`,
so that the package manager from my chosen environment is preferred over unrelated global installations.

**Why this priority**: Users who configure an explicit uv path or use a vault-local `.venv` expect that environment's tooling to win. Injecting global locations must not shadow the configured or environment-local managers.

**Independent Test**: Can be fully tested by configuring a uv path and a vault-local `.venv`, then verifying the configured uv directory and the environment directories appear ahead of the standard standalone install locations in the injected `PATH`.

**Acceptance Scenarios**:

1. **Given** a configured uv command path whose directory exists, **When** the plugin builds the spawned process `PATH`, **Then** the configured uv directory is prepended ahead of the vault-local and standalone install directories.
2. **Given** a vault-local `.venv` and a resolvable active interpreter, **When** the plugin builds the spawned process `PATH`, **Then** the vault-local command directory and the interpreter directory precede the standalone install directories.

---

### User Story 3 - Preserve existing PATH and avoid duplication (Priority: P3)

As a user whose `PATH` already includes some of the standard package-manager directories,
I want the plugin to preserve my existing `PATH` and avoid duplicate entries,
so that injection never reorders or disturbs directories that are already present.

**Why this priority**: The injection is additive. It must not remove, reorder, or duplicate entries that the inherited `PATH` already provides.

**Independent Test**: Can be fully tested by starting from a `PATH` that already contains one of the standard directories, then verifying that directory is not duplicated and the remaining inherited entries keep their order.

**Acceptance Scenarios**:

1. **Given** an inherited `PATH` that already contains a standard package-manager directory, **When** the plugin builds the spawned process `PATH`, **Then** that directory is not added a second time.
2. **Given** an inherited `PATH` with existing entries, **When** injection prepends new directories, **Then** the existing entries are preserved in their original relative order after the injected directories.

### Edge Cases

- **What happens when a candidate directory does not exist on disk?**
  - The plugin must skip that directory and not add it to the spawned process `PATH`.
- **What happens when a candidate path is not absolute?**
  - The plugin must ignore non-absolute candidates so only concrete directories are injected.
- **What happens when no candidate directories exist or all are already present?**
  - The plugin must spawn the process with the inherited environment unchanged.
- **What happens on Windows where Homebrew directories do not apply?**
  - The plugin must omit the Unix-only Homebrew directories and use the platform-appropriate command directory.
- **What happens when the inherited environment has no `PATH` entry at all?**
  - The plugin must still build a `PATH` from the injected directories without error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When spawning the marimo server, the plugin MUST prepend the standard package-manager install directories that exist on disk to the spawned process's `PATH`.
- **FR-002**: The plugin MUST inject the standard install directories themselves rather than gate injection on detecting any single package-manager binary, so that every package manager marimo supports (pip, uv, poetry, pixi, rye, and pipx-installed tools) can be located.
- **FR-003**: The plugin MUST include the directory of the configured uv command path, when set, ahead of all other injected directories.
- **FR-004**: The plugin MUST include the vault-local `.venv` command directory and the active interpreter's directory ahead of the standalone install directories.
- **FR-005**: The plugin MUST include the user-level `~/.local/bin` and `~/.cargo/bin` directories on all platforms.
- **FR-006**: The plugin MUST include the Homebrew ARM and Intel command directories only on non-Windows platforms.
- **FR-007**: The plugin MUST only include candidate directories that are absolute paths and that exist on disk.
- **FR-008**: The plugin MUST NOT add a candidate directory that is already present in the inherited `PATH`.
- **FR-009**: The plugin MUST preserve the inherited `PATH` entries and their relative order after the injected directories.
- **FR-010**: The plugin MUST spawn the process with the inherited environment unchanged when there are no new directories to inject.
- **FR-011**: The plugin MUST apply this `PATH` injection at every marimo server spawn site.
- **FR-012**: The plugin MUST deduplicate candidate directories so the same directory is not injected more than once.

### Key Entities *(include if data is involved)*

- **Package Manager Path Directory**: A standard filesystem directory where a package manager or its tools are installed, considered for `PATH` injection.
- **Spawn Environment**: The environment variable map passed to the spawned marimo server process, derived from the inherited environment with injected `PATH` directories.
- **Injection Order**: The deterministic order in which candidate directories are prepended to `PATH` (configured uv directory, environment directories, then standalone install locations).
- **Configured uv Command Path Setting**: The optional user-configured uv command path whose directory takes top precedence in the injected `PATH`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of marimo server spawns whose inherited `PATH` omits an existing standard package-manager directory receive that directory on the spawned process `PATH`.
- **SC-002**: 100% of spawned process `PATH` values place the configured uv directory ahead of the vault-local, interpreter, and standalone install directories when the configured uv directory exists.
- **SC-003**: 100% of spawned process `PATH` values place the vault-local and interpreter directories ahead of the standalone install directories when those directories exist.
- **SC-004**: 0% of injected directories duplicate an entry already present in the inherited `PATH`.
- **SC-005**: 100% of candidate directories injected into `PATH` are absolute paths that exist on disk.
- **SC-006**: 100% of spawns with no new directories to inject pass through the inherited environment unchanged.
- **SC-007**: The injected directory order is determined consistently across repeated spawns with the same settings and filesystem state.

## Assumptions

- Obsidian on macOS launches as a GUI application with a minimal `PATH` that omits common package-manager install directories.
- marimo's in-UI package installer resolves its package manager through `shutil.which(...)`, which depends on the spawned server process's `PATH`.
- The standard install directories (`~/.local/bin`, `~/.cargo/bin`, Homebrew command directories) cover the package managers marimo supports.
- The vault-local virtual environment is rooted at `.venv` under the vault root.
- This change affects only the spawned process environment and does not change package-manager strategy selection or uv command discovery from [spec 024](../024-add-uv-venv-paths/spec.md).
