# Phase 0 Research: Terminate Self-Spawned marimo Servers on Obsidian Exit

All open technical unknowns from the plan's Technical Context are resolved below.

## R1. Is `onunload` reliable for terminating servers on Obsidian app quit?

- **Decision**: Treat `onunload` as reliable **only** for plugin disable/reload, NOT for full application quit. Add a `window` `unload`/`beforeunload` listener (registered so it is torn down on unload) for best-effort exit cleanup, and make the persisted-record + next-launch reconciliation the actual guarantee.
- **Rationale**: On a full Obsidian quit the renderer/window is torn down without per-plugin `onunload` being dependably awaited. Even when an exit handler runs, Unix servers are spawned with `detached: true` (their own process group), so they are not children that die with the parent — they must be explicitly signalled. Therefore exit-time killing is inherently best-effort and a crash/force-quit can always leave orphans. The only robust mechanism is to persist what we spawned and reconcile on next launch (FR-007/FR-007a).
- **Alternatives considered**:
  - *Rely on `onunload` alone* — rejected: not invoked reliably on app quit; current behavior and the bug this feature fixes.
  - *Spawn non-detached on Unix so children die with parent* — rejected: contradicts Principle III (detached + process-group kill is the chosen Unix strategy) and still does not survive force-quit/crash.

## R2. Can exit-time cleanup do async work (await health checks, `exec` taskkill)?

- **Decision**: Exit handler must be **synchronous and best-effort**: use `process.kill(-pid, 'SIGTERM')` (Unix process group) and, on Windows, a synchronous `taskkill /PID <pid> /T /F` (`execSync`/`spawnSync`). Do not await health/token checks at exit. Anything not killed in time is caught by next-launch reconciliation.
- **Rationale**: `beforeunload`/`unload` handlers cannot reliably await Promises or async `exec` callbacks before the process exits. Synchronous signalling maximizes what gets killed in the small window; the reconciliation pass removes the need for exit-time perfection.
- **Alternatives considered**: *Async teardown with a delay* — rejected: not honored during quit; risks hanging shutdown.

## R3. How to confirm a leftover process is "the plugin's own marimo server" before killing (FR-007a/FR-009)?

- **Decision**: Two-gate positive confirmation:
  1. **Liveness**: `process.kill(pid, 0)` (signal `0` probes existence without terminating) returns without `ESRCH`.
  2. **Identity**: the recorded PID owns the recorded listening port and that server accepts the token persisted for the spawned process — reuse `serverAcceptsOurAuth(port, token)` (`/auth/login` redirect probes). Only if all gates pass is termination requested. Otherwise the record is dropped and the process left running.
- **Rationale**: PIDs can be recycled by the OS after a crash, and ports can be reassigned. Requiring both a live PID and a token-accepting marimo server on the recorded port makes a false-positive kill of an unrelated process extremely unlikely, satisfying the conservative posture chosen in clarification.
- **Alternatives considered**:
  - *Kill by recorded PID alone* — rejected: PID reuse → could kill an unrelated process (violates FR-009).
  - *Kill whatever occupies the recorded port* — rejected: port reassignment → same risk; this is the "aggressive" option the user declined.
  - *Match process command line* — rejected: brittle, platform-specific, and weaker than a live token handshake.

## R4. Where and how to persist the process records (must survive a crash, not clobber settings)?

- **Decision**: A dedicated JSON file in the plugin directory (resolved via `FileSystemAdapter.getBasePath()` + the plugin's config-relative dir, or `manifest.dir`), written **synchronously** with `fs.writeFileSync` on each spawn and confirmed process exit. Kept separate from `data.json`.
- **Rationale**: `saveSettings()` does `saveData(this.settings)`, which overwrites the whole `data.json`; storing records there would be clobbered. A separate file written synchronously at spawn time guarantees the record exists before the child can be orphaned, with no async flush to lose on a crash. Desktop-only means `fs` is always available (Principle II).
- **Alternatives considered**:
  - *Add a field to `data.json` and merge on save* — rejected: clobber risk + async writes can be lost on crash.
  - *OS temp dir / lockfile* — rejected: plugin dir is vault-scoped, predictable, and cleaned with the plugin.

## R5. Record staleness / write-time ordering.

- **Decision**: Write the record **immediately after** a successful `spawn` returns a `pid`, before `waitForReady`. Remove the record the moment the process is cleanly killed (`stopAll`, `restartEditServer`, failed `ensureRunServer`). On next-launch reconciliation, after processing, rewrite the store to contain only still-running confirmed entries (effectively pruning stale ones).
- **Rationale**: Ensures a server is never running without a persisted record (the orphan window), and the store self-heals on every launch.

## R6. Testing strategy (no framework in repo).

- **Decision**: Validation = `npm run build` (tsc type-check) + `npm run lint` + manual [quickstart.md](./quickstart.md) scenarios (normal quit, force-quit + relaunch, adopted-server survival, plugin reload). No new test framework introduced.
- **Rationale**: The repo has no test harness and the constitution's dev workflow lists only `dev`/`build`/`lint`. Adding a framework is out of scope for this fix; the behaviors are process/OS-level and best validated manually per quickstart.
- **Alternatives considered**: *Introduce vitest/jest* — deferred: larger change, not required by the feature and not present today.

## R7. Cross-platform termination specifics (Principle III).

- **Decision**: Reuse existing `killProcess` semantics — Windows: `taskkill /PID <pid> /T /F` (recursive tree); Unix: `process.kill(-pid, SIGTERM)` against the detached process group, falling back to `proc.kill()`. For exit-time and reconciliation paths that only have a PID (no `ChildProcess` handle), apply the same platform branch using the PID directly (`process.kill(-pid, ...)` on Unix; synchronous `taskkill` on Windows).
- **Rationale**: Consistent with the constitution and the current in-session behavior; the only new requirement is operating from a bare PID (from the record store) rather than a `ChildProcess` object.
