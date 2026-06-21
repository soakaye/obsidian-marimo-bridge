# Contract: Plugin Review Compliance and Runtime Compatibility

## Manifest contract

The submitted `manifest.json` must satisfy all of the following:

- `description` does not contain the word `Obsidian`.
- `description` remains a concise, complete sentence describing the plugin.
- `authorUrl` is `https://github.com/soakaye`.
- `authorUrl` does not point to the plugin repository.
- `isDesktopOnly` remains `true`.
- `minAppVersion` remains `1.5.0`.

## Source directive contract

The following production files must not contain
`eslint-disable-next-line` directives:

- `src/editor-view.ts`
- `src/main.ts`
- `src/server-manager.ts`

In particular, the implementation must not disable:

- `@typescript-eslint/no-explicit-any`
- `obsidianmd/no-unsupported-api`
- `obsidianmd/rule-custom-message`
- an unlimited or unnamed set of rules

The implementation must pass the configured lint rules without suppressing the
reported findings.

## Embedded-view compatibility contract

- The webview interception script runs after every `dom-ready`.
- The blank-view watchdog retries no more than the configured cap.
- Detached webviews are not reloaded.
- Main-frame load failures trigger recovery except for the known benign aborted
  redirect.
- Local marimo notebook links open through the plugin.
- Other local workspace files open through the workspace.
- External HTTP(S) links open through the system browser.
- Unsafe protocols are not opened externally.
- Sentinel console messages continue to drive navigation.
- Other guest messages remain visible at debug, warning, or error severity.

## Workspace activation contract

When `openMarimo(..., active=true)` completes:

- the target leaf has the marimo view state and requested file;
- the target leaf is the active leaf;
- focus is requested through an API supported by minimum app version 1.5.0.

When `active=false`, the plugin must not force the target leaf active.

## Process diagnostic and cleanup contract

- Child stdout and stderr remain available as debug diagnostics.
- Normal child exit remains available as a debug diagnostic.
- Spawn failures remain errors and continue showing the existing notice.
- Child exit/close continues removing crash-recovery records and managed state.
- Plugin unload continues requesting termination of every managed server.
- Unsupported vault startup followed by unload is a safe no-op.
- Windows tree termination and Unix process-group termination are unchanged.

## Capability boundary contract

This feature may retain the existing direct-filesystem and shell-execution
warnings. It must not:

- add a new Node filesystem import or operation;
- add a new child-process command or execution path;
- broaden binding beyond loopback;
- weaken token authentication;
- replace Vault API writes with direct writes for plugin-created vault content;
- add mobile support.
