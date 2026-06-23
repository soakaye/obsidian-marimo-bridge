# Implementation Plan: Upgrade Existing marimo Installations

**Branch**: `022-pip-install-marimo` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-pip-install-marimo/spec.md`

## Summary

When the user triggers `marimo` installation, check if `marimo` is already installed in the resolved Python environment.
- If not installed, run `python -m pip install marimo`.
- If installed, run `python -m pip install --upgrade marimo` to upgrade it to the latest version.

## Technical Context

**Language/Version**: TypeScript / Node.js

**Primary Dependencies**: Obsidian API, Node.js `child_process`

**Storage**: N/A

**Testing**: Node.js built-in test runner (`npm test`)

**Target Platform**: Obsidian Desktop (Windows/macOS/Linux)

**Project Type**: desktop-app (Obsidian Plugin)

**Performance Goals**: N/A

**Constraints**: Desktop-only APIs, constant externalization

**Scale/Scope**: Local execution of Python/pip commands

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Gate 1: Language Policy** -> All project artifacts, implementation plans, and code comments are written in English. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> No mobile support code is introduced; we use Node's `child_process`. -> **PASS**
- **Gate 3: Constant Externalization** -> All newly added string literals (like `--upgrade`) must be defined in `src/constants.ts`. -> **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/022-pip-install-marimo/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research and design decisions
├── data-model.md        # Data model implications (none)
└── quickstart.md        # Quickstart validation guide
```

### Source Code (repository root)

```text
src/
├── constants.ts         # Define CMD_ARG_UPGRADE = "--upgrade"
└── server-manager.ts    # Modify installMarimo() to conditionally add CMD_ARG_UPGRADE

tests/
└── server-manager.test.ts # Add unit tests for conditional --upgrade installation
```

**Structure Decision**: Single project layout matching the existing plugin structure.

## Proposed Changes

### marimo Bridge Plugin

#### [MODIFY] [constants.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/marimo-bridge/src/constants.ts)
- Add `export const CMD_ARG_UPGRADE = "--upgrade";`.

#### [MODIFY] [server-manager.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/marimo-bridge/src/server-manager.ts)
- Import `CMD_ARG_UPGRADE` from constants.
- In `installMarimo()`, check if `marimo` is already installed using `await this.getMarimoVersion() !== null`.
- If already installed, append `CMD_ARG_UPGRADE` to the installation args.

#### [MODIFY] [server-manager.test.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/marimo-bridge/tests/server-manager.test.ts)
- Add unit tests verifying `installMarimo()` passes the correct arguments to `runCapture()` depending on `getMarimoVersion()` return value.

## Verification Plan

### Automated Tests
- Run tests: `npm test`
- New tests: Verify `installMarimo()` correct argument generation.

### Manual Verification
- Follow [quickstart.md](./quickstart.md) validation scenarios to verify correct CLI args in development logs.
