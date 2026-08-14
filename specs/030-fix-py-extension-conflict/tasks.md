---

description: "Task list for feature implementation"
---

# Tasks: Resilient `.py` Extension Takeover

**Input**: Design documents from `/specs/030-fix-py-extension-conflict/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/startup-registration.md](./contracts/startup-registration.md), [quickstart.md](./quickstart.md)

**Tests**: Test tasks ARE included — spec.md FR-010 explicitly requires regression coverage of a start-up whose `.py` claim fails.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project at the repository root: production code in `src/`, regression suite in `tests/`. All paths below are repository-relative, per plan.md "Source Code (repository root)".

**Note on parallelism**: This feature touches only three files (`src/main.ts`, `src/constants.ts`, `tests/plugin-lifecycle.test.ts`), and most tasks within a story edit the same file. `[P]` is therefore marked sparingly and only where the files are genuinely disjoint — do not parallelize two tasks that name the same file.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a clean, reproducible baseline before changing behavior

- [X] T001 Establish a green baseline at the repository root: run `npm install`, then `npm test`, `npm run build`, and `npm run lint`, and record that all four succeed before any edit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the `onload()` test harness that every story's regression test depends on. `tests/plugin-lifecycle.test.ts` currently exercises only `openMarimo`/`onunload`, so no way to drive `onload()` exists yet.

**⚠️ CRITICAL**: No user story test can be written until this phase is complete. All three tasks edit the same file and MUST run sequentially.

- [X] T002 Add an `onload()` harness factory to `tests/plugin-lifecycle.test.ts` that builds the plugin with `Object.create(MarimoBridgePlugin.prototype)` (matching the existing `makePlugin` style) and assigns own-property recording stubs for `registerView`, `registerExtensions`, `registerMarkdownCodeBlockProcessor`, `addRibbonIcon`, `addCommand`, `registerEvent`, `registerDomEvent`, and `addSettingTab`, plus a `manifest` object
- [X] T003 Extend the harness in `tests/plugin-lifecycle.test.ts` with a `FileSystemAdapter` subclass whose `getBasePath()` returns an `fs.mkdtempSync` directory (so `onload()` clears its non-local-vault early return and `ServerRecordStore` I/O stays out of the repository), and a fake `app` exposing `vault.adapter`, `workspace.on()`, `workspace.getActiveFile()`, and a `workspace.onLayoutReady()` that stores its callback without invoking it — per research.md R5, this keeps every marimo process unspawned
- [X] T004 Add setup/teardown helpers to `tests/plugin-lifecycle.test.ts` that install `globalThis.window` with an `addEventListener` stub for the duration of a test and restore it afterwards (bare `window` in `registerDomEvent` is a `ReferenceError` under Node), and that capture and restore `console.warn`; both MUST restore in a `finally` block so the suite stays order-independent

**Checkpoint**: `onload()` can be driven from tests with no filesystem, process, or global side effects — story work can begin

---

## Phase 3: User Story 1 - Plugin Loads Alongside Another `.py` Owner (Priority: P1) 🎯 MVP

**Goal**: `onload()` completes and the plugin stays enabled when another plugin already owns the `.py` extension, so every capability except the default-editor claim keeps working.

**Independent Test**: Drive `onload()` with a `registerExtensions` stub that throws; assert the promise resolves and that registrations 3–9 of contract C2 (code-block processor, ribbon, four commands, two file-menu handlers, setting tab, both DOM unload handlers, layout-ready callback) were all recorded.

### Tests for User Story 1 ⚠️

> **NOTE: Write this test FIRST and confirm it FAILS against the current `src/main.ts` before implementing T006**

- [X] T005 [US1] Add a regression test to `tests/plugin-lifecycle.test.ts` named for the conflict case: with `takeOverPyExtension: true` and a `registerExtensions` stub that throws `new Error("Attempting to register an existing file extension \"py\"")`, assert `await plugin.onload()` resolves and that each registration listed in contracts/startup-registration.md C2 rows 3–9 was recorded (INV-1, INV-3, FR-001, FR-002, FR-003)

### Implementation for User Story 1

- [X] T006 [US1] In `src/main.ts`, extract the `.py` claim into a new `private registerPyExtension(): void` that wraps `this.registerExtensions([RUNTIME_CONSTANTS.EXTENSION_PY], VIEW_TYPE_MARIMO)` in `try`/`catch`, and replace the body of the `if (this.settings.takeOverPyExtension)` block at `src/main.ts:128-133` with a call to it; keep the existing explanatory comment and add a docstring stating why the failure is non-fatal (per research.md R3, catch every throwable — do not match on the message)
- [X] T007 [US1] Run `npm test` and `npm run build` at the repository root and confirm T005 now passes and `tsc -noEmit` reports no error

**Checkpoint**: The reported defect is fixed — the plugin no longer disables itself in a conflicting environment. This is the MVP and is shippable on its own (the `catch` is silent until US2 lands).

---

## Phase 4: User Story 2 - User Understands Why `.py` Files Do Not Open in marimo (Priority: P2)

**Goal**: The skipped claim is announced once per plugin load with a message naming the conflict and the remaining way to open a notebook, and the underlying error reaches the developer console.

**Independent Test**: Drive `onload()` in all three preference/claim combinations and assert the notice and log are emitted in exactly the conflict case.

**Story dependency**: Depends on US1 (T006) — these tasks fill in the `catch` block that T006 creates, in the same file. Do not run T011 in parallel with T006.

### Tests for User Story 2 ⚠️

- [X] T008 [US2] Add a regression test to `tests/plugin-lifecycle.test.ts` asserting that the conflict path emits exactly one notice whose text equals `RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT` (via `getNoticeMessages()` from `tests/stubs/obsidian.ts`, resetting with `resetNoticeMessages()` first) and exactly one `console.warn` call carrying `RUNTIME_CONSTANTS.LOG_PY_EXTENSION_CONFLICT` and the thrown error object unmodified (FR-004, FR-005, INV-2)
- [X] T009 [US2] Add the two negative-case tests to `tests/plugin-lifecycle.test.ts`: (a) with `takeOverPyExtension: true` and a non-throwing stub, `registerExtensions` is called exactly once with `["py"]` and `VIEW_TYPE_MARIMO` and no conflict notice is emitted; (b) with `plugin.loadData` overridden to return `{ takeOverPyExtension: false }`, `registerExtensions` is never called and no conflict notice is emitted (FR-006, FR-007, contract C3)

### Implementation for User Story 2

- [X] T010 [P] [US2] Add `NOTICE_PY_EXTENSION_CONFLICT` and `LOG_PY_EXTENSION_CONFLICT` to the `RUNTIME_CONSTANTS` object in `src/constants.ts`, placing them beside the existing `NOTICE_*` and `LOG_*` entries; the notice text MUST state that another plugin already handles `.py`, that the default-editor takeover was skipped, and that notebooks can still be opened via *Open in marimo* / the command palette, and the log label MUST carry the existing `[MarimoBridge]` prefix (FR-009, contract C4)
- [X] T011 [US2] In the `catch` block of `registerPyExtension` in `src/main.ts`, call `console.warn(RUNTIME_CONSTANTS.LOG_PY_EXTENSION_CONFLICT, e)` and then `new Notice(RUNTIME_CONSTANTS.NOTICE_PY_EXTENSION_CONFLICT, NOTICE_TIMEOUT_MS)`; emit it inline at the point of failure rather than deferring to `onLayoutReady` (spec.md Clarifications Q2) — `Notice` and `NOTICE_TIMEOUT_MS` are already imported
- [X] T012 [US2] Run `npm test` at the repository root and confirm T008 and T009 pass alongside the untouched suites, including `tests/constants-policy.test.ts` (which fails if either new string were inlined in `src/main.ts`)

**Checkpoint**: A user in a conflicting environment can diagnose the situation from the on-screen notice alone (SC-003). User Stories 1 and 2 are both independently verifiable.

---

## Phase 5: User Story 3 - Preference Explains the Conflict Behavior (Priority: P3)

**Goal**: The takeover preference tells the reader that another plugin can take precedence and that a change applies after a reload — as static text only, with the toggle left editable.

**Independent Test**: Read the preference description constant and confirm it states both the precedence rule and the reload requirement, and that `src/settings.ts` renders it unchanged.

**Story dependency**: None on US1/US2 — T013/T014 touch only the description constant and its test, so this story can be implemented in parallel with Phase 3 or 4 by a second developer.

### Tests for User Story 3 ⚠️

- [X] T013 [P] [US3] Add a test to `tests/settings.test.ts` asserting that `SETTING_TAKEOVER_DESC` mentions both that another plugin claiming `.py` takes precedence and that the change applies after reloading (FR-008)

### Implementation for User Story 3

- [X] T014 [P] [US3] Amend `SETTING_TAKEOVER_DESC` in `src/constants.ts` (line 328) to add one sentence stating that a plugin that already handles `.py` takes precedence and the marimo default is skipped; keep the existing "Change takes effect after reloading the plugin." sentence, and add no live indicator and no disabled-toggle behavior to `src/settings.ts` (spec.md Clarifications Q3 — `src/settings.ts` receives no code change in this feature)

**Checkpoint**: All three user stories are independently functional and covered by the regression suite.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, release notes, and end-to-end validation across all stories

- [X] T015 [P] Add a `### Fixed` bullet under `## [Unreleased]` in `CHANGELOG.md` describing that the plugin no longer fails to load when another plugin has already registered the `.py` extension, following the existing entry style and ending with `(spec: 030-fix-py-extension-conflict)`
- [X] T016 [P] Update the **Open .py files in marimo by default** row of the settings table in `README.md` (line 134) so it matches the amended description, noting that another plugin claiming `.py` takes precedence
- [X] T017 Run the full gate at the repository root — `npm test`, `npm run build`, `npm run lint` — and confirm all three pass, including `tests/review-compliance.test.ts` (no `eslint-disable-next-line` may be introduced in `src/main.ts`)
- [X] T018 Execute the manual validation in [quickstart.md](./quickstart.md) sections 2 and 3 in an Obsidian test vault: confirm the plugin stays enabled with a competing `.py` owner, the notice and console warning appear once, *Open in marimo* / commands / ribbon / ` ```marimo ` embeds still work, and that with no competitor the `.py` open behavior and silent start-up match release 1.0.6 (SC-001, SC-002, SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every story's test task (T005, T008, T009)
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational and on US1 T006 (fills the `catch` block US1 creates)
- **User Story 3 (Phase 5)**: Depends on Setup only — independent of US1 and US2
- **Polish (Phase 6)**: Depends on all stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories. Delivers the fix on its own.
- **User Story 2 (P2)**: Sequential after US1 in `src/main.ts`; its constants task (T010) is independent and can be done at any time
- **User Story 3 (P3)**: Fully independent — different constant, different test file

### Within Each User Story

- Tests are written and confirmed FAILING before the implementation task
- Constants (`src/constants.ts`) before the code that references them
- `src/main.ts` edits are strictly sequential: T006 → T011

### Parallel Opportunities

- T010 (constants for US2) may run in parallel with T005/T006 (`src/main.ts` and the test file)
- T013 and T014 (US3) may run in parallel with all of Phase 3 and Phase 4
- T015 and T016 (`CHANGELOG.md`, `README.md`) may run in parallel with each other and with any implementation task
- **Not parallelizable**: T002/T003/T004/T005/T008/T009 all edit `tests/plugin-lifecycle.test.ts`; T006 and T011 both edit `src/main.ts`; T010 and T014 both edit `src/constants.ts`

## Parallel Example: Cross-Story

```bash
# After Phase 2 completes, a second developer can take User Story 3 end-to-end
# while the first developer works User Story 1:
Task: "T013 Add SETTING_TAKEOVER_DESC assertion in tests/settings.test.ts"
Task: "T014 Amend SETTING_TAKEOVER_DESC in src/constants.ts"

# Documentation can proceed alongside implementation:
Task: "T015 Add the Unreleased > Fixed entry in CHANGELOG.md"
Task: "T016 Update the settings table row in README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (green baseline)
2. Complete Phase 2: Foundational (`onload()` harness — CRITICAL, blocks all story tests)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` plus a manual load in a vault with a competing `.py` owner — the plugin must stay enabled
5. This alone closes GitHub issue #2; ship it if the release is time-critical

### Incremental Delivery

1. Setup + Foundational → harness ready
2. Add User Story 1 → plugin survives the conflict (MVP)
3. Add User Story 2 → the conflict is explained to the user
4. Add User Story 3 → the preference documents the precedence rule
5. Polish → changelog, README, full gate, manual quickstart run

### Parallel Team Strategy

1. Both developers complete Setup + Foundational together (single test file — one driver)
2. Then:
   - Developer A: User Story 1 → User Story 2 (`src/main.ts` owner, sequential)
   - Developer B: User Story 3 + Polish docs (T013–T016)
3. Rejoin for T017/T018

---

## Notes

- Total: 18 tasks — Setup 1, Foundational 3, US1 3, US2 5, US3 2, Polish 4
- `[P]` marks only genuinely disjoint files; this feature's small file set makes most tasks sequential
- Verify each test FAILS before writing the implementation it covers
- Constitution VI is machine-enforced: any new literal in `src/*.ts` outside `constants.ts` fails `tests/constants-policy.test.ts`
- No private Obsidian API (`app.viewRegistry`) may be introduced — see research.md R2
- Commit after each task or logical group; commit messages in English (Constitution I)
