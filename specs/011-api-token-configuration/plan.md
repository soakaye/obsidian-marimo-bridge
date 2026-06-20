# Implementation Plan: API Token Configuration

**Branch**: `011-api-token-configuration` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-api-token-configuration/spec.md`

## Summary

Add an API token configuration setting to secure the local marimo server processes. By default (if the setting is empty), a secure, random 32-character session token is generated at startup. If a custom token is provided in the settings tab, it is used instead. All marimo edit/run servers are launched with `--token-password <token>` (replacing `--no-token`), and the embedded WebViews authenticate automatically by appending `?access_token=<token>` to the request URLs.

## Technical Context

**Language/Version**: TypeScript / ES2022 (Obsidian Plugin)

**Primary Dependencies**: Obsidian API, Node `child_process` (spawn/exec)

**Storage**: Persistent plugin settings (`data.json` managed by Obsidian)

**Testing**: Manual validation using the validation scenarios in `quickstart.md`.

**Target Platform**: Desktop (macOS, Windows, Linux)

**Project Type**: Obsidian desktop app plugin

**Performance Goals**: Instant automatic login in WebView (under 3 seconds)

**Constraints**: Local loopback binding (127.0.0.1) must be maintained. Must dynamically detect local `.venv` as per Principle V. Constants must be externalized in `src/constants.ts` (Principle VI).

**Scale/Scope**: Securing all marimo servers started by the plugin.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Language Division**: All design artifacts, plan, spec, tasks, code comments and commit messages are written in English. **Passed**.
- **Principle II: Desktop-Only Architecture**: Uses Electron WebView (`<webview>`) and Node child_process. **Passed**.
- **Principle III: Reliable Process Lifecycle Management**: Restarting/stopping server logic uses existing process group/tree killing logic, ensuring no processes are orphaned. **Passed**.
- **Principle IV: Safe Local Bindings**: marimo continues to bind to `127.0.0.1` and is now additionally protected by a token (improving local security). **Passed**.
- **Principle V: Virtual Environment Preference**: Python and marimo command resolution path remains unchanged. **Passed**.
- **Principle VI: Constant Externalization**: All new configuration labels, descriptions, and command line arguments will be added to `src/constants.ts`. **Passed**.

## Project Structure

### Documentation (this feature)

```text
specs/011-api-token-configuration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    └── interfaces.md
```

### Source Code (repository root)

```text
src/
├── constants.ts         # Add settings keys and CLI args
├── settings.ts          # Add API Token input field and type definitions
├── server-manager.ts    # Launch server with token-password, manage session token, edit file URLs
├── editor-view.ts       # Append access_token to WebView URL
└── embed-processor.ts   # Append access_token to embeds
```

**Structure Decision**: Single project layout. We will modify files within `src/` to support the settings schema update, CLI argument change, and URL-appending behavior.

## Complexity Tracking

*No violations of the Constitution identified.*
