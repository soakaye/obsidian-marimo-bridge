# Phase 0 Research: Resilient `.py` Extension Takeover

**Feature**: `030-fix-py-extension-conflict` | **Date**: 2026-08-14

No `NEEDS CLARIFICATION` markers were carried into Technical Context. The
research below records the decisions that shaped the implementation approach.

## R1 — Failure mode: why the plugin disables itself

**Decision**: Treat the failed extension claim as a recoverable, expected
condition and contain it inside `onload()`.

**Rationale**: `Plugin.registerExtensions()` delegates to Obsidian's view
registry, which maps one extension to exactly one view type and rejects a
duplicate by throwing `Error: Attempting to register an existing file extension
"py"`. The call sits at `src/main.ts:129`, so the exception unwinds `onload()`;
Obsidian's plugin loader catches it, logs `Plugin failure: marimo-bridge`, and
leaves the plugin disabled — matching the reporter's console output and the
toggle that flips back to off. Everything after line 133 is skipped, including
the `beforeunload`/`unload` handlers that Constitution III relies on.

**Alternatives considered**:

- *Let it fail and document the conflict* — rejected: the plugin is 100%
  unusable in an environment where only one optional convenience is unavailable.
- *Register `.py` last, after every other registration* — rejected: ordering
  makes the blast radius smaller but the plugin still fails to load and is still
  disabled by Obsidian.

## R2 — Detect the conflict up front, or catch the throw?

**Decision**: Attempt the registration and catch the failure.

**Rationale**: Obsidian's public `Plugin` API exposes no "is this extension
taken?" query. The information lives on `app.viewRegistry` (`typeByExtension`,
`getTypeByExtension`, `unregisterExtensions`), which is absent from
`obsidian.d.ts`; reaching it requires an unsafe cast, is flagged by
`eslint-plugin-obsidianmd`, and is a common rejection reason in Obsidian's
community-plugin review. `try`/`catch` needs no private API and is robust to a
future change in how the registry reports the conflict.

**Alternatives considered**:

- *`(this.app as any).viewRegistry.getTypeByExtension("py")`* — rejected on
  review-compliance grounds; `tests/review-compliance.test.ts` already guards
  `src/main.ts` against lint suppressions, which such a cast would invite.
- *Race-free "check then register"* — impossible without the private registry
  and pointless anyway: another plugin can claim `.py` between the two calls.

## R3 — Scope of the `catch`

**Decision**: Catch every throwable from the claim, not just the
already-registered message.

**Rationale**: The conflict is identified only by an error message string, which
is unstable across Obsidian versions and unlocalized; matching on it would make
the guard silently regress. The claim is an optional convenience, so no failure
of it justifies aborting start-up. The original error object is passed to
`console.warn` so the true cause is never lost (FR-005).

**Alternatives considered**:

- *Match `/existing file extension/`, rethrow otherwise* — rejected: brittle
  string coupling, and rethrowing reintroduces the exact defect for any other
  failure mode.

## R4 — Restoring the takeover without a reload

**Decision**: Do not attempt runtime re-registration; keep the claim a
load-time-only action and document it in the setting description.

**Rationale**: Releasing an extension claim requires
`app.viewRegistry.unregisterExtensions()`, again private API (see R2). Obsidian's
own `Plugin.registerExtensions` already registers an unregister hook for plugin
unload, so disabling and re-enabling the plugin — or reloading Obsidian — is the
supported recovery path once the competing plugin is turned off. The existing
description already says the change takes effect after a reload; one sentence
about precedence completes FR-008.

**Alternatives considered**:

- *Re-attempt the claim when the setting toggles* — rejected: without a
  supported unregister it can only ever add, never remove, and it would produce a
  second conflict notice for the same condition.
- *Poll for the extension becoming free* — rejected: private API, unbounded
  background work, no user benefit over a reload.

## R5 — Testing `onload()` under the existing harness

**Decision**: Extend `tests/plugin-lifecycle.test.ts` with an `onload()` harness
built from own-property fakes on an `Object.create(MarimoBridgePlugin.prototype)`
instance, rather than growing `tests/stubs/obsidian.ts`.

**Rationale**: The suite never calls the stub `Plugin` constructor, so own
properties shadow the prototype cleanly and each test declares exactly the
surface it exercises. Investigation of `onload()` surfaced three concrete
requirements the harness must satisfy:

1. The vault adapter must be `instanceof FileSystemAdapter` or `onload()` returns
   early before ever reaching the registration under test; a subclass returning a
   `mkdtemp` path also keeps `ServerRecordStore` I/O out of the repository.
2. `onload()` passes the bare identifier `window` to `registerDomEvent`; Node has
   no `window`, so the test must define `globalThis.window` (with
   `addEventListener`) and delete it afterwards.
3. `workspace.onLayoutReady` must record its callback without invoking it, so no
   marimo availability check or server spawn happens during the test.

`ServerManager`'s constructor performs no I/O beyond `fs.realpathSync` (which
falls back to the input path on failure), and `reconcileOrphans()` is fire-and-
forget over a missing records file, so neither needs to be mocked.

**Alternatives considered**:

- *Add registration methods to the shared `obsidian` stub* — deferred: it would
  make every suite pay for a surface only this test needs. If a second suite ever
  needs `onload()`, promote the harness then.
- *Assert on the bundled `main.js`* — rejected: tests run against `src/`, and a
  build artifact assertion would not pin the behavior.
