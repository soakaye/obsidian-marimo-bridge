# Contract: Lifecycle, Recovery, and Local-Server Behavior

The plugin exposes no public network API for this feature. The relevant contract
is the internal behavior boundary among markdown render children, embedded
pages, notebook creation, settings, and `ServerManager`.

## 1. Acquire

```text
ensureRunServer(vaultRelativePath) -> URL | null
```

The operation MUST:

1. Validate and canonicalize the requested notebook.
2. Return `null` without side effects when validation fails.
3. Reuse a ready server for the canonical notebook, or await the single shared
   startup request for that notebook.
4. Increment the canonical notebook's reference count once for this caller after
   a healthy server is available.
5. Return a token-bearing URL for the selected run server.
6. Leave no reference when startup fails.

## 2. Release

```text
releaseRunServer(vaultRelativePath) -> void
```

The operation MUST:

1. Resolve the same canonical notebook key used during acquisition, or use the
   retained acquisition alias when the notebook no longer exists at its original
   path.
2. Release at most one reference.
3. Keep the server running when the remaining count is greater than zero.
4. Remove the server and reference entry, then request process termination, when
   the remaining count reaches zero.
5. Complete safely when the path is invalid, the server is absent, or the count
   is already zero.

## 3. Concurrent startup

For N concurrent valid acquisitions of one notebook:

- exactly one startup operation runs;
- every successful caller receives the same server endpoint;
- the final reference count is N, not one;
- N releases are required before termination.

## 4. Render-child ownership

A run-mode render child MUST:

- release only after a successful acquisition;
- release exactly once;
- avoid attaching a webview after it has been disposed;
- immediately release if acquisition completes after disposal.

An edit-mode render child MUST NOT call either run-server lifecycle operation.

## 5. Global cleanup

Plugin unload and application-exit cleanup remain authoritative:

- every self-started run server is signalled regardless of reference count;
- run-server maps, startup maps, and reference maps are cleared;
- persisted ownership records follow the existing confirmed-exit contract.

## 6. Embedded-page recovery

An attached embedded page MUST:

1. Stop recovery when readiness is reported.
2. Retry no more than three times when readiness is absent or the main frame
   fails.
3. Perform no recovery action after it is detached.
4. Remove the unusable page and show shared recovery guidance exactly once after
   retries are exhausted.

## 7. Untitled notebook naming

Notebook creation MUST:

1. Examine generated candidates in deterministic order.
2. Create the first candidate that does not already exist.
3. Examine no more than 1,000 candidates.
4. Modify no file and show one notice when the search is exhausted.

## 8. Server binding and edit-port resolution

Every edit and run server operation MUST:

- use `127.0.0.1` for process arguments, URLs, requests, and port probes;
- omit host from active settings and ignore legacy persisted host values;
- start spawned servers headlessly with the active token;
- include the active token in embedded server URLs.

For an occupied edit port:

| Listener state | Required behavior |
|----------------|-------------------|
| Accepts the active token and enforces authentication | Adopt without spawning. |
| Incompatible or foreign and can be released | Terminate listening PIDs, confirm release, then spawn a replacement. |
| Cannot be released | Notify and stop without spawning. |

## 9. Runtime-value policy

Automated validation MUST reject runtime strings, template fragments, and
non-zero numeric literals outside the approved constants boundary. Reports MUST
include file and location. Compile-time type/module/property-name literals remain
excluded from this runtime policy.

## 10. Requirement traceability

| Requirement | Contract section |
|-------------|------------------|
| FR-001–FR-003 | §1 validation and canonicalization |
| FR-004–FR-006 | §1 and §3 |
| FR-007–FR-010 | §2 and §4 |
| FR-011 | Existing port-allocation contract retained by §1 |
| FR-012 | §5 |
| FR-013 | §4 |
| FR-014–FR-016 | §6 |
| FR-017–FR-018 | §7 |
| FR-019–FR-024 | §8 |
| FR-025 | §9 |
