# Implementation Plan: Fix blank marimo view after Obsidian restart

**Branch**: `012-fix-restart-blank-view` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-fix-restart-blank-view/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

After an Obsidian restart, a restored marimo tab renders blank: the embedded Electron `<webview>` attaches with the correct `src` and a visible size, but its guest page never finishes loading — `dom-ready` never fires, `executeJavaScript` against the guest hangs indefinitely, and nothing retries. A manual `webview.reload()` reliably recovers it.

Technical approach (already implemented in the working tree):

1. **Webview readiness watchdog** (`src/editor-view.ts`): track a `domReady` flag (set by the existing `dom-ready` listener); after the webview is appended, schedule a watchdog timer (`WEBVIEW_LOAD_WATCHDOG_MS`). If the guest has not signalled readiness when it fires, call `(el).reload()` and reschedule, capped at `WEBVIEW_MAX_LOAD_RETRIES`. A `did-fail-load` listener triggers the same recovery for real failures while ignoring benign aborted loads (`errorCode === ERR_LOAD_ABORTED` / `-3`, produced by the normal access-token redirect) and sub-frame failures.
2. **Token-aware server adoption** (`src/server-manager.ts`): replace the "reuse if `/health` returns 200" rule with `serverAcceptsOurAuth(port)`. Because marimo 303-redirects even a correctly-tokened root request, the check inspects the redirect target via `redirectsToLogin(port, token|null)` using Node `http` directly (Obsidian's `requestUrl` follows redirects and would mask the signal). A server is "ours" iff a no-token request is redirected to `/auth/login` (auth is enforced, i.e. started with `--token-password` as we do) AND a request carrying our token is **not** redirected to `/auth/login`. Incompatible leftovers are evicted with `killPort(port)` (find PIDs via `lsof` on Unix / `netstat` on Windows, then kill) and a fresh server is spawned.
3. **Duplicate-spawn prevention** (`src/server-manager.ts`): the existing `editSpawning` promise guard plus a `healthOk` recheck inside `ensureEditServer` ensures the auto-start trigger and the view-restore trigger cannot both bind the port (`address already in use`).
4. **Constants** (`src/constants.ts`): externalize all new literals (`EVENT_DID_FAIL_LOAD`, `WEBVIEW_LOAD_WATCHDOG_MS`, `WEBVIEW_MAX_LOAD_RETRIES`, `ERR_LOAD_ABORTED`, `PATH_AUTH_LOGIN`) per Constitution Principle VI.

## Technical Context

**Language/Version**: TypeScript (compiled with `tsc` type-check + esbuild bundle to `main.js`); targets the Obsidian/Electron renderer runtime.

**Primary Dependencies**: Obsidian Plugin API; Electron `<webview>` tag; Node `http`, `child_process`, `fs`, `path`, `crypto` (kept in esbuild `external`). No new third-party dependency is introduced.

**Storage**: N/A (plugin settings persist via Obsidian `loadData`/`saveData`; no change here).

**Testing**: Automated regression coverage runs through `npm test`, including capped webview failure rendering and edit-port conflict handling. Manual restart validation remains documented in `quickstart.md`, with `npm run build` and `npm run lint` as static gates.

**Target Platform**: Obsidian Desktop (macOS/Windows/Linux); desktop-only by Constitution Principle II.

**Project Type**: Desktop application plugin (single TypeScript project under `src/`).

**Performance Goals**: Restored marimo tab visibly renders within ~5s of workspace restore; watchdog interval is a few seconds so recovery is near-imperceptible.

**Constraints**: Electron strips `<webview>` preload and forces sandbox/no-node-integration, so the guest can only be controlled via `executeJavaScript` and observed via `console-message` (see existing `INJECTION_SCRIPT`). Recovery must therefore be driven from host-side webview events (`dom-ready`, `did-fail-load`) and `reload()`. Bind strictly to the fixed `127.0.0.1` host.

**Scale/Scope**: Localized change across 3 existing source files; no new modules, no schema changes, no UI surface added.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Language Division**: PASS — all spec/plan/code/commit artifacts in English; user-facing chat in Japanese.
- **II. Desktop-Only Architecture**: PASS — uses Electron `<webview>` and Node `http`/`child_process`; no mobile code paths added.
- **III. Reliable Process Lifecycle Management**: PASS / strengthened — `killPort` recursively removes leftover server processes (Windows `taskkill /T`, Unix kill); existing unload teardown unchanged.
- **IV. Safe Local Bindings**: PASS — as of constitution v2.0.0, servers MUST run headless with token validation (`--token-password`) bound to `127.0.0.1`, and the plugin must only reuse a server that accepts the active token. This feature's token-aware adoption (`serverAcceptsOurAuth`) and eviction of token-mismatched servers directly implement that rule. (Earlier the constitution said "without token validation"; that wording was amended in v2.0.0.)
- **V. Virtual Environment Preference**: PASS — server resolution/`resolveCommand` unchanged.
- **VI. Constant Externalization**: PASS — every new string/number literal is defined in `src/constants.ts`.

No unjustified violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/012-fix-restart-blank-view/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── webview-recovery.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── editor-view.ts       # createMarimoWebview: dom-ready watchdog + did-fail-load recovery
├── server-manager.ts    # ensureEditServer adoption: serverAcceptsOurAuth, redirectsToLogin, killPort
├── constants.ts         # new event/timing/error constants
├── main.ts              # (unchanged) plugin entry, auto-start trigger
├── settings.ts          # (unchanged)
└── embed-processor.ts   # (unchanged)

main.js                  # esbuild bundle (build output)
```

**Structure Decision**: Single-project Obsidian plugin. The change is confined to the three existing files above; no new directories or modules are added. Recovery logic lives with the webview that owns the failure (`editor-view.ts`); server adoption logic lives with the process owner (`server-manager.ts`); all literals are externalized to `constants.ts`.

## Complexity Tracking

> No constitution violations require justification. Section intentionally left empty.
