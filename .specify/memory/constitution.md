<!--
SYNC IMPACT REPORT:
- Version change: 1.1.0 -> 2.0.0
- List of modified principles:
  - Redefined (backward incompatible): IV. Safe Local Bindings
    — reversed the rule from "without token validation" to "with token validation"
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ aligned, generic placeholders)
  - .specify/templates/spec-template.md (✅ aligned, generic placeholders)
  - .specify/templates/tasks-template.md (✅ aligned, generic placeholders)
- Downstream artifacts to refresh:
  - specs/012-fix-restart-blank-view/plan.md (⚠ Constitution Check note for IV now obsolete — IV is PASS, no longer a deviation)
  - specs/011-api-token-configuration/* (token-auth feature that motivated this amendment; now aligned)
- Follow-up TODOs: None
-->
# marimo Bridge for Obsidian Constitution

## Core Principles

### I. Language Division (言語区分)
All project artifacts, including specifications (`spec.md`), implementation plans (`plan.md`), task lists (`tasks.md`), codebase modifications, and Git commit messages/pull request titles, MUST be written in **English**. Conversely, all direct communication, chat logs, Q&A sessions, and assistant explanations to the user MUST be written in **Japanese**.

### II. Desktop-Only Architecture
This plugin is built exclusively for Obsidian Desktop, depending on Node.js standard modules (like `child_process`) and Electron components (like `<webview>`). No mobile compatibility code or packages should be introduced unless these APIs are completely abstracted.

### III. Reliable Process Lifecycle Management
All spawned `marimo` server processes (both for editing and lazy running) MUST be terminated when the plugin unloads or on Obsidian app exit. On Windows, the entire process tree must be killed recursively. On Unix-like systems, server processes must be spawned detached and terminated by their process group to prevent orphan processes.

### IV. Safe Local Bindings
The local `marimo` servers MUST run in headless mode with token validation enabled (e.g. launched with `--token-password` using the plugin's active access token), binding strictly to the loopback interface (`127.0.0.1`). Every embedded request MUST carry that access token, and the plugin MUST only reuse a pre-existing server that accepts the active token (evicting and replacing any incompatible or token-mismatched server). Configuration options must ensure that port bindings do not conflict and are bound safely.

### V. Virtual Environment Preference
The plugin must dynamically detect vault-local Python virtual environments (e.g., `<vault>/.venv`) and use their executables (`python` or `marimo`) before falling back to system-wide installations.

### VI. Constant Externalization
All non-empty string literals and non-zero numeric literals used within the program execution code MUST be defined as constants and managed in a separate file (e.g., `src/constants.ts` or similar dedicated locations) rather than being hardcoded in-place.

## Core Constraints
- **Technology Stack**: TypeScript, HTML, Vanilla CSS.
- **Dependencies**: Keep all Node/Electron/Obsidian modules in the esbuild `external` list.
- **Coding Conventions**: Use Tabs for indentation (as configured in `.editorconfig`). Do not remove existing comments or Docstrings during edits.

## Development Workflow
- Use the following commands for development and building:
  - `npm install`
  - `npm run dev` (esbuild watch)
  - `npm run build` (tsc type-check + production bundle)
  - `npm run lint` (eslint)

## Governance
The constitution is the source of truth for the project's development constraints and workflows. Any modifications must update the version number and log dates in the constitution file.
Version Bumps:
- MAJOR: Backward incompatible removals of core principles or major technology shifts.
- MINOR: Adding new principles or significant workflow changes.
- PATCH: Clarifications, formatting, and typo fixes.

**Version**: 2.0.0 | **Ratified**: 2026-06-18 | **Last Amended**: 2026-06-20
