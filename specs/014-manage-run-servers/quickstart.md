# Quickstart Validation: Manage Run-Mode Server Lifecycles

## Prerequisites

- Obsidian Desktop with the plugin enabled.
- A valid marimo installation.
- Two Python notebooks inside the Vault.
- Development dependencies installed with `npm install`.

## Automated gates

Run from the plugin root:

```bash
npm test
npm run build
npm run lint
git diff --check
```

Expected: every command exits with status 0.

## Scenario 1 - Concurrent matching embeds share one server

1. Add two `mode: run` embeds for the same notebook to one note.
2. Open the note in a mode that renders both embeds at nearly the same time.
3. Confirm both embeds load.
4. Inspect the plugin's managed processes or logs.

Expected: exactly one run server starts for the notebook, and the internal usage
count represents both embeds.

## Scenario 2 - Release one of two references

1. Begin with two active run-mode embeds sharing one notebook server.
2. Remove or unload one embed while leaving the other rendered.

Expected: the remaining embed continues to work and the run server remains alive
with one reference.

## Scenario 3 - Release the final reference

1. Continue from Scenario 2.
2. Remove or unload the final embed.

Expected: the notebook's run server is terminated, its port becomes available,
and no active reference remains.

## Scenario 4 - Equivalent notebook paths

1. Reference one notebook through two equivalent Vault-relative paths containing
   redundant path segments.
2. Render both in run mode.

Expected: both paths resolve to one canonical notebook and share one server.

## Scenario 5 - Unsafe paths

Try each of the following in a run-mode embed:

- an absolute path;
- `../` traversal outside the Vault;
- a symlink inside the Vault whose target is outside;
- a missing file;
- an existing non-Python file.

Expected: no run server starts for any request, and the embed shows the existing
run-server failure state.

## Scenario 6 - Embed unload during startup

1. Configure a slow startup or temporarily delay the readiness response.
2. Render a run-mode embed.
3. Unload the note before startup completes.

Expected: no webview is attached after unload. If the shared startup completes,
the late acquisition is immediately released and no idle server remains.

## Scenario 7 - Occupied candidate port

1. Bind another process to the first candidate run-server port.
2. Render a valid run-mode embed.

Expected: the plugin skips the occupied port, selects another free loopback port,
and leaves the unrelated process untouched.

## Scenario 8 - Plugin unload overrides references

1. Keep multiple run-mode embeds active.
2. Disable or reload the plugin.

Expected: all self-started run servers are signalled and all session-local
reference state is cleared.

## Scenario 9 - Notebook removed before embed unload

1. Render a valid run-mode embed and wait for it to load.
2. Delete or rename the notebook file.
3. Unload the embed.

Expected: the retained acquisition identity releases the final reference and the
run server terminates even though the original path no longer resolves.
