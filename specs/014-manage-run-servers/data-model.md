# Phase 1 Data Model: Manage Run-Mode Server Lifecycles

This feature uses session-local lifecycle state. It adds no new persisted schema.

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
