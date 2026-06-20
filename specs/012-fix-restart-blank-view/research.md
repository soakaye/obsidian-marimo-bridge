# Phase 0 Research: Fix blank marimo view after Obsidian restart

All findings below were validated empirically against a live marimo server and the running plugin during diagnosis. No open `NEEDS CLARIFICATION` items remain.

## R1. Why a restored webview renders blank

- **Decision**: Treat "guest never loaded" as a recoverable state and reload the webview.
- **Evidence**: On a restored tab, host-side inspection showed the `<webview>` element exists, has the correct `src` (`http://127.0.0.1:<port>/?access_token=…`), and a visible size (e.g. 357×888), yet `executeJavaScript` against the guest stayed pending forever and no `dom-ready` had fired. Calling `webview.reload()` immediately brought the guest up (`dom-ready` fired, marimo runtime initialized, `document.body` populated to ~20 KB).
- **Rationale**: The guest WebContents fails to commit its initial load during workspace restore (a known Electron `<webview>` timing issue when attaching during app startup). A reload re-drives the load successfully.
- **Alternatives considered**:
  - *Re-set `src` / `loadURL` after attach* — heavier, and `reload()` already proven to work.
  - *Recreate the webview element* — more disruptive (loses partition session warmth) and unnecessary.
  - *Delay creation until the leaf is visible* — does not help; the element already has size and is visible when it fails.

## R2. How to detect the blank state

- **Decision**: Use a `dom-ready` watchdog timer plus a `did-fail-load` listener.
- **Rationale**: The failure is silent — there is no error, just an absence of `dom-ready`. A timeout is the only reliable signal. `did-fail-load` additionally covers explicit load errors.
- **Caveat (validated)**: The normal `?access_token=` → cookie redirect produces a `did-fail-load` with `errorCode === -3` (ABORTED). This is benign and must be ignored, as must sub-frame failures (`isMainFrame === false`), to avoid spurious reloads.
- **Tuning**: `WEBVIEW_LOAD_WATCHDOG_MS = 3000` (a healthy guest fires `dom-ready` in ~1 s; 3 s avoids reloading slow-but-healthy loads) and `WEBVIEW_MAX_LOAD_RETRIES = 3` (bounded recovery; if still blank, stop and let the existing "server not available" UX apply).

## R3. Why `/health` adoption is wrong, and the correct discriminator

- **Decision**: Adopt an already-running server only if it accepts our access token; otherwise evict and respawn.
- **Evidence** (curl, no redirect-follow):
  - `/health` → `200` for **any** marimo server (unauthenticated) — useless for "is this server usable by us".
  - Correct `--token-password` server, correct token: `/?access_token=<correct>` → `303 Location: /` (it strips the token and sets a cookie). So a naive `statusCode === 200` check **rejects our own valid server** → kill/respawn loop → "won't start" regression (observed).
  - Correct server, no token: `/` → `303 Location: /auth/login?...`.
  - Correct server, wrong token: `/?access_token=<wrong>` → `303 Location: /auth/login?...`.
  - Stale `--no-token` leftover: `/` (no token) → `200`; `/?access_token=<any>` → `303 Location: /` (token ignored).
- **Discriminator**: A server is "ours/usable" iff **(a)** a no-token root request is redirected to `/auth/login` (auth is enforced, i.e. started with `--token-password`) **AND (b)** a root request carrying our token is **not** redirected to `/auth/login`. This uniquely separates our correctly-tokened server (adopt) from a `--no-token` leftover (evict, since `/` returns 200, failing (a)) and from a wrong-token server (evict, failing (b)).
- **Rationale**: Must not follow redirects to read the signal; Obsidian's `requestUrl` follows them, so use Node `http` directly.
- **Alternatives considered**:
  - *Trust `/health`* — the original bug.
  - *Check `statusCode === 200` with token* — wrong; the valid server 303-redirects.
  - *Always spawn fresh and never adopt* — breaks legitimate reuse after a plugin reload and risks port conflicts.

## R4. Evicting an incompatible leftover server

- **Decision**: `killPort(port)` — discover the PID(s) bound to the port and terminate them, then spawn fresh.
- **Rationale**: A leftover from a crash, force-quit, or an older plugin version (e.g. one started with `--no-token`) holds the port; we cannot bind a new server until it is gone. We may not own its `ChildProcess` handle, so discover by port.
- **Mechanism**: Unix → `lsof -ti tcp:<port>`; Windows → `netstat -ano | findstr` then `taskkill /PID … /T /F`. Aligns with Constitution Principle III (reliable, recursive termination).
- **Alternatives considered**: *Spawn on a different port* — leaks the stale server and complicates URL/state; rejected.

## R5. Preventing duplicate spawns at startup

- **Decision**: Keep the single in-flight `editSpawning` promise guard and re-check `healthOk` inside the critical section before spawning.
- **Evidence**: Two independent triggers (auto-start on `onLayoutReady`, and the restored view's `setState → render → ensureEditServer`) can both reach server-start, producing `ERROR: address already in use` and a wasted process. The loser's `waitForReady` still observes the winner's healthy server, so the symptom is self-healing, but the error noise is removed by serializing through the existing guard.
- **Rationale**: Lightweight, no new locking primitive; reuses the structure already present.

## R6. Guest control constraints (context, no change required)

- **Finding**: Obsidian strips `<webview>` preload and forces sandbox / no node integration. The host can only run code in the guest via `executeJavaScript` and observe it via `console-message`. Therefore recovery is necessarily host-driven through webview lifecycle events (`dom-ready`, `did-fail-load`) and `reload()` — consistent with the existing `INJECTION_SCRIPT` link-interception design.
