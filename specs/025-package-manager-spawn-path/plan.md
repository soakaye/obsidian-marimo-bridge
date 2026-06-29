# Implementation Plan: Enhance Package Manager Path Resolution for Spawned Processes

**Branch**: `025-package-manager-spawn-path` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-package-manager-spawn-path/spec.md`

## Summary

Inject the standard package-manager install directories into the marimo server's spawned-process `PATH` so marimo's in-UI package installer can locate whichever package manager it uses (pip, uv, poetry, pixi, rye, …). On macOS, Obsidian launches with a minimal GUI `PATH` that omits these directories, so marimo's own `shutil.which(...)` lookups fail. Rather than gate on any single binary, the plugin prepends the standard install directories themselves (when they exist), deduplicated against the inherited `PATH`. The injection order is deterministic: configured uv directory first, then the vault-local `.venv` command directory and the active interpreter directory, then the standalone install locations. The inherited `PATH` and uv command discovery behavior remain unchanged.

## Technical Context

**Language/Version**: TypeScript / Node.js

**Primary Dependencies**: Obsidian API, Node.js `fs`/`path`/`os` modules, existing `child_process` spawn wrapper

**Storage**: No new persisted settings or data files

**Testing**: Node.js built-in test runner (`npm test`), TypeScript build (`npm run build`), ESLint (`npm run lint`)

**Target Platform**: Obsidian Desktop on Windows/macOS/Linux

**Project Type**: desktop-app (Obsidian plugin)

**Performance Goals**: `PATH` construction must stay bounded to a small deterministic candidate list and rely only on direct existence checks, not filesystem scans.

**Constraints**: Desktop-only APIs are expected; keep Node/Electron/Obsidian modules externalized; all new path and environment-variable literals must be centralized in `src/constants.ts`; use tabs for code indentation.

**Scale/Scope**: Environment construction for the spawned marimo server process at every spawn site.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Gate 1: Language Division** -> Plan, research, data model, contracts, quickstart, tasks, and code changes are written in English; user-facing chat remains Japanese. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> The feature relies on Node.js filesystem/path/os inspection and `child_process` spawning already used by the desktop plugin; no mobile support is introduced. -> **PASS**
- **Gate 3: Reliable Process Lifecycle Management** -> The feature changes only the environment passed at spawn time; spawn arguments, detachment, and stop/kill behavior are unchanged. -> **PASS**
- **Gate 4: Safe Local Bindings** -> Server binding, token handling, and server adoption rules are unchanged. -> **PASS**
- **Gate 5: Virtual Environment Preference** -> The feature strengthens vault-local `.venv` handling by placing its command directory and the active interpreter directory ahead of unrelated global install locations. -> **PASS**
- **Gate 6: Constant Externalization** -> The new `PATH` environment-variable literal and reused path literals are centralized in `src/constants.ts`. -> **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/025-package-manager-spawn-path/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── spawn-path-resolution.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── constants.ts         # Add `ENV_PATH` and reuse existing dir/path constants
└── server-manager.ts    # Build the injected PATH and the spawn environment

tests/
└── server-manager.test.ts  # Verify candidate selection, ordering, dedup, and pass-through
```

**Structure Decision**: Keep the change inside the existing server-manager spawn area. No new runtime dependency, settings field, UI component, or data store is required.

## Phase 0: Research Decisions

See [research.md](./research.md).

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md)
- [contracts/spawn-path-resolution.md](./contracts/spawn-path-resolution.md)
- [quickstart.md](./quickstart.md)

## Proposed Changes

### Constants

- Add `ENV_PATH = "PATH"` to `src/constants.ts` as the search-path environment-variable name inherited by spawned processes.
- Reuse the existing directory/path constants: `DIR_VENV`, `DIR_SCRIPTS_WIN`, `DIR_SCRIPTS_UNIX`, `DIR_UV_LOCAL`, `DIR_UV_CARGO`, `UV_HOMEBREW_ARM_PATH`, `UV_HOMEBREW_INTEL_PATH`, `ENV_USERPROFILE`, `PLATFORM_WIN32`.

### Package Manager Path Directory Construction

- Add a `packageManagerPathDirs()` helper in `ServerManager` that returns an ordered, deduplicated list of absolute directories that exist on disk:
  1. Configured uv binary's directory (`path.dirname(settings.uvPath)`), when `settings.uvPath` is non-empty.
  2. Vault-local `.venv` command directory (`<vault>/.venv/bin` on Unix, `<vault>\.venv\Scripts` on Windows).
  3. Active interpreter's directory (`path.dirname(resolvePython())`), when that path is absolute.
  4. `~/.local/bin` and `~/.cargo/bin` (both use `bin` on every platform).
  5. Homebrew ARM (`/opt/homebrew/bin`) and Intel (`/usr/local/bin`) command directories, on non-Windows only.
- Use `process.env[ENV_USERPROFILE] ?? os.homedir()` for the home directory and `process.platform === PLATFORM_WIN32` for the platform branch.
- Add only candidates that are absolute, not already collected, and exist on disk.

### Spawn Environment Construction

- Add a `buildSpawnEnv(extraPathDirs)` helper in `ServerManager` that:
  - Clones `process.env`.
  - Returns the clone unchanged when `extraPathDirs` is empty.
  - Splits the inherited `PATH` on `path.delimiter`, filters out directories already present, and prepends the remaining new directories.
  - Returns the inherited environment unchanged when there are no new directories to add.

### Spawn Site Wiring

- Replace `env: process.env` with `env: this.buildSpawnEnv(this.packageManagerPathDirs())` at every marimo server spawn site in `src/server-manager.ts` (the uv command probe/run spawn and the detached server spawn).

### Verification Plan

- Unit tests:
  - candidate list includes existing standard directories and skips missing or non-absolute ones;
  - configured uv directory is ordered ahead of vault-local, interpreter, and standalone directories;
  - vault-local and interpreter directories precede the standalone install directories;
  - Homebrew directories are omitted on Windows;
  - injected `PATH` does not duplicate inherited entries and preserves their order;
  - empty candidate list yields the inherited environment unchanged.
- Full validation:
  - `npm test`
  - `npm run build`
  - `npm run lint`

## Post-Design Constitution Check

- **Gate 1: Language Division** -> Generated artifacts are English. -> **PASS**
- **Gate 2: Desktop-Only Architecture** -> Design uses existing desktop-only filesystem/process access. -> **PASS**
- **Gate 3: Reliable Process Lifecycle Management** -> Only the spawn environment changes; lifecycle is unchanged. -> **PASS**
- **Gate 4: Safe Local Bindings** -> Server authentication and loopback binding are not changed. -> **PASS**
- **Gate 5: Virtual Environment Preference** -> Design prefers the configured and vault-local environment directories over unrelated global install locations. -> **PASS**
- **Gate 6: Constant Externalization** -> New and reused literals are constrained to `src/constants.ts`. -> **PASS**

## Complexity Tracking

No constitution violations require justification.
