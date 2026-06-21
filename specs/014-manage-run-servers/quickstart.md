# Quickstart Validation: Run-Server Lifecycle and Consistency Remediation

## Validation status

- Automated gates and Node-based lifecycle scenarios: completed on 2026-06-21.
- Obsidian Desktop safe scenarios: completed on 2026-06-21 with the `obsidian`
  CLI. The checks confirmed:
  - the Host setting is absent and the edit webview uses `127.0.0.1`;
  - equivalent concurrent acquisitions share one run server and release at the
    final reference;
  - ten repeated acquire/release cycles leave zero servers, references, and
    aliases after every cycle;
  - deleting a notebook after acquisition still releases the retained server;
  - plugin reload and normal application restart clear managed state and leave
    no listener on the previously assigned run-server port;
  - Obsidian reports no plugin errors after reload or restart.
- Forced-quit reconciliation in Scenario 17: completed on 2026-06-21 with
  explicit user approval. Before relaunch, the force-quit left the recorded edit
  server and run server listening on ports 2718 and 2719. On relaunch, the
  recorded run server was terminated, port 2719 was released, and the edit
  server was replaced by a new process with a new ownership token. The
  run-server, reference, and alias maps were empty, and Obsidian reported no
  plugin errors.
- Scenarios that intentionally induce startup failures, occupied ports, or
  recovery exhaustion are covered by the Node regression suite to avoid
  disrupting unrelated desktop processes. Together with the recorded desktop
  checks above, all release validation scenarios are complete.

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

The automated suite covers the fixed host setting, bounded naming, bounded
webview recovery, Vault path validation, run-server acquisition/release,
edit-port conflict behavior, process records, and runtime-value policy. The
remaining scenarios exercise Electron and operating-system behavior in Obsidian.

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

## Scenario 10 - Ten repeated open/close cycles

1. Render one valid run-mode embed and wait for it to load.
2. Unload it and confirm the run server exits.
3. Repeat the sequence ten times.

Expected: after every cycle there are zero run servers for the notebook and no
growth in lingering marimo processes.

## Scenario 11 - Exhausted embedded-page recovery

1. Make the marimo page unavailable or otherwise prevent `dom-ready`.
2. Open a full view or embed and wait through the recovery attempts.

Expected: no more than three reloads occur. The unusable embedded page is removed
and the shared recovery guidance appears once instead of a persistent blank
pane.

## Scenario 12 - Fixed host and token-bearing startup

1. If an older `data.json` contains a `host` value such as `0.0.0.0`, reload the
   plugin.
2. Confirm no Host setting appears.
3. Start an edit server and a run-mode embed.
4. Inspect their listening addresses, process arguments, and embedded URLs.

Expected: both servers listen only on `127.0.0.1`, start headlessly with token
validation, and embedded URLs carry the active token. The legacy host has no
effect.

## Scenario 13 - Compatible edit-port listener

1. Start a token-authenticated marimo edit server on the configured port using
   the plugin's active token.
2. Enable or reload the plugin.

Expected: the compatible server is adopted and no duplicate process starts.

## Scenario 14 - Replaceable edit-port listener

1. Start an incompatible marimo server or another process on the configured edit
   port.
2. Enable or reload the plugin.

Expected: the listener is terminated, the port becomes free, and one compatible
replacement starts on `127.0.0.1`.

## Scenario 15 - Unreleasable edit port

1. Arrange for a listener on the configured edit port to survive the plugin's
   termination request.
2. Enable or reload the plugin.

Expected: the plugin reports the conflict and starts no additional edit server.

## Scenario 16 - Notebook-name exhaustion

Run the automated naming test:

```bash
npm test
```

Expected: after 1,000 occupied generated candidates, zero files are created or
modified and one explanatory notice is observed.

## Scenario 17 - Full application exit and reconciliation

1. Open an edit view and at least one run-mode embed.
2. Quit Obsidian completely and confirm the plugin-started processes exit.
3. Repeat with a forced quit, then relaunch Obsidian.

Expected: normal exit leaves no plugin-started server. A positively identified
leftover from the forced quit is reconciled on the next launch without
terminating an unrelated process.
