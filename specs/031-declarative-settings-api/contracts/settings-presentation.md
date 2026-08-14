# Contract: Settings Presentation

**Feature**: `031-declarative-settings-api` | **Date**: 2026-08-14

The interface this plugin exposes to its host for settings. Signatures below are
quoted from the installed `obsidian@1.13.1` type definitions.

## C1 — `getSettingDefinitions()`

```ts
getSettingDefinitions(): SettingDefinitionItem[]
```

| Guarantee | Detail |
|-----------|--------|
| Non-empty | Returns 13 rows; an empty return would silently re-enable the legacy path on 1.13+ |
| Ordered | Same order as `display()` emits, excluding the heading row |
| Complete | Every key in `DEFAULT_SETTINGS` is bound by exactly one control (INV-2) |
| Pure | Building the list performs no I/O and starts no async work; the installation check is started by row 4's `render`, not by this method |
| Idempotent | Repeated calls return equivalent data; the host calls it on every `display()` and once at tab registration for search indexing |

Row kinds, in order:

| # | Name constant | Kind | Key |
|---|---------------|------|-----|
| 1 | `SETTING_MARIMO_PATH_NAME` | `text` | `marimoPath` |
| 2 | `SETTING_PYTHON_PATH_NAME` | `text` | `pythonPath` |
| 3 | `SETTING_UV_PATH_NAME` | `text` | `uvPath` |
| 4 | `SETTING_MARIMO_INSTALL_NAME` | `render` | — |
| 5 | `SETTING_PORT_NAME` | `number` | `port` |
| 6 | `SETTING_AUTO_START_NAME` | `toggle` | `autoStart` |
| 7 | `SETTING_TIMEOUT_NAME` | `number` | `startupTimeout` |
| 8 | `SETTING_TAKEOVER_NAME` | `toggle` | `takeOverPyExtension` |
| 9 | `SETTING_EMBED_MODE_NAME` | `dropdown` | `defaultEmbedMode` |
| 10 | `SETTING_EMBED_HEIGHT_NAME` | `number` | `defaultEmbedHeight` |
| 11 | `SETTING_CONTEXT_MENU_NAME` | `toggle` | `showContextMenu` |
| 12 | `SETTING_MD_CONTEXT_MENU_NAME` | `toggle` | `showMarkdownContextMenu` |
| 13 | `SETTING_API_TOKEN_NAME` | `text` | `apiToken` |

Each row reuses the **same** name and description constants the legacy path
uses. That reuse is what makes label parity hold without a second copy of the text.

## C2 — `getControlValue(key)`

```ts
getControlValue(key: string): unknown
```

| Input | Output |
|-------|--------|
| A key bound in C1 | The current value from `plugin.settings` |
| Any other key | Undefined behavior is not relied upon; the host only passes keys this tab declared |

MUST NOT mutate state or perform I/O — the host calls it on every render of
every control row.

## C3 — `setControlValue(key, value)`

```ts
setControlValue(key: string, value: unknown): void | Promise<void>
```

Ordered obligations:

1. For `marimoPath`, `pythonPath`, `uvPath`, **and `apiToken`** — store the value
   trimmed (FR-009). All four are trimmed by the legacy path today; omitting the
   token would let a stray space reach the server's token comparison.
2. Assign into `plugin.settings`.
3. `await plugin.saveSettings()` — the plugin's own save path, so
   `invalidateAvailability()` still runs (FR-006, INV-4). The base class
   implementation MUST NOT be relied on for persistence.
4. For the three **path** keys only — re-run the installation check so row 4
   reflects the new interpreter (FR-009). The token does not affect installation.

MUST NOT be reached for a value that `validate` rejected (INV-5); the host
enforces this ordering.

## C4 — Validation

| Key | Accepts | Rejects with |
|-----|---------|--------------|
| `port` | `1 … PORT_MAX` | an inline message; stored value unchanged |
| `startupTimeout` | `> 0` | an inline message; stored value unchanged |
| `defaultEmbedHeight` | `> 0` | an inline message; stored value unchanged |

`validate` returns `string \| void`: a non-empty string rejects, `void` accepts.
It CANNOT transform a value — that is why trimming lives in C3 (research.md R4).

Per the shipped docs, `validate` also runs once on mount, so an already-invalid
stored value surfaces its message without being rewritten.

## C5 — Row 4, the installation status

A `SettingDefinitionRender`. It carries **both** a declared `desc` and a render
callback:

- It MUST declare `desc` with the same initial "checking" constant the legacy
  path passes to `setDesc()`. A render callback alone would leave this row with
  no indexed description, which would silently drop it below the eleven
  description-bearing rows the spec counts and weaken FR-002 for it.
- Its render callback MUST draw the install button, update the row's description
  as the check resolves (the status text *is* the description today), and
  refresh after the install action resolves (FR-007).
- Its render callback MUST return a cleanup function so an in-flight check cannot
  write into a torn-down row (FR-010).

## C6 — Mutual exclusivity with the legacy presentation

Neither method arbitrates this; the host does. Per the installed type
definitions, `display()` is "Not called when `getSettingDefinitions` returns a
non-empty array", and on pre-1.13 hosts `getSettingDefinitions` does not exist on
the base class and is never invoked. Therefore:

- The plugin MUST NOT feature-detect the host version (research.md R2).
- `display()` MUST remain exactly as shipped (FR-005a).

## C7 — Backward compatibility

- No change to `MarimoBridgeSettings`, `DEFAULT_SETTINGS`, or `data.json`.
- No change to `manifest.json` `minAppVersion` (stays `1.5.7`).
- No public member of `MarimoBridgeSettingTab` is removed or changed; the three
  methods are additions.
