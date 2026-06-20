# Quickstart: Validate the restart-blank-view fix

Manual validation guide. There is no automated test harness in this repo; these scenarios are run in Obsidian + the developer console.

## Prerequisites

- marimo installed in the vault `.venv` (settings show "Installed").
- Plugin built and loaded: from the plugin directory run `npm run build`, then reload the plugin (or restart Obsidian) so the new `main.js` is active.

## Scenario 1 — Restored tab renders after restart (FR-001..FR-004, SC-001, SC-002)

1. Open a marimo notebook (or the marimo home page) in a tab; confirm it renders.
2. Fully quit Obsidian (Cmd+Q / app quit), then relaunch.
3. **Expected**: the restored marimo tab displays its content automatically within ~5 seconds, no manual action.
4. If the first guest load silently failed, the console shows the watchdog recovering:
   `[MarimoBridge] webview not ready (no dom-ready); reloading, attempt 1/3`
   followed by the marimo guest console lines (`Initializing runtime…`, `Runtime is healthy`).

**Inspect (optional)** — in the developer console, with the marimo tab focused:

```js
(async () => {
  const wv = document.querySelector('.marimo-bridge-webview');
  const r = await wv.executeJavaScript('document.body ? document.body.innerHTML.length : -1');
  console.log('guest bodyLen =', r); // > 0 means the guest loaded
})();
```

## Scenario 2 — Leftover/incompatible server is replaced (FR-005, FR-006, SC-003)

1. Stop Obsidian. Start a marimo server manually on the configured port with different auth, e.g.:
   `marimo edit --headless --no-token --port 2718 --host 127.0.0.1`
2. Launch Obsidian and open a marimo tab.
3. **Expected**: the plugin does not attach to the `--no-token` leftover; it evicts it (`killPort`) and starts its own `--token-password` server, and the view renders.

**Inspect** — verify only the plugin's server remains:

```sh
lsof -nP -iTCP:2718 -sTCP:LISTEN          # one listener
pgrep -fl "marimo edit"                    # started with --token-password <token>
```

Adoption signal (correct server should 303 to `/`, not `/auth/login`):

```sh
curl -s -D - -o /dev/null "http://127.0.0.1:2718/?access_token=<token>" | grep -i -E "HTTP/|location"
```

## Scenario 3 — Reuse without duplicate spawn (FR-007, FR-008, SC-004)

1. With the plugin's own server already running, disable then re-enable the plugin (or restart Obsidian).
2. **Expected**: no `ERROR: address already in use` in the console; exactly one server stays on the port; the view renders. A matching-token server is reused rather than re-spawned.

## Scenario 4 — Bounded recovery when content cannot load (FR-003, FR-009, SC-005)

1. Force an unrecoverable state (e.g. stop the marimo binary so the server cannot start), open a marimo tab.
2. **Expected**: the watchdog stops after `WEBVIEW_MAX_LOAD_RETRIES` (3) attempts; the user sees the existing "marimo server is not available — check settings" guidance rather than an indefinitely blank pane and no infinite reload loop in the console.

## Build / lint gates

```sh
npm run build   # tsc type-check + esbuild production bundle
npm run lint    # eslint
```

Both must pass.
