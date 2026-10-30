<!--
SYNC IMPACT REPORT:
- Version change: 3.0.0 -> 4.0.0
- List of modified principles:
  - Redefined: I. Language Division (言語区分)
    — Replaced the strict requirement that all direct user communication, chat logs,
      and assistant explanations must be written in Japanese with a flexible requirement
      to use the natural language appropriate for the agent's operating environment
      and user instructions/prompts.
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  - None
- Downstream artifacts to refresh:
  - None
- Follow-up TODOs: None
-->
# marimo Bridge for Obsidian Constitution

## Core Principles

### I. Language Division (言語区分)
All project artifacts, including specifications (`spec.md`), implementation plans (`plan.md`), task lists (`tasks.md`), codebase modifications, and Git commit messages/pull request titles, MUST be written in **English**. Direct communication, chat logs, Q&A sessions, and assistant explanations to the user MUST use the natural language appropriate for the agent's operating environment and user instructions or prompts (e.g., using Japanese in Japanese conversational contexts, while adapting naturally to English or other languages specified by the environment or prompt).

### II. Desktop-Only Architecture
This plugin is built exclusively for Obsidian Desktop, depending on Node.js standard modules (like `child_process`) and Electron components (like `<webview>`). No mobile compatibility code or packages should be introduced unless these APIs are completely abstracted.

### III. Reliable Process Lifecycle Management
All spawned `marimo` server processes (both for editing and lazy running) MUST be terminated when the plugin unloads or on Obsidian app exit. On Windows, the entire process tree must be killed recursively. On Unix-like systems, server processes must be spawned detached and terminated by their process group to prevent orphan processes.

### IV. Safe Local Bindings
The local `marimo` servers MUST run in headless mode with token validation enabled (e.g. launched with `--token-password` using the plugin's active access token), binding strictly to the loopback interface (`127.0.0.1`). Every embedded request MUST carry that access token. The plugin MUST only reuse a pre-existing server that it can positively confirm belongs to the **current vault**, identified by a same-vault crash-recovery record (matching vault root, the recorded PID listening on the port, and the recorded token still accepted); a token match alone is NOT sufficient, because separate vaults may share a configured token. The plugin MUST NOT terminate a server it cannot confirm as its own — for example one started by another vault on the same port, or a foreign process; instead it MUST fall back to a free port and start its own server there. Configuration options and this fallback together MUST ensure that port bindings do not conflict and are bound safely.

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

**Version**: 4.0.0 | **Ratified**: 2026-06-18 | **Last Amended**: 2026-10-31
