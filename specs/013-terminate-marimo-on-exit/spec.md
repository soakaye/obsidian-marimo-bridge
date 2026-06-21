# Feature Specification: Terminate Self-Spawned marimo Servers on Obsidian Exit

**Feature Branch**: `013-terminate-marimo-on-exit`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "obsidian終了時に自身が起動したmarimoサーバプロセスは全て終了させる"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No orphaned marimo processes after closing Obsidian (Priority: P1)

A user opens one or more marimo notebooks during a session (an edit server plus one or more read-only run servers are started on their behalf). When they close Obsidian completely, every marimo server process that the plugin started is shut down, leaving no background processes consuming ports, CPU, or memory.

**Why this priority**: This is the core promise of the feature. Orphaned servers are the primary harm — they hold onto loopback ports, keep a Python interpreter resident, and silently consume resources after the user believes they have closed the application. Without this, the feature delivers nothing.

**Independent Test**: Start Obsidian, open at least one edit notebook and one read-only embed (creating both an edit and a run server), then quit Obsidian. Verify that no marimo-related process remains running and that the previously used ports are free.

**Acceptance Scenarios**:

1. **Given** the plugin has started an edit server and at least one run server, **When** the user quits the Obsidian application, **Then** all server processes started by the plugin — including any child/worker subprocesses they spawned — are terminated.
2. **Given** the plugin has started one or more servers, **When** the user disables or reloads the plugin (without quitting Obsidian), **Then** all server processes started by the plugin are terminated.
3. **Given** the plugin started servers in a previous session that were not cleanly terminated (e.g. due to an abrupt crash or forced kill), **When** Obsidian is next launched with the plugin enabled, **Then** those leftover self-started processes are identified and terminated so the user does not accumulate orphans across sessions.

---

### User Story 2 - Cleanup leaves servers the plugin did not start untouched (Priority: P2)

A user (or another tool) is running an independent marimo server, or the plugin attached to a pre-existing compatible server rather than spawning its own. When the user quits Obsidian, only the processes the plugin actually started are terminated; servers the plugin merely connected to but did not spawn are left running.

**Why this priority**: The request is explicitly scoped to "自身が起動した" (servers it started itself). Killing a server the plugin did not start during unload, exit, or orphan reconciliation would surprise the user and could disrupt their separate workflow. Startup conflict resolution on the configured edit port is a separate safety boundary.

**Independent Test**: Start an independent marimo server manually so the plugin adopts it instead of spawning one, use it through Obsidian, then quit Obsidian and confirm the independently started server is still running.

**Acceptance Scenarios**:

1. **Given** the plugin adopted a pre-existing server it did not spawn, **When** Obsidian exits or the plugin unloads, **Then** that adopted server continues running and is not terminated.
2. **Given** an incompatible server occupies the configured edit port, **When** the plugin tries to start its edit server, **Then** the startup conflict-resolution path evicts that listener and starts a token-compatible replacement; if the port cannot be released, startup stops without spawning a conflicting process.

---

### Edge Cases

- **Abrupt termination of Obsidian** (force-quit, OS shutdown, crash): the normal in-app cleanup path may not run. The feature should minimize resulting orphans, and any that do survive must be cleaned up on the next launch (see User Story 1, Scenario 3).
- **Detached worker subprocesses**: a server may spawn its own child/worker processes. Terminating only the top-level process must not leave those children running.
- **Server still starting up at exit time**: the user quits while a server is mid-launch and not yet reporting healthy. The in-flight process must still be terminated.
- **Port reassigned to an unrelated process**: between recording a server and exit time, the OS may have given the same port to a different, unrelated process. Cleanup must not terminate a process the plugin did not start solely because it now occupies a previously used port.
- **Recycled process identifier**: after an unclean shutdown, the OS may have reassigned a recorded process identifier to an unrelated process. Next-launch cleanup must not terminate it on the identifier alone — confirmation that it is the plugin's own marimo server is required before terminating.
- **Cleanup invoked when no servers were ever started**: exit/unload must complete cleanly with no error and nothing to terminate.

## Clarifications

### Session 2026-06-20

- Q: How should leftover self-started servers from a crash/forced exit be identified and cleaned up on the next launch? → A: Persist each spawned server's PID, port, kind, and spawn token to a plugin data file; on startup, verify each recorded entry and terminate any that is still alive and confirmable as the plugin's own marimo server.
- Q: When next-launch cleanup finds something on a recorded port/PID but cannot positively confirm it is one the plugin started, should it skip or terminate? → A: Conservative — terminate only when positively confirmed (recorded PID still owns the port AND the server accepts its persisted spawn token); otherwise leave it running.
- Q: Graceful vs forced termination of self-started servers? → A: Graceful signal only, no forced-kill escalation or wait — send the platform's termination signal (Unix: SIGTERM to the process group; Windows: process-tree termination) and do not block to escalate; anything that does not exit in time is handled by next-launch reconciliation.
- Q: Quantify SC-002's "within a few seconds" port-release window? → A: Keep qualitative ("within a few seconds"); no fixed numeric threshold is imposed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On Obsidian application exit, the plugin MUST terminate every marimo server process it started during the session.
- **FR-002**: On plugin unload, disable, or reload, the plugin MUST terminate every marimo server process it started, independent of whether the whole application is exiting.
- **FR-003**: Termination MUST cover both the always-on edit server and every per-notebook run server the plugin started.
- **FR-004**: Termination MUST also stop any child/worker subprocesses descended from a server the plugin started, so that no descendant survives the parent.
- **FR-005**: Unload, exit, and orphan-reconciliation cleanup MUST NOT terminate a marimo server the plugin did not start (e.g. a compatible pre-existing server it merely adopted/attached to). Startup conflict resolution on the configured edit port is governed separately by Safe Local Bindings and may evict an incompatible listener so the plugin can bind safely.
- **FR-006**: The plugin MUST terminate a server that is still in the process of starting (not yet reported healthy) if exit/unload occurs before startup completes.
- **FR-007**: For each server it spawns, the plugin MUST persist a record containing the process identifier, port, server kind, and spawn token to a plugin-owned data store, and MUST remove that record only after the process is confirmed to have exited.
- **FR-007a**: On startup, the plugin MUST read the persisted records and, for each one, terminate the leftover process only when it can positively confirm the recorded process identifier still owns the recorded port AND the server accepts the record's spawn token. Confirmed leftovers MUST be signaled and retained in the store if they remain alive; unconfirmable records MUST be left untouched and cleared from the store.
- **FR-008**: Cleanup actions MUST be safe to invoke when no servers were started, completing without error.
- **FR-009**: Identification of "processes the plugin started" MUST be reliable enough that cleanup does not terminate an unrelated process that happens to occupy a previously used port. When identity cannot be positively confirmed, the plugin MUST favor leaving the process running over terminating it (conservative posture: never kill on suspicion alone).
- **FR-010**: The cleanup mechanism MUST function on the platforms the plugin supports (Obsidian Desktop on Windows and Unix-like systems), accounting for platform differences in how process trees are terminated.
- **FR-011**: Termination MUST use a single graceful termination signal per process (Unix: signal the detached process group; Windows: terminate the process tree) and MUST NOT block at exit/unload time to wait for confirmation or escalate to a forced kill. Any process that does not exit in time is reconciled on the next launch (FR-007a).

### Key Entities *(include if data involved)*

- **Managed Server**: A marimo server instance the plugin is responsible for. Distinguished by whether the plugin *started* it (subject to termination) or *adopted* it (left running). Characterized by its kind (edit vs. run), the port it uses, and its current readiness.
- **Self-Started Process Record**: A persisted entry the plugin writes for each server it spawns, containing the process identifier, port, server kind (edit vs. run), and spawn token — sufficient to identify and terminate that server and its descendants both during the session and, after an unclean shutdown, on the next launch. The record is removed only after process exit is confirmed. Records are only acted upon when the referenced process can be positively confirmed as the plugin's own marimo server.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a normal Obsidian quit following a session that started one edit server and any number of run servers, 0 plugin-started marimo processes remain running.
- **SC-002**: 100% of previously used loopback ports for plugin-started servers are free within a few seconds of a normal Obsidian quit.
- **SC-003**: A marimo server the plugin adopted but did not start survives an Obsidian quit in 100% of trials.
- **SC-004**: After an unclean prior shutdown that left orphaned plugin-started servers, launching Obsidian with the plugin enabled results in 0 of those orphans remaining once startup completes.
- **SC-005**: Across repeated open-and-quit cycles, the number of lingering marimo processes does not grow over time (no accumulation of orphans across sessions).

## Assumptions

- "marimo server process the plugin started itself" refers to any edit or run server the plugin spawned, and explicitly excludes servers the plugin adopted/attached to without spawning. This matches the existing distinction between a spawned process and an adopted one.
- Reliable cleanup after an abrupt/forced termination of Obsidian cannot be fully guaranteed at exit time; the accepted fallback is next-launch cleanup of leftovers rather than a hard real-time guarantee.
- The feature targets Obsidian Desktop only; mobile is out of scope, consistent with the plugin's desktop-only architecture.
- Existing per-process termination behavior (recursive tree kill on Windows; process-group termination on Unix-like systems) is the intended foundation; this feature is about ensuring it runs reliably and completely on exit, not about changing the supported platforms.
- "全て" (all) is bounded to servers the plugin started in the current and prior sessions; servers started by other tools or users are never in scope.
- A graceful termination signal without a forced-kill escalation (FR-011) is acceptable for data safety because marimo persists notebook state to the `.py` file as cells run; the loss window is limited to any in-flight, not-yet-persisted edit at the moment of termination.
- SC-002 is intentionally kept qualitative ("within a few seconds"); no fixed numeric port-release threshold is imposed.
