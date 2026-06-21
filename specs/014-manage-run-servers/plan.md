# Implementation Plan: Run-Server Lifecycle and Consistency Remediation

**Branch**: `014-manage-run-servers` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-manage-run-servers/spec.md`

## Summary

Bring the implemented runtime behavior and the Speckit artifacts back into one
consistent feature boundary. Run-mode notebook servers become shared,
reference-counted resources keyed by a Vault-safe canonical path. Embedded pages
use bounded recovery and show guidance after exhaustion. Untitled notebook
creation searches at most 1,000 candidates. Every server operation uses the
non-configurable `127.0.0.1` host with token authentication, and edit-port
startup either reuses a compatible listener, replaces an incompatible listener,
or stops safely. An automated syntax-tree policy check protects the project's
central runtime-value boundary.

## Technical Context

**Language/Version**: TypeScript 5.8, bundled to CommonJS with esbuild and type-checked with `tsc`.

**Primary Dependencies**: Obsidian Plugin API, `MarkdownRenderChild`, Node.js `fs`, `path`, `net`, and `child_process`; Electron `<webview>`. All runtime-provided modules remain external in esbuild.

**Storage**: No new persisted schema. Canonical notebook keys, aliases, startup
promises, managed run servers, usage counts, and embedded-page recovery state are
session-local. Existing spawned-server records remain responsible for crash
recovery. The obsolete persisted `host` setting is discarded during settings
load and is not written back.

**Testing**: TypeScript tests are bundled by `tests/run-tests.mjs` and executed
with the Node built-in test runner through `npm test`. Static gates are
`npm run build`, `npm run lint`, and `git diff --check`. Automated coverage is
split across path validation, run-server lifecycle, embed teardown, webview
recovery, notebook naming, settings migration, process records, and runtime-value
policy tests. Obsidian Desktop scenarios in [quickstart.md](./quickstart.md)
cover process behavior that unit tests cannot fully reproduce.

**Target Platform**: Obsidian Desktop on Windows, macOS, and Linux.

**Project Type**: Single-project desktop Obsidian plugin.

**Performance Goals**: Concurrent embeds for one notebook start one process;
reusing a ready run server requires no additional process startup; releasing the
last embed requests termination in the release path; webview recovery performs
at most three retries; notebook creation examines at most 1,000 candidates.

**Constraints**: Run targets must remain inside the real Vault boundary after
symbolic-link resolution. Cleanup must preserve the existing cross-platform
process-tree behavior. Every edit and run server must bind to `127.0.0.1`, run
headless with token validation, and provide token-bearing embedded URLs. No
mobile compatibility layer is introduced. Runtime string and non-zero numeric
literals remain subject to Constitution Principle VI.

**Scale/Scope**: One edit server plus a small number of run servers, views, and
embeds per session. The feature spans server lifecycle, path validation,
webview recovery, notebook creation, settings migration, process ownership
records, centralized runtime values, and their regression tests.

## Constitution Check

*GATE: Must pass before implementation. Re-check after design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Language Division | PASS | This plan and all generated artifacts are in English; user communication remains Japanese. |
| II. Desktop-Only Architecture | PASS | The design relies on Obsidian Desktop, Electron webviews, and Node process/filesystem APIs. |
| III. Reliable Process Lifecycle Management | PASS | Final-reference release and plugin-wide cleanup terminate self-started run servers using the existing Windows process-tree and Unix process-group behavior; process records retain crash-recovery ownership. |
| IV. Safe Local Bindings | PASS | All servers run headless with token validation on fixed `127.0.0.1` URLs. Compatible edit servers may be adopted; incompatible or foreign listeners are evicted, and startup stops if the port cannot be released. |
| V. Virtual Environment Preference | PASS | Command resolution is unchanged and continues to prefer the Vault-local environment. |
| VI. Constant Externalization | PASS | Runtime strings, template fragments, and non-zero numeric literals are centralized in `src/constants.ts`, with an AST-based regression test enforcing the rule. |

**Gate Result**: PASS. No constitution exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/014-manage-run-servers/
├── spec.md                    # Expanded functional scope
├── plan.md                    # This implementation plan
├── research.md                # Design decisions and rejected alternatives
├── data-model.md              # Session state and behavior-state models
├── quickstart.md              # Automated and Obsidian validation scenarios
├── tasks.md                   # Phase 2 task inventory
├── contracts/
│   └── run-server-lifecycle.md # Internal behavior contracts
└── checklists/
    └── requirements.md        # Specification quality gate
```

### Source Code (repository root)

```text
src/
├── constants.ts          # Central runtime values and formatting helpers
├── editor-view.ts        # Bounded webview recovery and terminal failure guidance
├── embed-processor.ts    # Run-server lease ownership and late-acquire release
├── main.ts               # Settings migration and bounded notebook naming
├── notebook-path.ts      # Vault-bound realpath canonicalization
├── server-manager.ts     # Server startup, binding, references, ports, and cleanup
├── server-records.ts     # Persisted spawned-process ownership records
├── settings.ts           # Settings schema without a configurable host
└── url-utils.ts          # Existing URL classification used by embedded navigation

tests/
├── constants-policy.test.ts   # AST enforcement for Principle VI
├── editor-view.test.ts        # Webview recovery and local-link behavior
├── embed-processor.test.ts    # Dispose-during-startup lease behavior
├── notebook-creation.test.ts  # 1,000-candidate naming boundary
├── notebook-path.test.ts      # Vault containment and valid notebook startup
├── server-manager.test.ts     # Binding, conflicts, lifecycle, and process state
├── server-records.test.ts     # Ownership-record validation
├── settings.test.ts           # Absence of configurable host
├── fixtures/
│   └── fake-marimo.mjs        # Child-process lifecycle fixture
├── stubs/
│   └── obsidian.ts            # Obsidian API test doubles
└── run-tests.mjs              # Bundle-and-run test harness
```

**Structure Decision**: Keep the existing single-project layout. `ServerManager`
owns process state, fixed-host startup, edit-port resolution, shared run-server
startup, and reference counts. `MarimoEmbedChild` owns one run-server lease.
`editor-view.ts` owns webview recovery. `main.ts` owns notebook-name selection
and legacy settings cleanup. `notebook-path.ts` remains the pure Vault-bound
canonicalization boundary, while `constants.ts` is the sole runtime-value policy
boundary.

## Phase 0: Research Decisions

The run-server, webview recovery, naming bound, fixed binding, port-resolution,
constant-policy, and validation-layer decisions are recorded in
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

### Embedded-page recovery flow

1. Start a readiness watchdog after attaching an embedded page.
2. Cancel recovery behavior once the page reports readiness.
3. When readiness is absent or the main frame fails, retry only while the page
   remains attached and fewer than three retries have occurred.
4. After the third retry also fails, remove the unusable page and display the
   shared recovery guidance exactly once.

### Notebook creation flow

1. Generate candidates from `untitled_marimo.py` through the bounded numbered
   naming sequence.
2. Create and open the first candidate that does not already exist.
3. Stop after 1,000 occupied candidates, modify no file, and display one notice.

### Binding and edit-port resolution flow

1. Discard any legacy persisted host and use `127.0.0.1` for URL generation,
   availability probes, health/auth requests, port checks, and process arguments.
2. If the edit port is free, continue normal startup.
3. If the listener is a token-compatible marimo server, adopt it.
4. Otherwise request termination of every listening PID and wait for the port to
   become free within the bounded confirmation window.
5. Spawn only after the port is free; otherwise stop startup and notify the user.

### Runtime-value policy flow

1. Keep shared runtime strings, template fragments, event names, command
   fragments, addresses, and non-zero numeric values in `src/constants.ts`.
2. Parse every other TypeScript source file in `src/` during tests.
3. Ignore compile-time type/module/property-name literals, but report runtime
   string, template-fragment, or non-zero numeric violations with file locations.

### Validation strategy

#### Automated behavior matrix

| Area | Test files | Required assertions |
|------|------------|---------------------|
| Run-server sharing and release | `tests/server-manager.test.ts`, `tests/embed-processor.test.ts` | One startup for concurrent callers, one reference per caller, exactly-once release, late acquisition cleanup, deletion/rename-safe release, edit-mode neutrality, and zero lingering servers after 10 cycles. |
| Vault boundary and port allocation | `tests/notebook-path.test.ts`, `tests/server-manager.test.ts` | Reject absolute, traversal, symlink-escape, missing, and non-Python targets; use resolved valid paths; skip occupied run ports. |
| Webview recovery | `tests/editor-view.test.ts` | Three retries maximum, terminal guidance exactly once, detached-page no-op, and retained local-link behavior. |
| Notebook creation | `tests/notebook-creation.test.ts` | First available candidate wins; 1,000 collisions create or modify zero files and emit one notice. |
| Safe binding and authentication | `tests/settings.test.ts`, `tests/server-manager.test.ts` | No host setting, legacy host ignored, edit/run URLs fixed to `127.0.0.1`, headless/token process arguments present, compatible adoption, incompatible/foreign eviction, and no spawn when release fails. |
| Process ownership | `tests/server-records.test.ts`, `tests/server-manager.test.ts` | Only valid token-bearing records load; records survive requested termination and clear after confirmed exit; orphan confirmation uses the persisted token. |
| Runtime-value policy | `tests/constants-policy.test.ts` | Runtime strings, template fragments, and non-zero numeric literals outside `src/constants.ts` fail with locations. |

Tests already present remain regression coverage. Missing assertions identified by
this matrix are added through a refreshed `/speckit-tasks` run before the feature
is considered fully covered.

#### Static and packaging gates

1. `npm test`
2. `npm run build`
3. `npm run lint`
4. `git diff --check`
5. `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`

#### Manual Obsidian Desktop validation

- Verify concurrent embeds, final-reference shutdown, plugin reload cleanup, and
  ten repeated open/close cycles.
- Verify visible recovery guidance after a deliberately unrecoverable embedded
  page.
- Verify the Host setting is absent and server processes use `127.0.0.1`,
  headless startup, and token authentication.
- Verify compatible edit-server adoption, incompatible listener replacement, and
  safe failure when the edit port cannot be released.
- Verify normal application exit and next-launch orphan reconciliation on the
  supported desktop platform.

### Post-design Constitution Check

All six principles remain PASS after design. The expanded structure adds no
mobile path, external binding, unauthenticated request, alternative process
cleanup model, or inline runtime-value exception.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
