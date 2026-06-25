# Implementation Plan: Support uv Package Manager for marimo Installation

**Branch**: `023-uv-package-manager` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-uv-package-manager/spec.md`

## Summary

Add uv-aware package detection and installation for vault-local `.venv` environments created by uv. The plugin will add a settings-screen field for an optional uv command path, detect uv-created `.venv` directories when `.venv/pyvenv.cfg` contains a `uv` entry, use `uv pip show/install --python <venv-python>` for marimo package operations when appropriate, and preserve the existing `python -m pip install` flow for all non-uv targets.

## Technical Context

**Language/Version**: TypeScript / Node.js

**Primary Dependencies**: Obsidian API, Node.js `child_process`, Node.js `fs`/`path`

**Storage**: Obsidian plugin settings (`data.json`) via `MarimoBridgeSettings`

**Testing**: Node.js built-in test runner (`npm test`), TypeScript build (`npm run build`), ESLint (`npm run lint`)

**Target Platform**: Obsidian Desktop on Windows/macOS/Linux

**Project Type**: desktop-app (Obsidian plugin)

**Performance Goals**: uv command resolution and package availability checks should complete within existing marimo detection timeouts under normal local process conditions.

**Constraints**: Desktop-only APIs are expected; keep Node/Electron/Obsidian modules externalized; all command strings and path literals must be centralized in `src/constants.ts`; use tabs for code indentation.

**Scale/Scope**: Local package-manager selection and execution for one vault-local `.venv` and one marimo package.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Gate 1: Language Policy** -> Plan, research, data model, contracts, quickstart, and code changes are written in English; user-facing chat remains Japanese. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> The feature relies on Node.js process and filesystem APIs already used by the desktop plugin; no mobile support is introduced. -> **PASS**
- **Gate 3: Reliable Process Lifecycle Management** -> The feature changes package installation and detection only; server spawn/stop behavior is unchanged. -> **PASS**
- **Gate 4: Safe Local Bindings** -> Server binding, token handling, and adoption rules are unchanged. -> **PASS**
- **Gate 5: Virtual Environment Preference** -> The feature strengthens vault-local `.venv` handling by choosing uv package operations only for uv-created vault environments. -> **PASS**
- **Gate 6: Constant Externalization** -> New command names, command args, setting labels/descriptions, filenames, and default path candidates must be constants. -> **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/023-uv-package-manager/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── package-manager-resolution.md
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
src/
├── constants.ts         # New uv command/path/settings constants and formatting helpers
├── settings.ts          # Add uvPath to settings schema, defaults, and settings tab UI
├── main.ts              # Preserve settings migration/loading with uvPath default
└── server-manager.ts    # Add uv venv detection, uv command resolution, uv pip detection/install

tests/
├── settings.test.ts        # Verify uvPath defaults and migration behavior
└── server-manager.test.ts  # Verify package-manager strategy, uv resolution, command args, fallback behavior
```

**Structure Decision**: Keep the feature within the existing single-plugin TypeScript layout. No new runtime dependency is required because process execution and filesystem inspection already live in `ServerManager`.

## Phase 0: Research Decisions

See [research.md](./research.md).

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md)
- [contracts/package-manager-resolution.md](./contracts/package-manager-resolution.md)
- [quickstart.md](./quickstart.md)

## Proposed Changes

### Settings

- Add `uvPath: string` to `MarimoBridgeSettings`.
- Add `DEFAULT_UV_PATH = ""`.
- Add a settings tab input named `uv command path`.
- Place the uv setting after Python interpreter path and before marimo installation status so package-manager target resolution is visible before the install button.
- On blur, trim and persist the configured uv path, invalidate marimo availability, and refresh install status.

### Package Manager Resolution

- Add a package-manager strategy in `ServerManager`:
  - Use existing pip behavior unless the selected install target is the vault-local `.venv` and `.venv/pyvenv.cfg` contains a `uv` entry such as `uv = <version>`.
  - If the uv path setting is non-empty, validate and use it before any discovery candidate.
  - If the uv path setting is empty, search deterministic candidates: `uv` on PATH, then OS/default/common install locations.
  - If a configured uv path is invalid, fail clearly and do not silently use another uv executable.
  - If no uv command can be resolved for a uv-created `.venv`, fail clearly and do not fall back to pip.

### marimo Detection and Installation

- Preserve `getMarimoVersion()` as the launch availability check using the resolved marimo command.
- Add package inspection for install decisions:
  - uv-created vault `.venv`: `uv pip show marimo --python <venv-python>`.
  - non-uv targets: existing `getMarimoVersion()` / pip behavior.
- For uv install:
  - Fresh install: `uv pip install marimo --python <venv-python>`.
  - Upgrade: `uv pip install --upgrade marimo --python <venv-python>`.
- For pip install:
  - Fresh install: `python -m pip install marimo`.
  - Upgrade: `python -m pip install --upgrade marimo`.

### Verification Plan

- Unit tests:
  - default settings include `uvPath: ""`;
  - configured uv path is persisted and preferred;
  - empty uv path searches deterministic candidates;
  - uv-created `.venv` detection reads `.venv/pyvenv.cfg` and requires a `uv` entry;
  - uv-created `.venv` uses `uv pip show/install --python <venv-python>`;
  - configured invalid uv path fails without fallback;
  - non-uv targets preserve pip command args.
- Full validation:
  - `npm test`
  - `npm run build`
  - `npm run lint`

## Post-Design Constitution Check

- **Gate 1: Language Policy** -> Generated artifacts are English. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> Design uses existing desktop-only process/filesystem access. -> **PASS**
- **Gate 3: Reliable Process Lifecycle Management** -> Server lifecycle behavior is not changed. -> **PASS**
- **Gate 4: Safe Local Bindings** -> Server authentication and loopback binding are not changed. -> **PASS**
- **Gate 5: Virtual Environment Preference** -> Design respects configured paths and vault-local `.venv` precedence. -> **PASS**
- **Gate 6: Constant Externalization** -> New literals are planned for `src/constants.ts`. -> **PASS**

## Complexity Tracking

No constitution violations require justification.
