# Research: Resolve Plugin Review Findings

## Decision 1: Represent Electron boundaries with local structural types

**Decision**: Define private interfaces in `src/editor-view.ts` for the small
Electron and `<webview>` surfaces used by the plugin: module loading,
`shell.openExternal`, `executeJavaScript`, `reload`, and console-message event
fields. Cast `window`, created elements, and events through `unknown` into those
interfaces.

**Rationale**: The DOM library does not describe Electron's `<webview>` element
or Obsidian's renderer-side module loader. Structural interfaces remove
`explicit-any` and unsafe-member/call suppressions while documenting exactly
which privileged members the plugin uses. Keeping these types local avoids
claiming a broader or shared Electron API contract.

**Alternatives considered**:

- Add Electron as a development dependency and import its types: rejected
  because Electron is supplied by the host, must remain external, and the
  plugin uses only a very small runtime surface.
- Extend global `Window` and `HTMLElementTagNameMap`: rejected because this
  broadens ambient types for the entire project and can hide unrelated misuse.
- Retain suppressions with descriptions: rejected because disabling
  `no-explicit-any` is explicitly prohibited by review.

## Decision 2: Use `setActiveLeaf` for minimum-version-compatible activation

**Decision**: After setting the view state, call
`workspace.setActiveLeaf(leaf, { focus: true })` when the requested tab should
be active.

**Rationale**: The installed Obsidian type declarations mark `setActiveLeaf`
public since 0.16.3, which predates the manifest's minimum app version 1.5.0.
`revealLeaf` is public only since 1.7.2 and therefore triggers
`no-unsupported-api`. `setActiveLeaf` preserves the user-facing outcome of
activating and focusing the opened notebook without raising the minimum app
version.

**Alternatives considered**:

- Raise `minAppVersion` to 1.7.2: rejected because the feature is a compliance
  cleanup and should not drop support for existing users.
- Remove the explicit activation call: rejected because it could regress
  foreground opening behavior, especially when reusing an existing leaf.
- Suppress `no-unsupported-api`: rejected because the review explicitly
  prohibits that suppression.

## Decision 3: Route routine diagnostics through `console.debug`

**Decision**: Replace non-error `console.log` calls used for embedded-page
forwarding, child stdout/stderr, and normal process exit with `console.debug`.
Keep abnormal conditions on `console.warn` or `console.error`.

**Rationale**: The repository's recommended review configuration permits
`debug`, `warn`, and `error`, while `log` and `info` produce the custom-message
finding. Debug severity preserves diagnostics for developers without presenting
routine process output as user-facing logging.

**Alternatives considered**:

- Remove routine diagnostics: rejected because the specification requires
  diagnostics to remain available and they are useful for marimo startup
  troubleshooting.
- Promote routine output to warnings: rejected because normal stdout, stderr,
  and clean exit are not necessarily warning conditions.
- Disable the custom-message rule: rejected because review prohibits it.

## Decision 4: Model server initialization as a real optional state

**Decision**: Store the manager in an optional private field, expose initialized
access through the existing `servers` surface, and use optional access from
`onunload`.

**Rationale**: `onload` returns early for non-filesystem vault adapters, so the
manager genuinely may not exist when unload runs. The current definite
assignment assertion contradicts that lifecycle and forces a suppression.
Modeling the state accurately removes the directive while preserving strict
access everywhere registered runtime behavior requires an initialized manager.

**Alternatives considered**:

- Make every consumer handle `ServerManager | undefined`: rejected because
  views and callbacks are registered only after initialization and pervasive
  optional access would weaken those invariants.
- Construct a no-op manager before adapter validation: rejected because it
  would require fake paths or a second lifecycle implementation.
- Retain the definite assignment assertion and suppression: rejected because
  the directive itself is a reported error.

## Decision 5: Add a focused review-invariant regression test

**Decision**: Add `tests/review-compliance.test.ts` to validate manifest wording,
author profile URL, and the absence of next-line suppression directives in the
three affected production files.

**Rationale**: Existing ESLint catches most source issues but the supplied
review also applies repository-submission metadata rules that local lint does
not fully enforce, such as rejecting the plugin repository as `authorUrl`.
A small static test prevents reintroduction and complements runtime suites.

**Alternatives considered**:

- Depend only on external review: rejected because feedback would arrive late
  and the author URL warning is predictable locally.
- Put static checks in runtime test files: rejected because manifest/directive
  invariants have a distinct responsibility.
- Snapshot entire files: rejected because snapshots would be noisy and brittle.

## Decision 6: Preserve filesystem and shell warnings as intentional

**Decision**: Do not remove or conceal Node filesystem and child-process usage.
Validate that this feature adds no new capability surface and continues using
the Vault API for plugin-created vault content.

**Rationale**: The plugin's declared purpose requires discovering local Python
environments, launching marimo, managing process trees, and reconciling crash
records. These warnings align with the desktop-only constitution. Removing the
capabilities would break the product rather than improve compliance.

**Alternatives considered**:

- Replace marimo process management with a remote service: rejected as a
  product and security architecture change outside this feature.
- Hide the imports from analysis: rejected as misleading and incompatible with
  transparent review.
