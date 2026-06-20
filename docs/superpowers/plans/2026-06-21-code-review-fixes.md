# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all eight reviewed defects in server lifecycle management, path validation, settings invalidation, and URL handling.

**Architecture:** Preserve `ServerManager` as the lifecycle owner while making persisted ownership token-aware and exit-driven. Add small pure helpers for Vault notebook resolution and URL query extraction so security and decoding behavior can be tested without the Obsidian runtime.

**Tech Stack:** TypeScript, Obsidian API, Node.js child processes/filesystem, esbuild, Node built-in test runner.

---

### Task 1: Add the regression test harness

**Files:**
- Create: `tests/run-tests.mjs`
- Create: `tests/stubs/obsidian.ts`
- Create: `tests/fixtures/fake-marimo.mjs`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `eslint.config.mts`

- [ ] Add an esbuild-based runner that bundles `tests/*.test.ts` into a temporary
  directory and executes them with `node --test`.
- [ ] Alias the `obsidian` import to a minimal test stub.
- [ ] Add `npm test` and include TypeScript tests in type-checking.
- [ ] Run `npm test` once to verify the harness works.

### Task 2: Specify ownership and lifecycle regressions

**Files:**
- Create: `tests/server-records.test.ts`
- Create: `tests/server-manager.test.ts`

- [ ] Add a failing test requiring every persisted record to contain a token.
- [ ] Add a failing test proving reconciliation uses the stored token.
- [ ] Add a failing test proving an incompatible port occupant is not killed.
- [ ] Add a failing test proving stop requests retain records until exit.
- [ ] Add a failing test proving an exited edit child is not reused.
- [ ] Add a failing test proving startup timeout clears and terminates the edit child.
- [ ] Add a failing test proving process-affecting settings invalidate a ready server.
- [ ] Run `npm test` and confirm failures match the reviewed defects.

### Task 3: Implement safe ownership and exit-driven lifecycle

**Files:**
- Modify: `src/server-records.ts`
- Modify: `src/server-manager.ts`
- Modify: `src/constants.ts`

- [ ] Add `token` to `SpawnedServerRecord` validation and spawn-time persistence.
- [ ] Make token acceptance probes accept an explicit token.
- [ ] Refuse incompatible occupied edit ports instead of calling `killPort`.
- [ ] Attach an idempotent child finalizer that removes records and matching
  managed state on `exit` or `close`.
- [ ] Stop removing records from signal-sending methods.
- [ ] Terminate and clear edit state after startup timeout.
- [ ] Reconcile using the stored token and retain records for processes that
  remain alive after the bounded termination wait.
- [ ] Run lifecycle tests until green.

### Task 4: Validate notebook paths and settings transitions

**Files:**
- Create: `src/notebook-path.ts`
- Create: `tests/notebook-path.test.ts`
- Modify: `src/server-manager.ts`

- [ ] Add failing tests for absolute paths, traversal, symlink escape,
  nonexistent files, non-Python files, and a valid Vault notebook.
- [ ] Implement realpath-based Vault containment validation.
- [ ] Use the normalized relative key and validated absolute spawn path in
  `ensureRunServer`.
- [ ] Snapshot process-affecting settings and stop managed servers when the
  snapshot changes during `invalidateAvailability`.
- [ ] Run path and settings tests until green.

### Task 5: Remove URL double decoding

**Files:**
- Create: `src/url-utils.ts`
- Create: `tests/url-utils.test.ts`
- Modify: `src/editor-view.ts`

- [ ] Add a failing test for a file path containing a literal percent sign.
- [ ] Implement a single-decoding URL query helper.
- [ ] Replace every `decodeURIComponent` call applied to
  `URLSearchParams.get()` output.
- [ ] Run URL tests until green.

### Task 6: Verify the complete change

**Files:**
- Modify only if verification reveals a defect.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Confirm `git diff --check` passes.
- [ ] Confirm unrelated `CLAUDE.md` remains untouched.

