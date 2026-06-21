# Phase 0 Research: Run-Server Lifecycle and Consistency Remediation

## R1. Canonical notebook identity

**Decision**: Resolve the Vault and candidate through real paths, require the
candidate to remain inside the Vault, require an existing regular `.py` file, and
use a normalized Vault-relative path as the map key.

**Rationale**: One stable identity is needed for deduplication and reference
counting. Resolving symbolic links before containment checks prevents an embed
from selecting a notebook outside the Vault.

**Alternatives considered**:

- Use the raw embed path as the key: rejected because equivalent paths would
  create duplicate servers.
- Use the unresolved absolute path: rejected because symbolic links can escape
  the Vault.

## R2. Startup serialization and reference ownership

**Decision**: Keep one shared startup promise per canonical notebook, but do not
increment references inside that promise. Every caller increments exactly once
after the shared startup succeeds.

**Rationale**: A startup promise represents process creation, while a reference
represents one consumer. Combining them undercounts concurrent consumers because
all callers await the same promise execution.

**Alternatives considered**:

- Increment once inside the startup promise: rejected because two concurrent
  embeds produce one reference.
- Start one process per embed: rejected because it wastes ports and memory and
  defeats shared lifecycle management.

## R3. Embed disposal during asynchronous startup

**Decision**: Give each render child `disposed` and `acquired` state. If
acquisition completes after disposal, immediately release the acquired reference
and skip webview creation.

**Rationale**: Obsidian may unload rendered markdown while server checks or
startup are still pending. A teardown call that occurs before acquisition cannot
release a reference that does not yet exist; the completion path must compensate.

**Alternatives considered**:

- Ignore the race and rely on plugin unload: rejected because unused servers can
  live for the rest of the session.
- Cancel the child process startup globally: rejected because another concurrent
  embed may still need the shared startup.

## R4. Final-reference termination

**Decision**: Remove the run server and reference entry from active maps when the
count reaches zero, then request termination through the existing cross-platform
process helper.

**Rationale**: Removing tracking first prevents a new acquisition from treating a
server scheduled for termination as healthy. Existing persisted process records
continue to handle confirmation and crash recovery.

**Alternatives considered**:

- Keep idle servers for reuse: rejected because the requested behavior is prompt
  resource release and the expected number of servers after all embeds close is
  zero.
- Terminate on every embed unload: rejected because it breaks remaining embeds
  that share the same server.

## R5. Port allocation

**Decision**: Continue probing candidate ports and skip the edit port, tracked
run ports, and ports that cannot be bound on the fixed loopback host.

**Rationale**: A failed bind consumes the full startup timeout and can create
misleading lifecycle state.

**Alternatives considered**:

- Let the run server report a bind error: retained only as the final fallback
  after the valid port range is exhausted.

## R6. Constitutional prerequisites

**Decision**: Treat the incompatible-port ownership policy conflict and the
constant-externalization drift as blocking prerequisites, not as exceptions in
this feature. Both prerequisites are resolved by the fixed-host/edit-port design
and the syntax-tree policy gate described below.

**Rationale**: Constitution principles are non-negotiable. The run-server design
can be completed independently, but implementation cannot be declared compliant
while those project-wide conflicts remain.

**Alternatives considered**:

- Reinterpret or waive the principles inside this plan: rejected because
  governance requires a separate explicit constitution update or remediation.

## R7. Bounded embedded-page recovery

**Decision**: Retry an attached embedded page at most three times when readiness
does not arrive or the main frame fails. If recovery is exhausted, remove the
unusable page and display one shared guidance message.

**Rationale**: A bounded retry handles Electron attachment races without creating
an endless loop, while terminal guidance prevents an unexplained blank pane.

**Alternatives considered**:

- Leave the blank page in place: rejected because it provides no actionable
  state to the user.
- Retry indefinitely: rejected because a permanent server or configuration
  failure would consume resources forever.

## R8. Bounded untitled-notebook naming

**Decision**: Search at most 1,000 generated notebook names and abort with a
notice when all candidates are occupied.

**Rationale**: The bound guarantees termination while preserving existing files.
One thousand candidates is large enough for normal use and is already the
established project limit.

**Alternatives considered**:

- Search indefinitely: rejected because a corrupted or adversarial adapter could
  keep the operation running forever.
- Overwrite the last candidate: rejected because notebook creation must never
  destroy existing work.

## R9. Fixed loopback binding and settings migration

**Decision**: Remove the host setting, discard legacy persisted host values, and
use `127.0.0.1` for every server URL, request, port probe, and process argument.

**Rationale**: A single non-configurable loopback address satisfies the local-only
security boundary and prevents settings, URLs, probes, and child processes from
disagreeing about the active host.

**Alternatives considered**:

- Keep a validated host text field: rejected because the requirement forbids all
  other addresses and the setting would provide no valid choice.
- Normalize only at process spawn: rejected because URLs and health checks could
  still target a stale configured address.

## R10. Edit-port listener classification

**Decision**: Classify an occupied edit port as compatible, replaceable, or
unreleasable. Adopt only a server that enforces authentication and accepts the
active token. Terminate other listening PIDs and wait for the port to become
free; stop without spawning if release cannot be confirmed.

**Rationale**: This preserves compatible reload behavior, restores the
constitution-required replacement path, and avoids knowingly spawning into an
occupied port.

**Alternatives considered**:

- Always fail on any listener: rejected because it breaks safe adoption after a
  plugin reload.
- Spawn on another edit port: rejected because persisted view URLs and settings
  would diverge and the incompatible listener would remain.

## R11. Syntax-tree enforcement of runtime-value policy

**Decision**: Parse TypeScript source and reject runtime strings, template
fragments, and non-zero numeric literals outside `src/constants.ts`, excluding
compile-time type/module/property-name literals.

**Rationale**: Text search cannot reliably distinguish runtime code from imports,
types, or comments and previously missed interpolated template fragments.

**Alternatives considered**:

- Rely on reviewer discipline: rejected because the prior drift demonstrates
  that the rule is too broad for reliable manual enforcement.
- Use regular expressions: rejected because syntax context is required for
  accurate exclusions.

## R12. Layered validation

**Decision**: Combine focused automated tests, static/build gates, and manual
Obsidian Desktop scenarios. Treat the requirement-to-test matrix in the plan as
the coverage contract and refresh tasks when a required assertion is missing.

**Rationale**: Pure lifecycle and formatting behavior can be tested quickly in
Node, while Electron attachment, real process trees, and full application exit
still require desktop validation.

**Alternatives considered**:

- Manual testing only: rejected because concurrency and boundary regressions are
  difficult to reproduce consistently.
- Unit tests only: rejected because Electron and operating-system exit behavior
  cannot be represented faithfully by the current test doubles.
