# Implementation Plan: Add uv Virtual Environment Search Paths

**Branch**: `024-add-uv-venv-paths` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-add-uv-venv-paths/spec.md`

## Summary

Extend automatic uv command discovery so that an empty uv command path setting can find uv inside the vault-local virtual environment command directory. The discovery order will remain deterministic: configured uv path first, then automatic discovery beginning with the platform-appropriate vault `.venv` command directory, then `uv` on PATH, then the existing user-level and common install locations. Explicit uv path errors and non-uv package-manager behavior remain unchanged.

## Technical Context

**Language/Version**: TypeScript / Node.js

**Primary Dependencies**: Obsidian API, Node.js `fs`/`path`/`os` modules, existing `child_process` execution wrapper

**Storage**: No new persisted settings or data files

**Testing**: Node.js built-in test runner (`npm test`), TypeScript build (`npm run build`), ESLint (`npm run lint`)

**Target Platform**: Obsidian Desktop on Windows/macOS/Linux

**Project Type**: desktop-app (Obsidian plugin)

**Performance Goals**: uv discovery should remain bounded to a small deterministic candidate list and should not add filesystem scans beyond direct existence checks.

**Constraints**: Desktop-only APIs are expected; keep Node/Electron/Obsidian modules externalized; all new path and command literals must be centralized in `src/constants.ts`; use tabs for code indentation.

**Scale/Scope**: Local command discovery for one vault-local `.venv` and one uv executable candidate per platform.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Gate 1: Language Division** -> Plan, research, data model, contracts, quickstart, tasks, and code changes are written in English; user-facing chat remains Japanese. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> The feature relies on Node.js filesystem/path inspection already used by the desktop plugin; no mobile support is introduced. -> **PASS**
- **Gate 3: Reliable Process Lifecycle Management** -> The feature changes uv command discovery only; marimo server spawn/stop behavior is unchanged. -> **PASS**
- **Gate 4: Safe Local Bindings** -> Server binding, token handling, and server adoption rules are unchanged. -> **PASS**
- **Gate 5: Virtual Environment Preference** -> The feature strengthens vault-local `.venv` handling by considering its uv executable during uv package-manager discovery. -> **PASS**
- **Gate 6: Constant Externalization** -> New command/path literals and discovery-order labels must be constants or built from existing constants. -> **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/024-add-uv-venv-paths/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── uv-command-discovery.md
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
src/
├── constants.ts         # Add or reuse uv executable/path constants
└── server-manager.ts    # Add vault-local uv candidate to automatic discovery

tests/
└── server-manager.test.ts  # Verify discovery order, local candidate behavior, and explicit path precedence
```

**Structure Decision**: Keep the change inside the existing server-manager package-resolution area. No new runtime dependency, settings field, UI component, or data store is required.

## Phase 0: Research Decisions

See [research.md](./research.md).

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md)
- [contracts/uv-command-discovery.md](./contracts/uv-command-discovery.md)
- [quickstart.md](./quickstart.md)

## Proposed Changes

### uv Candidate Construction

- Add a helper or equivalent small unit in `ServerManager` that returns the platform-appropriate vault-local uv candidate:
  - Windows: `<vault>\.venv\Scripts\uv.exe`
  - Linux/macOS: `<vault>/.venv/bin/uv`
- Insert that candidate into the existing automatic discovery list when `settings.uvPath` is empty.
- Place the vault-local candidate first among automatic candidates so environment-local uv is preferred when no explicit uv path is configured.
- Keep `uv` on PATH after the vault-local candidate and before user-level/default/common install locations so existing PATH-based discovery continues when no local uv candidate is usable.
- Continue skipping missing non-PATH candidates without surfacing an error.

### Explicit uv Path Behavior

- Preserve the current configured path behavior:
  - A non-empty `settings.uvPath` is validated and used before any automatic candidate.
  - An invalid configured path fails clearly and does not fall back to vault-local or global candidates.

### Package-Manager Selection

- Preserve the current rule that uv-backed marimo package operations are used only for a positively identified uv-created vault `.venv`.
- Preserve pip behavior for non-uv targets, configured Python paths, configured marimo paths, and system fallback.

### Verification Plan

- Unit tests:
  - automatic uv discovery includes the platform-appropriate vault `.venv` uv candidate;
  - candidate order is vault-local uv, then `uv` on PATH, then existing user-level/default/common candidates;
  - a local uv candidate can satisfy discovery when `settings.uvPath` is empty;
  - an invalid configured uv path still fails without calling local or global candidates;
  - non-uv package-manager strategy remains pip.
- Full validation:
  - `npm test`
  - `npm run build`
  - `npm run lint`

## Post-Design Constitution Check

- **Gate 1: Language Division** -> Generated artifacts are English. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> Design uses existing desktop-only filesystem/process access. -> **PASS**
- **Gate 3: Reliable Process Lifecycle Management** -> No server lifecycle behavior is changed. -> **PASS**
- **Gate 4: Safe Local Bindings** -> Server authentication and loopback binding are not changed. -> **PASS**
- **Gate 5: Virtual Environment Preference** -> Design explicitly prefers the vault-local uv executable over PATH and unrelated default locations when no explicit uv path is configured. -> **PASS**
- **Gate 6: Constant Externalization** -> New literals are constrained to `src/constants.ts` or built from existing constants. -> **PASS**

## Complexity Tracking

No constitution violations require justification.
