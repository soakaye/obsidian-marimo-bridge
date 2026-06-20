# Implementation Plan: Terminate Self-Spawned marimo Servers on Obsidian Exit

**Branch**: `013-terminate-marimo-on-exit` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-terminate-marimo-on-exit/spec.md`

## Summary

Guarantee that every marimo server the plugin *spawns* (the always-on edit server and each lazily-started run server) is terminated when Obsidian exits or the plugin unloads, while never touching servers the plugin merely *adopted*. Because Obsidian's `onunload` is not reliably invoked on a full application quit and Unix servers are spawned `detached` (their own process group, so they survive a parent exit), reliable cleanup cannot depend on the in-session teardown alone. The approach adds a **persisted process-record store** (PID + port + kind, written synchronously at spawn time and removed on clean termination) plus a **best-effort synchronous kill on `window` unload** and a **next-launch reconciliation** that terminates only positively-confirmed leftovers (live PID AND a marimo server that accepts the active token). This realizes Constitution Principle III and the clarified FR-007/FR-007a/FR-009.

## Technical Context

**Language/Version**: TypeScript (compiled via esbuild; `tsc --noEmit` type-check), targeting the Electron renderer bundled by Obsidian Desktop.

**Primary Dependencies**: Obsidian API; Node.js `child_process`, `fs`, `path`, `http`, `crypto` (kept in the esbuild `external` list); Electron `<webview>`. No new third-party dependencies.

**Storage**: A dedicated JSON file in the plugin directory (e.g. `<vault>/.obsidian/plugins/marimo-bridge/<records file>`), written synchronously with `fs`. Kept **separate** from Obsidian's `data.json` so `saveData(settings)` cannot clobber it and so writes survive a crash without an async flush.

**Testing**: No automated test framework exists in the repo (scripts: `dev`, `build`, `lint` only). Validation is `npm run build` (tsc type-check) + `npm run lint` + the manual scenarios in [quickstart.md](./quickstart.md).

**Target Platform**: Obsidian Desktop on Windows and Unix-like systems (macOS/Linux). Mobile is out of scope (Principle II).

**Project Type**: Single-project desktop Obsidian plugin (`src/*.ts`).

**Performance Goals**: Cleanup is not on any hot path. Next-launch reconciliation must add negligible startup latency (target: complete within a few seconds, bounded by a short per-record confirmation timeout).

**Constraints**: Exit-time work must be effectively synchronous — `beforeunload`/`unload` handlers cannot await async I/O reliably. Identity confirmation must avoid false-positive kills (PID reuse, port reassignment).

**Scale/Scope**: Small. One edit server + a handful of run servers per session; the record store holds at most a few entries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Language Division | PASS | All artifacts (spec/plan/research/data-model/contracts/quickstart) and code/commits in English; chat in Japanese. |
| II. Desktop-Only Architecture | PASS | Uses Node `child_process`/`fs`; no mobile code paths added. |
| III. Reliable Process Lifecycle Management | PASS (directly advances) | This feature *implements* the principle: terminate all spawned servers on unload/exit; Windows recursive tree kill (`taskkill /T /F`); Unix process-group termination on detached spawns; adds persisted-record + next-launch reconciliation as the crash-safety net. |
| IV. Safe Local Bindings | PASS | No change to binding/token behavior. Identity confirmation **reuses** the existing token-acceptance check; adopted (non-spawned) servers are never killed. |
| V. Virtual Environment Preference | PASS | Interpreter resolution unchanged. |
| VI. Constant Externalization | PASS (gated in tasks) | All new string/number literals (records file name, existence-probe signal, confirmation timeout, etc.) MUST be added to `src/constants.ts`, not hardcoded. |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/013-terminate-marimo-on-exit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── server-records.md  # Persisted record store + reconciliation contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── constants.ts        # ADD: records file name, SIGNAL existence probe (0),
│                       #      reconcile confirmation timeout, log/notice text
├── server-manager.ts   # CHANGE: record on spawn / unrecord on clean kill;
│                       #         add reconcileOrphans() for next-launch cleanup;
│                       #         add synchronous stopAllSync() for exit handler
├── main.ts             # CHANGE: call reconcileOrphans() during onload();
│                       #         register window 'unload'/'beforeunload' → stopAllSync();
│                       #         keep onunload() → stopAll()
└── server-records.ts   # NEW (optional): tiny module owning the persisted
                        #      record store (load/add/remove/list, sync fs I/O)
```

**Structure Decision**: Single-project plugin layout is unchanged. The record store is introduced either as a small new module `src/server-records.ts` or as private methods on `ServerManager`; the plan favors a thin dedicated module for testability and to keep `ServerManager` focused on process lifecycle. All literals land in `src/constants.ts` per Principle VI.

## Complexity Tracking

> No Constitution violations — section intentionally empty.
