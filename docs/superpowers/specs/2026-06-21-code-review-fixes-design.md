# Code Review Fixes Design

## Goal

Resolve the eight implementation defects found in the full source review without
changing the plugin's intended user-facing workflow.

## Architecture

Server ownership is represented by a persisted record containing the spawned
PID, port, server kind, and the authentication token used for that process.
Records are removed only after the child process exits or reconciliation proves
that the process is already gone. A process merely occupying the configured port
is never terminated unless its persisted record, PID-to-port relationship, and
stored token all identify it as a server spawned by this plugin.

`ServerManager` remains the lifecycle owner. It updates in-memory readiness when
a child exits, terminates timed-out children, and invalidates running servers
when process-affecting settings change. Run-mode notebook paths are resolved
through a dedicated Vault-boundary helper before spawning.

URL query values are read exactly once through `URLSearchParams`; callers do not
apply a second `decodeURIComponent`.

## Data Model

`SpawnedServerRecord` contains:

- `pid`: positive integer process identifier.
- `port`: integer from 1 through 65535.
- `kind`: `edit` or `run`.
- `token`: non-empty token passed to `marimo --token-password`.

Legacy records without a token are treated as unconfirmable and discarded
without terminating any process.

## Lifecycle Rules

1. Add a record immediately after spawn returns a PID.
2. Attach an idempotent exit/close finalizer to every spawned process.
3. On a stop request, signal the process but retain its record.
4. On confirmed process exit, remove the record and clear matching managed state.
5. On startup reconciliation, confirm PID liveness, PID ownership of the port,
   and authentication with the record's stored token.
6. After signaling a confirmed orphan, wait for bounded exit confirmation.
   Retain the record if the process remains alive so a later launch can retry.
7. Never kill an incompatible process discovered only through a health check.

## Path Validation

Run-mode notebook input must:

- be a relative path;
- resolve to an existing regular file;
- have a `.py` extension;
- remain inside the Vault after resolving symbolic links.

The validated absolute path is passed to `marimo run`; a normalized
Vault-relative key is used for server deduplication.

## Settings

`invalidateAvailability()` compares process-affecting settings with the snapshot
used by currently managed servers. Changes to executable paths, host, port, or
API token stop managed servers and reset relevant cached state. Embed-only and UI
settings do not restart servers.

## Testing

Use Node's built-in test runner. Tests are bundled with esbuild so the Obsidian
runtime import can be replaced with a minimal test stub. Regression coverage
includes:

- stored-token record validation and reconciliation;
- refusal to terminate an unowned port occupant;
- retained records until exit;
- managed-state reset after child exit;
- edit-server cleanup after startup timeout;
- process restart after process-affecting settings change;
- Vault-bound run notebook validation;
- percent-containing file names in URL query parameters.

