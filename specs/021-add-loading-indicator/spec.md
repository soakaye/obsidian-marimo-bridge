# Feature Specification: Add Marimo Loading Indicator

**Feature Branch**: `021-add-loading-indicator`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Display a centered loading message with a spinner while marimo pages load in both full-tab editors and inline embeds. Show it again during page navigation, keep it visible during automatic recovery attempts, and replace it with the existing failure guidance if loading cannot recover."

## Clarifications

### Session 2026-06-22

- Q: While replacement content is loading, should the loading layer hide and block interaction with the previous content? → A: Use an opaque loading layer that covers the previous content and blocks interaction.
- Q: How should assistive technologies announce the loading state? → A: Politely announce `Loading marimo…` while treating the spinner as decorative.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Loading Progress When Opening Marimo (Priority: P1)

A user opens a marimo notebook, the marimo home page, or an inline marimo
embed. Until the marimo content is ready, the user sees a centered spinner and
the message `Loading marimo…` instead of an unexplained blank area.

**Why this priority**: Opening marimo content is the primary workflow. Immediate
visible feedback reassures the user that the page is still loading rather than
broken or empty.

**Independent Test**: Delay marimo readiness after opening a full-tab view and
an inline embed, verify that each surface shows the loading indicator, then
allow the content to become ready and verify that the indicator disappears.

**Acceptance Scenarios**:

1. **Given** a user opens a full-tab marimo editor or home page, **When** the
   marimo content is not yet ready, **Then** a centered spinner and
   `Loading marimo…` message are visible.
2. **Given** a user renders an inline marimo embed, **When** the marimo content
   is not yet ready, **Then** the same centered spinner and loading message are
   visible within the embed.
3. **Given** a loading indicator is visible, **When** the marimo content becomes
   ready, **Then** the indicator is removed and does not obstruct or cover the
   usable content.
4. **Given** a loading indicator is visible over initial or previous content,
   **When** the user attempts pointer or keyboard interaction, **Then** the
   covered content does not receive that interaction.
5. **Given** a user relies on assistive technology, **When** the loading state
   appears, **Then** `Loading marimo…` is announced without interrupting a
   higher-priority announcement and the spinner is not announced separately.

---

### User Story 2 - See Loading Progress During Navigation (Priority: P2)

A user follows an in-page action that causes the current marimo surface to load
a different full page. The loading indicator returns for that loading period
and disappears when the new marimo content is ready.

**Why this priority**: A view that becomes blank during navigation is just as
ambiguous as an initially blank view, but users must first be able to open
marimo content successfully.

**Independent Test**: Start with a ready marimo surface, trigger a full-page
navigation, and verify that the indicator reappears until the destination is
ready without appearing for updates that do not replace the page.

**Acceptance Scenarios**:

1. **Given** a marimo surface is ready, **When** it begins loading a replacement
   page, **Then** the centered loading indicator becomes visible again.
2. **Given** the replacement page is loading, **When** it becomes ready,
   **Then** the indicator disappears.
3. **Given** a marimo surface performs an update that does not replace its
   current page, **When** that update occurs, **Then** the plugin does not
   unnecessarily cover the content with the loading indicator.

---

### User Story 3 - Distinguish Recovery From Failure (Priority: P2)

A user encounters a marimo page that is slow, temporarily unresponsive, or
unable to load. The loading indicator remains visible while automatic recovery
is still in progress. If recovery is exhausted, the loading state is replaced
by the existing explanatory failure guidance.

**Why this priority**: Users need a clear distinction between an operation that
is still being recovered and one that requires their intervention.

**Independent Test**: Prevent a marimo surface from becoming ready, allow each
automatic recovery attempt to occur, and verify that the loading indicator
persists until the final failure guidance replaces it.

**Acceptance Scenarios**:

1. **Given** a marimo surface has not become ready and automatic recovery remains
   available, **When** a recovery attempt occurs, **Then** the loading indicator
   remains visible.
2. **Given** all permitted recovery attempts have failed, **When** the loading
   process is declared unsuccessful, **Then** the loading indicator is removed
   and the existing server-unavailable guidance is displayed.
3. **Given** a loading marimo surface is closed or removed, **When** a pending
   recovery action reaches its scheduled time, **Then** no loading or failure
   message is added back to the removed surface.

### Edge Cases

- The marimo server is still starting before the page-loading phase begins.
- The marimo page becomes ready immediately after the loading indicator is
  shown.
- A replacement-page navigation begins before a previous loading cycle has
  completed.
- Multiple readiness notifications occur for the same loading cycle.
- A navigation affects only a nested portion of the page rather than replacing
  the main content.
- The user closes a full-tab view or removes an inline embed while it is
  loading.
- Automatic recovery succeeds after one or more failed loading attempts.
- Automatic recovery reaches its limit without the page becoming ready.
- The user has enabled reduced-motion accessibility preferences.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST display a visible loading state whenever a
  full-tab marimo editor, marimo home page, or inline marimo embed is waiting
  for its marimo content to become ready.
- **FR-002**: The loading state MUST contain a centered activity indicator and
  the exact text `Loading marimo…`.
- **FR-003**: The loading state MUST remain legible in supported light and dark
  Obsidian themes without requiring user configuration.
- **FR-004**: The plugin MUST remove the loading state when the associated
  marimo content becomes ready for use.
- **FR-005**: The loading state MUST NOT cover or obstruct ready marimo content.
- **FR-005a**: While visible, the loading state MUST use an opaque background
  that fully covers initial or previous marimo content and MUST prevent pointer
  and keyboard interaction with that covered content.
- **FR-006**: A full-page navigation within an existing marimo surface MUST
  display the loading state again until the replacement content becomes ready.
- **FR-007**: Updates that do not replace the main page MUST NOT unnecessarily
  redisplay the loading state.
- **FR-008**: The loading state MUST remain visible while bounded automatic
  loading-recovery attempts are in progress.
- **FR-009**: When automatic recovery is exhausted, the plugin MUST replace the
  loading state with the existing server-unavailable guidance.
- **FR-010**: Closing or removing a marimo surface MUST prevent pending loading
  or recovery activity from restoring a loading or failure message on that
  removed surface.
- **FR-011**: The existing server-starting status MUST remain available before
  the marimo page-loading phase and MUST transition to the marimo loading state
  once page loading begins.
- **FR-012**: The activity indicator MUST respect reduced-motion accessibility
  preferences while preserving a visible textual loading status.
- **FR-012a**: Each displayed loading state MUST make `Loading marimo…`
  available as a polite assistive-technology status announcement, and the
  spinner MUST be treated as decorative rather than announced separately.
- **FR-013**: The feature MUST NOT add a new user setting or require users to
  enable the loading indicator.
- **FR-014**: Existing notebook opening, inline embedding, navigation,
  authentication, and loading-recovery outcomes MUST remain unchanged apart
  from the added status feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested full-tab and inline loading scenarios, visible
  loading feedback appears before marimo content becomes ready.
- **SC-002**: In 100% of tested successful loading and navigation scenarios, the
  loading feedback disappears when the destination content becomes ready and
  does not obstruct interaction.
- **SC-002a**: In 100% of tested active loading scenarios, covered initial or
  previous content is not visible and does not receive pointer or keyboard
  interaction.
- **SC-003**: In 100% of tested automatic-recovery scenarios, loading feedback
  remains visible during recovery and is replaced by the existing failure
  guidance only after recovery is exhausted.
- **SC-004**: In 100% of tested removed-surface scenarios, no loading or failure
  feedback reappears after the full-tab view or inline embed has been removed.
- **SC-005**: Manual verification in both a light theme and a dark theme confirms
  that the spinner and loading text are readable and visually centered.
- **SC-006**: Manual verification with reduced motion enabled confirms that
  users still receive clear textual loading feedback without requiring
  continuous animation.
- **SC-007**: Manual assistive-technology verification confirms that each
  loading cycle announces `Loading marimo…` without interrupting
  higher-priority output and without announcing the spinner separately.

## Assumptions

- The feature applies to both full-tab marimo surfaces and inline marimo embeds.
- `Loading marimo…` is the approved page-loading message.
- The existing server-starting and server-unavailable messages remain unchanged.
- Full-page navigation should show loading feedback; updates that retain the
  current page should not.
- The loading indicator is always enabled and introduces no new setting.
- Existing automatic recovery limits and timing remain unchanged.
- The plugin remains desktop-only, consistent with the project constitution.
