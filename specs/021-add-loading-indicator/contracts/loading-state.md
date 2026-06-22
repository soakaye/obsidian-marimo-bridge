# Contract: Marimo Loading State

## Scope

This is a private UI lifecycle contract shared by full-tab marimo views and
inline marimo embeds. It adds no public API, setting, persistence format, or
network behavior.

## Initial Loading Contract

- A marimo surface displays a centered loading layer before its webview can
  expose a blank loading frame.
- The layer contains one activity indicator and the exact text
  `Loading marimo…`.
- The text is exposed as a polite status announcement and the activity
  indicator is decorative.
- The opaque layer covers previous content, intercepts pointer input, and
  prevents keyboard interaction with the covered webview.
- The existing server-starting status remains in place until page loading
  begins; the two statuses are not shown simultaneously.
- The loading layer is removed when the guest reports `dom-ready`.

## Navigation Contract

- A non-in-place main-frame navigation from a ready page starts a new loading
  cycle and displays the layer.
- Subframe and in-place navigation do not display the layer.
- Additional main-frame navigation while already loading, including redirects
  and recovery reloads, remains in the same loading cycle.
- The next `dom-ready` completes the active cycle and removes the layer.

## Recovery Contract

- The loading layer remains visible during every permitted automatic reload.
- Recovery events do not create duplicate loading layers.
- Reload-driven navigation does not reset the recovery count.
- After the existing retry limit is exhausted, the loading layer and unusable
  webview are removed and the existing server-unavailable guidance is shown
  once.
- Benign aborted loads and subframe failures retain their existing behavior.

## Teardown Contract

- Once the webview is detached or its containing surface is removed, pending
  watchdog or failure activity performs no reload and creates no loading or
  failure UI.
- Full-tab close and embed unload continue to clear their existing containers.

## Presentation Contract

- The layer is visually centered within the full-tab view or configured embed
  area.
- It uses host theme colors that remain readable in supported light and dark
  themes.
- It covers stale or blank guest content while loading and never covers ready
  content.
- It prevents interaction with covered content until the loading cycle is
  complete.
- Reduced-motion preference stops continuous spinner animation while preserving
  a visible indicator and textual status.
- Assistive technology announces the loading text politely once per displayed
  loading cycle and does not announce the spinner separately.

## Compatibility Contract

- Notebook opening, home-page loading, inline edit/run embedding, token
  propagation, URL routing, bridge installation, and process recovery outcomes
  remain unchanged.
- No new runtime dependency, user setting, external interface, or mobile path
  is introduced.
