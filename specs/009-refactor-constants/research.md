# Technical Research: Constant Externalization

**Date**: 2026-06-19
**Feature**: [spec.md](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/009-refactor-constants/spec.md)

## Extraction Criteria and Implementation Guidelines

In accordance with Principle VI ("Constant Externalization") of the project constitution, this refactoring shifts all magic strings and numbers in executable code blocks to `src/constants.ts`. The detailed rules and findings are documented below.

### 1. Exclusion Rules (Remain Inline)
The following categories of literals do not represent configurable business logic or variables, and will remain inline to preserve readability and type safety:

- **Empty Strings (`""` / `''`)**: Typically used for initialization or default checks where constant extraction provides no semantic value.
- **Numeric Zero (`0`)**: Used for default index values, array starting positions, or logical zero checks.
- **TypeScript Type Definitions**:
  - Example: `type ServerKind = "edit" | "run"` or union types. These are compile-time type constructs rather than "program execution code" and do not exist at runtime.
- **Build / Configuration Scripts**: Files outside the `src/` directory (e.g. build configs or eslint configs) are out of scope.

### 2. Inclusion Rules (Extract to `src/constants.ts`)
The following literals will be moved to `src/constants.ts` and exported as `const` variables using `UPPER_SNAKE_CASE` naming format:

- **Default Settings values**:
  - `DEFAULT_PORT = 2718`
  - `DEFAULT_HOST = "127.0.0.1"`
  - `DEFAULT_EMBED_MODE = "edit"`
  - `DEFAULT_EMBED_HEIGHT = 600`
  - `DEFAULT_STARTUP_TIMEOUT = 30`
- **Obsidian / Electron Strings**:
  - View Type ID: `VIEW_TYPE_MARIMO = "marimo-editor"`
  - UI Classes: `CLS_VIEW_CONTAINER = "marimo-bridge-view"`, `CLS_LOADING = "marimo-bridge-loading"`, `CLS_EMBED = "marimo-bridge-embed"`, `CLS_EMBED_ERROR = "marimo-bridge-embed-error"`
- **Python / Marimo Command & Path segments**:
  - Virtual env directories: `DIR_VENV = ".venv"`, `DIR_SCRIPTS_WIN = "Scripts"`, `DIR_SCRIPTS_UNIX = "bin"`
  - Binary names: `EXE_MARIMO_WIN = "marimo.exe"`, `EXE_MARIMO_UNIX = "marimo"`, `EXE_PYTHON_WIN = "python.exe"`, `EXE_PYTHON_UNIX = "python"`
  - Fallback commands: `CMD_MARIMO = "marimo"`, `CMD_PYTHON3 = "python3"`
- **Notice and Error messages**:
  - Labels, tooltips, and warning text printed inside notices or console warnings.
- **Timeouts and polling delays (ms)**:
  - Default Notice timeout (`8000`), pip installation timeout (`180000`), polling/sleeping delays (`500`).

### 3. Design Decisions

- **Decision**: Constants will be exported as individual `const` statements in `src/constants.ts` rather than being nested inside namespace objects.
- **Rationale**: Flat individual exports play much better with IDE auto-import tools and make tracking usages with compiler diagnostics simpler.
- **Structure**: Comments within `src/constants.ts` will segment constants by feature/module (e.g., Settings, Paths, View Types, UI Labels) to prevent the file from becoming unstructured.
