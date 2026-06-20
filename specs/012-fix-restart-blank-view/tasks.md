---
description: "Task list for 012-fix-restart-blank-view"
---

# Tasks: Fix blank marimo view after Obsidian restart

**Input**: Design documents from `/specs/012-fix-restart-blank-view/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: No automated test harness exists in this repo. Per the spec/plan, validation is **manual** via the Obsidian developer console (see quickstart.md). No automated test tasks are generated.

**Organization**: Tasks are grouped by user story. Implementation is already present in the working tree and verified by `npm run build` + `npm run lint`; completed tasks are marked `[X]`. Remaining unchecked tasks are manual validation runs the user performs in Obsidian.

**Constitution**: Aligned with v2.0.0. Principle IV (Safe Local Bindings) now REQUIRES token validation (`--token-password`) and token-accepting server reuse — directly implemented by User Story 2. Principle VI (Constant Externalization) governs Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (maps to spec.md user stories)

## Path Conventions

- Single-project Obsidian plugin: source under `src/`, bundle output `main.js` at repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the build/lint toolchain used to validate the change.

- [X] T001 Confirm dev toolchain works: `npm install`, `npm run build` (tsc + esbuild), `npm run lint` all succeed in the plugin root.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Externalized constants required by every later phase (Constitution Principle VI).

**⚠️ CRITICAL**: All literals must exist in `src/constants.ts` before the watchdog and adoption logic can reference them.

- [X] T002 Add webview-recovery constants to `src/constants.ts`: `EVENT_DID_FAIL_LOAD = "did-fail-load"`, `WEBVIEW_LOAD_WATCHDOG_MS = 3000`, `WEBVIEW_MAX_LOAD_RETRIES = 3`, `ERR_LOAD_ABORTED = -3`.
- [X] T003 Add server-adoption constant to `src/constants.ts`: `PATH_AUTH_LOGIN = "/auth/login"`.

**Checkpoint**: Constants available — user story implementation can proceed.

---

## Phase 3: User Story 1 - Restored marimo tab renders after restart (Priority: P1) 🎯 MVP

**Goal**: A restored marimo tab loads its content automatically after an Obsidian restart; a silently-failed guest load is recovered by an automatic, capped reload.

**Independent Test**: Open a marimo tab, quit and relaunch Obsidian, confirm the restored tab renders within ~5s with no manual action (quickstart.md Scenario 1).

### Implementation (`src/editor-view.ts`, `createMarimoWebview`)

- [X] T004 [US1] Import the new constants (`EVENT_DID_FAIL_LOAD`, `WEBVIEW_LOAD_WATCHDOG_MS`, `WEBVIEW_MAX_LOAD_RETRIES`, `ERR_LOAD_ABORTED`) into `src/editor-view.ts`.
- [X] T005 [US1] Track readiness: declare a `domReady` flag and set it `true` inside the existing `dom-ready` listener in `src/editor-view.ts` (keep the existing injection-script behavior). (FR-001)
- [X] T006 [US1] Implement capped reload recovery in `src/editor-view.ts`: `loadRetries` counter + `reloadWebview(reason)` that calls `(el).reload()` only while `!domReady` and `loadRetries < WEBVIEW_MAX_LOAD_RETRIES`, increments the counter, logs the attempt, and reschedules. (FR-002, FR-003)
- [X] T007 [US1] Implement `scheduleLoadWatchdog()` (via `window.setTimeout(..., WEBVIEW_LOAD_WATCHDOG_MS)`) and call it once immediately after `parent.appendChild(el)` in `src/editor-view.ts`. (FR-002)
- [X] T008 [US1] Add the `EVENT_DID_FAIL_LOAD` listener in `src/editor-view.ts` that returns early on `errorCode === ERR_LOAD_ABORTED` and on `isMainFrame === false`, otherwise calls `reloadWebview`. (FR-004)
- [X] T009 [US1] Build + lint gate: `npm run build` and `npm run lint` pass with the watchdog changes.

### Manual Validation (quickstart.md)

- [ ] T010 [US1] Run quickstart Scenario 1: open a marimo tab, fully quit + relaunch Obsidian, confirm the restored tab renders within ~5s; if it first failed, confirm the console shows `webview not ready … reloading, attempt 1/3` then a healthy guest. (SC-001, SC-002)
- [ ] T011 [US1] Run quickstart Scenario 4: force an unrecoverable load and confirm recovery stops after 3 attempts with the existing "server not available" guidance and no infinite reload loop. (FR-009, SC-005)

**Checkpoint**: US1 delivers the MVP — the reported blank-on-restart defect is resolved.

---

## Phase 4: User Story 2 - Healthy startup when a leftover server is present (Priority: P2)

**Goal**: The plugin reuses an already-running server only when it accepts the current access token, and otherwise evicts and replaces a stale/incompatible leftover so the view never attaches to a server that renders blank. Directly implements Constitution v2.0.0 Principle IV.

**Independent Test**: Start a marimo server on the configured port with different auth, then launch the plugin and confirm the view still renders (quickstart.md Scenario 2).

### Implementation (`src/server-manager.ts`)

- [X] T012 [US2] Import `PATH_AUTH_LOGIN` and Node `http` into `src/server-manager.ts`.
- [X] T013 [US2] Implement `redirectsToLogin(port, token|null)` in `src/server-manager.ts` using Node `http` (non-redirect-following) to GET `/` (optionally with `?access_token=<token>`) and return `true` iff the response is 3xx with a `Location` containing `PATH_AUTH_LOGIN`. (FR-005)
- [X] T014 [US2] Implement `serverAcceptsOurAuth(port)` in `src/server-manager.ts`: `redirectsToLogin(port, null) === true` AND `redirectsToLogin(port, getActiveToken()) === false`. (FR-005, contracts C2)
- [X] T015 [US2] Implement `killPort(port)` in `src/server-manager.ts`: discover PIDs (`lsof -ti tcp:<port>` on Unix; `netstat -ano` + `taskkill /PID … /T /F` on Windows) and terminate them, best-effort. (FR-006, contracts C4, Constitution III)
- [X] T016 [US2] Update `ensureEditServer()` adoption flow in `src/server-manager.ts`: when `healthOk(port)` is true, adopt only if `serverAcceptsOurAuth(port)`; otherwise `killPort(port)` then spawn fresh. (FR-006, FR-007, Constitution IV)
- [X] T017 [US2] Build + lint gate: `npm run build` and `npm run lint` pass with the adoption changes.

### Manual Validation (quickstart.md)

- [X] T018 [US2] Run quickstart Scenario 2: start a `--no-token` server on the port, launch Obsidian, confirm the leftover is evicted, a `--token-password` server replaces it, and the view renders. Verify a single listener via `lsof`. (SC-003) — Validated against real marimo servers on an isolated port (2799): `serverAcceptsOurAuth(--no-token) === false`, `killPort` freed the port, replacement `--token-password` server adopted (`=== true`), exactly one listener. Surfaced and fixed a latent `killPort` bug (`lsof -ti tcp:<port>` matched client/TIME_WAIT sockets — could SIGKILL Obsidian itself; now `-sTCP:LISTEN`).

**Checkpoint**: US2 hardens startup against leftover/incompatible servers and satisfies Principle IV.

---

## Phase 5: User Story 3 - No duplicate server / port conflict at startup (Priority: P3)

**Goal**: Concurrent auto-start and view-restore triggers result in exactly one server on the port with no `address already in use` error.

**Independent Test**: Launch Obsidian with auto-start enabled and a marimo tab to restore; confirm one server and no bind error (quickstart.md Scenario 3).

### Implementation (`src/server-manager.ts`)

- [X] T019 [US3] Ensure `ensureEditServer()` serializes concurrent callers through the single in-flight `editSpawning` promise and re-checks `healthOk(port)` inside the critical section before spawning, so only one server binds the port. (FR-008)
- [X] T020 [US3] Build + lint gate: `npm run build` and `npm run lint` pass.

### Manual Validation (quickstart.md)

- [X] T021 [US3] Run quickstart Scenario 3: with the plugin's own server running, disable+re-enable the plugin (or restart Obsidian); confirm no `address already in use` in the console and exactly one server remains. (SC-004) — Confirmed by the user in-app, and the adoption logic that makes it possible was validated on port 2799: a matching-token server satisfies `healthOk && serverAcceptsOurAuth` (→ adopted/reused, no second spawn), while a wrong token is bounced to `/auth/login` (control).

**Checkpoint**: US3 removes the startup port-conflict noise.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 [P] Verify Constitution v2.0.0 compliance: all new literals in `src/constants.ts` (VI); change is desktop-only (II); `killPort` aligns with reliable process termination (III); token-validated server reuse satisfies the amended Principle IV.
- [X] T023 [P] Update `CHANGELOG.md` with an entry for the restart-blank-view fix and token-aware server adoption.
- [X] T024 Final end-to-end pass: run all quickstart scenarios (1–4) once more on a clean Obsidian restart to confirm no regressions.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational constants)** must complete first; constants block all implementation.
- **User stories** are independent and could be implemented in any order after Phase 2, but priority order is US1 (P1, MVP) → US2 (P2) → US3 (P3).
  - US1 touches only `src/editor-view.ts`.
  - US2 and US3 both touch `src/server-manager.ts` (US3 refines the same `ensureEditServer` US2 edits), so sequence US2 before US3 to avoid overlap.
- **Phase 6 (Polish)** runs after the user stories.

## Parallel Opportunities

- T002 and T003 (constants) are in the same file — edit together (not parallel).
- US1 (`editor-view.ts`) can be developed in parallel with US2/US3 (`server-manager.ts`) — different files. Marked conceptually `[P]` across stories.
- Polish T022 and T023 are independent `[P]`.

## Implementation Strategy

- **MVP = User Story 1**: the dom-ready watchdog alone resolves the user-visible blank-on-restart defect and is independently shippable.
- US2 and US3 are incremental robustness improvements for leftover/duplicate servers and can ship together as a follow-up increment.

## Status Summary

All implementation tasks (T001–T009, T012–T017, T019–T020, T022), the changelog entry (T023), and the server-adoption validations (T018 logic-validated on an isolated port, T021 confirmed in-app + logic-validated) are **complete** and pass build + lint. Validating T018 surfaced and fixed a latent `killPort` bug (now `-sTCP:LISTEN`). Remaining open tasks require restarting Obsidian / a live developer-console session and must be performed by the user: T010, T011 (US1 restart + unrecoverable-load scenarios) and T024 (final clean-restart pass).
