# Phase 0 Research: Manage Run-Mode Server Lifecycles

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
this feature.

**Rationale**: Constitution principles are non-negotiable. The run-server design
can be completed independently, but implementation cannot be declared compliant
while those project-wide conflicts remain.

**Alternatives considered**:

- Reinterpret or waive the principles inside this plan: rejected because
  governance requires a separate explicit constitution update or remediation.
