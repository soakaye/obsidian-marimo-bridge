# Tasks: Resolve Plugin Review Findings

**Input**: Design documents from `specs/017-fix-review-findings/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/review-compliance.md`, `quickstart.md`

**Tests**: Tests are required because the specification requires automated regression, build, and lint success, and the implementation plan mandates test-first delivery.

**Organization**: Tasks are grouped by user story so review compliance, behavioral preservation, and capability-boundary validation can each be completed and verified as distinct increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes a different file and has no dependency on another incomplete task
- **[Story]**: Maps the task to User Story 1, 2, or 3
- Every task names the exact file or files it reads or changes

## Phase 1: Setup (Shared Baseline)

**Purpose**: Establish the pre-change state without modifying dependencies or unrelated user work.

- [x] T001 Run `npm test`, `npm run build`, and `npm run lint` from `package.json` and record any pre-existing failures before changing `manifest.json` or `src/`
- [x] T002 Verify `tests/run-tests.mjs` automatically discovers new `tests/*.test.ts` files and confirm no test-runner or dependency change is required

---

## Phase 2: Foundational (Blocking Compliance Test)

**Purpose**: Add the shared failing regression test that defines the review-compliance target for all stories.

**⚠️ CRITICAL**: Complete this phase before changing production files.

- [x] T003 Create `tests/review-compliance.test.ts` with assertions that `manifest.json` excludes the word `Obsidian`, uses `https://github.com/soakaye` as `authorUrl`, and that `src/editor-view.ts`, `src/main.ts`, and `src/server-manager.ts` contain no `eslint-disable-next-line` directives
- [x] T004 Run the `tests/review-compliance.test.ts` case through `npm test` and confirm it fails against the current `manifest.json` metadata and reported source directives before implementation

**Checkpoint**: The regression test fails for the reported review findings and is ready to drive implementation.

---

## Phase 3: User Story 1 - Submit Review-Compliant Plugin Metadata and Source (Priority: P1) 🎯 MVP

**Goal**: Eliminate the two manifest findings and all ten reported source-directive findings without disabling review rules.

**Independent Test**: Run `npm test`, `npm run build`, and `npm run lint`, then confirm the review-compliance test reports no forbidden manifest metadata or source directives.

### Implementation for User Story 1

- [x] T005 [P] [US1] Update `manifest.json` so `description` contains no word `Obsidian` and `authorUrl` is `https://github.com/soakaye` while preserving the remaining manifest fields
- [x] T006 [P] [US1] Add narrow local Electron module, Electron-enabled window, marimo webview element, and console-message event interfaces in `src/editor-view.ts`, then replace all explicit-any and unsafe-call suppression sites with `unknown` boundary casts and typed members
- [x] T007 [US1] Replace routine embedded-page fallback logging with `console.debug` and remove the unlimited suppression in `src/editor-view.ts` while preserving warning and error severity routing
- [x] T008 [P] [US1] Model the server manager as an optional initialization state in `src/main.ts`, add any required runtime error text to `src/constants.ts`, and remove the unload suppression while keeping `onunload` safe after an early non-filesystem-vault return
- [x] T009 [US1] Replace `workspace.revealLeaf` with minimum-version-compatible `workspace.setActiveLeaf(leaf, { focus: true })` in `src/main.ts` and remove the unsupported-API suppression
- [x] T010 [P] [US1] Replace child stdout, stderr, and normal-exit `console.log` calls with `console.debug` in `src/server-manager.ts` and remove all custom-message suppressions without changing finalization or error handling
- [x] T011 [US1] Run `tests/review-compliance.test.ts`, `npm run build`, and `npm run lint` against `manifest.json`, `src/editor-view.ts`, `src/main.ts`, `src/constants.ts`, and `src/server-manager.ts`; fix only compliance or type issues in those files until all three checks pass

**Checkpoint**: User Story 1 is complete when all reported manifest and directive errors are absent and the package builds and lints cleanly.

---

## Phase 4: User Story 2 - Preserve Notebook and Server Behavior (Priority: P2)

**Goal**: Prove that typed boundaries and API/logging replacements preserve webview navigation, tab activation, diagnostics, and shutdown behavior.

**Independent Test**: Run the editor, plugin lifecycle, and server-manager regression tests and manually open, restore, navigate, and unload a marimo notebook without an observable behavior change.

### Tests for User Story 2

- [x] T012 [P] [US2] Extend `tests/editor-view.test.ts` to assert `dom-ready` calls the typed `executeJavaScript` member and `console-message` events route ordinary, warning, and error messages to `console.debug`, `console.warn`, and `console.error`
- [x] T013 [P] [US2] Create `tests/plugin-lifecycle.test.ts` to assert `openMarimo(..., active=true)` calls `setViewState` then `setActiveLeaf` with focus, `active=false` does not force activation, initialized unload calls `stopAll`, and uninitialized unload is a safe no-op
- [x] T014 [P] [US2] Extend `tests/server-manager.test.ts` to capture child stdout, stderr, and exit diagnostics at debug severity and verify exit/close still removes managed state and crash-recovery records

### Implementation Validation for User Story 2

- [x] T015 [US2] Adjust `src/editor-view.ts`, `src/main.ts`, `src/constants.ts`, or `src/server-manager.ts` only where the new User Story 2 regression tests expose a behavioral mismatch, preserving the contracts in `specs/017-fix-review-findings/contracts/review-compliance.md`
- [x] T016 [US2] Run the targeted suites in `tests/editor-view.test.ts`, `tests/plugin-lifecycle.test.ts`, and `tests/server-manager.test.ts`, then run the notebook-opening and webview-recovery scenarios in `specs/017-fix-review-findings/quickstart.md`

**Checkpoint**: User Story 2 is complete when foreground/background activation, webview recovery and navigation, diagnostic forwarding, and process cleanup all match prior observable behavior.

---

## Phase 5: User Story 3 - Retain Deliberate Desktop Capabilities (Priority: P3)

**Goal**: Confirm the compliance cleanup neither removes required desktop behavior nor introduces new filesystem, shell, network-binding, or vault-write privileges.

**Independent Test**: Compare the implementation diff with the capability contract and run the existing loopback, token, process lifecycle, and Vault API tests with no new capability warning category.

### Tests and Validation for User Story 3

- [x] T017 [P] [US3] Extend `tests/review-compliance.test.ts` to assert `manifest.json` remains desktop-only with minimum version `1.5.0` and `src/main.ts` continues creating plugin-generated notebooks through `this.app.vault.create`
- [x] T018 [P] [US3] Run the loopback binding, token authentication, foreign-server fallback, process-tree cleanup, and Vault notebook creation cases in `tests/server-manager.test.ts`, `tests/notebook-path.test.ts`, and `tests/notebook-creation.test.ts`
- [x] T019 [US3] Audit `git diff -- manifest.json src tests` against `specs/017-fix-review-findings/contracts/review-compliance.md` and remove any new filesystem operation, child-process path, non-loopback binding, weakened token check, direct vault-content write, mobile support, or unrelated `temp/` change

**Checkpoint**: User Story 3 is complete when expected desktop warnings remain intentional, no new capability surface appears, and Vault writes still use the host API.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Run full gates and produce final evidence across all stories.

- [x] T020 Run the complete regression suite with `npm test` from `package.json` and resolve failures only in files scoped by `specs/017-fix-review-findings/plan.md`
- [x] T021 Run the production type-check and bundle with `npm run build` from `package.json` and confirm `esbuild.config.mjs` still externalizes Node, Electron, and Obsidian modules
- [x] T022 Run `npm run lint` from `package.json` and `rg -n "eslint-disable-next-line" src/editor-view.ts src/main.ts src/server-manager.ts`, confirming zero lint errors and zero matching directives
- [x] T023 Execute every manual scenario in `specs/017-fix-review-findings/quickstart.md` and record any environment-specific limitation in that file without weakening acceptance criteria
- [x] T024 Review `specs/017-fix-review-findings/spec.md`, `specs/017-fix-review-findings/contracts/review-compliance.md`, and the final `git diff -- manifest.json src tests` to confirm FR-001 through FR-017 and SC-001 through SC-006 are covered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No dependencies
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks production changes
- **Phase 3 — User Story 1**: Depends on the failing compliance test from Phase 2
- **Phase 4 — User Story 2**: Depends on User Story 1's source replacements so tests validate the intended implementation
- **Phase 5 — User Story 3**: Depends on User Story 1 and can run in parallel with User Story 2 after the compliance implementation stabilizes
- **Phase 6 — Polish**: Depends on all selected user stories

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on another story and is the MVP
- **User Story 2 (P2)**: Depends on User Story 1 because it validates the behavior of the replacement types, activation API, and logging calls
- **User Story 3 (P3)**: Depends on User Story 1's final diff but is otherwise independent of User Story 2

### Within Each User Story

- Write or extend tests before implementation validation
- Keep tasks touching the same file sequential when one depends on the other's result
- Run targeted tests before full project gates
- Complete the story checkpoint before claiming that story is done

### Parallel Opportunities

- T005, T006, T008, and T010 can start in parallel; T007 follows T006 in `src/editor-view.ts`, and T009 follows T008 in `src/main.ts`
- T012, T013, and T014 can run in parallel because they modify separate test files
- T017 and T018 can run in parallel because one changes a static compliance test and the other executes existing behavioral suites
- User Story 2 and User Story 3 can proceed in parallel after User Story 1 stabilizes

---

## Parallel Example: User Story 1

```text
Worker A: T005 in manifest.json
Worker B: T006 then T007 in src/editor-view.ts
Worker C: T008 then T009 in src/main.ts and src/constants.ts
Worker D: T010 in src/server-manager.ts
```

## Parallel Example: User Story 2

```text
Worker A: T012 in tests/editor-view.test.ts
Worker B: T013 in tests/plugin-lifecycle.test.ts
Worker C: T014 in tests/server-manager.test.ts
```

## Parallel Example: User Story 3

```text
Worker A: T017 in tests/review-compliance.test.ts
Worker B: T018 using tests/server-manager.test.ts, tests/notebook-path.test.ts, and tests/notebook-creation.test.ts
```

---

## Implementation Strategy

### MVP First — User Story 1

1. Complete Phase 1 baseline checks.
2. Add and run the failing compliance test in Phase 2.
3. Complete T005 through T010 by independent file ownership.
4. Run T011 and stop if the review errors, build, or lint are not clean.
5. User Story 1 alone delivers the review-unblocking MVP.

### Incremental Delivery

1. **Compliance foundation**: Phase 1 + Phase 2
2. **MVP**: User Story 1 removes all blocking review errors
3. **Behavior assurance**: User Story 2 locks navigation, activation, logging, and cleanup behavior
4. **Capability assurance**: User Story 3 proves no privilege expansion
5. **Release evidence**: Phase 6 runs complete automated and manual validation

### Parallel Team Strategy

1. One worker completes the shared failing test.
2. Split User Story 1 by production file, preserving same-file ordering.
3. After User Story 1 stabilizes, run User Stories 2 and 3 concurrently.
4. Rejoin for the full verification phase and final requirements audit.

---

## Notes

- `[P]` means tasks are parallelizable only when they do not share a file with another active task.
- User story labels provide traceability to `specs/017-fix-review-findings/spec.md`.
- Do not modify or stage the unrelated `.gitignore`/`temp/` work while implementing this feature.
- Preserve existing comments and docstrings, tabs, desktop-only behavior, and constant externalization.
- Commit after each task or coherent same-file task pair.
