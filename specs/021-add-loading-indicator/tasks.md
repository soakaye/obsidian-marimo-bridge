# Tasks: Add Marimo Loading Indicator

**Input**: Design documents from `specs/021-add-loading-indicator/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/loading-state.md`, `quickstart.md`

**Tests**: Required. Follow red-green-refactor for every user-story phase and
verify each new behavioral test fails for the expected missing behavior before
editing production code.

**Organization**: Tasks are grouped by user story so initial loading, navigation
loading, and recovery/failure behavior can be validated at explicit checkpoints.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after prior dependencies are complete because it
  touches a different file.
- **[Story]**: Maps the task to a user story in `spec.md`.
- Every task names the exact file or files it affects.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a clean baseline and verify repository configuration
before behavioral changes.

- [X] T001 Run the existing `npm test`, `npm run build`, and `npm run lint` commands from `package.json` and record any pre-existing failures before editing source files
- [X] T002 Verify `.gitignore` and the `ignores` configuration in `eslint.config.js` cover generated Node/TypeScript artifacts, adding only missing critical patterns if required

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add deterministic DOM observations used by all loading-state tests.

**⚠️ CRITICAL**: Complete this phase before writing any user-story tests.

- [X] T003 Extend the fake parent/status element harness in `tests/editor-view.test.ts` to record created classes, text, attributes, child elements, removal state, connection state, and append order without adding a DOM dependency

**Checkpoint**: The existing test suite still passes with the richer test
harness and no production behavior change.

---

## Phase 3: User Story 1 - See Loading Progress When Opening Marimo (Priority: P1) 🎯 MVP

**Goal**: Full-tab editors, the marimo home page, and inline embeds show one
centered, opaque, accessible loading state until the initial marimo page is
ready.

**Independent Test**: Delay initial readiness in the shared webview harness and
an inline embed; verify `Loading marimo…`, one decorative spinner, polite status
semantics, interaction blocking, configured embed height, and removal on
`dom-ready`.

### Tests for User Story 1

> **NOTE: Write T004 and T005 first, then complete T006 and confirm RED before
> production implementation.**

- [X] T004 [P] [US1] Add failing initial-loading tests in `tests/editor-view.test.ts` for creation before webview attachment, exact text, one spinner, polite assistive status, decorative spinner semantics, opaque-layer class, webview interaction blocking, idempotent `dom-ready`, and restored interaction after readiness
- [X] T005 [P] [US1] Add a failing embed handoff test in `tests/embed-processor.test.ts` proving the server-starting status is removed, the shared page-loading state is created, and the configured embed height remains effective
- [X] T006 [US1] Run the User Story 1 cases in `tests/editor-view.test.ts` and `tests/embed-processor.test.ts` and confirm they fail only because the initial loading state and accessibility behavior are not implemented

### Implementation for User Story 1

- [X] T007 [US1] Add centralized loading text, loading-layer class, spinner class, and required host attribute constants in `src/constants.ts`
- [X] T008 [US1] Implement idempotent initial `showLoading` and `hideLoading` ownership in `src/editor-view.ts`, including polite status semantics, a decorative spinner, interaction blocking while loading, and removal/restoration on `dom-ready`
- [X] T009 [P] [US1] Add theme-aware opaque centered-layer, spinner animation, pointer interception, full-tab/embed positioning, and reduced-motion rules in `styles.css`
- [X] T010 [US1] Run `npm test` from `package.json` and confirm all User Story 1 and pre-existing tests pass before proceeding

**Checkpoint**: User Story 1 is independently usable as the MVP on full-tab and
inline surfaces.

---

## Phase 4: User Story 2 - See Loading Progress During Navigation (Priority: P2)

**Goal**: A ready marimo surface returns to the loading state only for a
replacement main-page navigation and becomes usable again at the next
readiness event.

**Independent Test**: Start from a ready webview, dispatch replacement,
in-place, and subframe navigation events, and verify only the replacement event
creates a new loading cycle that ends on the next `dom-ready`.

### Tests for User Story 2

- [X] T011 [US2] Add failing navigation-cycle tests in `tests/editor-view.test.ts` for ready-to-loading replacement navigation, no loading for in-place/subframe navigation, one polite announcement per new cycle, interaction blocking during the cycle, and removal/restoration on the next `dom-ready`
- [X] T012 [US2] Run the User Story 2 cases in `tests/editor-view.test.ts` and confirm they fail because replacement-page loading cycles are not yet implemented

### Implementation for User Story 2

- [X] T013 [US2] Implement ready-to-loading cycle transitions in the existing `did-start-navigation` and `dom-ready` handlers in `src/editor-view.ts`, resetting retries only when the prior cycle was ready and preserving bridge-generation behavior
- [X] T014 [US2] Run `npm test` from `package.json` and confirm User Stories 1 and 2 plus all pre-existing tests pass

**Checkpoint**: Initial loading and replacement-page navigation loading are
independently testable; same-page and subframe activity remain unobstructed.

---

## Phase 5: User Story 3 - Distinguish Recovery From Failure (Priority: P2)

**Goal**: One loading state persists through bounded automatic recovery,
successful recovery removes it, exhausted recovery replaces it with existing
guidance, and removed surfaces receive no late UI.

**Independent Test**: Drive watchdog and explicit failure events through
successful retry, retry exhaustion, redirect/reload navigation, and detached
surface scenarios; verify one loading layer, a preserved retry cap, exactly one
failure message, and no late reload or UI.

### Tests for User Story 3

- [X] T015 [US3] Add failing recovery-state tests in `tests/editor-view.test.ts` for one persistent loading layer across retries, no retry reset on redirect/reload navigation, successful recovery, failure replacement after the existing cap, and suppression after detachment
- [X] T016 [US3] Run the User Story 3 cases in `tests/editor-view.test.ts` and confirm they fail for the missing loading-layer recovery integration rather than existing recovery behavior

### Implementation for User Story 3

- [X] T017 [US3] Integrate loading ownership with `reloadWebview`, `scheduleLoadWatchdog`, `did-fail-load`, and `showLoadFailure` in `src/editor-view.ts`, preserving benign-abort/subframe handling, the existing retry cap, idempotent failure guidance, and detached-view guards
- [X] T018 [US3] Run `npm test` from `package.json` and confirm all three user stories and the complete regression suite pass

**Checkpoint**: All user stories are functionally complete and independently
validated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Synchronize clarified accessibility behavior and complete static
and manual validation.

- [X] T019 [P] Update accessibility, opaque interaction blocking, and assistive announcement details in `specs/021-add-loading-indicator/plan.md`, `specs/021-add-loading-indicator/data-model.md`, `specs/021-add-loading-indicator/contracts/loading-state.md`, and `specs/021-add-loading-indicator/quickstart.md`
- [X] T020 Run the full `npm test`, `npm run build`, and `npm run lint` validation commands from `package.json` and resolve every regression without weakening the new tests
- [X] T021 Execute the full-tab, inline embed, navigation, recovery, removal, light/dark theme, reduced-motion, interaction-blocking, and assistive-technology scenarios in `specs/021-add-loading-indicator/quickstart.md`
- [X] T022 Review `src/constants.ts`, `src/editor-view.ts`, `styles.css`, `tests/editor-view.test.ts`, and `tests/embed-processor.test.ts` against every functional requirement and success criterion in `specs/021-add-loading-indicator/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **User Story 1 (Phase 3)**: Depends on Foundational and supplies the shared
  loading layer required by later stories.
- **User Story 2 (Phase 4)**: Depends on User Story 1.
- **User Story 3 (Phase 5)**: Depends on User Story 1. It may be designed in
  parallel with User Story 2, but implementation is sequential because both
  modify `src/editor-view.ts` and `tests/editor-view.test.ts`.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: No user-story dependency; recommended MVP.
- **User Story 2 (P2)**: Uses the loading helpers introduced by User Story 1.
- **User Story 3 (P2)**: Uses the loading helpers introduced by User Story 1
  and preserves existing recovery semantics.

### Within Each User Story

- Write behavioral tests before production code.
- Run the focused tests and observe the expected RED result.
- Implement the minimum behavior required for GREEN.
- Run the complete test suite at the story checkpoint.
- Do not change test expectations merely to accommodate implementation details.

### Parallel Opportunities

- T004 and T005 can run in parallel because they modify different test files.
- After T007, T008 and T009 can run in parallel because they modify
  `src/editor-view.ts` and `styles.css` respectively.
- T019 can run in parallel with a final code review because it changes only
  feature documentation.
- User Story 2 and User Story 3 test design can be reviewed in parallel, but
  their code changes must be integrated sequentially due to shared files.

---

## Parallel Example: User Story 1

```text
Task T004: Add initial webview loading-state tests in tests/editor-view.test.ts
Task T005: Add inline embed handoff test in tests/embed-processor.test.ts
```

After T007:

```text
Task T008: Implement loading lifecycle in src/editor-view.ts
Task T009: Implement loading presentation in styles.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational tasks.
2. Complete T004-T006 and verify RED.
3. Complete T007-T009 and verify GREEN with T010.
4. Stop and manually validate initial loading in one full tab and one embed.

### Incremental Delivery

1. Deliver User Story 1 for immediate initial-load feedback.
2. Add User Story 2 for replacement-page navigation feedback.
3. Add User Story 3 for recovery/failure clarity.
4. Complete documentation synchronization and all automated/manual gates.

### Execution Notes

- Keep all runtime literals centralized in `src/constants.ts`.
- Do not add dependencies, settings, persistence, guest DOM inspection, or
  mobile support.
- Preserve existing token, navigation routing, bridge, and server lifecycle
  behavior.
- Mark each completed task `[X]` immediately in this file during
  `/speckit-implement`.
