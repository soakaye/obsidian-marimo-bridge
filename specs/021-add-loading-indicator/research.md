# Research: Add Marimo Loading Indicator

No `NEEDS CLARIFICATION` items remain.

## Decision 1: Own loading feedback at the shared webview boundary

**Decision**: Create and manage the page-loading status inside
`createMarimoWebview`.

**Rationale**: Full-tab editors, the marimo home page, and inline edit/run embeds
all pass through this function. One owner guarantees consistent behavior and
avoids duplicating lifecycle logic between views and embeds.

**Alternatives considered**:

- Manage status separately in `MarimoEditorView` and the embed processor:
  rejected because navigation, retry, and readiness behavior would be
  duplicated.
- Add a separate loading controller module: rejected because the state belongs
  to one function invocation and does not require a reusable public abstraction.

## Decision 2: Use replacement-page navigation and readiness boundaries

**Decision**: Show loading for initial creation and non-in-place main-frame
navigation, and hide it on `dom-ready`.

**Rationale**: The existing bridge lifecycle already treats non-in-place
main-frame `did-start-navigation` as the guest-context replacement boundary.
`dom-ready` is also the existing successful-readiness signal used by webview
recovery. Reusing both boundaries keeps loading feedback consistent with
established behavior.

**Alternatives considered**:

- `did-start-loading` and `did-stop-loading`: rejected because they can include
  subframe and incidental resource loading and do not align with guest-context
  replacement.
- Hide on `did-navigate`: rejected because navigation commit does not guarantee
  the guest DOM is ready.
- React only to `src` assignments: rejected because redirects, reloads, and
  guest-initiated navigation would be missed.

## Decision 3: Start a new retry cycle only after a ready page

**Decision**: A non-in-place main-frame navigation resets readiness and retries
only when the preceding cycle was ready. Navigation while already loading keeps
the current retry count and watchdog cycle.

**Rationale**: Recovery reloads and authentication redirects can themselves
emit main-frame navigation events. Resetting retries on every event could
prevent the existing three-attempt limit from ever being reached. The
ready-to-loading transition uniquely identifies a new user-visible page cycle.

**Alternatives considered**:

- Reset on every main-frame navigation: rejected because reload-generated
  navigation can create an unbounded recovery loop.
- Never reset after first readiness: rejected because later full-page
  navigation would have no valid watchdog/retry cycle.
- Introduce a second independent navigation retry counter: rejected because it
  creates competing recovery policies without user value.

## Decision 4: Use one idempotent overlay element

**Decision**: Maintain at most one loading element per webview invocation and
reuse idempotent show/hide operations across creation, navigation, retries, and
readiness.

**Rationale**: Watchdog and explicit failure events can occur close together.
Idempotent ownership prevents duplicate spinners, stale overlays, and repeated
removal errors.

**Alternatives considered**:

- Create a new status element for each event: rejected because overlapping
  lifecycle signals can leave duplicates.
- Hide the webview by changing its display state: rejected because it expands
  layout changes and complicates restoration and embed sizing.

## Decision 5: Use a host-side theme-aware CSS spinner

**Decision**: Center an activity ring and text in an opaque overlay using
Obsidian theme variables. Stop rotation under `prefers-reduced-motion: reduce`
while retaining the ring and text.

**Rationale**: Host-side CSS is available before guest readiness, works in light
and dark themes, adds no image or package dependency, and can honor the
operating-system motion preference.

**Alternatives considered**:

- Guest-page loading UI: rejected because it cannot render before the guest
  loads and couples the plugin to marimo's DOM.
- Animated image asset: rejected because CSS is smaller, themeable, and does
  not require another distributed file.
- Text only: rejected because the approved design requires an activity
  indicator as well as text.

## Decision 6: Extend the existing fake DOM instead of adding a browser DOM

**Decision**: Enhance `tests/editor-view.test.ts` fake elements to record status
creation, children, and removal; reuse existing event and timer helpers.

**Rationale**: Tests only need deterministic observation of a small DOM surface.
The current esbuild and Node test setup already covers webview events and retry
timers without a DOM dependency.

**Alternatives considered**:

- Add jsdom or happy-dom: rejected as unnecessary dependency and setup cost.
- Export private loading helpers for direct unit tests: rejected because it
  widens the module surface for test convenience.
- Duplicate the full lifecycle matrix in embed tests: rejected because both
  surfaces use the same webview factory; one focused handoff test is sufficient.
