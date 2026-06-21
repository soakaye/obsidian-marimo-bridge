# Feature Specification: Run-Server Lifecycle and Consistency Remediation

**Feature Branch**: `014-manage-run-servers`

**Created**: 2026-06-21

**Status**: Implemented and validated

**Input**: User description: "Analyze the source code against existing Speckit specifications and plans, create Speckit artifacts for substantial undocumented differences, fix the existing issues, and make the server host permanently fixed to 127.0.0.1 with no other address configurable."

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

---

### User Story 4 - Receive a clear failure instead of a blank marimo view (Priority: P2)

A user opens a marimo view or embed whose embedded page cannot finish loading.
After bounded automatic recovery attempts fail, the unusable embedded page is
replaced with an explanation that the server is unavailable and that the user
should check the marimo path and reopen the view.

**Why this priority**: A permanently blank view gives the user no indication of
whether loading is still in progress or what action might restore access.

**Independent Test**: Prevent an embedded marimo page from becoming ready, allow
all automatic recovery attempts to finish, and verify that the blank page is
removed and explanatory guidance is displayed.

**Acceptance Scenarios**:

1. **Given** an embedded marimo page does not become ready, **When** fewer than
   the maximum recovery attempts have occurred, **Then** the plugin retries
   loading without creating an unbounded retry loop.
2. **Given** all permitted recovery attempts fail, **When** the final attempt
   completes, **Then** the unusable embedded page is removed and an explanatory
   failure message is shown.
3. **Given** the view or embed is removed while a retry is pending, **When** the
   retry time arrives, **Then** no further loading action is performed for the
   removed view.

---

### User Story 5 - Create notebooks without overwriting existing files (Priority: P2)

A user creates an untitled marimo notebook in a folder containing many notebooks
with the generated naming pattern. The plugin searches a bounded set of names,
creates the first available candidate, and stops with a notice rather than
overwriting a file or searching indefinitely when all candidates are occupied.

**Why this priority**: Notebook creation must protect existing work and remain
responsive even in an unusually crowded folder.

**Independent Test**: Populate all 1,000 generated-name candidates, request a new
notebook, and verify that no file is overwritten or created and that the user is
notified.

**Acceptance Scenarios**:

1. **Given** an available name exists among the first 1,000 candidates, **When**
   the user creates a notebook, **Then** the first available candidate is created
   without modifying any existing file.
2. **Given** all 1,000 candidates are occupied, **When** the user creates a
   notebook, **Then** creation stops, no existing file is modified, and the user
   receives an explanatory notice.

---

### User Story 6 - Keep every local marimo server safely bound and authenticated (Priority: P1)

A user starts or reconnects to marimo through the plugin. Every edit and run
server is available only through `127.0.0.1`, requires the plugin's active access
token, and cannot be configured to listen on another address. If the configured
edit port is already occupied, the plugin reuses only a compatible authenticated
server, otherwise replaces the listener before starting; if the port cannot be
released, startup stops without creating a conflicting process.

**Why this priority**: Binding to a non-loopback address or attaching to an
incompatible listener can expose notebook access, produce authentication
failures, or leave the user with a blank view.

**Independent Test**: Load settings containing a legacy non-loopback host, start
edit and run servers under free, compatible, incompatible, foreign, and
unreleasable-port conditions, and verify the resulting address, authentication,
reuse, replacement, and failure behavior.

**Acceptance Scenarios**:

1. **Given** settings contain a legacy host value other than `127.0.0.1`, **When**
   settings are loaded and a server URL or process is created, **Then** the
   legacy value is ignored and `127.0.0.1` is used.
2. **Given** a compatible authenticated server occupies the edit port, **When**
   the plugin requests the edit server, **Then** that server is reused without
   starting a duplicate.
3. **Given** an incompatible or foreign listener occupies the edit port, **When**
   the plugin requests the edit server, **Then** the listener is terminated and
   replaced with a compatible authenticated server.
4. **Given** an incompatible listener cannot be released, **When** the plugin
   requests the edit server, **Then** startup stops, the user is notified, and no
   conflicting server is started.
5. **Given** the plugin starts an edit or run server, **When** a request does not
   carry the active access token, **Then** notebook content is not made available
   through that request and no external browser is opened by server startup.

---

### User Story 7 - Prevent operational value drift during maintenance (Priority: P3)

A maintainer changes plugin behavior, messages, commands, events, or numeric
limits. Shared operational values remain managed in one policy boundary, and
automated validation identifies any newly introduced inline value that would
make behavior inconsistent across plugin surfaces.

**Why this priority**: Central management prevents security-sensitive addresses,
limits, and messages from diverging as the plugin evolves, but it does not alter
the primary notebook workflow.

**Independent Test**: Introduce a representative inline runtime value outside the
approved boundary and verify that automated validation rejects it; restore the
centralized value and verify that validation succeeds.

**Acceptance Scenarios**:

1. **Given** all shared operational values use the approved policy boundary,
   **When** automated validation runs, **Then** it reports no policy violations.
2. **Given** a new non-empty runtime string or non-zero runtime numeric value is
   introduced outside the approved boundary, **When** automated validation runs,
   **Then** it identifies the violating file and location.

### Edge Cases

- A run embed unloads while its server is still starting.
- A run-server startup fails before the first usage reference is established.
- The same notebook path contains redundant segments or platform-specific
  separators.
- A notebook path is empty, absolute, contains parent traversal, or resolves
  through a symbolic link outside the Vault.
- A candidate run-server port is already occupied by another process.
- A notebook is renamed or deleted between rendering and release.
- Plugin unload occurs while run servers still have active references.
- An embedded page never reports readiness, reports an explicit load failure, or
  is detached while a retry is pending.
- All 1,000 generated notebook names already exist.
- Legacy settings contain a non-loopback host.
- The edit port is occupied by a compatible server, an incompatible server, a
  non-marimo process, or a process that does not exit when termination is
  requested.

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
- **FR-014**: Embedded marimo pages that fail to become ready MUST retry loading
  no more than three times.
- **FR-015**: After the final permitted loading attempt fails, the plugin MUST
  remove the unusable embedded page and display explanatory recovery guidance.
- **FR-016**: A pending loading retry MUST NOT act on a view or embed that has
  already been removed.
- **FR-017**: Untitled notebook creation MUST examine no more than 1,000 generated
  name candidates and MUST create the first available candidate without
  overwriting an existing file.
- **FR-018**: When all 1,000 generated notebook names are occupied, notebook
  creation MUST stop without creating or modifying a file and MUST notify the
  user.
- **FR-019**: Every edit and run server MUST bind only to `127.0.0.1`, and the
  bind address MUST NOT be configurable.
- **FR-020**: Persisted host values from earlier versions MUST be ignored and
  removed from active settings.
- **FR-021**: Every server started by the plugin MUST start without opening an
  external browser, MUST require the active access token, and every embedded
  server request MUST include that token.
- **FR-022**: When the edit port is occupied by a server that accepts the active
  token, the plugin MUST reuse it without starting another process.
- **FR-023**: When the edit port is occupied by an incompatible or foreign
  listener, the plugin MUST request termination of that listener before starting
  a replacement.
- **FR-024**: If the occupied edit port cannot be released, the plugin MUST stop
  startup, notify the user, and MUST NOT start a conflicting process.
- **FR-025**: Shared runtime messages, command fragments, event names, and
  non-zero numeric policy values MUST use one approved policy boundary, and
  automated validation MUST identify violations outside that boundary.

### Key Entities

- **Canonical Notebook**: A valid Python notebook whose resolved real path is
  inside the Vault, identified by a normalized Vault-relative key.
- **Run Server**: A local read-only notebook server associated with exactly one
  canonical notebook and one selected loopback port.
- **Usage Reference**: One active run-mode embed's claim on a notebook's shared
  run server.
- **Startup Request**: An in-progress attempt to create a run server, shared by
  concurrent requests for the same canonical notebook.
- **Embed Recovery State**: The readiness, retry count, and attachment state used
  to decide whether an embedded page should retry, fail with guidance, or stop
  acting after removal.
- **Notebook Name Candidate**: One generated untitled notebook path considered
  during the bounded search for an available name.
- **Edit-Port Listener**: The process or server currently occupying the
  configured edit port, classified as reusable, replaceable, or unreleasable.
- **Operational Value**: A shared runtime message, command fragment, event name,
  address, or numeric limit governed by the project's consistency policy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rendering any number of simultaneous run-mode embeds for the same
  notebook results in exactly one run server for that notebook.
- **SC-002**: With two embeds sharing a server, unloading the first leaves one
  healthy server; unloading the second leaves zero servers for that notebook.
- **SC-003**: 100% of tested absolute, traversal, symlink-escape, missing, and
  non-Python paths start zero run servers.
- **SC-004**: Across 10 consecutive open-and-close cycles, the number of lingering
  run servers after all embeds are closed remains zero.
- **SC-005**: A port already occupied by another process is never selected for a
  new run server.
- **SC-006**: Deleting a notebook after its run embed loads does not prevent the
  final embed unload from terminating the associated run server.
- **SC-007**: In 100% of tested cases where an embedded page never becomes ready,
  no more than three recovery attempts occur and the user receives explanatory
  guidance instead of a persistent blank page.
- **SC-008**: With all 1,000 generated notebook names occupied, a creation request
  modifies zero files and produces one explanatory notice.
- **SC-009**: 100% of edit and run server addresses and generated server URLs use
  `127.0.0.1`, including when legacy settings contain another host value.
- **SC-010**: In tested edit-port conflicts, compatible authenticated servers are
  reused, replaceable listeners are replaced, and unreleasable ports result in
  zero conflicting process starts.
- **SC-011**: Automated consistency validation reports zero unmanaged shared
  operational values.

## Assumptions

- Run-mode embeds are read-only application views and may safely share one server
  when they reference the same notebook.
- The existing edit server remains independent from run-server reference
  counting.
- Plugin unload and application exit cleanup remain authoritative and may stop
  all run servers even if embed teardown callbacks have not completed.
- Desktop-only filesystem and process APIs remain available.
- Invalid run paths and run-server startup failures continue to use the existing
  run-server failure state.
- The only new user-facing failure surfaces in this feature are the exhausted
  embedded-page recovery guidance and the exhausted notebook-name notice.
- The configured edit port remains user-selectable; only the bind address is
  fixed.
- Replacing an incompatible edit-port listener is limited to startup conflict
  resolution. Unload, exit, and orphan reconciliation retain their existing
  conservative ownership checks.
