# Implementation Plan: Searchable Plugin Settings

**Branch**: `031-declarative-settings-api` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-declarative-settings-api/spec.md`

## Summary

`MarimoBridgeSettingTab` renders its 13 options imperatively in `display()`.
Obsidian 1.13 added a declarative alternative, `getSettingDefinitions()`, and
only settings described that way are indexed by the global settings search — so
today none of this plugin's options are findable unless the user already knows
which plugin owns them.

Add `getSettingDefinitions()` alongside the existing `display()`, plus
`getControlValue`/`setControlValue` overrides that route persistence through the
plugin's own `saveSettings()` (preserving `invalidateAvailability()`). Per the
clarification session, `display()` is **not** touched: it is the path that
cannot be manually verified (it needs a pre-1.13 host), so it stays byte-for-byte
as shipped and a parity test guards the two lists against drift.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES modules, bundled by esbuild 0.28 to CommonJS `main.js`)

**Primary Dependencies**: Obsidian plugin API — **verified against the installed `obsidian@1.13.1` type definitions**, not from documentation

**Storage**: `data.json` via `loadData`/`saveData` — **unchanged**; no schema or default value moves

**Testing**: Node built-in test runner via `npm test` (`tests/run-tests.mjs` bundles `tests/*.test.ts` with esbuild, aliasing `obsidian` → `tests/stubs/obsidian.ts`)

**Target Platform**: Obsidian Desktop; `manifest.json` `minAppVersion` stays `1.5.7`, so both presentations must coexist

**Project Type**: Single-project Obsidian desktop plugin

**Performance Goals**: None specific — the definitions are built once per render; the only async work (the installation check) already exists today

**Constraints**: `display()` must not be modified (FR-005a); no private Obsidian API; every new literal must live in `src/constants.ts` (machine-enforced by `tests/constants-policy.test.ts`); tabs for indentation

**Scale/Scope**: 13 options across 2 source files (`src/settings.ts`, `src/constants.ts`) plus 1 test file; roughly 250 lines of new production code, all additive

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Assessment |
|-----------|---------|------------|
| I. Language Division | Yes | Spec/plan/tasks/code/commits in English; user-facing chat in Japanese. **PASS** |
| II. Desktop-Only Architecture | Yes | No new platform surface; settings UI only. **PASS** |
| III. Reliable Process Lifecycle | Yes (indirectly) | FR-006 exists precisely to keep `saveSettings()` → `invalidateAvailability()` in the loop, so a changed path/port/token still stops the stale server. Losing it would be a silent regression of this principle — see research.md R3. **PASS** |
| IV. Safe Local Bindings | Yes (indirectly) | The API token and port remain editable; persistence still flows through `saveSettings()`, so token changes still invalidate running servers. No binding behavior changes. **PASS** |
| V. Virtual Environment Preference | No | Detection logic untouched; only how its status is presented. **N/A** |
| VI. Constant Externalization | Yes | Largest single cost of this feature: control-kind discriminators and all 13 settings keys become constants. See research.md R7. **PASS** |
| Core Constraints (stack, externals, tabs, keep comments) | Yes | TypeScript only, no dependency or esbuild `external` change, tabs, existing comments preserved. **PASS** |

**Result**: No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/031-declarative-settings-api/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (R1–R8)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── settings-presentation.md   # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify output)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── settings.ts          # MODIFIED (additive): getSettingDefinitions(),
│                        #   getControlValue(), setControlValue().
│                        #   display() left exactly as-is.
├── constants.ts         # MODIFIED: settings keys, control-kind discriminators,
│                        #   validation messages
├── main.ts              # Untouched
├── server-manager.ts    # Untouched
├── editor-view.ts       # Untouched
└── embed-processor.ts   # Untouched

tests/
├── settings.test.ts     # MODIFIED: structure, parity, and direct unit tests
│                        #   of validate / getControlValue / setControlValue
└── stubs/obsidian.ts    # Untouched (the declarative path is plain data; the
                         #   existing Setting stub already serves the parity test)
```

**Structure Decision**: Single-project layout, unchanged. Both presentations live
on the same class because they are two views of one settings tab; splitting the
definitions into their own module would separate them from the `display()` they
must stay in parity with.

## Implementation Approach

### 1. Constants (`src/constants.ts`)

Three additions, all required by Principle VI (research.md R7):

- **Settings keys** — one constant per persisted key (`port`, `autoStart`,
  `takeOverPyExtension`, …). These are the `key` values the framework passes back
  to `getControlValue`/`setControlValue`.
- **Control-kind discriminators** — `"toggle"`, `"text"`, `"number"`,
  `"dropdown"`. Declared as plain `export const` so their literal types survive
  and the `SettingControl` union still narrows (the existing `MODE_EDIT` /
  `MODE_RUN` constants already prove this pattern works).
- **Validation messages** — the inline error text shown when a numeric value is
  out of range.
- **Numeric bounds** — the `min`/`max` values themselves. `tests/constants-policy.test.ts`
  rejects *non-zero numeric* literals as well as strings, so `min: 1` inlined in
  `src/settings.ts` fails the suite. Reuse `PORT_MAX` and `OFFSET_ONE` where they
  fit and add constants for the rest.

Existing text constants (`SETTING_*_NAME`, `SETTING_*_DESC`, `PLACEHOLDER_*`,
`PORT_MAX`, `MODE_EDIT`/`MODE_RUN`, `TEXT_EMBED_MODE_*`) are **reused as-is** —
that reuse is what makes name/description parity hold by construction.

### 2. Declarative definitions (`src/settings.ts`, additive)

```ts
getSettingDefinitions(): SettingDefinitionItem[] {
    return [ /* 13 rows, in the same order display() emits them */ ];
}
```

Row-by-row mapping (order preserved from `display()`):

| # | Option | Kind | Key |
|---|--------|------|-----|
| 1 | marimo executable path | `text` | `marimoPath` |
| 2 | Python interpreter path | `text` | `pythonPath` |
| 3 | uv command path | `text` | `uvPath` |
| 4 | marimo installation | `render` | — (live status, not a stored value) |
| 5 | Port | `number` (1…`PORT_MAX`) | `port` |
| 6 | Auto-start server on load | `toggle` | `autoStart` |
| 7 | Startup timeout (seconds) | `number` (> 0) | `startupTimeout` |
| 8 | Open .py files in marimo by default | `toggle` | `takeOverPyExtension` |
| 9 | Default embed mode | `dropdown` | `defaultEmbedMode` |
| 10 | Default embed height (px) | `number` (> 0) | `defaultEmbedHeight` |
| 11 | Enable file explorer context menu | `toggle` | `showContextMenu` |
| 12 | Open Markdown files in marimo | `toggle` | `showMarkdownContextMenu` |
| 13 | API token | `text` | `apiToken` |

The list is flat — no heading row. The legacy path emits one via `setHeading()`,
but a heading is not an option and the host already titles the tab; the parity
test skips it (research.md R8).

Row 4 is a `render` definition that reproduces today's status text and
install button and **returns a cleanup function**, so an installation check still
in flight cannot write into a torn-down row (FR-010).

### 3. Persistence overrides (`src/settings.ts`, additive)

```ts
getControlValue(key: string): unknown
setControlValue(key: string, value: unknown): Promise<void>
```

`setControlValue` must:

1. trim the value for the three path keys **and `apiToken`** (FR-009) — all four
   are trimmed by the legacy path today, and `validate` cannot transform, only
   reject (research.md R4);
2. write into `this.plugin.settings`;
3. `await this.plugin.saveSettings()` — **not** the framework's default
   persistence, which would skip `invalidateAvailability()` (FR-006,
   research.md R3);
4. for the path keys, re-run the installation check and refresh the row.

### 4. Tests (`tests/settings.test.ts`)

Per the clarification, coverage is structural plus direct unit tests of our own
logic; the host's rendering framework is not simulated.

- **Structure**: the definitions expose 13 rows in the documented order, with the
  expected kind per row, and every key in `DEFAULT_SETTINGS` is bound exactly once.
- **Parity (FR-005b)**: drive `display()` with the existing fake-container
  collector, drop the heading row, and compare the ordered names against the
  declarative rows.
- **Behavior**: call `validate` directly for in-range and out-of-range numbers;
  call `setControlValue` directly and assert the path keys are stored trimmed,
  that `saveSettings()` was invoked, and that a rejected number leaves the stored
  value untouched.

The two existing `display()`-based tests stay untouched — they remain the
regression guard for the legacy path.

## Complexity Tracking

Not applicable — the Constitution Check reported no violations.
