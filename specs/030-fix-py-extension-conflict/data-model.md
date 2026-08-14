# Phase 1 Data Model: Resilient `.py` Extension Takeover

**Feature**: `030-fix-py-extension-conflict` | **Date**: 2026-08-14

This feature introduces no persisted data and no new schema. The entities below
are the run-time concepts the spec names, mapped to the code that represents
them.

## Entities

### Takeover preference

| Field | Type | Location | Notes |
|-------|------|----------|-------|
| `takeOverPyExtension` | `boolean` | `MarimoBridgeSettings` (`src/settings.ts:89`) | Persisted in `data.json` |

- **Default**: `true` (`DEFAULT_TAKE_OVER_PY_EXTENSION`, `src/constants.ts:12`).
- **Meaning**: the user *requests* that `.py` open in the marimo editor. It does
  not guarantee the claim is granted.
- **Validation**: none beyond the boolean type; merged over `DEFAULT_SETTINGS` by
  `loadSettings()`.
- **Change**: written by the settings toggle (`src/settings.ts:303-313`) and
  applied on the next plugin load. **Unchanged by this feature.**

### `.py` extension claim

Not a stored value — an association held by Obsidian's view registry between the
extension `py` and `VIEW_TYPE_MARIMO`.

- **Cardinality**: at most one owner per extension, granted first-come.
- **Acquired**: `Plugin.registerExtensions([...], VIEW_TYPE_MARIMO)` during
  `onload()`.
- **Released**: automatically on plugin unload, by the disposer Obsidian
  registers with the call. Never released explicitly by this plugin.
- **Failure signal**: the call throws when another owner exists. This is the only
  supported way to observe the conflict (see `research.md` R2).

### Conflict warning

A transient `Notice` plus a `console.warn` record, produced at most once per
plugin load.

| Attribute | Value |
|-----------|-------|
| User text | `RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT` (new) |
| Log label | `RUNTIME_CONSTANTS.LOG_PY_EXTENSION_CONFLICT` (new) |
| Log payload | The caught error object, unmodified |
| Timeout | `NOTICE_TIMEOUT_MS` (existing) |
| Emitted when | Takeover preference is on **and** the claim throws |

## State transitions

`onload()`, per plugin load:

```text
                 takeOverPyExtension?
                   │
        false ─────┼───── true
          │                 │
   no claim,          attempt claim
   no warning              │
          │        ┌───────┴────────┐
          │     granted           throws
          │        │                │
          │  .py opens in    warning shown,
          │  marimo editor   claim skipped
          └────────┴────────────────┘
                       │
        start-up continues to completion
        (view, commands, ribbon, menus,
         embeds, settings tab, unload
         handlers, layout-ready startup)
```

The terminal state is identical in all three branches with respect to plugin
enablement: `onload()` completes and the plugin stays enabled.

## Invariants

- **INV-1**: `onload()` never propagates an exception from the extension claim.
- **INV-2**: At most one conflict warning is emitted per plugin load.
- **INV-3**: The registrations that follow the claim are performed in every
  branch of the diagram above.
- **INV-4**: When the claim succeeds, run-time behavior is byte-for-byte the
  behavior of the previous release.
