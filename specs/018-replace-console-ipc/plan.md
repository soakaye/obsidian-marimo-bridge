# Implementation Plan: Replace Console-Based Webview IPC

**Branch**: `018-replace-console-ipc` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-replace-console-ipc/spec.md`

## Summary

Replace the sentinel-prefixed guest `console.log` control channel with a
Promise-based FIFO bridge evaluated through the existing Electron webview
boundary. The guest queues structured open messages and exposes one pending
`nextMessage()` request; the host installs the bridge after each `dom-ready`,
consumes messages serially, validates them before routing, and invalidates
receive loops when the guest context changes. Ordinary guest console output
remains diagnostic-only.

## Technical Context

**Language/Version**: TypeScript 5.8, targeting ES2021

**Primary Dependencies**: Obsidian API and the Electron `<webview>` runtime
supplied by Obsidian Desktop; no new package dependency

**Storage**: N/A; the queue and receive state are in-memory and scoped to one
guest page context

**Testing**: Node built-in test runner with esbuild-bundled TypeScript tests,
TypeScript type-checking, ESLint flat configuration, and manual Obsidian
Desktop validation

**Target Platform**: Obsidian Desktop, minimum app version 1.5.0

**Project Type**: Single-project desktop plugin

**Performance Goals**: Deliver queued navigation messages without polling;
process at least 20 rapid messages exactly once and in FIFO order; introduce no
observable delay beyond the existing asynchronous webview boundary

**Constraints**: Preserve existing navigation outcomes and ordinary console
diagnostics; use one active receive operation per guest context; reject stale
results after loading, reload, navigation, detachment, or closure; add no
preload, timer-based polling, network transport, port, main-process API, public
plugin API, persistence, or server lifecycle change; keep tabs and externalize
runtime literals in `src/constants.ts`

**Scale/Scope**: Two production files (`src/constants.ts`,
`src/editor-view.ts`), the focused editor-view regression suite, and the
feature documentation; specification 017 remains untouched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Planning response |
|-----------|--------|-------------------|
| I. Language Division | PASS | All feature artifacts, planned code, tests, and commit messages are in English; user communication remains Japanese. |
| II. Desktop-Only Architecture | PASS | The design continues using the existing Electron `<webview>` boundary and introduces no mobile compatibility layer. |
| III. Reliable Process Lifecycle Management | PASS | No process spawning, cleanup, or server-manager behavior changes. |
| IV. Safe Local Bindings | PASS | No listener, port, request, token, binding, or server-adoption behavior changes. |
| V. Virtual Environment Preference | PASS | Python and marimo executable resolution are outside this feature. |
| VI. Constant Externalization | PASS | New event names, bridge message literals, and executable guest scripts are defined in `src/constants.ts`; `src/editor-view.ts` consumes those constants. |

**Gate result**: PASS. The change narrows an existing renderer-to-guest
interaction without broadening privileges or network exposure.

## Project Structure

### Documentation (this feature)

```text
specs/018-replace-console-ipc/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── webview-bridge.md
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── constants.ts          # Guest bridge scripts, event names, and message constants
└── editor-view.ts        # Bridge lifecycle, validation, and existing URL routing

tests/
└── editor-view.test.ts   # Bridge order, routing, validation, lifecycle, and diagnostics
```

**Structure Decision**: Keep the existing single-project layout. The bridge is
private to the editor-view boundary, so no shared runtime module or public type
is added. Keep the injected guest program in `src/constants.ts` to satisfy the
project's runtime-literal policy and keep host lifecycle logic in
`src/editor-view.ts`.

## Phase 0 — Research

See [research.md](./research.md). The technical decisions are:

- Electron webview `executeJavaScript()` resolves with the evaluated result and
  follows a returned Promise, so a pending guest `nextMessage()` can serve as a
  push-style receive operation without polling.
- A guest-local FIFO queue plus one pending resolver is sufficient because the
  host runs exactly one receive loop for the current guest context.
- A main-frame, non-in-place `did-start-navigation` invalidates the prior
  generation before a replacement page becomes ready; `dom-ready` installs a
  new bridge and starts a new generation. Post-await generation and connection
  checks prevent stale routing.
- Bridge installation errors are logged only while the same connected context
  is current. Expected receive rejection during navigation, reload, or teardown
  stops the loop quietly.
- `ipcRenderer.sendToHost()` remains unsuitable because it requires guest
  renderer access normally supplied by preload, and privileged
  `webContents.setWindowOpenHandler()` is outside the plugin renderer boundary.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) defines the open-message shape, FIFO queue,
  guest generation, and receive-cycle states.
- [contracts/webview-bridge.md](./contracts/webview-bridge.md) defines the
  private message and lifecycle contract between the host and current guest.
- [quickstart.md](./quickstart.md) defines automated and manual acceptance
  scenarios.

### Implementation touch points

1. `src/constants.ts`
   - Remove `MARIMO_OPEN_SENTINEL` and the obsolete parse-error log constant.
   - Add the navigation-start event name, the `"open"` message-type constant,
     and a dedicated script expression for awaiting the next bridge message.
   - Rewrite `INJECTION_SCRIPT` to install an idempotent guest bridge containing
     a FIFO array, one pending resolver, `enqueue()`, and `nextMessage()`.
   - Have `window.open` and captured links with non-self targets enqueue
     `{ type: "open", url, disposition }` after resolving the URL.
   - Return a successful installation marker and contain no console transport.

2. `src/editor-view.ts`
   - Change the narrow webview contract to
     `executeJavaScript(script: string): Promise<unknown>`.
   - Add a private `BridgeOpenMessage` shape and bounded type guard requiring
     `type === "open"`, a non-empty string URL, and an absent or string
     disposition.
   - Extract the existing open-request branch into one asynchronous router used
     by both `new-window` events and bridge messages, preserving token
     propagation and all destination decisions.
   - Increment a bridge generation when a non-in-place main-frame navigation
     starts and again when a ready context begins installation. Ignore subframe
     and in-page navigation starts. Await installation before requesting the
     first message.
   - Consume messages serially. After every awaited operation, require the same
     generation and a connected element; ignore malformed values and continue,
     but return on stale context or receive rejection.
   - Log installation rejection only if the same connected context is still
     current. Treat later rejection as expected lifecycle termination.
   - Remove sentinel parsing from `console-message`; retain only existing
     debug/warning/error forwarding.

3. `tests/editor-view.test.ts`
   - Update the fake webview to return controllable Promises and record script
     execution order.
   - Assert installation completes before the first receive expression runs.
   - Cover notebook, workspace-file, and external URL routing through structured
     messages.
   - Feed at least 20 messages and assert exact FIFO, once-only handling.
   - Cover malformed/unknown values followed by a valid value.
   - Resolve an old deferred result after a new load generation and assert it is
     ignored.
   - Assert subframe and in-place navigation starts do not invalidate the
     current receive cycle.
   - Reject a receive during navigation/teardown and allow the test runner to
     prove there is no unhandled rejection or unexpected routing.
   - Assert the injected script contains neither the former sentinel nor
     `console.log`, and retain the existing console severity test with a
     sentinel-looking diagnostic treated as ordinary debug output.

### Test-first implementation order

1. Upgrade the fake webview and add failing bridge installation/receive-order
   tests.
2. Add failing routing, FIFO, malformed-message, stale-generation, rejection,
   and no-console-transport tests.
3. Rewrite bridge constants and the injected script until guest-contract tests
   pass.
4. Implement host validation, shared routing, lifecycle generation, and receive
   loop until editor-view tests pass.
5. Run `npm test`, `npm run build`, and `npm run lint`.
6. Execute the manual scenarios in [quickstart.md](./quickstart.md).

## Post-Design Constitution Re-Check

All gates remain PASS. The design adds no dependency, storage, server,
filesystem, process, authentication, or public API surface. New runtime values
remain centralized in `src/constants.ts`; process cleanup and local binding
invariants are unchanged.

## Complexity Tracking

No constitution violations require justification.
