# Implementation Plan: Refactor Literals to Constants

**Branch**: `009-refactor-constants` | **Date**: 2026-06-19 | **Spec**: [spec.md](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/009-refactor-constants/spec.md)

**Input**: Feature specification from `/specs/009-refactor-constants/spec.md`

## Summary
In accordance with Principle VI ("Constant Externalization") added to the project constitution, all non-empty string literals and non-zero numeric literals inside program execution code will be extracted to a new centralized constants file (`src/constants.ts`). The original codebase will be updated to import and reference these constants.

## Technical Context

- **Language/Version**: TypeScript 5.x
- **Primary Dependencies**: Obsidian API, Node.js standard modules (`child_process`, `fs`, `path`)
- **Storage**: N/A
- **Testing**: Manual verification inside Obsidian desktop, ESLint checks, TypeScript compiler check
- **Target Platform**: Obsidian Desktop (Electron)
- **Project Type**: Desktop plugin (Obsidian)
- **Performance Goals**: No performance regression or behavior changes
- **Constraints**: 
  - Centralize constants in `src/constants.ts`
  - Exclude empty strings, numeric zero (`0`), and TypeScript compile-time type definitions
  - Use `UPPER_SNAKE_CASE` naming for all exported constants

## Constitution Check

- **I. Language Division (言語区分)**: Artifacts in English, direct user communication in Japanese. (PASS)
- **II. Desktop-Only Architecture**: Dependent on Node.js standard modules and Electron `<webview>`. (PASS)
- **III. Reliable Process Lifecycle Management**: Terminate marimo process tree on onunload recursively on Windows. (PASS)
- **IV. Safe Local Bindings**: Bind strictly to loopback interface `127.0.0.1`. (PASS)
- **V. Virtual Environment Preference**: Detect vault-local Python virtual environments. (PASS)
- **VI. Constant Externalization**: Externalize all non-empty string literals and non-zero numeric literals. (Strictly applied in this plan)

## Proposed Changes

### Constant Definition Component

#### [NEW] [constants.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/constants.ts)
Create a central constant repository file and export all extracted constants including settings default values, class names, file paths, and notice/error messages.

#### [MODIFY] [main.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/main.ts)
- Replace raw string literals (such as command IDs, ribbon descriptions, icons, template strings) and numbers with imports from `src/constants.ts`.

#### [MODIFY] [server-manager.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/server-manager.ts)
- Replace raw path resolution segments (`.venv`, `Scripts`, `bin`, `marimo.exe`, etc.), default host, ports, timeouts (`8000`, `180000`), and other magic numbers/strings with constant imports.

#### [MODIFY] [editor-view.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/editor-view.ts)
- Replace view types, class names, loading messages, and IPC log prefix strings with constants.

#### [MODIFY] [embed-processor.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/embed-processor.ts)
- Replace code-block processor name, error messages, and loading placeholders with constant imports.

#### [MODIFY] [settings.ts](file:///c:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/src/settings.ts)
- Replace setting defaults (`2718`, `30`, `600`, `"127.0.0.1"`, `"edit"`), setting names, descriptions, placeholders, and installation labels with constant references.

## Verification Plan

### Automated Tests
Run the following build and quality checks to ensure no compile-time or static-analysis issues:
- `npm run build` (tsc type-check and esbuild compilation check)
- `npm run lint` (ESLint configuration check)

### Manual Verification
1. Load the modified plugin in Obsidian Desktop.
2. Open settings and ensure all setting tabs, descriptions, and labels render correctly.
3. Open the marimo home dashboard via the ribbon icon or command to verify the local server starts successfully.
4. Create a new marimo notebook to verify it initializes a valid notebook and opens a new editor tab.
5. Open an existing notebook in an editor and check if edits are saved.
