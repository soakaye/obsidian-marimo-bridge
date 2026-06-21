# Contract: Webview Navigation Bridge

## Scope

This is a private contract between the plugin host renderer and the currently
loaded marimo guest page. It does not add a public plugin API or a stable
third-party extension point.

## Guest Installation Contract

- Installation occurs only after the webview reports that its DOM is ready.
- Reinstalling in the same guest context is idempotent.
- Installation creates one FIFO queue and exposes one `nextMessage()` operation.
- Installation hooks `window.open` and captured anchor clicks that target a
  separate browsing context.
- Installation resolves requested URLs against the current guest location
  before enqueueing them.
- Installation emits no console control output.

## Message Contract

The only accepted message is structurally equivalent to:

```json
{
  "type": "open",
  "url": "http://127.0.0.1:2718/?file=example.py",
  "disposition": "foreground-tab"
}
```

Rules:

- `type` must be exactly `"open"`.
- `url` must be a non-empty string.
- `disposition` may be omitted; when present it must be a string.
- No message is trusted until the host validates it.
- Invalid values are ignored and do not terminate the current valid receive
  cycle.

## Delivery Contract

- Messages are delivered exactly once to one host receive cycle.
- Messages queued before a receive request remain available.
- Queued messages are delivered first-in, first-out.
- When the queue is empty, `nextMessage()` remains pending until the next
  message; it does not poll.
- The host requests one message at a time and finishes routing it before
  requesting the next message.

## Lifecycle Contract

- A receive cycle belongs to one captured guest generation.
- A non-in-place main-frame navigation invalidates every earlier generation
  before the replacement page is ready.
- Subframe and in-page navigation do not invalidate the current bridge.
- A result is actionable only while its generation is current and its webview
  remains connected.
- Each `dom-ready` event installs a fresh bridge and starts a fresh receive
  cycle.
- Rejection caused by navigation, reload, or teardown stops the affected
  receive cycle without an unhandled rejection.
- A current-context installation failure retains the existing injection error
  diagnostic.

## Routing Contract

A validated open message uses the existing routing policy:

- Local marimo notebook destinations open through the plugin.
- Other local workspace files open through the Obsidian workspace.
- External HTTP(S) destinations open through the system browser.
- Unsafe external protocols are not opened.
- Local internal destinations that should stay in the same webview continue to
  receive the active token.

## Console Contract

- `console-message` is diagnostic-only.
- Debug and routine guest messages are forwarded at debug severity.
- Warning guest messages are forwarded at warning severity.
- Error guest messages are forwarded at error severity.
- Console text matching the former sentinel has no control meaning and is
  forwarded according to its severity.

## Explicit Non-Goals

- Guest preload scripts
- `ipcRenderer.sendToHost()`
- Main-process `webContents` integration
- Timer-based polling
- HTTP or WebSocket transport
- Additional ports or listeners
- Public APIs, persistence, migrations, or server lifecycle changes
