---

description: "Task list for lifecycle-safe run-mode marimo servers and related consistency remediation"

---

# Tasks: Manage Run-Mode Server Lifecycles

**Input**: Design documents from `specs/014-manage-run-servers/`

## Phase 1: Regression Coverage

- [X] T001 Add a regression test proving concurrent run-mode acquisitions produce one shared server and one reference per caller.
- [X] T002 Add a regression test for embed unload while run-server startup is pending.
- [X] T003 Add regression coverage for capped webview reload failure guidance.
- [X] T004 Add regression coverage for the 1000-candidate notebook naming limit.
- [X] T005 Add regression coverage for fixed-loopback URLs and removal of the configurable host setting.
- [X] T006 Add regression coverage for incompatible and foreign edit-port eviction, including the unable-to-release case.
- [X] T007 Add an AST-based policy test that rejects runtime string and non-zero numeric literals outside `src/constants.ts`.

## Phase 2: Implementation

- [X] T008 Separate shared run-server startup from per-caller reference acquisition in `src/server-manager.ts`.
- [X] T009 Add disposed/acquired lease state to `MarimoEmbedChild` in `src/embed-processor.ts`.
- [X] T009a Retain acquisition aliases so run servers can be released after a notebook is renamed or deleted.
- [X] T010 Display explanatory guidance after capped webview reload attempts in `src/editor-view.ts`.
- [X] T011 Enforce the notebook naming search limit and abort safely in `src/main.ts`.
- [X] T012 Remove the host setting and bind all server operations to `127.0.0.1`.
- [X] T013 Restore edit-port conflict eviction and stop startup when the port cannot be released.
- [X] T014 Externalize remaining runtime literals into `src/constants.ts`.

## Phase 3: Verification and Documentation

- [X] T015 Run `npm test`, `npm run build`, and `npm run lint`.
- [X] T016 Update README, changelog, and affected Speckit artifacts.
- [X] T017 Run the manual Obsidian exit/restart scenarios from feature 013 and the run-embed scenarios from this feature's quickstart.
