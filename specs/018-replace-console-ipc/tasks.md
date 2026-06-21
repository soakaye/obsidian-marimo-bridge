# Tasks: Replace Console-Based Webview IPC

**Input**: Design documents from `specs/018-replace-console-ipc/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/webview-bridge.md`, `quickstart.md`

**Tests**: Tests are required by the feature specification and implementation
plan. Each user story follows test-first ordering.

**Organization**: Tasks are grouped by user story. Because all three stories
incrementally modify the same bridge implementation and test file, implement
them in priority order even though each story retains an independent acceptance
test.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches a different file and has no
  dependency on another incomplete task
- **[Story]**: Maps to User Story 1, 2, or 3 from `spec.md`
- Every task names the exact file or command source it uses

## Phase 1: Setup (Shared Baseline)

**Purpose**: Confirm the current branch, test baseline, and protected scope
before changing bridge behavior.

- [X] T001 Run `npm test`, `npm run build`, and `npm run lint` from `package.json` and record any pre-existing failure before modifying `src/` or `tests/`
- [X] T002 Verify `specs/017-fix-review-findings/` has no branch-local diff and record its current tree state for the final scope audit
- [X] T003 [P] Review `src/constants.ts`, `src/editor-view.ts`, and `tests/editor-view.test.ts` against `specs/018-replace-console-ipc/contracts/webview-bridge.md` and list the existing sentinel transport, routing branches, and lifecycle events that must be preserved or replaced

---

## Phase 2: Foundational (Blocking Test Infrastructure)

**Purpose**: Provide deterministic Promise controls for every bridge story.

**⚠️ CRITICAL**: Complete this phase before adding story-specific production
behavior.

- [X] T004 Update `FakeWebview.executeJavaScript` in `tests/editor-view.test.ts` to return configurable `Promise<unknown>` results while retaining an ordered record of every executed script
- [X] T005 Add reusable deferred-Promise and async-flush helpers in `tests/editor-view.test.ts` for controlling bridge installation, pending receives, resolution order, and rejection without timer sleeps
- [X] T006 Run the editor-view cases through `npm test` from `package.json` and adjust only the test fake compatibility in `tests/editor-view.test.ts` until the existing pre-feature tests pass

**Checkpoint**: Existing editor behavior passes with a Promise-capable fake
webview, and story tests can deterministically control asynchronous boundaries.

---

## Phase 3: User Story 1 - Open Embedded Links Without Console IPC (Priority: P1) 🎯 MVP

**Goal**: Replace console control messages with a structured Promise bridge
while preserving notebook, workspace-file, external URL, unsafe-protocol, and
same-webview routing outcomes.

**Independent Test**: Dispatch `dom-ready`, complete bridge installation, return
structured open messages for each destination class, and verify existing
handlers run while sentinel-looking console output remains diagnostic-only.

### Tests for User Story 1

- [X] T007 [US1] Add failing tests in `tests/editor-view.test.ts` proving `dom-ready` awaits bridge installation before evaluating the first next-message expression
- [X] T008 [US1] Add failing structured-message routing tests in `tests/editor-view.test.ts` for a local marimo notebook, a local non-Python workspace file, an external HTTP(S) URL, an unsafe external protocol, and an internal local URL that remains in the same webview with its token
- [X] T009 [US1] Add failing transport-separation tests in `tests/editor-view.test.ts` asserting `INJECTION_SCRIPT` contains neither `MARIMO_OPEN_SENTINEL` nor `console.log`, and that former-sentinel text received through `console-message` is forwarded as an ordinary diagnostic
- [X] T010 [US1] Run `npm test` from `package.json` and confirm the new User Story 1 cases fail because the Promise bridge and structured host routing do not yet exist

### Implementation for User Story 1

- [X] T011 [US1] Replace the sentinel transport in `src/constants.ts` by removing `MARIMO_OPEN_SENTINEL` and `LOG_OPEN_MESSAGE_PARSE_FAILED`, defining the open-message and next-message runtime constants, and rewriting `INJECTION_SCRIPT` to install an idempotent guest queue with `enqueue()` and `nextMessage()` for `window.open` and separate-target anchor clicks
- [X] T012 [US1] Change the private webview boundary in `src/editor-view.ts` so `executeJavaScript(script)` returns `Promise<unknown>`, add the bounded structured open-message type guard, and centralize the existing open-request routing used by both native `new-window` events and bridge messages
- [X] T013 [US1] Implement the `dom-ready` installation sequence and serial next-message receive loop in `src/editor-view.ts`, awaiting installation before reception and removing all sentinel interpretation from the `console-message` handler
- [X] T014 [US1] Run the targeted editor-view suite through `npm test` from `package.json` and resolve User Story 1 failures only in `src/constants.ts`, `src/editor-view.ts`, and `tests/editor-view.test.ts`

**Checkpoint**: Supported embedded links route through structured messages with
zero console-based control transport, while ordinary guest diagnostics retain
their existing severities.

---

## Phase 4: User Story 2 - Preserve Ordered and Reliable Message Delivery (Priority: P2)

**Goal**: Prove and enforce exactly-once FIFO delivery, pending-wait behavior,
and safe continuation after malformed values.

**Independent Test**: Supply at least 20 structured messages across pre-queued
and pending-receive states, interleave malformed values, and verify every valid
message is handled once in original order with no polling.

### Tests for User Story 2

- [X] T015 [US2] Add failing FIFO tests in `tests/editor-view.test.ts` that deliver at least 20 pre-queued structured messages and assert exact once-only routing order
- [X] T016 [US2] Add failing pending-wait tests in `tests/editor-view.test.ts` proving one unresolved receive remains idle until the next message and no timer-based polling or repeated receive call occurs
- [X] T017 [US2] Add failing validation tests in `tests/editor-view.test.ts` for null, primitive, unknown-type, empty-URL, and non-string-disposition values followed by a valid message that must still route
- [X] T018 [US2] Run `npm test` from `package.json` and confirm the new User Story 2 cases expose any FIFO, duplicate-receive, or invalid-message continuation gaps

### Implementation for User Story 2

- [X] T019 [US2] Complete the guest FIFO and single-pending-resolver invariants in `src/constants.ts` so queued messages shift oldest-first and a waiting receiver is resolved directly without polling
- [X] T020 [US2] Complete serial host consumption and invalid-value continuation in `src/editor-view.ts` so one message is awaited and fully routed before the next receive begins
- [X] T021 [US2] Run the targeted editor-view suite through `npm test` from `package.json` and resolve User Story 2 failures only in `src/constants.ts`, `src/editor-view.ts`, and `tests/editor-view.test.ts`

**Checkpoint**: A burst of at least 20 messages is delivered exactly once in
FIFO order, and malformed values neither navigate nor block later valid work.

---

## Phase 5: User Story 3 - Recover Cleanly Across Reloads and Closure (Priority: P3)

**Goal**: Ensure old guest contexts cannot route late results and expected
navigation or teardown rejection stops quietly.

**Independent Test**: Keep receives pending across top-level navigation,
subframe/in-page navigation, reload, detachment, installation failure, and
rejection; verify only the current connected generation can route.

### Tests for User Story 3

- [X] T022 [US3] Add failing generation tests in `tests/editor-view.test.ts` proving a non-in-place main-frame `did-start-navigation` invalidates an old deferred result before the next `dom-ready`
- [X] T023 [US3] Add failing navigation-boundary tests in `tests/editor-view.test.ts` proving subframe and in-place `did-start-navigation` events do not invalidate the current receive cycle
- [X] T024 [US3] Add failing lifecycle tests in `tests/editor-view.test.ts` proving a new `dom-ready` starts a fresh generation, a detached webview ignores late resolution, and receive rejection during navigation or teardown causes no routing or unhandled rejection
- [X] T025 [US3] Add failing installation-error tests in `tests/editor-view.test.ts` proving a rejection is logged only for the same current connected generation and remains silent after invalidation or detachment
- [X] T026 [US3] Run `npm test` from `package.json` and confirm the new User Story 3 cases fail before generation-aware lifecycle handling is implemented

### Implementation for User Story 3

- [X] T027 [US3] Add the `did-start-navigation` runtime event constant in `src/constants.ts` and preserve all new non-empty strings and non-zero numeric values under the existing constant-externalization policy
- [X] T028 [US3] Implement guest generation invalidation and post-await generation/connection guards in `src/editor-view.ts`, invalidating only non-in-place main-frame navigation and starting a fresh generation on each `dom-ready`
- [X] T029 [US3] Separate current-context installation error reporting from quiet receive-loop termination in `src/editor-view.ts` so reload, navigation, detachment, and closure do not produce unhandled or noisy failures
- [X] T030 [US3] Run the targeted editor-view suite through `npm test` from `package.json` and resolve User Story 3 failures only in `src/constants.ts`, `src/editor-view.ts`, and `tests/editor-view.test.ts`

**Checkpoint**: Only the current connected guest generation can route messages;
reload, navigation, and closure terminate obsolete receives safely.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Validate the complete feature, constitution boundaries, and manual
user journeys.

- [X] T031 Run the complete regression suite with `npm test` from `package.json` and resolve only feature-scoped failures in `src/constants.ts`, `src/editor-view.ts`, or `tests/editor-view.test.ts`
- [X] T032 Run the production type-check and bundle with `npm run build` from `package.json` and confirm `esbuild.config.mjs` still externalizes Obsidian, Electron, and Node modules
- [X] T033 Run `npm run lint` from `package.json` and confirm `src/constants.ts`, `src/editor-view.ts`, and `tests/editor-view.test.ts` pass without new suppression directives
- [X] T034 [P] Audit `git diff -- src/constants.ts src/editor-view.ts tests/editor-view.test.ts package.json esbuild.config.mjs specs/017-fix-review-findings` against `specs/018-replace-console-ipc/contracts/webview-bridge.md`, confirming no dependency, preload, polling timer, port, listener, HTTP/WebSocket transport, main-process API, persistence, public API, server lifecycle change, or specification 017 edit
- [X] T035 Execute every automated and manual scenario in `specs/018-replace-console-ipc/quickstart.md`, recording any environment limitation without weakening its expected outcomes
- [X] T036 Review `specs/018-replace-console-ipc/spec.md`, `specs/018-replace-console-ipc/plan.md`, and the final implementation diff to confirm FR-001 through FR-017 and SC-001 through SC-007 are covered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No dependencies
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks story tests
- **Phase 3 — User Story 1**: Depends on the Promise-capable fake from Phase 2
- **Phase 4 — User Story 2**: Depends on User Story 1's bridge and receive loop
- **Phase 5 — User Story 3**: Depends on User Stories 1 and 2 so lifecycle guards
  wrap the final receive behavior
- **Phase 6 — Polish**: Depends on all selected user stories

### User Story Dependencies

- **User Story 1 (P1)**: Establishes the new transport and is the MVP
- **User Story 2 (P2)**: Extends User Story 1 with delivery guarantees; it is
  independently accepted by FIFO, pending-wait, and malformed-value tests
- **User Story 3 (P3)**: Wraps the completed receive loop with lifecycle
  invalidation; it is independently accepted by stale-result and teardown tests

### Within Each User Story

- Write the listed tests first and run them to confirm the intended failure
- Update `src/constants.ts` before host behavior when the host depends on a new
  script or event constant
- Update `src/editor-view.ts` after the guest contract exists
- Run targeted tests at the story checkpoint before advancing
- Keep same-file tasks sequential; do not implement multiple story phases
  concurrently in the same worktree

### Parallel Opportunities

- T003 can run in parallel with T001-T002 because it is a read-only contract
  mapping task
- T034 can run in parallel with the manual execution in T035 after T031-T033
  pass
- Documentation/contract review in T036 can begin while T035 manual validation
  runs, but must use the final implementation diff
- Story implementation itself is intentionally sequential because every story
  modifies `src/constants.ts`, `src/editor-view.ts`, and
  `tests/editor-view.test.ts`

---

## Parallel Example: Final Verification

```text
Worker A: T034 scope and capability audit against contracts/webview-bridge.md
Worker B: T035 manual scenarios from quickstart.md
Worker C: T036 requirement and success-criteria coverage review
```

---

## Implementation Strategy

### MVP First — User Story 1

1. Complete Setup and Foundational phases.
2. Add the failing User Story 1 tests.
3. Replace the console transport and implement structured routing.
4. Run the User Story 1 checkpoint.
5. Stop here for a reviewable MVP if ordered-delivery stress and lifecycle
   hardening will be delivered separately.

### Incremental Delivery

1. **Foundation**: Promise-capable deterministic test fake
2. **MVP**: User Story 1 removes console IPC while preserving destinations
3. **Reliability**: User Story 2 locks FIFO and malformed-message behavior
4. **Lifecycle safety**: User Story 3 rejects stale contexts and quiets teardown
5. **Release evidence**: Full automated, manual, and scope validation

### Parallel Team Strategy

Because production and test changes converge on the same three files, assign
one implementation owner to execute User Stories 1 through 3 sequentially.
Use separate reviewers in Phase 6 for scope audit, manual validation, and
requirements coverage.

---

## Notes

- `[P]` means parallelizable only under the dependency conditions above
- `[US1]`, `[US2]`, and `[US3]` provide traceability to `spec.md`
- Preserve tabs, comments/docstrings, and runtime constant externalization
- Do not modify `specs/017-fix-review-findings/`
- Do not add dependencies or broaden Electron privileges
- Commit after each completed story or coherent test/implementation pair
