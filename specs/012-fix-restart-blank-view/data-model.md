# Phase 1 Data Model: Fix blank marimo view after Obsidian restart

This feature is behavioral; it introduces no persisted data and no settings schema changes. The "entities" below are the in-memory state objects and their state transitions that the recovery logic observes.

## Entity: Webview load state (per `MarimoEditorView` webview, `src/editor-view.ts`)

Transient state local to one `createMarimoWebview` invocation.

| Field | Type | Meaning |
|-------|------|---------|
| `domReady` | boolean | `true` once the guest has fired `dom-ready` at least once. Set in the existing `dom-ready` listener. |
| `loadRetries` | number | Count of automatic `reload()` attempts performed so far. |

**Constants** (`src/constants.ts`):

| Name | Value | Meaning |
|------|-------|---------|
| `WEBVIEW_LOAD_WATCHDOG_MS` | `3000` | Delay before checking readiness / between reload attempts. |
| `WEBVIEW_MAX_LOAD_RETRIES` | `3` | Upper bound on automatic reloads. |
| `EVENT_DID_FAIL_LOAD` | `"did-fail-load"` | Webview event name for failed loads. |
| `ERR_LOAD_ABORTED` | `-3` | Electron error code for an aborted (benign, e.g. redirect) load. |

**State transitions**:

```
created ──append──▶ loading ──dom-ready──▶ ready (terminal; no more reloads)
                       │
                       ├─ watchdog fires & !domReady & loadRetries < MAX
                       │        └─▶ reload(); loadRetries++ ; reschedule ──▶ loading
                       │
                       ├─ did-fail-load (errorCode ≠ -3, main frame) & loadRetries < MAX
                       │        └─▶ reload(); loadRetries++ ; reschedule ──▶ loading
                       │
                       └─ loadRetries == MAX & !domReady
                                └─▶ give up (terminal; existing "server unavailable" UX applies)
```

**Rules**:
- Reload only while `domReady === false`. Once ready, the watchdog is a no-op.
- Never exceed `WEBVIEW_MAX_LOAD_RETRIES` reloads.
- Ignore `did-fail-load` when `errorCode === ERR_LOAD_ABORTED` or `isMainFrame === false`.

## Entity: Managed edit server adoption (per port, `src/server-manager.ts`)

No new persisted fields; this refines the decision logic of `ensureEditServer` over the existing `ManagedServer` bookkeeping.

| Concept | Type | Meaning |
|---------|------|---------|
| token | string | The plugin's active access token (`getActiveToken()`). |
| port | number | Configured edit-server port. |
| adoption verdict | derived | `adopt` \| `evict-and-respawn` \| `spawn-fresh`. |

**Constant** (`src/constants.ts`): `PATH_AUTH_LOGIN = "/auth/login"` — redirect-target marker for the discriminator.

**Adoption decision** (evaluated only when `healthOk(port)` is already true):

```
serverAcceptsOurAuth(port) =
    redirectsToLogin(port, null) == true        # no-token root → /auth/login (auth enforced)
    AND redirectsToLogin(port, token) == false  # our token NOT bounced to /auth/login

if healthOk(port):
    if serverAcceptsOurAuth(port):  verdict = adopt
    else:                           verdict = evict-and-respawn  # killPort(port) then spawn
else:                               verdict = spawn-fresh
```

Where `redirectsToLogin(port, token|null)` issues a non-following Node `http` GET of `/` (optionally with `?access_token=<token>`) and returns `true` iff the response is a 3xx whose `Location` contains `PATH_AUTH_LOGIN`.

**Rules**:
- Never adopt on `/health` alone.
- A single in-flight `editSpawning` promise plus a `healthOk` recheck guarantees one server per port (no duplicate spawn / port-bind conflict).
