---

description: "Task list for feature implementation"
---

# Tasks: Searchable Plugin Settings

**Input**: Design documents from `/specs/031-declarative-settings-api/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/settings-presentation.md](./contracts/settings-presentation.md), [quickstart.md](./quickstart.md)

**Tests**: Test tasks ARE included — spec.md FR-013/FR-013a/FR-013b explicitly require structural, parity, and direct unit coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project at the repository root: production code in `src/`, regression suite in `tests/`. All paths are repository-relative, per plan.md "Source Code (repository root)".

**Note on parallelism**: This feature touches only `src/constants.ts`, `src/settings.ts`, and `tests/settings.test.ts`. Most tasks within a phase edit the same file, so `[P]` is marked sparingly and only where the files are genuinely disjoint — never parallelize two tasks that name the same file.

**⚠️ Read before planning a partial ship**: a non-empty return from `getSettingDefinitions()` makes the host bypass `display()` **entirely** (contracts C6). The definitions array therefore cannot be populated incrementally — a half-filled array silently *removes* the missing options on 1.13+ hosts. See "Implementation Strategy" for what this means for the MVP boundary.

**Two single-source-of-truth rules govern this feature.** Both exist to stop a second, drifting copy of something the codebase already owns:

1. The two presentations must list the same options (FR-005b) — guarded by the parity test in T009.
2. The existing `DEFAULT_SETTINGS` table stays the only place defaults are declared (FR-011a) — guarded by an assertion in T005 and honored by T006.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a clean, reproducible baseline before changing behavior

- [X] T001 Establish a green baseline at the repository root: run `npm install`, then `npm test`, `npm run build`, and `npm run lint`, and record that all four succeed before any edit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The constants every definition references, and the persistence bridge every control row writes through. Nothing in any story can compile without these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. T002 and T003 both edit `src/constants.ts` and MUST run sequentially.

- [X] T002 Add one settings-key constant per persisted key to `src/constants.ts` — `marimoPath`, `pythonPath`, `uvPath`, `port`, `autoStart`, `startupTimeout`, `takeOverPyExtension`, `defaultEmbedMode`, `defaultEmbedHeight`, `showContextMenu`, `showMarkdownContextMenu`, `apiToken` (12 keys, matching `DEFAULT_SETTINGS` exactly). These are the `key` values the host passes back to `getControlValue`/`setControlValue` (research.md R7, FR-012)
- [X] T003 Add control-kind discriminator constants (`"text"`, `"number"`, `"toggle"`, `"dropdown"`) to `src/constants.ts` as plain `export const` so their literal types survive and Obsidian's `SettingControl` union still narrows — follow the existing `MODE_EDIT`/`MODE_RUN` pattern in the same file. The installation row needs no discriminator; it is identified by having a `render` property (research.md R7, FR-012)
- [X] T004 Add `getControlValue(key)` and `setControlValue(key, value)` overrides to `MarimoBridgeSettingTab` in `src/settings.ts`: read from and write to `this.plugin.settings`, then `await this.plugin.saveSettings()` — NOT the base class's default persistence, which would skip `invalidateAvailability()` and leave a stale server running against the old configuration (contracts C2/C3, research.md R3, FR-006, INV-4)

**Checkpoint**: Constants exist and every control row has a persistence path that preserves the plugin's save side effects — story work can begin

---

## Phase 3: User Story 1 - Find a Plugin Setting From the Global Search (Priority: P1) 🎯 MVP core

**Goal**: All 13 options are described declaratively so the host indexes them for global settings search, in the same order and with the same labels as today.

**Independent Test**: Call `getSettingDefinitions()` and assert it returns 13 rows in the documented order with the expected control kind per row, that every key in `DEFAULT_SETTINGS` is bound exactly once, that the two description-less rows carry no description, and that no control declares its own default value.

### Tests for User Story 1 ⚠️

> **NOTE: Write this test FIRST and confirm it FAILS before implementing T006/T007**

- [X] T005 [US1] Add a structure test to `tests/settings.test.ts` asserting that `getSettingDefinitions()` returns 13 rows whose ordered names match contracts/settings-presentation.md C1; each row's control kind matches that table; every key in `DEFAULT_SETTINGS` is bound by exactly one control (INV-2); rows 7 (`SETTING_TIMEOUT_NAME`) and 10 (`SETTING_EMBED_HEIGHT_NAME`) have **no** description, since neither has a `setDesc()` in the legacy path and neither may gain one, while the other eleven — **including row 4** — do declare one (spec.md Clarifications, FR-002); and **no control declares its own default value**, keeping `DEFAULT_SETTINGS` the single source of defaults (FR-011a, FR-013a). Also assert `DEFAULT_SETTINGS` itself is unchanged — its exact keys and values — so the "no persisted data, schema, or default changes" promise is machine-checked rather than left to review (FR-011, SC-004, INV-1)

### Implementation for User Story 1

- [X] T006 [US1] Implement `getSettingDefinitions(): SettingDefinitionItem[]` on `MarimoBridgeSettingTab` in `src/settings.ts` with the 12 control rows from contracts C1, reusing the existing `SETTING_*_NAME` and `SETTING_*_DESC` constants verbatim (that reuse is what makes label parity hold) and the key/kind constants from T002/T003; emit the rows in `display()` order; build the `defaultEmbedMode` dropdown's options from the existing `MODE_EDIT`/`MODE_RUN` keys and `TEXT_EMBED_MODE_EDIT`/`TEXT_EMBED_MODE_RUN` labels; omit `desc` on the two description-less rows; and omit `defaultValue` on every control — `loadSettings()` already merges `DEFAULT_SETTINGS`, so a per-control default would be a dead second source of truth (FR-011a). Do NOT add a heading row — the legacy heading is excluded by design (research.md R8)
- [X] T007 [US1] Add the installation-status row (row 4) to the same array in `src/settings.ts` as a `render` definition that **declares `desc` with the same `TEXT_CHECKING` constant the legacy path passes to `setDesc()`** (without it the row has no indexed description and FR-002 weakens for it) and whose callback reproduces today's status text and install button by porting the logic from `display()`'s `refreshInstallStatus` — read via `servers.getMarimoPackageVersion()` / `resolvePython()` / `vaultVenvBroken()` / `describeMarimoInstallTarget()` and install via `servers.installMarimo()`; leave the cleanup function for T015 (contracts C5, FR-007)
- [X] T008 [US1] Run `npm test` and `npm run build` at the repository root and confirm T005 passes and `tsc -noEmit` is clean — the type check is what proves the definitions actually satisfy Obsidian's discriminated unions, so a wrong `type`/`control` pairing fails here

**Checkpoint**: Every option is described to the host and indexable by search. **Not yet shippable on its own** — see the Dependencies section: numeric validation from US3 must land before release.

---

## Phase 4: User Story 2 - Settings Keep Working on Older Hosts (Priority: P2)

**Goal**: Pre-1.13 hosts keep the exact settings tab they have today, and no option is ever drawn twice.

**Independent Test**: Drive `display()` with the existing fake-container collector and compare its ordered option names against the declarative rows; separately confirm `display()`'s source is unmodified and that no host-version check was introduced.

**Story dependency**: The parity test needs the declarative rows from US1 (T006/T007) to compare against. The *implementation* obligation here is to have changed nothing — which is why this phase is mostly verification.

### Tests for User Story 2 ⚠️

- [X] T009 [US2] Add a parity test to `tests/settings.test.ts`: run `display()` against a fake container (reuse the collector pattern already used by the two existing `display()` tests), drop the leading `SETTINGS_TAB_HEADER` heading row, and assert the remaining ordered names equal the ordered names from `getSettingDefinitions()` — this is the guard that a future option added to one presentation and forgotten in the other cannot ship (FR-005b, SC-006, INV-3, research.md R8)

### Implementation for User Story 2

- [X] T010 [US2] Verify the no-change obligation for `src/settings.ts`: run `git diff src/settings.ts` and confirm the `display()` method body is untouched (additions only, all outside it), and confirm no host-version detection (`requireApiVersion`, `apiVersion`, or equivalent) was introduced anywhere — mutual exclusivity is the host's job, not the plugin's (FR-005a, FR-004, contracts C6, research.md R2)
- [X] T011 [US2] Run `npm test` and confirm the two pre-existing `display()` tests (`renders uv command path between Python path and install status`, `trims and saves uvPath from the settings tab`) still pass unmodified — they are the legacy path's only regression guard

**Checkpoint**: Both presentations are provably in parity and the legacy path is provably untouched

---

## Phase 5: User Story 3 - Dynamic and Validated Options Still Behave Correctly (Priority: P3)

**Goal**: The complex options — numeric ranges, path trimming with status re-check, and the live install row — behave as they do today rather than being degraded by the move.

**Independent Test**: Call `validate` directly with in-range and out-of-range values; call `setControlValue` directly and assert path keys are stored trimmed, that the plugin's `saveSettings()` ran, and that a rejected value never reaches storage.

**Story dependency**: Depends on US1 (T006 for the rows that receive `validate`, T007 for the render row that receives cleanup) and on Foundational T004 (the `setControlValue` this phase extends). T014 and T004 edit the same method — strictly sequential.

### Tests for User Story 3 ⚠️

- [X] T012 [US3] Add behavior unit tests to `tests/settings.test.ts` that call the plugin's own logic directly, without simulating the host's rendering framework (spec.md Clarifications, FR-013b): `validate` returns void in range and a non-empty message out of range for `port` (1…`PORT_MAX`), `startupTimeout` (> 0), and `defaultEmbedHeight` (> 0); `setControlValue` stores each of the three path keys **and `apiToken`** trimmed; `setControlValue` invokes `saveSettings()`; and saving a path key re-runs the installation check while saving the token does not (FR-009, FR-006, INV-4). Note that "a rejected value never reaches storage" (INV-5) is ordering the **host** guarantees per contracts C3, so assert what this plugin controls — that `validate` returns a non-empty message — and leave the end-to-end rejection to T019 (FR-008)

### Implementation for User Story 3

- [X] T013 [US3] Add the out-of-range message constants **and the numeric bound constants** to `src/constants.ts` — `tests/constants-policy.test.ts` rejects non-zero *numeric* literals too, so an inlined `min: 1` fails T016; reuse `PORT_MAX`/`OFFSET_ONE` where they fit. Then attach `min`/`max` and a `validate` callback to the three `number` controls in `src/settings.ts` — port `1…PORT_MAX`, startup timeout `> 0`, embed height `> 0`. Returning a non-empty string rejects and surfaces an inline message; returning void accepts, so a rejection leaves storage untouched with no manual revert logic (contracts C4, research.md R5, FR-008, FR-012)
- [X] T014 [US3] Extend the `setControlValue` override in `src/settings.ts` (from T004) so that `marimoPath`, `pythonPath`, `uvPath`, **and `apiToken`** are stored trimmed — all four are trimmed by today's legacy handlers (`src/settings.ts:384` trims the token), and `validate` cannot transform a value, only reject it, so trimming has to live here. Re-run the installation check afterwards for the three **path** keys only; the token does not affect installation (contracts C3, research.md R4, FR-009)
- [X] T015 [US3] Make the installation-status `render` callback in `src/settings.ts` return a cleanup function so an in-flight version check cannot write into a torn-down row, and confirm the status still refreshes after the install action resolves (contracts C5, FR-007, FR-010)
- [X] T016 [US3] Run `npm test` at the repository root and confirm T012 passes alongside every other suite, including `tests/constants-policy.test.ts` — it fails if any control kind, settings key, or validation message was inlined in `src/settings.ts` instead of being declared in `src/constants.ts`

**Checkpoint**: All three user stories are complete and the release is behaviorally equivalent to release 1.0.7 on both host versions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Release notes and end-to-end validation across both host versions

- [X] T017 [P] Add an `### Added` bullet under `## [Unreleased]` in `CHANGELOG.md` stating that plugin settings now appear in Obsidian's global settings search on 1.13+, with no change for older versions, following the existing entry style and ending with `(spec: 031-declarative-settings-api)`
- [X] T018 Run the full gate at the repository root — `npm test`, `npm run build`, `npm run lint` — and confirm all three pass
- [X] T019 Execute [quickstart.md](./quickstart.md) section 2 on an Obsidian 1.13+ test vault: search for `port`, `token`, `timeout`, `embed`, and `uv` and confirm each surfaces the matching option (SC-001); confirm that **selecting a result opens that option ready to edit without first locating the plugin's settings tab** (SC-002); confirm the tab itself still lists all 13 options in the original order; then exercise rejection (port `70000` — this is where FR-008's "never reaches storage" is actually proven, since the host owns that ordering), trimming (a path and the API token, each with trailing spaces), the install action, repeated open/close of the tab (FR-010), and a hand-edited out-of-range `data.json` value that must be surfaced rather than rewritten (FR-006–FR-010)
- [ ] T020 Execute [quickstart.md](./quickstart.md) section 3 on an Obsidian vault older than 1.13: confirm all 13 options render, edit, and persist identically to release 1.0.7, and that no option is duplicated. **If no pre-1.13 host is available, report this task as not performed** — the parity test covers list drift but not rendering on that host (FR-003, FR-004, SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all story work; nothing compiles without T002–T004
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on US1 (its parity test compares against the declarative rows)
- **User Story 3 (Phase 5)**: Depends on US1 (T006/T007) and Foundational (T004)
- **Polish (Phase 6)**: Depends on all stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: The core deliverable. Independently *testable* (structure test), but see the release constraint below.
- **User Story 2 (P2)**: Verification-only implementation; its test needs US1 to exist.
- **User Story 3 (P3)**: Hardens rows created by US1; cannot precede it.

### ⚠️ Release constraint — US1 alone is testable but NOT shippable

Because a non-empty definitions array makes the host bypass `display()` completely (contracts C6), shipping US1 without US3's `validate` callbacks would let a user store a port of `70000` or a timeout of `0` — values today's legacy handlers reject. That is a behavioral regression, not merely a missing improvement. **US1 + US3 must ship together**; US2 must land too, since its parity test is what stops the two lists from drifting.

### Within Each User Story

- Tests are written and confirmed FAILING before the implementation they cover
- Constants (`src/constants.ts`) before the code that references them
- `src/settings.ts` edits are strictly sequential: T004 → T006 → T007 → T013 → T014 → T015
- `tests/settings.test.ts` edits are strictly sequential: T005 → T009 → T012

### Parallel Opportunities

- T017 (`CHANGELOG.md`) may run in parallel with any implementation task
- **Not parallelizable**: T002/T003/T013 all edit `src/constants.ts`; T004/T006/T007/T013/T014/T015 all edit `src/settings.ts`; T005/T009/T012 all edit `tests/settings.test.ts`

With only three source files in play, this feature is close to fully sequential. Splitting it across two developers would mostly produce merge conflicts rather than speedup.

## Parallel Example

```bash
# The only meaningful overlap — documentation alongside implementation:
Task: "T017 Add the Unreleased > Added entry in CHANGELOG.md"
# ...while another task proceeds in src/ or tests/
```

---

## Implementation Strategy

### Incremental Delivery

1. Setup + Foundational → constants and the persistence bridge exist
2. Add User Story 1 → every option is described and indexable; structure test green
3. Add User Story 2 → parity locked in; legacy path proven untouched
4. Add User Story 3 → validation, trimming, and cleanup restored to today's behavior
5. Polish → changelog, full gate, manual validation on both host versions

Stop-and-validate points are the checkpoints at the end of Phases 2, 3, 4, and 5. The **release** boundary, however, is the end of Phase 5 — not the end of Phase 3 (see the release constraint above).

### Highest-Risk Steps

- **T006/T007** — the type check in T008 is the real verification; a wrong `type`/`control` pairing is caught by `tsc`, not by tests
- **T002/T003/T013** — Principle VI is machine-enforced; any inlined literal in `src/settings.ts` fails `tests/constants-policy.test.ts`
- **T020** — the one step that cannot be verified without a second Obsidian install; report honestly if unavailable

---

## Notes

- Total: 20 tasks — Setup 1, Foundational 3, US1 4, US2 3, US3 5, Polish 4
- `[P]` marks only genuinely disjoint files; this feature's three-file footprint makes nearly everything sequential
- Verify each test FAILS before writing the implementation it covers
- No private Obsidian API may be introduced; the host arbitrates which presentation runs (research.md R2)
- `display()` is off-limits (FR-005a) — additions to `src/settings.ts` go around it, never into it
- `DEFAULT_SETTINGS` is off-limits as a second declaration site (FR-011a) — no control carries its own `defaultValue`
- Commit after each task or logical group; commit messages in English (Constitution I)
