# Feature Specification: Handle Null LoadData in LoadSettings

**Feature Branch**: `020-handle-null-loaddata`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "fix: handle null loadData result in loadSettings"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fresh Plugin Installation (Priority: P1)

As a new user installing the plugin, I want the plugin to load successfully without throwing errors on startup, so that I can use the plugin immediately.

**Why this priority**: Preventing startup crashes during first-time installation is critical for user adoption and basic usability.

**Independent Test**: Simulate a fresh install environment where `loadData()` returns `null` and confirm that `loadSettings()` completes without throwing and loads default settings.

**Acceptance Scenarios**:

1. **Given** a fresh installation of the plugin (no settings data exists yet), **When** the plugin initializes and calls `loadSettings()`, **Then** the plugin loads the default settings and does not throw any exceptions.
2. **Given** a plugin instance, **When** `loadData()` resolves to `null`, **Then** the internal settings object matches `DEFAULT_SETTINGS`.

---

### User Story 2 - Existing Settings Loading (Priority: P2)

As an existing user, I want my previously saved settings to be loaded correctly, so that my customized configuration is preserved.

**Why this priority**: Existing settings must not be overwritten or broken by the fix for null checks.

**Independent Test**: Save a custom settings object, reload, and verify that custom settings are successfully loaded.

**Acceptance Scenarios**:

1. **Given** customized configuration exists in local storage, **When** the plugin initializes, **Then** those configuration values are correctly applied to the plugin settings.

### Edge Cases

- If the loaded data is an empty object or has partially missing keys, it should merge seamlessly with the defaults.
- Legacy settings structure containing a `host` key should have the `host` key discarded (already implemented, but must not break).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `loadSettings` method MUST handle the case where `loadData()` returns `null`.
- **FR-002**: The `loadSettings` method MUST fall back to an empty object when `loadData()` resolves to `null`.
- **FR-003**: The plugin MUST initialize using `DEFAULT_SETTINGS` when no settings are persisted.
- **FR-004**: The plugin MUST discard any legacy `host` settings during the loading phase.

### Key Entities

- **MarimoBridgeSettings**: The settings configuration object for the plugin. Defaults are defined in `DEFAULT_SETTINGS`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of settings tests pass, including the new test checking `null` result from `loadData()`.
- **SC-002**: The plugin successfully loads on a fresh install without throwing errors.

## Assumptions

- Obsidian's `loadData()` API resolves to `null` if no settings have ever been saved.
