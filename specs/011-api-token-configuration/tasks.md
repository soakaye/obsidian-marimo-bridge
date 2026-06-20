# Tasks: API Token Configuration

**Input**: Design documents from `/specs/011-api-token-configuration/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/interfaces.md

**Organization**: Tasks are grouped by implementation phases and user stories to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and checking environment.

- [x] T001 Verify project build commands `npm run build` and `npm run lint` execute successfully in workspace root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure settings and type updates. No user story work can begin until this phase is complete.

- [x] T002 Add API token configuration constants in `src/constants.ts` (e.g., `DEFAULT_API_TOKEN`, settings labels, settings descriptions, and CLI flag string constants)
- [x] T003 Update settings interface and defaults to include `apiToken` in `src/settings.ts`
- [x] T004 Add text input field for API token configuration to the settings tab interface in `src/settings.ts`, and display a warning note indicating that server restart is required for changes to take effect
- [x] T005 Implement cryptographically secure session token generation logic in `src/server-manager.ts` to be used when `settings.apiToken` is empty

**Checkpoint**: Foundation ready - settings page and configuration logic are ready to support token-based authentication.

---

## Phase 3: User Story 1 - Configure and Authenticate with API Token (Priority: P1) 🎯 MVP

**Goal**: Configure a custom token or use a secure auto-generated session token to secure the marimo servers and authenticate WebViews seamlessly.

**Independent Test**: Configure a custom token, restart the server, confirm direct browser access requires token, and verify that Obsidian WebView loads the notebook successfully without prompts.

### Implementation for User Story 1

- [x] T006 [P] [US1] Modify `spawnServer` in `src/server-manager.ts` to pass the token via `--token-password <token>` instead of `--no-token` for both edit and run server processes
- [x] T007 [US1] Update URL construction methods (`editBaseUrl`, `editFileUrl`, `editHomeUrl`, and `ensureRunServer`) in `src/server-manager.ts` to include the `access_token` query parameter with the resolved active token
- [x] T008 [P] [US1] Update WebView URL initialization and reloading in `src/editor-view.ts` to ensure the `access_token` parameter is appended to all webview source URLs
- [x] T009 [P] [US1] Update iframe/webview URL configuration in `src/embed-processor.ts` to ensure the `access_token` parameter is appended to embed server URLs

**Checkpoint**: User Story 1 is fully functional. Both edit and run servers require a token, and the plugin authenticates automatically.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verification, linting, and final documentation checks.

- [x] T010 [P] Execute all manual validation scenarios specified in `specs/011-api-token-configuration/quickstart.md`
- [x] T011 Run final project linting `npm run lint` and TypeScript compilation `npm run build` to verify code correctness
- [x] T012 Commit all implementation changes to the `011-api-token-configuration` branch

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3)**: Depends on Foundational phase completion
- **Polish (Phase 4)**: Depends on all user story tasks being completed

### Within User Story 1
- T006 (passing token via CLI) and T007 (updating URL endpoints) must be completed.
- T008 (editor-view WebView) and T009 (embed-processor WebView) depend on T007 for URL structure, but can be implemented in parallel.

### Parallel Opportunities
- T008 and T009 can be developed in parallel since they touch different files (`src/editor-view.ts` and `src/embed-processor.ts`).
- Verification tasks in Phase 4 can be run in parallel with documentation checks.

---

## Parallel Example: User Story 1

```bash
# Developer A
Task: "Update WebView URL initialization and reloading in src/editor-view.ts"

# Developer B
Task: "Update iframe/webview URL configuration in src/embed-processor.ts"
```

---

## Implementation Strategy

### MVP First
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Implement T006 and T007 in `src/server-manager.ts` to pass the token to marimo processes.
3. Implement T008 in `src/editor-view.ts` to verify the main editor can load notebooks.
4. **VALIDATION**: Run manual test to verify the editor loads, and the browser requires a password.
5. Implement T009 in `src/embed-processor.ts` for preview embeds.
6. Verify all test scenarios in `quickstart.md`.
