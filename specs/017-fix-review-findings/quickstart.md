# Quickstart: Validate Plugin Review Findings

## Prerequisites

- Node.js and dependencies installed with `npm install`
- Obsidian Desktop with a filesystem-backed test vault
- marimo available through the configured executable or Python environment
- The plugin enabled from this repository directory

## 1. Run the automated gates

From the repository root:

```bash
npm test
npm run build
npm run lint
```

Expected:

- The new review-compliance test passes.
- All existing editor, server, settings, and notebook tests pass.
- TypeScript reports no errors.
- The production bundle completes.
- ESLint reports no errors or warnings for the changed files.

## 2. Inspect review invariants

Confirm:

```bash
rg -n "eslint-disable-next-line" src/editor-view.ts src/main.ts src/server-manager.ts
```

Expected: no matches.

Confirm the manifest values:

```bash
node -e "const m=require('./manifest.json'); console.log(m.description); console.log(m.authorUrl)"
```

Expected:

- The description does not contain `Obsidian`.
- The author URL is `https://github.com/soakaye`.

## 3. Validate notebook opening and activation

1. In Obsidian Desktop, right-click a `.py` notebook.
2. Select **Open in marimo**.
3. Confirm a marimo editor tab opens and becomes the active tab.
4. From the marimo home page, open another notebook in a background
   disposition if available.
5. Confirm the background-open path does not steal focus.

Expected: behavior matches the
[workspace activation contract](./contracts/review-compliance.md#workspace-activation-contract).

## 4. Validate webview recovery and navigation

1. Open a marimo notebook and confirm the interception script is active by
   opening another local notebook link.
2. Confirm the target notebook opens in a plugin tab.
3. Open an external HTTP(S) link and confirm it opens in the system browser.
4. Reload or restore the workspace and confirm the embedded editor does not
   remain blank.
5. Inspect the developer console and confirm routine guest messages appear as
   debug diagnostics, while warnings and errors keep their severity.

Expected: all outcomes satisfy the
[embedded-view compatibility contract](./contracts/review-compliance.md#embedded-view-compatibility-contract).

## 5. Validate process diagnostics and cleanup

1. Start the edit server by opening a notebook.
2. Observe marimo stdout/stderr in the developer console at debug severity.
3. Disable or reload the plugin.
4. Confirm the managed marimo process terminates.
5. On Windows, confirm no child process remains; on Unix-like systems, confirm
   the detached process group is gone.

Expected: lifecycle behavior is unchanged and satisfies the
[process contract](./contracts/review-compliance.md#process-diagnostic-and-cleanup-contract).

## 6. Confirm capability scope

Review the implementation diff:

```bash
git diff -- manifest.json src tests
```

Expected:

- No new filesystem operation.
- No new shell command or process execution path.
- Vault notebook creation still calls the Vault API.
- Loopback/token/server-adoption logic is unchanged.
- The unrelated `temp/` directory is absent from the diff.

## Validation Record

**Date**: 2026-06-21

- Automated regression, production build, lint, manifest, directive, and
  capability-scope validation completed.
- Obsidian Desktop 1.12.7 loaded the plugin from the filesystem-backed
  `Obsidian Vault`; opening a `.py` file produced an active `marimo-editor`
  leaf with a connected webview.
- Foreground opening activated the requested notebook. Background opening
  created a marimo leaf without changing the active leaf.
- Local notebook navigation through the injected `window.open` bridge created
  the requested plugin tab. External HTTPS navigation reached Electron's
  `shell.openExternal`; the method was temporarily instrumented so validation
  did not launch an unrelated browser window.
- Plugin reload restored the active notebook with a non-blank webview and the
  interception script installed.
- Routine guest output appeared at debug severity, warnings remained warnings,
  and errors remained errors. Child-process startup and exit diagnostics also
  appeared at debug severity.
- Reload terminated the managed edit-server process (PID 70911); restored
  notebook leaves started a replacement process (PID 75451).
- No environment-specific acceptance limitation remains. The manual run
  exposed and fixed background-tab focus restoration and Electron console
  level mapping before this record was finalized.
