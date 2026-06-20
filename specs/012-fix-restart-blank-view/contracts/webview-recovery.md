# Internal Contracts: Webview recovery & server adoption

This plugin exposes no public API, CLI, or network endpoint for this feature. The "contracts" here are the internal function behaviors that the implementation and any future change must preserve. They are the testable surface referenced by `quickstart.md`.

## C1. `createMarimoWebview` readiness recovery (`src/editor-view.ts`)

**Given** a `<webview>` is created with a valid marimo `src` and appended to the DOM:

- MUST register a `dom-ready` listener that sets the local `domReady` flag to `true` (in addition to the existing injection-script behavior).
- MUST schedule a watchdog `WEBVIEW_LOAD_WATCHDOG_MS` after append.
- On watchdog fire, **if** `domReady === false` **and** `loadRetries < WEBVIEW_MAX_LOAD_RETRIES`: MUST call `reload()`, increment `loadRetries`, and reschedule the watchdog.
- MUST register a `EVENT_DID_FAIL_LOAD` listener that:
  - returns early when `errorCode === ERR_LOAD_ABORTED` (`-3`),
  - returns early when `isMainFrame === false`,
  - otherwise applies the same capped reload as the watchdog.
- MUST NOT reload once `domReady === true`.
- MUST NOT exceed `WEBVIEW_MAX_LOAD_RETRIES` reloads.

**Observable outcome**: A webview whose guest fails to load is reloaded automatically and renders; a healthy webview is never reloaded; a permanently failing webview stops after the cap.

## C2. `serverAcceptsOurAuth(port)` (`src/server-manager.ts`)

Returns `true` iff the server on `port` is usable by the plugin with the current token.

| Server on port | no-token `/` | `/?access_token=<our>` | Result |
|----------------|--------------|------------------------|--------|
| our `--token-password` server, our token | 303 → `/auth/login` | 303 → `/` (not login) | **true (adopt)** |
| `--token-password` server, different token | 303 → `/auth/login` | 303 → `/auth/login` | false (evict) |
| `--no-token` / foreign server | 200 (no redirect) | 303 → `/` or 200 | false (evict) |
| nothing listening / error | — | — | false |

- MUST use a non-redirect-following HTTP client (Node `http`), not Obsidian `requestUrl`.
- MUST classify by whether the `Location` header contains `PATH_AUTH_LOGIN`.

## C3. `ensureEditServer()` adoption flow (`src/server-manager.ts`)

- When `healthOk(port)` is true and `serverAcceptsOurAuth(port)` is true → adopt (mark ready, no spawn).
- When `healthOk(port)` is true and `serverAcceptsOurAuth(port)` is false → `killPort(port)`, then spawn a fresh server.
- When `healthOk(port)` is false → spawn a fresh server.
- Concurrent callers MUST share the single in-flight `editSpawning` promise so only one spawn occurs; a `healthOk` recheck inside the critical section prevents an `address already in use` bind conflict.

## C4. `killPort(port)` (`src/server-manager.ts`)

- MUST discover only the **LISTENING** PID(s) on `port` (Unix: `lsof -ti tcp:<port> -sTCP:LISTEN`; Windows: `netstat -ano` filtered to `LISTENING`) and terminate them.
- MUST NOT match client/`TIME_WAIT` connections to the port (those can include the host/Obsidian process itself; killing them would terminate the wrong process).
- MUST be best-effort and not throw if no process is found.
