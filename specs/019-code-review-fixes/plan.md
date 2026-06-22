# Implementation Plan: Resolve Code Review Fixes

**Branch**: `019-code-review-fixes` | **Date**: 2026-06-22 | **Spec**: [spec.md](file:///Users/soakaye/Documents/Obsidian%20Vault/.obsidian/plugins/obsidian-marimo-bridge/specs/019-code-review-fixes/spec.md)

## Summary

Resolve the eight implementation defects identified during code review. The plan involves making server process lifecycle management robust and exit-driven, adding token-awareness to persisted server ownership, validating notebook paths within the Vault boundary, and fixing URL double-decoding for notebooks containing percent signs in their filenames.

## Technical Context

**Language/Version**: TypeScript

**Primary Dependencies**: Obsidian API, Node.js child_process, Node.js fs

**Storage**: `.marimo-servers.json` (persisted SpawnedServerRecord entries)

**Testing**: Node.js built-in test runner (`node --test`), test bundling via `esbuild`

**Target Platform**: Desktop (Obsidian desktop plugin)

**Project Type**: Obsidian desktop-plugin

**Performance Goals**: N/A (local server management)

**Constraints**: Local process execution boundary (within the active Vault)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- All Node/Electron/Obsidian modules must be external in build configuration.
- Direct filesystem and process execution must remain desktop-only.

## Project Structure

### Documentation (this feature)

```text
specs/019-code-review-fixes/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list
```

### Source Code (repository root)

```text
src/
├── constants.ts
├── editor-view.ts
├── main.ts
├── notebook-path.ts
├── server-manager.ts
├── server-records.ts
└── url-utils.ts

tests/
├── editor-view.test.ts
├── notebook-path.test.ts
├── plugin-lifecycle.test.ts
├── review-compliance.test.ts
├── server-manager.test.ts
└── url-utils.test.ts
```

**Structure Decision**: Standard Obsidian plugin directory layout. Business logic and helpers reside in `src/`, with corresponding test suites in `tests/`.
