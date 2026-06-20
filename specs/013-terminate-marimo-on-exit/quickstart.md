# Quickstart / Validation Guide: Terminate Self-Spawned marimo Servers on Obsidian Exit

Manual validation scenarios that prove the feature end-to-end. There is no automated test framework in this repo; these are the acceptance checks.

## Prerequisites

- Obsidian Desktop with a local (FileSystem) vault.
- marimo installed and resolvable by the plugin (vault `.venv` or configured path).
- Build the plugin and load it: `npm install` then `npm run build` (or `npm run dev` for watch). Enable the plugin in Obsidian.

## Build / static checks

```bash
npm run build   # tsc --noEmit type-check + esbuild bundle
npm run lint    # eslint (incl. obsidianmd rules)
```

Both MUST pass with no new errors.

## Helper: list marimo processes / ports

- macOS/Linux: `pgrep -fl marimo` and `lsof -iTCP -sTCP:LISTEN -P | grep -i marimo`
- Windows: `tasklist | findstr /i marimo` and `netstat -ano | findstr LISTENING`

## Scenario 1 — Normal quit leaves no orphans (FR-001, SC-001, SC-002)

1. Open a `.py` notebook in the marimo editor (starts the edit server) and open a read-only `mode: run` embed (starts a run server).
2. Confirm two marimo processes / listening ports exist (helper above).
3. Quit Obsidian normally.
4. **Expected**: within a few seconds, **zero** marimo processes remain and both ports are free.

## Scenario 2 — Plugin disable/reload kills spawned servers (FR-002)

1. With servers running (Scenario 1, steps 1–2), disable the plugin (or toggle it off/on).
2. **Expected**: all plugin-spawned marimo processes are terminated on disable.

## Scenario 3 — Force-quit + relaunch reconciliation (FR-007/FR-007a, SC-004)

1. With servers running, **force-quit** Obsidian (kill the app, simulating a crash) so the in-session teardown does not complete.
2. Confirm one or more marimo processes are still running (orphans) and that the records file in the plugin dir lists them.
3. Relaunch Obsidian with the plugin enabled.
4. **Expected**: during startup the plugin terminates the confirmed orphans; afterward **zero** of those orphans remain and the records file is empty/pruned.

## Scenario 4 — Adopted server survives (FR-005, SC-003)

1. Before opening Obsidian, manually start a marimo edit server on the configured port with the plugin's active token (so the plugin will *adopt* rather than spawn).
2. Open Obsidian, use a notebook (plugin adopts the existing server), then quit Obsidian.
3. **Expected**: the manually-started server is **still running** after quit (never recorded, never killed).

## Scenario 5 — Mid-startup server is terminated (FR-006)

1. Trigger a server start and immediately disable the plugin / quit while it is still becoming ready (before the "server ready" notice).
2. **Expected**: the in-flight process is terminated; no orphan remains (verify next launch is clean).

## Scenario 6 — No servers, clean exit (FR-008)

1. Open Obsidian without opening any marimo notebook/embed, then quit.
2. **Expected**: no errors in the console; nothing to terminate; records file absent or empty.

## Scenario 7 — No accumulation across cycles (SC-005)

1. Repeat Scenario 1 (open → quit) five times.
2. **Expected**: the count of lingering marimo processes stays at 0 across all cycles (no growth).

## Scenario 8 — Conservative safety (FR-009)

1. After a force-quit leaves a record, free the orphan but start an **unrelated** process on the same port (or let the OS reuse the PID) before relaunch.
2. **Expected**: reconciliation does **not** kill the unrelated process — it only terminates a process that is both live by recorded PID and presents a token-accepting marimo server on the recorded port; otherwise it prunes the record and leaves the process alone.

## References

- Persistence + reconciliation contract: [contracts/server-records.md](./contracts/server-records.md)
- Record schema: [data-model.md](./data-model.md)
- Decisions/rationale: [research.md](./research.md)
