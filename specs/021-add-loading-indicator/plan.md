# Implementation Plan: Add Marimo Loading Indicator

**Branch**: `021-add-loading-indicator` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/021-add-loading-indicator/spec.md`

## Summary

Add one shared loading-status layer to every marimo webview so full-tab editors,
the marimo home page, and inline embeds show a centered spinner with
`Loading marimo…` until the guest page reports readiness. The existing
main-frame navigation boundary starts a new loading cycle only when the prior
cycle was ready; redirects and recovery reloads remain in the current cycle so
the three-retry cap cannot be reset indefinitely. Readiness removes the layer,
while exhausted recovery replaces it with the existing failure guidance.

## Technical Context

**Language/Version**: TypeScript 5.8 targeting ES2021; HTML; Vanilla CSS

**Primary Dependencies**: Obsidian desktop API and Electron `<webview>` runtime;
no new dependencies

**Storage**: N/A; all loading state is transient and local to one webview

**Testing**: Node.js built-in test runner with tests bundled by esbuild

**Target Platform**: Obsidian Desktop on Electron

**Project Type**: Desktop plugin

**Performance Goals**: Loading feedback is created synchronously with webview
creation or replacement-page navigation and removed on the matching readiness
event; no polling or additional network requests

**Constraints**: Preserve the existing server-starting message, authentication
redirect handling, bridge generation lifecycle, three-attempt recovery cap,
full-tab webview reuse, inline embed sizing, and detached-view safeguards

**Scale/Scope**: One transient loading state per marimo webview; full-tab editor,
home page, edit embeds, and run embeds share the same implementation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Result | Design alignment |
|-----------|--------|------------------|
| I. Language Division | PASS | All generated artifacts are in English; user communication remains Japanese. |
| II. Desktop-Only Architecture | PASS | The design uses the existing Electron webview events and introduces no mobile path. |
| III. Reliable Process Lifecycle Management | PASS | No process startup, ownership, or shutdown behavior changes. |
| IV. Safe Local Bindings | PASS | Server URLs, token propagation, authentication redirects, and loopback policy are unchanged. |
| V. Virtual Environment Preference | PASS | Python and marimo detection are outside this feature. |
| VI. Constant Externalization | PASS | New text, class names, and animation values used by runtime code are centralized in the existing constants/style boundaries. |
| Core Constraints | PASS | The change remains TypeScript/HTML/CSS, uses tabs in code, retains comments, and adds no bundled runtime dependency. |

**Post-design re-check**: PASS. The selected shared-host implementation and UI
contract do not introduce a constitutional exception.

## Project Structure

### Documentation (this feature)

```text
specs/021-add-loading-indicator/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── loading-state.md
└── tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── constants.ts          # Loading text and CSS class constants
├── editor-view.ts        # Shared webview loading lifecycle
└── embed-processor.ts    # Existing embed-to-webview handoff, behavior preserved

tests/
├── editor-view.test.ts   # Shared loading lifecycle regression coverage
└── embed-processor.test.ts

styles.css                # Centered overlay, spinner, theme and reduced-motion rules
```

**Structure Decision**: Keep loading ownership in `createMarimoWebview`, the
single boundary used by full-tab and inline marimo surfaces. Do not create a
second controller, new dependency, or duplicated full-tab/embed lifecycle.

## Implementation Design

### Shared loading layer

- Add `TEXT_LOADING_MARIMO`, a loading-layer class, and a spinner class to
  `src/constants.ts`.
- In `createMarimoWebview`, create idempotent `showLoading()` and
  `hideLoading()` closures that own at most one status element.
- Create the initial loading layer before attaching the webview so no blank
  frame is exposed. The opaque layer contains the spinner and exact loading
  text, blocks pointer interaction, and marks the covered webview inert so
  keyboard interaction cannot reach stale content.
- Give the loading text polite status semantics and mark the spinner decorative
  so assistive technology announces each loading cycle once without
  interrupting higher-priority output.
- Position the full-tab and embed wrappers as containing blocks; position the
  loading layer over the webview with an opaque theme background and centered
  content. Preserve the existing configured embed height.
- Stop spinner animation under `prefers-reduced-motion: reduce` while retaining
  the visible ring and text.

### Load-cycle transitions

- Treat the existing boolean readiness state as the current cycle state:
  `false` while loading and `true` after `dom-ready`.
- On non-in-place main-frame `did-start-navigation`, continue the existing
  bridge-generation invalidation and call a loading-cycle transition.
- If the prior cycle was ready, start a new cycle: set readiness false, reset
  the cycle retry count, show the loading layer, and schedule a watchdog.
- If a navigation occurs while already loading, keep the same cycle and retry
  count. This covers authentication redirects and recovery reloads without
  resetting the bounded retry policy.
- Ignore in-place and subframe navigation for both bridge invalidation and
  loading display.
- On every `dom-ready`, mark the cycle ready, hide the loading layer, and
  preserve the existing bridge installation sequence.

### Recovery and teardown

- Keep one loading layer visible through watchdog and explicit-failure retries;
  retries must not create duplicate layers.
- Check webview connection before either retrying or replacing loading with a
  failure state, so a detached surface cannot receive late UI.
- On retry exhaustion, remove the webview and loading layer before creating the
  existing server-unavailable guidance exactly once.
- Existing view/embed cleanup continues to empty its container; no new global
  timer, listener, or teardown registry is introduced.

### Verification strategy

- Extend the existing lightweight fake DOM in `tests/editor-view.test.ts` to
  record created status elements, their classes/text/children, removal state,
  accessibility attributes, inert state, and webview attachment without adding
  jsdom.
- Add regression coverage for initial display/removal, replacement-page
  navigation, ignored in-place/subframe navigation, idempotent display during
  retries, final failure replacement, and detached-surface suppression.
- Keep shared lifecycle tests at `createMarimoWebview`; the existing embed
  processor test harness only needs a focused assertion if required to prove
  the startup-status-to-page-loading handoff.

## Complexity Tracking

No constitution violations or exceptional complexity are required.
