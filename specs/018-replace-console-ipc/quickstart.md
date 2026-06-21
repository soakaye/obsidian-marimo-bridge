# Quickstart: Validate the Webview Navigation Bridge

## Prerequisites

- Obsidian Desktop with this plugin installed from the current branch
- A vault-local or configured Python environment with marimo available
- At least one marimo notebook and one non-Python vault file
- Developer tools available for observing guest and plugin diagnostics

## Automated Validation

From the repository root:

```bash
npm test
npm run build
npm run lint
```

Expected outcomes:

- Bridge installation precedes the first receive operation.
- Structured notebook, workspace-file, and external messages use their existing
  destination handlers.
- At least 20 queued messages are handled once each in FIFO order.
- Malformed and unknown messages are ignored without blocking a later valid
  message.
- Results from an invalidated generation are ignored.
- Subframe and in-page navigation do not stop the current receive cycle.
- Receive rejection during navigation or teardown creates no unhandled
  rejection.
- The injected program contains neither the former sentinel nor a
  `console.log` transport.
- Ordinary guest console messages retain debug, warning, and error severity.
- Type-checking, production bundling, and linting succeed.

## Manual Scenario 1: Marimo Home notebook links

1. Open marimo Home inside an Obsidian plugin tab.
2. Select notebooks from Running notebooks, Recent notebooks, and the workspace
   browser.
3. Exercise a standard click and any available named/new-target link behavior.

Expected:

- Every notebook opens in the same Obsidian tab mode and focus behavior as
  before.
- No sentinel-prefixed navigation line appears in guest console output.
- Ordinary marimo logs remain visible as diagnostics.

## Manual Scenario 2: `window.open` and named targets

1. Trigger the marimo action that creates or opens a notebook through
   `window.open`.
2. Trigger a link whose target is `_blank` or an application-generated named
   browsing context.

Expected:

- Both requests are routed through the plugin.
- No external blank window is left behind.
- Requests occur in the order triggered.

## Manual Scenario 3: Workspace and external links

1. Open a non-Python vault file from the embedded workspace browser.
2. Open an external HTTP(S) documentation link.
3. If available, attempt a non-HTTP(S) external protocol.

Expected:

- The vault file opens through Obsidian.
- The HTTP(S) link opens through the system browser.
- The unsafe protocol is not opened and retains the existing warning behavior.

## Manual Scenario 4: Reload recovery

1. Open a marimo page and allow the bridge to become ready.
2. Reload the embedded page several times.
3. After each readiness event, open a notebook link.
4. Exercise the existing blank-view recovery path if the environment reproduces
   it.

Expected:

- Each new page context handles its own messages.
- No message from a previous page opens an unexpected tab.
- Existing watchdog, authentication retry, and recovery behavior remains
  unchanged.

## Manual Scenario 5: View closure

1. Start from a ready embedded page.
2. Close the Obsidian tab while the bridge is waiting for its next message.
3. Observe developer tools briefly after closure.

Expected:

- The receive operation ends without an unhandled rejection or visible error.
- No background navigation occurs after closure.

## Scope Audit

Review the final diff and confirm:

- Only the feature documentation, `src/constants.ts`, `src/editor-view.ts`, and
  focused editor-view tests changed.
- `specs/017-fix-review-findings/` is unchanged.
- No preload file, dependency, port, listener, HTTP/WebSocket service,
  main-process API, persisted data, or server-manager change was added.
- The behaviors match [contracts/webview-bridge.md](./contracts/webview-bridge.md).

## Validation Record — 2026-06-22

- Automated validation completed with 66 passing tests, a successful production
  build, and a clean lint run.
- Obsidian Desktop loaded the rebuilt plugin without captured runtime errors and
  rendered two connected marimo webviews.
- Calling `window.open()` inside the live guest for
  `02_documents/untitled_marimo_3.py` created the expected Obsidian marimo tab,
  confirming the Promise bridge on the real Electron boundary.
- The remaining workspace-file, external-browser, repeated-reload, and
  close-while-waiting manual scenarios could not be completed because the
  Obsidian CLI repeatedly lost its running-app endpoint after the successful
  notebook-routing check. Their expected outcomes remain covered by the
  automated structured-routing, generation, detachment, and rejection tests;
  rerun these manual scenarios when a stable Desktop CLI session is available.
