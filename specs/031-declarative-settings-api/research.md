# Phase 0 Research: Searchable Plugin Settings

**Feature**: `031-declarative-settings-api` | **Date**: 2026-08-14

The Obsidian API surface used here shipped after this codebase was last touched,
so every finding below was verified against the **installed** type definitions
(`node_modules/obsidian/obsidian.d.ts`, version 1.13.1) rather than from
documentation or memory. Where a claim came from the web it is marked as such.

## R1 — The API contract, verified against the shipped types

**Decision**: Implement `getSettingDefinitions()` on `MarimoBridgeSettingTab` and
override `getControlValue` / `setControlValue`.

**Rationale**: The installed `obsidian.d.ts` declares, on `PluginSettingTab`:

```ts
getSettingDefinitions(): SettingDefinitionItem[];
getControlValue(key: string): unknown;
setControlValue(key: string, value: unknown): void | Promise<void>;
```

`SettingDefinitionItem` is a union of `SettingDefinition` (a single row),
`SettingDefinitionGroup`, `SettingDefinitionList`, and `SettingDefinitionPage`.
A single row is itself a union discriminated by which of `control`, `render`,
or `action` is present (all three are `?: never` on the other variants), plus an
"empty" variant with none of them. Every row carries `name`, optional `desc`,
`aliases`, `searchable`, and `visible`.

`SettingControl` is discriminated by `type` and covers `toggle`, `dropdown`,
`text`, `textarea`, `number`, `file`, `folder`, `slider`, `color`. Each control
extends `SettingControlBase<V>` which supplies `key`, `defaultValue`,
`validate?: (value: V) => string | void | Promise<string | void>`, and
`disabled`.

**Alternatives considered**:

- *Trusting the published migration guide alone* — rejected: the guide's
  summary of the types was incomplete (it showed a flat `control` shape and no
  `SettingDefinitionItem` union). Reading the shipped `.d.ts` is the only source
  that matches what the compiler will enforce.

## R2 — How the two presentations stay mutually exclusive (FR-004)

**Decision**: Rely on the host. Define both methods unconditionally; do not
feature-detect the host version.

**Rationale**: The `display()` doc comment in the installed types states it is
"Not called when `getSettingDefinitions` returns a non-empty array", and marks
`display()` `@deprecated Since 1.13.0`. On hosts older than 1.13 the base class
has no `getSettingDefinitions` at all, so the extra method on our subclass is
simply never invoked and `display()` runs as it does today. Both directions are
therefore handled by the host with no version check in plugin code — which is
also why FR-004 needs no runtime guard.

**Alternatives considered**:

- *Branch on `apiVersion` / `requireApiVersion()`* — rejected: adds a runtime
  code path that can only be wrong (the host already arbitrates), and would need
  its own test matrix.
- *Return `[]` under some condition to force the legacy path* — rejected: it
  would silently disable search, which is the entire point of the feature.

## R3 — Preserving the existing save side effects (FR-006)

**Decision**: Override `setControlValue` to mutate `plugin.settings` and then
`await plugin.saveSettings()`.

**Rationale**: The base `PluginSettingTab.setControlValue` "Mutates and persists
`this.plugin.settings`" — i.e. it persists via the plugin's data store directly.
This plugin's `saveSettings()` does more than persist: it calls
`servers.invalidateAvailability()`, which stops managed servers when a
process-affecting setting (path, port, token) changed. Letting the framework
persist for us would silently drop that, leaving a stale server running against
the old configuration. Overriding is the only way to satisfy FR-006.

`getControlValue` is overridden alongside it for symmetry and to keep the read
path explicit against `MarimoBridgeSettings` rather than relying on the base's
untyped lookup.

**Alternatives considered**:

- *Keep the default persistence and hook `onChange` elsewhere* — rejected: the
  declarative API exposes no per-control change hook; `validate` runs before
  persistence and cannot be used as a commit callback.

## R4 — Trimming and post-save refresh for path options (FR-009)

**Decision**: Trim inside the `setControlValue` override for the three path
keys, and refresh the installation status from there.

**Rationale**: `validate` returns `string | void` — it can *reject* a value but
cannot *transform* it, so trimming cannot live there. `setControlValue` is the
only hook that sees the value on its way to storage. The same override is the
natural place to re-run the installation check, mirroring what the legacy
`display()` does in its blur handler.

Consequence, accepted: the stored value is trimmed while the text the user typed
stays on screen until the tab re-renders. This matches the spec's Assumption
that the user's text is left in place rather than snapped back.

**Alternatives considered**:

- *Trim in `getControlValue` on read* — rejected: it would hide untrimmed data
  rather than fix it, and the untrimmed value would still reach the server
  manager through `plugin.settings`.

## R5 — Numeric validation (FR-008)

**Decision**: Use the `number` control with `min`/`max` plus a `validate`
callback that returns a message for out-of-range input.

**Rationale**: The shipped `SettingNumberControl` carries `min`, `max`, `step`,
and inherits `validate`. Per the type docs, returning a non-empty string
"reject[s] the change and surface[s] it as an inline error message"; returning
void accepts and persists. Rejection therefore leaves the stored value untouched
— exactly FR-008 — without any manual revert logic.

Ranges come straight from the existing legacy handlers: port is `1..PORT_MAX`,
startup timeout is `> 0`, embed height is `> 0`.

Also noted from the type docs: `validate` runs once on mount, so a value
persisted by an older plugin version that is now out of range surfaces its error
immediately without being rewritten. This is what the spec's "stored value is
already invalid" edge case requires, and it comes for free.

**Alternatives considered**:

- *Keep `text` controls and parse manually* — rejected: loses the numeric input
  affordances and re-implements what `min`/`max` already express declaratively.

## R6 — The installation-status row

**Decision**: Express it as a `render` definition returning a cleanup function.

**Rationale**: This row is not a stored preference: it shows an asynchronously
detected runtime version (or a not-installed state) and owns an install button
whose label and disabled state change as the check runs. No `control` type
models that. `SettingDefinitionRender` exists for exactly this case and — per
the shipped docs — "May return a cleanup function, invoked before the row is
torn down", which is how FR-010 is satisfied for the in-flight check.

**Alternatives considered**:

- *`action` type* — rejected: it models a clickable row, but gives no place to
  own the async status text or to mutate the button's label mid-flight.
- *Drop the row from the searchable presentation* — rejected: it would violate
  FR-005 (same option set in both presentations).

## R7 — Constant externalization under Principle VI

**Decision**: Add constants for every new literal — control-kind discriminators
(`"toggle"`, `"text"`, `"number"`, `"dropdown"`; the render row needs no
discriminator, since it is identified by the presence of its `render` property),
every settings key (`"port"`, `"autoStart"`, …), and every non-zero numeric bound.

**Rationale**: `tests/constants-policy.test.ts` walks every `src/*.ts` except
`constants.ts` and reports **any** non-empty string literal — *and any non-zero
numeric literal* — that is not a type node, an import/export, or a property
*name*. A declarative definition is a value-position object literal, so
`type: "toggle"`, `key: "port"`, and `min: 1` are all violations. The numeric
half is easy to overlook: the plan's constant list must cover the `min`/`max`
bounds, not just text. Declaring them as `export const` in `constants.ts` keeps their
literal types intact (as the existing `MODE_EDIT`/`MODE_RUN` constants already
demonstrate), so the discriminated unions still narrow correctly.

This is the single largest hidden cost in the feature and the most likely cause
of a red build if missed — hence its own research entry.

**Alternatives considered**:

- *Exempt `src/settings.ts` from the policy test* — rejected: it would weaken a
  constitution-enforcing guard for the convenience of one feature.

## R8 — Parity testing between the two presentations (FR-005b)

**Decision**: Compare the ordered list of option **names** produced by each
presentation, and separately assert that every persisted settings key appears
exactly once across the declarative definitions.

**Rationale**: The two presentations expose different shapes — the legacy path
produces `Setting` objects (the test stub already records `name`/`desc` and
collects them in order, which the existing settings tests rely on), while the
declarative path produces plain data carrying both `name` and `key`. Names and
order are the only attributes present on both sides, so that is what parity can
compare; key coverage is asserted against `DEFAULT_SETTINGS` instead, which is
the actual source of truth for what must be configurable.

One deliberate exclusion: the legacy path emits a leading heading row
(`SETTINGS_TAB_HEADER`) via `setHeading()`. A heading is not an option, and the
host already titles the tab, so the declarative list is flat with no heading and
the parity comparison skips that row. This is recorded here rather than left
implicit because it is the one place the two presentations legitimately differ.

**Alternatives considered**:

- *Compare descriptions too* — deferred: descriptions are built with runtime
  substitution (platform-specific example paths) in the legacy path; comparing
  them would couple the test to that formatting without catching a class of bug
  that name+order parity misses.
