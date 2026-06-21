# Feature Specification: Replace Console-Based Webview IPC

**Feature Branch**: `018-replace-console-ipc`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Replace sentinel-prefixed console.log communication with an asynchronous Promise/queue bridge for webview messages, preserve ordinary guest console forwarding as diagnostics, and keep completed specification 017 unchanged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Embedded Links Without Console IPC (Priority: P1)

As a plugin user, I want links and new-window actions from the embedded marimo interface to continue opening in the appropriate application destination without using console output as a communication channel.

**Why this priority**: Opening notebooks and related links is a core navigation workflow. Console output is intended for diagnostics, so using it for control messages creates an unnecessary coupling between normal logging and application behavior.

**Independent Test**: Open marimo Home in the plugin, select notebook, workspace, and external links, and verify each link reaches the same destination as before while no control message appears in guest console output.

**Acceptance Scenarios**:

1. **Given** marimo Home is embedded in a plugin view, **When** the user selects a local marimo notebook link that requests a new target, **Then** the notebook opens in a plugin-managed marimo tab without emitting a console control message.
2. **Given** an embedded marimo page requests a new window for a local workspace file, **When** the request is received, **Then** the file is routed through the host workspace without emitting a console control message.
3. **Given** an embedded marimo page requests an external HTTP or HTTPS URL, **When** the request is received, **Then** the URL opens through the existing external-browser flow without emitting a console control message.

---

### User Story 2 - Preserve Ordered and Reliable Message Delivery (Priority: P2)

As a plugin user, I want rapid embedded navigation actions to be handled in the order they occurred so that no requested destination is lost or confused with another action.

**Why this priority**: Replacing the transport must not introduce dropped, duplicated, reordered, or stale navigation actions.

**Independent Test**: Produce several supported navigation actions in rapid succession and verify that each valid action is handled once, in the original order.

**Acceptance Scenarios**:

1. **Given** multiple valid navigation actions are waiting, **When** the host receives them, **Then** each action is handled exactly once in first-in, first-out order.
2. **Given** no navigation action is waiting, **When** the host waits for the next action, **Then** the wait remains idle without repeated polling or diagnostic noise.
3. **Given** a message does not match the supported navigation contract, **When** it is received, **Then** it is ignored safely and does not trigger navigation.

---

### User Story 3 - Recover Cleanly Across Reloads and Closure (Priority: P3)

As a plugin user, I want embedded views to reload, navigate, and close without stale messages causing unexpected tabs, errors, or background activity.

**Why this priority**: Embedded guest contexts are routinely replaced during reload and navigation. A robust bridge must distinguish the current context from obsolete ones.

**Independent Test**: Start a pending receive operation, reload or close the embedded view, and verify that obsolete results are ignored and no visible error or unhandled failure occurs.

**Acceptance Scenarios**:

1. **Given** a receive operation belongs to an earlier guest context, **When** that operation resolves after a reload, **Then** its result is ignored.
2. **Given** the embedded page reloads and becomes ready again, **When** a new valid navigation action occurs, **Then** the new context handles it normally.
3. **Given** the embedded view navigates away, reloads, or closes while waiting for a message, **When** the pending operation ends, **Then** the plugin stops that receive cycle quietly without an unhandled failure.
4. **Given** the embedded page fails to initialize its communication bridge, **When** the failure is detected, **Then** existing view recovery and diagnostic behavior remains available without starting a broken receive cycle.

### Edge Cases

- A malformed value, missing URL, unsupported message type, or non-string disposition is received.
- Several messages are queued before the host begins waiting for them.
- A new message is enqueued while a host receive operation is already pending.
- The embedded page reloads more than once while earlier receive operations are unresolved.
- The view is detached or closed while bridge initialization or message receipt is in progress.
- A guest page emits ordinary debug, warning, or error console output containing text similar to the former sentinel.
- An unsafe external protocol is requested through an otherwise valid navigation message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The embedded view MUST communicate supported navigation actions through a dedicated asynchronous bridge and MUST NOT use console output as a control-message transport.
- **FR-002**: The bridge MUST represent each navigation action as structured data containing a message type, a resolved URL, and an optional disposition.
- **FR-003**: The guest side MUST retain unconsumed navigation actions in first-in, first-out order.
- **FR-004**: A receiver waiting when no action is queued MUST be completed by the next navigation action without periodic polling.
- **FR-005**: Navigation actions produced by new-window requests and links targeting a separate browsing context MUST enter the same bridge.
- **FR-006**: The host MUST validate every received value against the supported navigation-message contract before performing any action.
- **FR-007**: Each valid navigation message MUST be routed through the existing local notebook, local workspace file, external HTTP(S), and unsafe-protocol decision paths.
- **FR-008**: Unsupported, incomplete, or malformed messages MUST be ignored without opening a destination or disrupting later valid messages.
- **FR-009**: The host MUST associate each receive cycle with the current embedded guest context and MUST ignore results belonging to an obsolete context.
- **FR-010**: The bridge MUST restart for the new guest context after each successful embedded-page readiness event.
- **FR-011**: Communication failures caused by navigation, reload, detachment, or closure MUST end the affected receive cycle without an unhandled failure or user-facing error.
- **FR-012**: Ordinary guest console output MUST remain available through the existing debug, warning, and error diagnostic routing.
- **FR-013**: Ordinary console output MUST never be interpreted as a navigation control message, including output matching the former sentinel format.
- **FR-014**: Existing embedded-view loading, authentication retry, blank-view recovery, navigation interception, and file-change behavior MUST remain unchanged.
- **FR-015**: The feature MUST NOT add guest preload scripts, periodic polling, additional network listeners or ports, HTTP or WebSocket transports, or privileged main-process integration.
- **FR-016**: Completed specification 017 and its historical artifacts MUST remain unchanged.
- **FR-017**: The feature MUST remain desktop-only and MUST NOT broaden filesystem, process-execution, network-binding, or authentication capabilities.

### Key Entities

- **Bridge Message**: A structured request from the current embedded guest context. It identifies the action type, destination URL, and optional navigation disposition.
- **Message Queue**: The ordered collection of valid bridge messages that have not yet been consumed by the host.
- **Receive Cycle**: One active wait for the next bridge message, associated with a specific embedded guest context.
- **Guest Context Generation**: The identity of the currently active embedded page context, used to reject results from contexts replaced by reload, navigation, or closure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested local notebook, local workspace file, and external HTTP(S) navigation actions reach the same destinations as before the transport change.
- **SC-002**: 0 navigation control messages are emitted through or decoded from guest console output during automated and manual navigation tests.
- **SC-003**: In a test sequence of at least 20 rapidly queued valid actions, 100% are handled exactly once and in their original order.
- **SC-004**: 100% of tested malformed or unsupported messages are ignored without navigation, visible failure, or disruption of the next valid message.
- **SC-005**: 100% of tested stale results produced after reload, navigation, detachment, or closure are ignored without opening an unexpected destination.
- **SC-006**: Existing diagnostic forwarding continues to preserve debug, warning, and error severity for all tested ordinary guest console messages.
- **SC-007**: All existing automated navigation, recovery, authentication, and file-change regression scenarios complete without an observable behavior change.

## Assumptions

- The existing navigation classification and destination-opening behavior is correct and will be reused unchanged.
- Only navigation control communication is replaced; ordinary guest console diagnostics and server-process diagnostics remain in scope as logging.
- The host environment provides an asynchronous request-and-result boundary for executing code in the embedded guest, allowing a pending result to represent the next queued message.
- A single active receive cycle per current guest context is sufficient because bridge messages are consumed serially.
- No new user setting, visible command, persisted data, or migration is required.
- Specification 017 remains the historical record for plugin review remediation and is not revised by this follow-up feature.
