# Implementation Plan: Resilient `.py` Extension Takeover

**Branch**: `030-fix-py-extension-conflict` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-fix-py-extension-conflict/spec.md`

## Summary

`MarimoBridgePlugin.onload()` calls `registerExtensions(["py"], VIEW_TYPE_MARIMO)`
unguarded when `takeOverPyExtension` is enabled (the default). Obsidian's view
registry allows one owner per extension and **throws** when the extension is
already claimed, so the exception escapes `onload()`, Obsidian reports a plugin
failure and force-disables the plugin, and every registration after that line
(commands, ribbon, context menus, code-block processor, settings tab, unload
handlers, layout-ready startup) never runs.

The fix keeps the takeover **best-effort**: isolate the claim in a small private
method that catches the failure, logs the underlying error, and shows a single
`Notice` explaining the conflict and the remaining ways to open a notebook.
Start-up then continues normally. New user-facing and log strings go to
`src/constants.ts` (Constitution VI), the takeover setting description gains a
sentence about precedence, and `tests/plugin-lifecycle.test.ts` grows an
`onload()` harness that proves start-up survives a throwing `registerExtensions`.

## Technical Context

**Language/Version**: TypeScript 5.8 (ES modules, bundled by esbuild 0.28 to CommonJS `main.js`)

**Primary Dependencies**: Obsidian plugin API (`obsidian`, external), Node built-ins (`path`, `fs`, `child_process`), Electron `<webview>`

**Storage**: `data.json` via `loadData`/`saveData` (settings) — unchanged by this feature

**Testing**: Node built-in test runner via `npm test` (`tests/run-tests.mjs` bundles `tests/*.test.ts` with esbuild and aliases `obsidian` to `tests/stubs/obsidian.ts`)

**Target Platform**: Obsidian Desktop 1.5.7+ (Windows/macOS/Linux), `isDesktopOnly: true`

**Project Type**: Single-project Obsidian desktop plugin

**Performance Goals**: No measurable start-up cost added; the change is one `try`/`catch` on a path already executed once per load

**Constraints**: `onload()` must never throw; no new runtime dependencies; no private Obsidian API (`app.viewRegistry`) — `eslint-plugin-obsidianmd` and Obsidian review guidelines discourage it; all literals externalized to `src/constants.ts`; tabs for indentation

**Scale/Scope**: 3 source files touched (`src/main.ts`, `src/constants.ts`, `src/settings.ts` only via constant text), 1 test file extended; roughly 40 lines of production change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Assessment |
|-----------|---------|------------|
| I. Language Division | Yes | All spec/plan/tasks/code/commits in English; user-facing chat in Japanese. **PASS** |
| II. Desktop-Only Architecture | Yes | No new API surface; nothing added that would need mobile abstraction. **PASS** |
| III. Reliable Process Lifecycle | Yes (indirectly) | Today the throw skips `registerDomEvent(beforeunload/unload)` and the layout-ready path, so a conflicting environment loses the synchronous server shutdown hooks. The fix restores them, strengthening compliance. **PASS** |
| IV. Safe Local Bindings | No | No server, port, or token behavior is touched. **N/A** |
| V. Virtual Environment Preference | No | No Python discovery change. **N/A** |
| VI. Constant Externalization | Yes | New notice/log strings and the amended setting description are added to `src/constants.ts`; `tests/constants-policy.test.ts` enforces this for `src/*.ts`. **PASS** |
| Core Constraints (stack, externals, tabs, keep comments) | Yes | TypeScript only, no dependency or esbuild `external` change, tabs, existing docstrings preserved and extended. **PASS** |

**Result**: No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/030-fix-py-extension-conflict/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── startup-registration.md   # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify output)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── main.ts              # MODIFIED: extract registerPyExtension(); guard the claim
├── constants.ts         # MODIFIED: NOTICE_/LOG_ strings, amended SETTING_TAKEOVER_DESC
├── settings.ts          # UNCHANGED code; renders the amended description constant
├── server-manager.ts    # Untouched
├── editor-view.ts       # Untouched
└── embed-processor.ts   # Untouched

tests/
├── plugin-lifecycle.test.ts  # MODIFIED: onload() harness + conflict/no-conflict cases
├── stubs/obsidian.ts         # Extended only if the harness needs a shared fake
└── ...                       # Other suites untouched
```

**Structure Decision**: Single-project layout, unchanged. The feature is a
localized hardening of the existing plugin entry point; no new module is
introduced because a one-purpose private method on `MarimoBridgePlugin` keeps the
failure handling next to the registration it guards.

## Implementation Approach

### 1. Constants (`src/constants.ts`)

Add to `RUNTIME_CONSTANTS`, next to the existing `NOTICE_*` / `LOG_*` entries:

- `NOTICE_PY_EXTENSION_CONFLICT` — user-facing text naming the conflict and the
  fallback ("Open in marimo" from the file menu / command palette).
- `LOG_PY_EXTENSION_CONFLICT` — `[MarimoBridge]`-prefixed console label, matching
  the style of `LOG_RENDER_ERROR` and `LOG_UNSAFE_PROTOCOL`.

Amend `SETTING_TAKEOVER_DESC` to add one sentence: another plugin that already
handles `.py` takes precedence. The existing sentence "Change takes effect after
reloading the plugin." already satisfies the reload half of FR-008 and is kept.

### 2. Guarded registration (`src/main.ts`)

Replace the inline block at `src/main.ts:128-133` with a call to a new private
method, keeping the existing explanatory comment:

```ts
if (this.settings.takeOverPyExtension) {
    this.registerPyExtension();
}
```

```ts
/**
 * Claim `.py` as a marimo-owned extension. Obsidian permits one owner per
 * extension and throws when it is already taken, so a competing plugin must
 * not abort our onload: degrade to "no default editor" and tell the user.
 */
private registerPyExtension(): void {
    try {
        this.registerExtensions(
            [RUNTIME_CONSTANTS.EXTENSION_PY],
            VIEW_TYPE_MARIMO
        );
    } catch (e) {
        console.warn(RUNTIME_CONSTANTS.LOG_PY_EXTENSION_CONFLICT, e);
        new Notice(
            RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT,
            NOTICE_TIMEOUT_MS
        );
    }
}
```

The `catch` is intentionally broad: Obsidian signals the conflict only by
throwing, and any other failure of an optional convenience must not be fatal
either (spec Edge Cases). `Notice` and `NOTICE_TIMEOUT_MS` are already imported.

### 3. Regression coverage (`tests/plugin-lifecycle.test.ts`)

The existing suite builds a plugin with `Object.create(MarimoBridgePlugin.prototype)`
and assigns fakes as own properties; the new cases reuse that pattern so the
shared `tests/stubs/obsidian.ts` `Plugin` class does not need registration
methods. The harness must supply:

- own no-op/recording stubs for `registerView`, `registerExtensions`,
  `registerMarkdownCodeBlockProcessor`, `addRibbonIcon`, `addCommand`,
  `registerEvent`, `registerDomEvent`, `addSettingTab`;
- `manifest` and an adapter that is `instanceof FileSystemAdapter` (subclass the
  stub and return a `mkdtemp` base path) so `onload()` clears its early return
  and `reconcileOrphans()` touches only a throwaway directory;
- a fake `app` with `vault.adapter`, `workspace.on()`, and an
  `workspace.onLayoutReady()` that stores the callback without invoking it, so
  no marimo process is ever spawned;
- `globalThis.window` set to an object with `addEventListener` for the duration
  of the test — `onload()` passes `window` to `registerDomEvent`, and bare
  `window` is a `ReferenceError` under Node;
- `console.warn` temporarily captured to assert the diagnostic (FR-005).

Cases: (a) throwing `registerExtensions` → `onload()` resolves, all later
registrations recorded, exactly one conflict `Notice`, one `console.warn`;
(b) succeeding `registerExtensions` → called once with `["py"]` and
`VIEW_TYPE_MARIMO`, no conflict notice; (c) `takeOverPyExtension: false` →
`registerExtensions` never called, no notice.

All fakes are restored in a `finally` block so the suite stays order-independent.

## Complexity Tracking

Not applicable — the Constitution Check reported no violations.
