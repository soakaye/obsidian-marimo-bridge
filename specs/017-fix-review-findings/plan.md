# Implementation Plan: Resolve Plugin Review Findings

**Branch**: `017-fix-review-findings` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-fix-review-findings/spec.md`

## Summary

Resolve the two manifest findings and ten source-directive findings reported by
plugin review without removing the desktop-only capabilities needed to run
marimo. The implementation replaces lint suppressions with explicit boundary
types for Electron/webview interactions, models optional server initialization
truthfully, uses the minimum-version-compatible workspace activation API, and
routes routine diagnostics through the permitted debug console level. A focused
regression test will lock the metadata and no-suppression requirements while
existing editor and server tests protect runtime behavior.

## Technical Context

**Language/Version**: TypeScript 5.8, targeting ES2021

**Primary Dependencies**: Obsidian API, Electron runtime exposed by Obsidian
Desktop, Node.js `child_process`/`fs`/`path`, `eslint-plugin-obsidianmd`

**Storage**: Existing plugin manifest metadata, vault files through the Obsidian
Vault API, and existing local crash-recovery records; no new persisted data

**Testing**: Node built-in test runner bundled through esbuild, TypeScript
type-checking, ESLint flat configuration, and manual Obsidian Desktop validation

**Target Platform**: Obsidian Desktop, minimum app version 1.5.0

**Project Type**: Single-project desktop plugin

**Performance Goals**: No measurable change to notebook open time, webview
recovery timing, server startup, or shutdown

**Constraints**: Remove all ten reported source suppressions; do not disable
review rules; preserve direct filesystem and process execution required by the
desktop architecture; keep vault writes on the Vault API; use tabs; preserve
existing comments/docstrings; externalize new runtime literals

**Scale/Scope**: Five production files (`manifest.json`, `src/constants.ts`,
`src/editor-view.ts`, `src/main.ts`, `src/server-manager.ts`), one focused
regression test, and no new user-facing feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Planning response |
|-----------|--------|-------------------|
| I. Language Division | PASS | All generated artifacts and planned code/test changes are in English; user communication remains Japanese. |
| II. Desktop-Only Architecture | PASS | Electron `<webview>`, Node filesystem access, and child processes are retained. No mobile abstraction is introduced. |
| III. Reliable Process Lifecycle Management | PASS | The plan preserves `stopAll`, `stopAllSync`, process-group termination, and Windows tree termination. Optional initialization is modeled without weakening cleanup. |
| IV. Safe Local Bindings | PASS | No change is planned to loopback binding, token propagation, adoption checks, or port fallback. |
| V. Virtual Environment Preference | PASS | Executable discovery and environment preference are unchanged. |
| VI. Constant Externalization | PASS | The only possible new runtime error text for unavailable server access will be added to `src/constants.ts`; type/interface names add no runtime literals. |

**Gate result**: PASS. The filesystem and shell warnings are expected
consequences of Principles II, III, and V, not constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/017-fix-review-findings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── review-compliance.md
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
manifest.json                  # Public plugin metadata
src/
├── constants.ts              # Runtime strings, numbers, and formatters
├── editor-view.ts            # Electron/webview boundary and event routing
├── main.ts                   # Plugin lifecycle and workspace activation
└── server-manager.ts         # Child-process lifecycle and diagnostics
tests/
├── editor-view.test.ts       # Existing webview behavior regression tests
├── server-manager.test.ts    # Existing process lifecycle regression tests
└── review-compliance.test.ts # New manifest/directive regression checks
```

**Structure Decision**: Keep the existing single-project layout. Add one test
file dedicated to review invariants rather than mixing static metadata checks
into runtime-oriented suites. Keep Electron boundary types private to
`editor-view.ts`; they describe an implementation boundary and are not shared
domain types.

## Phase 0 — Research

See [research.md](./research.md). All technical questions are resolved:

- Electron/webview members can be represented with local structural interfaces
  and an `unknown` boundary cast, eliminating explicit `any` and unsafe calls.
- `Workspace.setActiveLeaf(leaf, { focus: true })` is public since 0.16.3 and is
  compatible with the manifest's minimum app version 1.5.0.
- The configured review rules permit `console.debug`, `console.warn`, and
  `console.error`; routine forwarded output should use `console.debug`.
- Server initialization must be modeled as optional because `onload` can return
  before construction for unsupported vault adapters.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) defines the manifest metadata record, the
  private Electron/webview structural contracts, and the server-manager
  initialization state.
- [contracts/review-compliance.md](./contracts/review-compliance.md) defines the
  externally observable review and runtime compatibility contract.
- [quickstart.md](./quickstart.md) provides automated and manual validation.

### Implementation touch points

1. `manifest.json`
   - Remove the redundant host-product name from `description`.
   - Change `authorUrl` to `https://github.com/soakaye`.

2. `src/editor-view.ts`
   - Add narrow local interfaces for the Electron module, Electron-enabled
     window, marimo webview element, and console-message event.
   - Cast through `unknown` once at each untyped platform boundary.
   - Create the webview as the narrow element type so `executeJavaScript()` and
     `reload()` require no suppression.
   - Type the console-message listener parameter as `Event`, narrow it locally,
     and replace the fallback `console.log` with `console.debug`.
   - Preserve all existing navigation, auth retry, reload, and file-change
     behavior.

3. `src/main.ts` and `src/constants.ts`
   - Back the public `servers` accessor with an optional private manager so the
     non-filesystem early return is represented truthfully.
   - Use optional access only in `onunload`; retain strict access after
     successful initialization through the accessor.
   - Add any accessor failure message to `src/constants.ts`.
   - Replace `revealLeaf` with `setActiveLeaf(leaf, { focus: true })`.

4. `src/server-manager.ts`
   - Replace routine stdout, stderr, and normal-exit `console.log` calls with
     `console.debug`.
   - Retain warnings and errors at their current severity.

5. `tests/review-compliance.test.ts`
   - Parse `manifest.json` and assert the description excludes the forbidden
     word and `authorUrl` equals the author profile.
   - Read the three affected source files and assert they contain no
     `eslint-disable-next-line` directives.
   - Keep behavior verification in the existing editor/server suites, extending
     those suites only if implementation changes expose an uncovered path.

### Test-first implementation order

1. Add the review-compliance regression test and confirm it fails against the
   current manifest and source suppressions.
2. Correct manifest metadata and confirm only source checks remain failing.
3. Introduce typed Electron/webview boundaries and debug-level forwarding, then
   run the editor suite.
4. Model optional server initialization and switch workspace activation API,
   then run type-checking and the complete regression suite.
5. Change managed-process routine logging to debug and run server lifecycle
   tests.
6. Run `npm test`, `npm run build`, and `npm run lint`; then execute the manual
   scenarios in `quickstart.md`.

## Post-Design Constitution Re-Check

All gates remain PASS. The design introduces no new process, filesystem,
network, persistence, or platform behavior. The only added runtime literal, if
the guarded accessor requires one, is centralized in `src/constants.ts`.
Process cleanup and safe local binding behavior remain unchanged.

## Complexity Tracking

No constitution violations require justification.
