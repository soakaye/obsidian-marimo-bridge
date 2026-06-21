# Data Model: Resolve Plugin Review Findings

This feature adds no persisted domain data. The relevant model consists of one
public metadata record and three in-memory boundary/state contracts.

## Plugin Manifest Metadata

Represents the public submission metadata consumed by the plugin directory and
review tooling.

| Field | Type | Validation |
|-------|------|------------|
| `description` | string | Concise English sentence; starts with a capital, ends with a period, contains no word `Obsidian`, and accurately describes notebook viewing/editing plus local server embedding. |
| `author` | string | Existing author identifier `soakaye`. |
| `authorUrl` | URL string | Exact author profile `https://github.com/soakaye`; must not equal the plugin repository URL. |
| `isDesktopOnly` | boolean | Remains `true` because the plugin uses Electron and Node capabilities. |
| `minAppVersion` | version string | Remains `1.5.0`; planned APIs must be available at or before this version. |

## Electron Module Boundary

An in-memory structural contract local to `src/editor-view.ts`.

| Member | Type | Purpose |
|--------|------|---------|
| `require(moduleName)` | function returning Electron module subset | Resolves the host-provided Electron module. |
| `shell.openExternal(url)` | async function | Opens validated HTTP(S) links in the system browser. |

Validation rules:

- The boundary exposes no filesystem, IPC, or arbitrary web-contents member.
- The module name continues to come from existing constants.
- URL protocol validation remains outside the shell contract.

## Marimo Webview Boundary

An `HTMLElement` structural extension used only by the marimo embedding code.

| Member | Type | Purpose |
|--------|------|---------|
| inherited DOM members | `HTMLElement` | Attributes, classes, connection state, event listeners, and removal. |
| `executeJavaScript(script)` | callable | Installs the existing interception script after `dom-ready`. |
| `reload()` | callable | Retries a blank or failed main-frame load. |

Validation rules:

- The element remains detached until attributes and listeners are configured.
- The retry cap and detached-element guard remain unchanged.
- The function continues returning the element as `HTMLElement` to callers.

## Webview Console Message

An event payload consumed from Electron's `console-message` event.

| Field | Type | Purpose |
|-------|------|---------|
| `level` | number | Maps guest severity to host debug/warn/error output. |
| `message` | string | Carries either the navigation sentinel payload or guest diagnostic text. |
| `line` | number | Included in formatted diagnostic output. |
| `sourceId` | string | Included in formatted diagnostic output. |

Validation rules:

- Sentinel messages are parsed and routed before diagnostic forwarding.
- Invalid sentinel JSON is reported as an error without crashing.
- Non-warning/non-error messages are forwarded with debug severity.

## Server Manager Initialization State

Represents whether plugin startup reached the point where local filesystem
capabilities are available.

```text
uninitialized
    ├── unsupported vault adapter → remains uninitialized → safe unload no-op
    └── filesystem vault → initialized → registered runtime behavior
                                      └── unload → stop all managed servers
```

Validation rules:

- Runtime views and commands are registered only after initialization.
- Strict runtime access fails fast if the invariant is violated.
- Unload uses optional access because early startup exit is valid.
- Process lifecycle state inside `ServerManager` is unchanged.
