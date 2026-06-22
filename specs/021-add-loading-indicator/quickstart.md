# Quickstart: Validate Marimo Loading Indicator

## Prerequisites

- Obsidian Desktop with this plugin loaded from the current repository.
- A working marimo installation and at least one notebook in the Vault.
- One note containing both an edit embed and, if available, a run embed.

Example:

````markdown
```marimo
file: example.py
mode: edit
height: 600
```
````

## Automated Validation

Run from the repository root:

```bash
npm test
npm run build
npm run lint
```

Expected:

- All loading lifecycle and existing regression tests pass.
- Type checking and production bundling succeed.
- Lint reports no errors.

## Scenario 1: Initial Full-Tab Loading

1. Restart the marimo server or open a notebook while the server is cold.
2. Open the notebook in a marimo tab.
3. Observe the surface before the marimo page is ready.

Expected:

- Server startup guidance appears while the server is being prepared.
- It transitions to a centered spinner and `Loading marimo…`.
- The opaque layer hides the underlying page and prevents pointer and keyboard
  interaction while loading.
- The loading layer disappears as soon as marimo becomes usable.
- Ready content is not covered.

## Scenario 2: Initial Inline Loading

1. Open a note containing a marimo edit or run embed.
2. Switch to a mode that renders the embed.

Expected:

- The embed shows the same centered spinner and loading text within its
  configured area.
- The indicator disappears when the embedded marimo content becomes ready.

## Scenario 3: Replacement-Page Navigation

1. Start from a ready marimo home or notebook surface.
2. Trigger an action that replaces the current marimo page.
3. Also perform an interaction that updates the current page without replacing
   it.

Expected:

- Replacement-page navigation shows loading again and removes it on readiness.
- Same-page updates do not unnecessarily cover the content.

## Scenario 4: Automatic Recovery

1. Temporarily prevent a marimo webview from becoming ready, or reproduce the
   restored-blank-webview condition documented in specification 012.
2. Observe the existing bounded automatic reloads.
3. Test both a later successful recovery and a permanently failing load.

Expected:

- One loading layer remains visible throughout retries and does not multiply.
- Successful recovery removes the layer.
- Exhausted recovery replaces it with the existing server-unavailable guidance.
- Reload attempts remain capped at the existing maximum.

## Scenario 5: Removal During Loading

1. Begin loading a full-tab view or inline embed.
2. Close the tab or unload the note before readiness or the next watchdog.
3. Wait longer than the watchdog interval.

Expected:

- No view is reloaded after removal.
- No loading or failure message reappears in the removed surface.

## Scenario 6: Theme, Motion, and Assistive Technology

1. Repeat an initial loading check in a light Obsidian theme.
2. Repeat it in a dark theme.
3. Enable reduced motion in the operating system and repeat once more.
4. With a screen reader enabled, open and navigate a marimo surface.

Expected:

- Text and indicator remain readable and centered in both themes.
- With reduced motion, continuous rotation stops but loading remains clearly
  communicated.
- Each loading cycle politely announces `Loading marimo…` without interrupting
  higher-priority output.
- The spinner is not announced separately.

See [the loading-state contract](./contracts/loading-state.md) and
[the transient state model](./data-model.md) for the complete expected behavior.
