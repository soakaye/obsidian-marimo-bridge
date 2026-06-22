# Tasks: Resolve Code Review Fixes

**Input**: Design documents from `/specs/019-code-review-fixes/`

**Prerequisites**: plan.md (required), spec.md (required)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test harness and environment setup

- [ ] T001 [P] Create test runner harness and stubs
  - Files: `tests/run-tests.mjs`, `tests/stubs/obsidian.ts`, `tests/fixtures/fake-marimo.mjs`, `package.json`, `tsconfig.json`, `eslint.config.mts`
  - Details: Configure esbuild bundling runner, map obsidian imports, add `npm test` script and verify it runs successfully.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core constants or config setup (none required, directly proceed to stories)

---

## Phase 3: User Story 1 - Secure and robust server ownership (Priority: P1) 🎯 MVP

**Goal**: Ensure server manager only manages owned ports and terminates processes properly based on token-aware records.

**Independent Test**: Run server records and manager lifecycle tests and check that unowned ports are unaffected and records are cleared on exit.

### Tests for User Story 1
- [ ] T002 [US1] Create test suite for server records token checks
  - Files: `tests/server-records.test.ts`
  - Details: Add tests validating that records have token, and reconciliation filters out invalid/legacy entries.
- [ ] T003 [US1] Create test suite for server manager lifecycle regressions
  - Files: `tests/server-manager.test.ts`
  - Details: Add tests checking that unowned ports aren't killed, records are retained until process exits, and edit server timing out is cleared.

### Implementation for User Story 1
- [ ] T004 [US1] Add token validation to spawned server record persistence
  - Files: `src/server-records.ts`, `src/constants.ts`
  - Details: Enforce token attribute in validation and persist it.
- [ ] T005 [US1] Implement exit-driven record cleanup and port ownership checks
  - Files: `src/server-manager.ts`
  - Details: Avoid killing incompatible port occupants. Attach idempotent finalizer on exit to clean records. Ensure records are kept on signal stop until confirmation.
- [ ] T006 [US1] Implement settings change invalidation and edit server timeout cleanup
  - Files: `src/server-manager.ts`
  - Details: Reset ready server state on settings changes and terminate timed-out startup processes.

**Checkpoint**: User Story 1 features verified by `npm test`.

---

## Phase 4: User Story 2 - Vault boundary enforcement for notebooks (Priority: P2)

**Goal**: Validate notebook paths to prevent symbolic link traversal outside the active Vault directory.

**Independent Test**: Attempt invalid path formats and symlinks in tests and confirm they are rejected.

### Tests for User Story 2
- [ ] T007 [US2] Create test suite for notebook path validation
  - Files: `tests/notebook-path.test.ts`
  - Details: Add traversal, symlink escapes, absolute paths, and valid relative python file tests.

### Implementation for User Story 2
- [ ] T008 [US2] Implement realpath Vault boundary validation utility
  - Files: `src/notebook-path.ts`
  - Details: Resolve absolute path and verify it remains within Vault bounds.
- [ ] T009 [US2] Integrate notebook validation in server manager
  - Files: `src/server-manager.ts`
  - Details: Enforce containment check in `ensureRunServer` spawning.

**Checkpoint**: User Story 2 features verified by `npm test`.

---

## Phase 5: User Story 3 - URL query safety (Priority: P3)

**Goal**: Avoid URL double decoding to allow opening notebook files with literal percent signs in names.

**Independent Test**: Test opening file paths containing `%` in view and verify single decoding works.

### Tests for User Story 3
- [ ] T010 [US3] Create test suite for URL query parameters
  - Files: `tests/url-utils.test.ts`
  - Details: Assert single decoding correctness for files with `%` characters.

### Implementation for User Story 3
- [ ] T011 [US3] Implement single-decoding helper
  - Files: `src/url-utils.ts`
  - Details: Create parsing utility extracting query parameters exactly once.
- [ ] T012 [US3] Replace double-decoding in editor view
  - Files: `src/editor-view.ts`
  - Details: Swap `decodeURIComponent` wrappers on URLSearchParams with the new utility.

**Checkpoint**: User Story 3 features verified by `npm test`.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T013 Verify complete integration and code quality
  - Details: Execute `npm test`, `npm run build`, `npm run lint` and verify no errors.
