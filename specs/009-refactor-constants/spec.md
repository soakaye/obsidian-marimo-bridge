# Feature Specification: Refactor Literals to Constants

**Feature Branch**: `009-refactor-constants`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Refactor program execution code to externalize non-empty string literals and non-zero numeric literals as constants in a separate file based on Principle VI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centralized Constant Management (Priority: P1)

Developers and maintainers need a central place to manage configuration values, command arguments, and magic numbers to avoid code duplication and ease future modifications. A dedicated constants file must be introduced.

**Why this priority**: It is the foundational requirement for managing constants in a structured manner. Without this, no refactoring can take place.

**Independent Test**: Verify that a new constants file compiles successfully and its exports are accessible from other modules.

**Acceptance Scenarios**:

1. **Given** no dedicated constants file exists, **When** we create `src/constants.ts` and define basic constants, **Then** the TypeScript compiler compiles the file without errors.
2. **Given** constants are defined in `src/constants.ts`, **When** we import and use them in another file, **Then** the plugin compiles successfully and behaves as expected.

---

### User Story 2 - String Literal Externalization (Priority: P2)

All non-empty string literals embedded in program execution code (such as shell commands, configuration keys, or environment settings) must be extracted to the constants file to avoid duplication and improve maintainability.

**Why this priority**: String literals are the most common source of magic values in the codebase. Managing them centrally makes the application less prone to typo-related bugs.

**Independent Test**: Verify that the plugin behaves identically before and after extracting string literals, and that no executable code in the source files uses raw non-empty string literals.

**Acceptance Scenarios**:

1. **Given** raw non-empty string literals exist in `src/server-manager.ts` or other source files, **When** they are replaced by imports from `src/constants.ts`, **Then** the plugin still compiles and correctly spawns/detects python/marimo processes.

---

### User Story 3 - Numeric Literal Externalization (Priority: P3)

All non-zero numeric literals embedded in program execution code (such as process timeout limits, port numbers, or delay values) must be extracted to the constants file to prevent magic numbers.

**Why this priority**: Non-zero numeric values are parameters that may need tuning in the future. Having them in a single place makes tuning straightforward.

**Independent Test**: Verify that timeouts, delay values, and port definitions behave correctly after being replaced by constants.

**Acceptance Scenarios**:

1. **Given** numeric literals like `5000` (timeout) or `500` (delay) exist in the source code, **When** they are replaced by constants, **Then** process execution and lifecycle management flows continue to work flawlessly.

---

### Edge Cases

- **Empty String Literals**: What happens to empty string literals (`""` or `''`)?
  - *Decision*: Empty strings do not carry semantic business logic/configuration meaning in most contexts. They MUST remain inline as `""` or `''` and should not be externalized.
- **Zero Numeric Literals**: What happens to `0` numeric literals?
  - *Decision*: The number `0` is typically used as a default index, starting position, or check for emptiness. It MUST remain inline as `0` and should not be externalized.
- **TypeScript Type Annotations**: How to handle string literals used as types (e.g. `type Mode = "sequential" | "timestamp"`)?
  - *Decision*: Types are compile-time structures, not program execution code. They MUST remain inline. Only literals in executable code blocks (values) should be externalized.
- **Third-party API / Obsidian API parameters**: What if an API requires a string literal value that is part of their contract?
  - *Decision*: These are still values in execution code and MUST be externalized into descriptive constants (e.g., `OBSIDIAN_VIEW_TYPE`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define all shared and externalized constants in a new dedicated file: `src/constants.ts`.
- **FR-002**: The system MUST externalize all non-empty string literals found in program execution code (excluding type declarations, tests, and configurations) into this constant file.
- **FR-003**: The system MUST externalize all non-zero numeric literals found in program execution code into this constant file.
- **FR-004**: Empty string literals (`""` or `''`) MUST NOT be externalized.
- **FR-005**: Numeric literals equal to `0` MUST NOT be externalized.
- **FR-006**: Externalized constants MUST be named using uppercase snake-case format (e.g., `DEFAULT_MARIMO_PORT`, `PYTHON_VENV_DIR`).
- **FR-007**: The codebase MUST retain the same behavior, build successfully, and pass all linter checks after the refactoring.

### Key Entities

- **Constants File (`src/constants.ts`)**: Represents the single source of truth for all hardcoded string and numeric configurations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Build output (`npm run build`) finishes with `exit code 0` and no type errors.
- **SC-002**: Linter checks (`npm run lint`) finish with `exit code 0` and no errors.
- **SC-003**: 100% of non-empty string literals and non-zero numeric literals in execution code are successfully replaced by constant references (excluding allowed exceptions).
- **SC-004**: The plugin loads successfully in Obsidian and can open, view, and edit a marimo notebook without regressions.

## Assumptions

- No functional behaviors should change as a result of this refactoring.
- Test files and configuration files (such as `esbuild.config.mjs`, eslint configuration, package.json) are out of scope.
- String literals in `console.log` or debug statements may be externalized or left inline depending on readability, but critical execution string literals (paths, commands, events, plugin settings keys) must be externalized.
