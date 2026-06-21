# Feature Specification: Manage Run-Mode Server Lifecycles

**Feature Branch**: `014-manage-run-servers`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Analyze the source code against existing Speckit specifications and plans, and create Speckit artifacts for substantial undocumented differences."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reuse one run server across matching embeds (Priority: P1)

A user places the same notebook in multiple `mode: run` embeds, including embeds
that render at nearly the same time. The plugin provides all of those embeds from
one shared run server instead of starting duplicate processes for the same
notebook.

**Why this priority**: Duplicate run servers waste ports and memory and can leave
untracked processes behind. Preventing duplicate startup is the core lifecycle
guarantee for run-mode embeds.

**Independent Test**: Render two run-mode embeds for the same notebook
concurrently and verify that both load successfully while only one run server is
started for that notebook.

**Acceptance Scenarios**:

1. **Given** no run server exists for a notebook, **When** two matching embeds
   request it concurrently, **Then** exactly one server is started and both
   embeds receive a working view.
2. **Given** a healthy run server already serves a notebook, **When** another
   matching embed is rendered, **Then** the existing server is reused without
   starting another process.
3. **Given** two differently written paths resolve to the same notebook,
   **When** both are embedded in run mode, **Then** they share one server.

---

### User Story 2 - Stop an unused run server (Priority: P1)

A user closes a note, switches preview modes, or otherwise removes run-mode
embeds. The plugin keeps the shared run server alive while any matching embed is
still using it and stops the server after the final matching embed is removed.

**Why this priority**: Run servers exist only to serve active embeds. Releasing
them promptly prevents resource and port consumption from growing during a long
Obsidian session.

**Independent Test**: Render two run-mode embeds for one notebook, unload them
one at a time, and verify that the server survives the first unload and exits
after the second.

**Acceptance Scenarios**:

1. **Given** two active embeds share one run server, **When** one embed unloads,
   **Then** the server remains available to the other embed.
2. **Given** one active embed is the final user of a run server, **When** that
   embed unloads, **Then** the server is terminated and removed from active
   server tracking.
3. **Given** an embed uses edit mode, **When** it unloads, **Then** it does not
   change any run-server usage count.

---

### User Story 3 - Reject unsafe or invalid notebook paths (Priority: P2)

A user or note contains a run-mode embed with a malformed, missing, non-Python,
or out-of-vault path. The plugin refuses to start a process for that path and
shows the existing run-server failure state instead of accessing files outside
the Vault.

**Why this priority**: Run-mode input ultimately selects a local file for a
process to execute. The Vault boundary must be enforced before a server starts.

**Independent Test**: Attempt run-mode embeds using an absolute path, parent
traversal, a symlink escaping the Vault, a missing file, and a non-Python file;
verify that none starts a server.

**Acceptance Scenarios**:

1. **Given** an absolute or parent-traversal path, **When** a run embed requests
   it, **Then** no server is started.
2. **Given** a symbolic link inside the Vault that resolves outside the Vault,
   **When** a run embed requests it, **Then** no server is started.
3. **Given** an existing regular Python notebook inside the Vault, **When** a run
   embed requests it, **Then** a server starts using that resolved notebook.

### Edge Cases

- A run embed unloads while its server is still starting.
- A run-server startup fails before the first usage reference is established.
- The same notebook path contains redundant segments or platform-specific
  separators.
- A candidate run-server port is already occupied by another process.
- A notebook is renamed or deleted between rendering and release.
- Plugin unload occurs while run servers still have active references.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST resolve every run-mode notebook request to an
  existing regular Python file contained within the Vault before starting a run
  server.
- **FR-002**: The plugin MUST reject absolute paths, paths that escape the Vault,
  symbolic links whose resolved targets escape the Vault, missing files, and
  non-Python files.
- **FR-003**: The plugin MUST derive a stable canonical identity for each valid
  notebook so equivalent paths refer to the same run server.
- **FR-004**: The plugin MUST maintain at most one active run server for each
  canonical notebook identity.
- **FR-005**: Concurrent requests for the same notebook MUST share one startup
  operation and MUST NOT create duplicate run servers.
- **FR-006**: Each successfully served run-mode embed MUST acquire one usage
  reference for its notebook's run server.
- **FR-007**: Unloading a run-mode embed MUST release exactly one usage reference.
- **FR-007a**: Release MUST remain possible when the notebook is renamed or
  deleted after acquisition by retaining the canonical identity associated with
  the embed's original request.
- **FR-008**: A run server MUST remain active while one or more usage references
  remain.
- **FR-009**: The plugin MUST terminate and untrack a run server after its final
  usage reference is released.
- **FR-010**: Failed startup attempts and invalid path requests MUST NOT leave a
  usage reference or a tracked run server.
- **FR-011**: Run-server port selection MUST skip the edit-server port, ports
  already assigned to tracked run servers, and ports currently occupied by other
  processes.
- **FR-012**: Plugin-wide cleanup MUST terminate all self-started run servers and
  clear their usage references regardless of the current reference count.
- **FR-013**: Edit-mode embeds MUST NOT acquire or release run-server references.

### Key Entities

- **Canonical Notebook**: A valid Python notebook whose resolved real path is
  inside the Vault, identified by a normalized Vault-relative key.
- **Run Server**: A local read-only notebook server associated with exactly one
  canonical notebook and one selected loopback port.
- **Usage Reference**: One active run-mode embed's claim on a notebook's shared
  run server.
- **Startup Request**: An in-progress attempt to create a run server, shared by
  concurrent requests for the same canonical notebook.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rendering any number of simultaneous run-mode embeds for the same
  notebook results in exactly one run server for that notebook.
- **SC-002**: With two embeds sharing a server, unloading the first leaves one
  healthy server; unloading the second leaves zero servers for that notebook.
- **SC-003**: 100% of tested absolute, traversal, symlink-escape, missing, and
  non-Python paths start zero run servers.
- **SC-004**: Repeatedly opening and closing run-mode embeds does not increase the
  number of lingering run servers after all embeds are closed.
- **SC-005**: A port already occupied by another process is never selected for a
  new run server.
- **SC-006**: Deleting a notebook after its run embed loads does not prevent the
  final embed unload from terminating the associated run server.

## Assumptions

- Run-mode embeds are read-only application views and may safely share one server
  when they reference the same notebook.
- The existing edit server remains independent from run-server reference
  counting.
- Plugin unload and application exit cleanup remain authoritative and may stop
  all run servers even if embed teardown callbacks have not completed.
- Desktop-only filesystem and process APIs remain available.
- The existing user-facing run-server failure message is sufficient for invalid
  path and startup failures; this feature adds no new UI.
