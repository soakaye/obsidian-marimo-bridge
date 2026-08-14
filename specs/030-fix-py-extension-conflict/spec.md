# Feature Specification: Resilient `.py` Extension Takeover

**Feature Branch**: `030-fix-py-extension-conflict`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "fix Plugin fails to load if another plugin registers the \".py\" extension"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plugin Loads Alongside Another `.py` Owner (Priority: P1)

As a user who already runs another plugin that claims `.py` files (for example a code-runner plugin), I want marimo Bridge to finish loading and stay enabled, so that I can still use every marimo feature instead of being blocked by a conflict I cannot see.

**Why this priority**: Today the conflict aborts startup and the plugin is force-disabled, so the user loses 100% of the plugin's value. Nothing else in this feature matters if the plugin cannot load.

**Independent Test**: Start the plugin in an environment where the `.py` extension is already claimed by another component, then confirm that the plugin remains enabled and that its commands, ribbon action, context-menu entries, and inline notebook embeds all work.

**Acceptance Scenarios**:

1. **Given** another active plugin has already claimed the `.py` extension and the "open `.py` in marimo by default" preference is on, **When** marimo Bridge starts, **Then** the plugin finishes loading and stays enabled instead of switching itself off.
2. **Given** the same conflicting environment, **When** the plugin has finished loading, **Then** every plugin capability that does not depend on the default-editor claim — commands, ribbon action, file context-menu entries, and inline notebook embeds — is available.
3. **Given** no other component has claimed the `.py` extension and the preference is on, **When** the plugin starts, **Then** `.py` files open in the marimo editor by default, exactly as before this change.
4. **Given** the preference is off, **When** the plugin starts, **Then** the plugin does not claim the `.py` extension and no conflict message is shown.

---

### User Story 2 - User Understands Why `.py` Files Do Not Open in marimo (Priority: P2)

As a user in a conflicting environment, I want to be told that another component owns `.py` files and that marimo Bridge skipped the default-editor claim, so that I can decide whether to change my setup instead of assuming the plugin is broken.

**Why this priority**: Without a message the degraded state is silent and indistinguishable from a bug, which is the primary complaint in the original report. It is second only to loading itself because the plugin is already usable without it.

**Independent Test**: Start the plugin in a conflicting environment and confirm a single, human-readable warning appears that names the conflict and states the remaining way to open notebooks.

**Acceptance Scenarios**:

1. **Given** the `.py` claim is skipped because another component owns the extension, **When** the plugin finishes loading, **Then** a visible warning tells the user that `.py` is already claimed, that the default-editor takeover was skipped, and how to still open a notebook in marimo.
2. **Given** the same situation, **When** the user inspects the developer console, **Then** a diagnostic record of the conflict is present, including the underlying failure detail.
3. **Given** the `.py` claim succeeds, **When** the plugin finishes loading, **Then** no conflict warning is shown.

---

### User Story 3 - Preference Explains the Conflict Behavior (Priority: P3)

As a user reviewing the plugin preferences, I want the "open `.py` in marimo by default" option to state that another plugin can take precedence and that changes take effect after a reload, so that I can set my expectations without trial and error.

**Why this priority**: Purely informational polish; the plugin is fully functional and self-explanatory at run time without it.

**Independent Test**: Open the plugin preferences and confirm the option's description mentions both the possible conflict and the reload requirement.

**Acceptance Scenarios**:

1. **Given** the plugin preferences are open, **When** the user reads the "open `.py` in marimo by default" option, **Then** its description states that another plugin claiming `.py` takes precedence and that toggling the option applies after Obsidian reloads.

---

### Edge Cases

- Another component claims `.py` **after** marimo Bridge has already claimed it: marimo Bridge keeps whatever claim it holds and takes no corrective action; this is outside the plugin's control.
- The conflicting plugin is later disabled: marimo Bridge does not retroactively claim `.py` within the running session; the claim is re-attempted on the next plugin load, and the preference description sets that expectation.
- The extension claim fails for a reason other than an existing owner: the plugin still finishes loading, still surfaces a warning, and the underlying detail is recorded for diagnosis.
- A conflict occurs on every start-up: at most one warning per plugin load, so repeated restarts do not produce stacked or duplicate messages.
- The vault is not backed by a local file system (already unsupported): the existing early exit is unchanged and no conflict handling applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST complete its start-up successfully when the `.py` extension is already claimed by another component.
- **FR-002**: The plugin MUST NOT be disabled, nor report a load failure, as a result of a `.py` extension claim conflict.
- **FR-003**: All start-up registrations that follow the `.py` extension claim — commands, ribbon action, file context-menu entries, and inline notebook embed handling — MUST be performed even when the claim fails.
- **FR-004**: When the `.py` claim fails, the plugin MUST show the user a single visible warning that identifies the conflict and states how notebooks can still be opened.
- **FR-005**: When the `.py` claim fails, the plugin MUST record the underlying failure detail in the developer console for diagnosis.
- **FR-006**: The plugin MUST show no conflict warning when the `.py` claim succeeds or when the takeover preference is disabled.
- **FR-007**: The plugin MUST preserve the existing behavior in non-conflicting environments: with the takeover preference enabled, `.py` files open in the marimo editor by default.
- **FR-008**: The takeover preference description MUST state that another plugin claiming `.py` takes precedence and that a change to the preference applies after Obsidian reloads.
- **FR-009**: All user-visible and log text introduced by this feature MUST be defined as named constants rather than inline literals, per the project's constant-externalization rule.
- **FR-010**: The regression test suite MUST cover a start-up in which the `.py` extension claim fails, asserting that start-up completes, that the subsequent registrations still occur, and that the user warning is issued exactly once.

### Key Entities

- **`.py` extension claim**: The association between the `.py` file extension and the marimo editor as its default opener. At most one component may hold it at a time; it is granted on a first-come basis and is optional for the plugin's operation.
- **Takeover preference**: The persisted user setting that requests the `.py` extension claim at start-up. Enabled by default. It expresses intent; it does not guarantee the claim succeeds.
- **Conflict warning**: The one-per-load user-facing message issued when the requested claim could not be granted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The plugin loads and stays enabled in 100% of start-ups where another component already owns the `.py` extension.
- **SC-002**: 100% of plugin capabilities other than the default-editor claim remain available in a conflicting environment.
- **SC-003**: A user in a conflicting environment can identify the cause and the workaround from the on-screen warning alone, without opening the developer console or reading the source.
- **SC-004**: Zero behavior change in non-conflicting environments: existing start-up outcomes and `.py` open behavior are identical before and after the change.
- **SC-005**: The regression suite fails if the conflict-tolerance behavior is removed, so the defect cannot silently return.
- **SC-006**: Issue reports describing the plugin auto-disabling itself because of a `.py` extension conflict drop to zero after release.

## Assumptions

- The environment grants the `.py` extension claim to at most one component, first come first served, and signals a rejected claim to the requester; the plugin cannot enumerate the current owner through a supported interface, so the conflict is detected by attempting the claim.
- Releasing an extension claim mid-session is not a supported operation, so the takeover preference continues to take effect on the next plugin load rather than immediately; this is documented rather than engineered around.
- The plugin cannot and should not revoke another plugin's `.py` claim; coexisting in a degraded but functional state is the desired outcome.
- Users in a conflicting environment retain the file context-menu "Open in marimo" entry, the commands, and the ribbon action as the supported ways to open a notebook.
- The takeover preference remains enabled by default; this feature changes conflict handling only, not the default value.
- Scope is limited to the `.py` extension claim during start-up. No other start-up step is audited or hardened by this feature.
