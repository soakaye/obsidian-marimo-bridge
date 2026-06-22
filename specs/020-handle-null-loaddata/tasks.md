# Tasks: Handle Null LoadData in LoadSettings

**Input**: Design documents from `/specs/020-handle-null-loaddata/`

**Prerequisites**: plan.md (required), spec.md (required)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test harness and environment verification

- [x] T001 Verify existing test environment can run successfully
  - Details: Run `npm test` once to ensure the baseline test harness works.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required for this bug fix

---

## Phase 3: User Story 1 - Fresh Plugin Installation (Priority: P1) 🎯 MVP

**Goal**: Ensure `loadSettings()` does not throw an exception when `loadData()` resolves to `null` on a fresh install.

**Independent Test**: Verify that the test for `null` loaded data passes.

### Tests for User Story 1
- [x] T002 [US1] Create a regression test simulating null settings load
  - Files: `tests/settings.test.ts`
  - Details: Add a test where `loadData()` returns `null` and assert that `loadSettings()` completes without error and applies `DEFAULT_SETTINGS`.

### Implementation for User Story 1
- [x] T003 [US1] Add fallback for null loadData in loadSettings
  - Files: `src/main.ts`
  - Details: Modify `loadSettings()` to coalesce the `loadData()` result with an empty object `?? {}` before deleting properties.

---

## Phase 4: User Story 2 - Existing Settings Loading (Priority: P2)

**Goal**: Verify custom settings continue to load correctly without regression.

**Independent Test**: Verify all settings tests (including legacy settings) pass.

### Implementation for User Story 2
- [x] T004 [US2] Verify settings loading with legacy attributes
  - Files: `tests/settings.test.ts`
  - Details: Run existing settings tests to ensure custom settings and host-removal behavior are untouched.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T005 Verify build and code quality
  - Details: Run `npm test`, `npm run build`, and `npm run lint` to guarantee complete correctness and compliance.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **User Story 1 (Phase 3)**: Depends on T001.
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion.
- **Polish (Phase 5)**: Depends on all implementation tasks being complete.

### Parallel Opportunities
- T002 (Test writing) can be done in parallel with T003 definition, but test must be executed before T003 is verified.
