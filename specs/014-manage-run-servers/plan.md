# Implementation Plan: Manage Run-Mode Server Lifecycles

**Branch**: `014-manage-run-servers` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-manage-run-servers/spec.md`

## Summary

Run-mode notebook servers behave like shared, reference-counted resources:
validate and canonicalize the requested notebook inside the Vault, serialize
startup per canonical notebook, grant one usage reference to every successful
embed acquisition, and terminate the server when the final reference is
released. Startup is reference-neutral, each caller acquires independently after
the shared startup resolves, and a disposed-before-acquire guard immediately
releases a late result instead of creating an unreferenced server.

## Technical Context

**Language/Version**: TypeScript 5.8, bundled to CommonJS with esbuild and type-checked with `tsc`.

**Primary Dependencies**: Obsidian Plugin API, `MarkdownRenderChild`, Node.js `fs`, `path`, `net`, and `child_process`; Electron `<webview>`. All runtime-provided modules remain external in esbuild.

**Storage**: No new persisted data. Canonical notebook keys, startup promises,
managed run servers, and usage counts are session-local. Existing spawned-server
records remain responsible for crash recovery.

**Testing**: Node built-in test runner through `npm test`, TypeScript/build gate
through `npm run build`, ESLint through `npm run lint`, plus the manual scenarios
in [quickstart.md](./quickstart.md).

**Target Platform**: Obsidian Desktop on Windows, macOS, and Linux.

**Project Type**: Single-project desktop Obsidian plugin.

**Performance Goals**: Concurrent embeds for one notebook start one process;
reusing a ready run server requires no additional process startup; releasing the
last embed requests termination immediately.

**Constraints**: Run targets must remain inside the real Vault boundary after
symbolic-link resolution. Cleanup must preserve the existing cross-platform
process-tree behavior. No mobile compatibility layer is introduced.

**Scale/Scope**: One edit server plus a small number of run servers and embeds per
session. Changes are localized to run-server acquisition/release, embed teardown,
constants, and regression tests.

## Constitution Check

*GATE: Must pass before implementation. Re-check after design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Language Division | PASS | This plan and all generated artifacts are in English; user communication remains Japanese. |
| II. Desktop-Only Architecture | PASS | The design relies on Obsidian Desktop, Electron webviews, and Node process/filesystem APIs. |
| III. Reliable Process Lifecycle Management | PASS | Final-reference release and plugin-wide cleanup terminate self-started run servers using the existing platform-specific process-tree logic. |
| IV. Safe Local Bindings | PASS | All servers bind to the fixed `127.0.0.1` host. Compatible servers may be adopted; incompatible or foreign edit-port listeners are evicted, and startup stops if the port cannot be released. |
| V. Virtual Environment Preference | PASS | Command resolution is unchanged and continues to prefer the Vault-local environment. |
| VI. Constant Externalization | PASS | Runtime string and non-zero numeric literals are centralized in `src/constants.ts`, with an AST-based regression test enforcing the rule. |

**Gate Result**: PASS. No constitution exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/014-manage-run-servers/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── run-server-lifecycle.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── constants.ts          # Add any lifecycle event/message constants required by the change
├── embed-processor.ts    # Track disposed/acquired state for each run-mode render child
├── notebook-path.ts      # Keep Vault-bound realpath canonicalization
└── server-manager.ts     # Separate shared startup from per-caller acquisition and release

tests/
├── notebook-path.test.ts # Preserve path-boundary coverage
└── server-manager.test.ts# Add concurrent acquisition/release and startup-race coverage
```

**Structure Decision**: Keep the existing single-project layout. `ServerManager`
owns shared process state and reference counts; `MarimoEmbedChild` owns the
lifetime of one embed lease; `notebook-path.ts` remains the pure canonicalization
boundary.

## Phase 0: Research Decisions

The decisions and rejected alternatives are recorded in
[research.md](./research.md). No unresolved technical clarification remains.

## Phase 1: Design

### Acquisition flow

1. Resolve the requested notebook to a canonical Vault-relative key and real
   absolute path.
2. Reuse a ready server or await the single in-flight startup promise for that
   key.
3. Keep startup itself reference-neutral.
4. After a caller receives a healthy server, increment the reference count for
   that caller, retain an original-path-to-canonical-key alias for later release,
   and return the URL.
5. If startup fails or the canonical path is invalid, return failure without
   incrementing.

### Embed lifetime flow

1. A run-mode render child starts in `disposed = false`, `acquired = false`.
2. After acquisition succeeds, it sets `acquired = true` only if it is still
   active and then creates the webview.
3. If the child was disposed while acquisition was pending, it immediately
   releases the newly acquired reference and does not attach a webview.
4. On unload, it releases only when `acquired` is true, ensuring exactly-once
   release.

### Release flow

1. Resolve the same canonical notebook key, falling back to the acquisition
   alias when the notebook has since been renamed or deleted.
2. Decrement one reference without going below zero.
3. Keep the server while the count is positive.
4. At zero, remove tracking first and then request process-tree termination.
5. Plugin-wide cleanup remains authoritative and clears all counts and servers.

### Validation strategy

- Unit-test two concurrent acquisitions to prove the resulting count is two.
- Release them one at a time to prove the server survives the first and is
  terminated after the second.
- Test a disposed-during-startup embed through a small lifecycle seam or a
  manager-level acquire/release sequence.
- Preserve all Vault-bound path tests and add canonical-equivalence coverage.
- Run `npm test`, `npm run build`, `npm run lint`, and `git diff --check`.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
