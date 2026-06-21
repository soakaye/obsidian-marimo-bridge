# Phase 1 Data Model: Run-Server Lifecycle and Consistency Remediation

This feature adds no new persisted schema. Run-server, embedded-page, and
port-resolution state is session-local. Existing process ownership records
remain persisted, while the obsolete persisted host setting is discarded.

## Entity: CanonicalNotebook

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Normalized Vault-relative identity used by maps and reference counts. |
| `absolutePath` | string | Real absolute path passed to the run server. |

### Validation rules

- The request is relative.
- The real target exists and is a regular file.
- The real target remains inside the real Vault directory.
- The file extension is `.py`, compared case-insensitively.

## Entity: RunServerState

| Field | Type | Description |
|-------|------|-------------|
| `notebookKey` | string | Canonical notebook identity. |
| `port` | integer | Selected loopback port. |
| `process` | managed process or null | Self-started process; run servers are normally self-started. |
| `ready` | boolean | Whether the server passed its readiness check. |
| `references` | non-negative integer | Number of active embed leases. |

### Invariants

- At most one tracked run server exists for a canonical notebook key.
- `references > 0` for every ready server retained solely for embed use.
- A failed startup creates no reference.
- A zero-reference server is removed from active tracking and termination is
  requested.

## Entity: StartupRequest

| Field | Type | Description |
|-------|------|-------------|
| `notebookKey` | string | Canonical notebook being started. |
| `promise` | asynchronous result | Shared result awaited by concurrent acquisitions. |

### Invariants

- At most one startup request exists per canonical notebook.
- The request is removed when startup resolves or rejects.
- The request does not own a usage reference.

## Entity: RunServerAlias

| Field | Type | Description |
|-------|------|-------------|
| `requestedPath` | string | Original path supplied by an embed acquisition. |
| `notebookKey` | string | Canonical notebook identity resolved while the file existed. |

Aliases allow release to find the correct reference count after the notebook has
been renamed or deleted. All aliases for a notebook are removed when its final
reference is released or during plugin-wide cleanup.

## Entity: EmbedLease

| Field | Type | Description |
|-------|------|-------------|
| `notebookKey` | string | Notebook requested by the render child. |
| `disposed` | boolean | Whether Obsidian has unloaded the child. |
| `acquired` | boolean | Whether this child currently owns one usage reference. |

### State transitions

```text
[Created]
    │ onload
    ▼
[Acquiring] ── failure ─────────────► [Inactive]
    │ success while active
    ▼
[Acquired] ── onunload/release ─────► [Released]
    │
    └─ success after prior disposal ─► immediate release ─► [Released]
```

`acquired` may transition from false to true at most once, and a true value must
produce exactly one release.

## Entity: EmbedRecoveryState

| Field | Type | Description |
|-------|------|-------------|
| `ready` | boolean | Whether the embedded page reported readiness. |
| `retryCount` | integer from 0 through 3 | Number of recovery reloads requested. |
| `attached` | boolean | Whether the embedded page still belongs to a live view or embed. |
| `failureShown` | boolean | Whether terminal recovery guidance has been rendered. |

### State transitions

```text
[Attached, waiting]
    ├─ readiness ─────────────────────────────► [Ready]
    ├─ failure/timeout and retryCount < 3 ───► [Retrying]
    │                                            │
    │                                            └─ back to [Attached, waiting]
    ├─ failure/timeout and retryCount = 3 ────► [Guidance shown]
    └─ detached ──────────────────────────────► [Inactive]
```

- `retryCount` never exceeds three.
- `failureShown` transitions to true at most once.
- No reload or guidance action occurs after `attached` becomes false.

## Entity: NotebookNamingSearch

| Field | Type | Description |
|-------|------|-------------|
| `folder` | Vault-relative path | Destination folder selected by the user. |
| `candidateIndex` | integer from 0 through 999 | Current generated-name position. |
| `candidatePath` | Vault-relative path | Candidate checked for a collision. |
| `result` | available path or exhausted | Outcome of the bounded search. |

### Invariants

- At most 1,000 candidates are examined.
- Existing files are never modified.
- The first available candidate is selected.
- Exhaustion creates no file and produces one notice.

## Entity: ServerBindingPolicy

| Field | Type | Description |
|-------|------|-------------|
| `host` | fixed value `127.0.0.1` | Address used by every edit/run URL, request, probe, and process. |
| `port` | user-selected integer | Edit port or allocated run port. |
| `token` | non-empty active token | Required by spawned servers and embedded requests. |
| `headless` | fixed true | Prevents server startup from opening an external browser. |

### Invariants

- Host is not represented in active user settings.
- Legacy persisted host values do not affect runtime behavior.
- Spawn arguments, probes, and generated URLs use the same fixed host.
- Embedded server URLs carry the active token.

## Entity: EditPortResolution

| Field | Type | Description |
|-------|------|-------------|
| `port` | integer | Configured edit-server port. |
| `classification` | free, compatible, replaceable, or unreleasable | Result of listener inspection. |
| `listeningPids` | set of process identifiers | Processes currently listening on the port. |
| `outcome` | spawn, adopt, replace-and-spawn, or abort | Startup decision. |

### Decision table

| Classification | Outcome |
|----------------|---------|
| free | Spawn after executable availability is confirmed. |
| compatible | Adopt without spawning. |
| replaceable | Request listener termination, confirm the port is free, then spawn. |
| unreleasable | Notify and abort without spawning. |

## Entity: OperationalValuePolicy

| Field | Type | Description |
|-------|------|-------------|
| `boundary` | source file | Approved central runtime-value location. |
| `literalKind` | string, template fragment, or non-zero number | Runtime syntax category being checked. |
| `sourceLocation` | file, line, and column | Location reported for a violation. |
| `excludedContext` | type, module, or property-name position | Compile-time/readability contexts not treated as runtime values. |

### Invariants

- Runtime violations outside the boundary fail automated validation.
- Violation reports identify the source location.
- Empty strings and numeric zero follow the existing policy exclusions.
