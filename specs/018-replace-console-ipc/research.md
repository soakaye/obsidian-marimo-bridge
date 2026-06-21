# Research: Replace Console-Based Webview IPC

## Decision 1: Use `executeJavaScript()` Promise results as the receive channel

**Decision**: Install a guest-side bridge through the existing webview
`executeJavaScript()` method, then evaluate a second expression that returns
`nextMessage()`. When no message is queued, `nextMessage()` returns a pending
Promise; Electron resolves the host call when the next message arrives.

**Rationale**: Electron documents `<webview>.executeJavaScript()` as returning a
Promise that resolves with the executed code's result and rejects when that
result is a rejected Promise. This provides push-style asynchronous delivery
through the boundary already used by the plugin, without adding periodic
polling or another communication service.

**Alternatives considered**:

- Continue sentinel-prefixed console output: rejected because console is a
  diagnostic channel and ordinary output must not control navigation.
- Poll a guest array on a timer: rejected because it adds repeated execution,
  latency, and lifecycle cleanup despite no message being available.
- Add HTTP or WebSocket communication: rejected because it adds a listener,
  port, authentication considerations, and shutdown behavior for an in-process
  navigation signal.

**Reference**:
[Electron `<webview>` tag](https://www.electronjs.org/docs/latest/api/webview-tag)

## Decision 2: Use one FIFO queue and one pending resolver per guest context

**Decision**: The installed bridge owns an array of unconsumed messages and at
most one pending resolver. `enqueue()` resolves the current waiter immediately
or appends to the array. `nextMessage()` removes the oldest queued item or
returns a Promise whose resolver becomes the waiter.

**Rationale**: The host consumes messages with one serial receive loop, so a
single waiter is the minimum complete model. The array preserves messages
emitted before the host begins waiting and preserves first-in, first-out order
during bursts.

**Alternatives considered**:

- Multiple simultaneous waiters: rejected because the host contract permits
  only one active receive operation and multiple waiters complicate ordering.
- A single mutable last-message slot: rejected because bursts could overwrite
  unconsumed navigation actions.
- Browser events or DOM mutation observers: rejected because they remain
  indirect signaling mechanisms and provide weaker message validation.

## Decision 3: Invalidate receive loops at loading boundaries

**Decision**: Keep a host-side numeric generation. Increment it when
`did-start-navigation` reports a non-in-place main-frame navigation, and
establish a fresh generation on `dom-ready`. Ignore subframe and in-page
navigation starts. Every awaited installation, receive, and route step checks
that generation and the element's connection state before continuing.

**Rationale**: A guest Promise belongs to the JavaScript context in which it was
created. Reload and top-level navigation replace that context. The Electron
event exposes `isMainFrame` and `isInPlace`, allowing invalidation at the
replacement-navigation boundary without stopping the bridge for subframes or
same-document navigation. Post-await checks prevent a late old result from
opening a tab after the page has changed.

**Alternatives considered**:

- Increment only on `dom-ready`: rejected because an old result could arrive
  after navigation starts but before the replacement page becomes ready.
- Use `did-start-loading`: rejected because it describes loading-indicator
  state rather than specifically identifying replacement main-frame
  navigation.
- Depend only on Promise rejection: rejected because lifecycle rejection is
  expected but generation checks make stale-result handling explicit and
  testable.
- Add cancellation tokens inside the guest: rejected because navigation
  destroys the guest context and the host still needs to reject late results.

**Reference**:
[Electron `<webview>` navigation events](https://www.electronjs.org/docs/latest/api/webview-tag#event-did-start-navigation)

## Decision 4: Separate installation failures from expected receive termination

**Decision**: Await bridge installation separately. Report an installation
failure only when its generation is still current and the element is connected.
After installation, catch receive rejection and return without logging.

**Rationale**: A failure to install in a live current page indicates a real
bridge problem and should preserve the existing injection diagnostic. A pending
receive commonly rejects because navigation, reload, or teardown destroys its
execution context; logging that expected lifecycle would create noise and
contradict the quiet-stop requirement.

**Alternatives considered**:

- Suppress every rejection: rejected because a current-page installation defect
  would become invisible.
- Log every rejection: rejected because normal reload and close operations
  would appear as errors.
- Retry installation on a timer: rejected because readiness events already
  define the correct retry boundary and polling is out of scope.

## Decision 5: Validate a minimal structured open-message contract

**Decision**: Accept only a non-null object whose `type` is the constant
`"open"`, whose `url` is a non-empty string, and whose `disposition` is absent
or a string. Ignore other values and continue the current receive loop.

**Rationale**: Values cross an untyped guest boundary and must be treated as
`unknown`. A bounded type guard documents the only supported action and
prevents malformed guest values from invoking navigation. Continuing after an
invalid value ensures a later valid queued message is not blocked.

**Alternatives considered**:

- Cast directly to the expected shape: rejected because it provides no runtime
  protection.
- Parse JSON text: rejected because `executeJavaScript()` returns structured
  cloneable values directly and no text protocol is needed.
- Introduce a general message bus: rejected because the feature has one message
  type and no public extension requirement.

## Decision 6: Do not use Electron preload or main-process IPC APIs

**Decision**: Keep the implementation inside the existing host renderer and
guest execution boundary. Do not add preload scripts,
`ipcRenderer.sendToHost()`, or `webContents.setWindowOpenHandler()`.

**Rationale**: Electron's documented `sendToHost()` path depends on
`ipcRenderer` in the guest renderer, normally made available through preload.
The existing Obsidian environment removes the plugin-provided webview preload
and enforces sandbox/no Node integration. `setWindowOpenHandler()` belongs to
the privileged `webContents` surface and would broaden the plugin's host
integration for a problem already solved at the existing boundary.

**Alternatives considered**:

- Guest preload plus `sendToHost()`: rejected because the host removes that
  preload boundary.
- Direct privileged webContents access: rejected because it is outside the
  current narrow structural contract and increases compatibility risk.

**References**:

- [Electron `ipcRenderer`](https://www.electronjs.org/docs/latest/api/ipc-renderer)
- [Electron `webContents`](https://www.electronjs.org/docs/latest/api/web-contents)
