# Phase 1 Data Model: Searchable Plugin Settings

**Feature**: `031-declarative-settings-api` | **Date**: 2026-08-14

No persisted data changes. `MarimoBridgeSettings` and `DEFAULT_SETTINGS` are
untouched (FR-011). What this feature adds is a second *description* of the same
settings, consumed by the host.

## Entities

### Setting option (existing, unchanged)

The 12 persisted fields of `MarimoBridgeSettings` (`src/settings.ts:75-100`),
with defaults in `DEFAULT_SETTINGS` (`src/settings.ts:102-115`).

| Key | Type | Control kind | Constraint |
|-----|------|--------------|------------|
| `marimoPath` | `string` | text | stored trimmed |
| `pythonPath` | `string` | text | stored trimmed |
| `uvPath` | `string` | text | stored trimmed |
| `port` | `number` | number | `1 … PORT_MAX` |
| `autoStart` | `boolean` | toggle | — |
| `startupTimeout` | `number` | number | `> 0` |
| `takeOverPyExtension` | `boolean` | toggle | — |
| `defaultEmbedMode` | `"edit" \| "run"` | dropdown | one of the two modes |
| `defaultEmbedHeight` | `number` | number | `> 0` |
| `showContextMenu` | `boolean` | toggle | — |
| `showMarkdownContextMenu` | `boolean` | toggle | — |
| `apiToken` | `string` | text | stored trimmed |

That is 12 persisted keys; the 13th row is the installation status below, which
is not persisted.

### Installation status (existing, unchanged in behavior)

Not a stored preference. An asynchronously determined value — the detected
runtime version, or a not-installed state carrying an install target and a
possible broken-environment hint — with an attached install action.

- **Read**: `servers.getMarimoPackageVersion()`, `servers.resolvePython()`,
  `servers.vaultVenvBroken()`, `servers.describeMarimoInstallTarget()`
- **Write**: `servers.installMarimo()` via the row's button
- **Lifecycle**: re-checked on render, after the install action completes, and
  after any of the three path options is saved
- **Teardown**: an in-flight check must not write into a removed row (FR-010)

### Setting presentation (new concept)

How the option set is handed to the host. Two exist; exactly one is active per
host version, decided by the host (research.md R2).

| | Legacy presentation | Searchable presentation |
|---|---|---|
| Produced by | `display()` | `getSettingDefinitions()` |
| Shape | imperative `Setting` objects appended to a container | plain data returned as an array |
| Used when | host predates 1.13 | host is 1.13+ **and** the array is non-empty |
| Indexed by settings search | no | yes |
| Modified by this feature | **no** (FR-005a) | added |
| Leading heading row | yes (`setHeading()`) | no — excluded from parity (research.md R8) |

## Relationships

```text
MarimoBridgeSettings (persisted, 12 keys)
        │
        ├── described by ──> legacy presentation      ──> pre-1.13 host
        │                        (untouched)
        └── described by ──> searchable presentation  ──> 1.13+ host + search index
                                 (new)                          │
                                                                │ getControlValue(key)
                                                                │ setControlValue(key, value)
                                                                ▼
                                                     plugin.saveSettings()
                                                                │
                                                                ▼
                                                  servers.invalidateAvailability()
```

Both presentations are hand-maintained; FR-005b holds them in parity by test
rather than by construction.

## Validation rules

Sourced from the existing legacy handlers, unchanged in effect:

| Key | Rule | On violation |
|-----|------|--------------|
| `port` | integer, `1 … PORT_MAX` | reject; stored value untouched; inline message |
| `startupTimeout` | integer, `> 0` | reject; stored value untouched; inline message |
| `defaultEmbedHeight` | integer, `> 0` | reject; stored value untouched; inline message |
| path keys | none | trimmed on write |

A stored value that is already out of range (persisted by an older version) is
surfaced on mount and is **not** rewritten (research.md R5).

## Invariants

- **INV-1**: Persisted data is byte-identical before and after this change for
  any user who does not edit a setting.
- **INV-2**: Every key in `DEFAULT_SETTINGS` is bound by exactly one control in
  the searchable presentation.
- **INV-3**: The two presentations list the same options, in the same order,
  ignoring the legacy heading row.
- **INV-4**: Every write path — either presentation — ends in
  `plugin.saveSettings()`.
- **INV-5**: A rejected value never reaches storage.
