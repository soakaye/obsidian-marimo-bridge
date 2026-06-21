# Feature Specification: Resolve Plugin Review Findings

**Feature Branch**: `017-fix-review-findings`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Fix the reported manifest metadata errors and source-code directive errors. Preserve the plugin's required desktop-only filesystem and shell capabilities while retaining vault writes through the host application's vault API."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit review-compliant plugin metadata and source (Priority: P1)

As a plugin maintainer, I want the submitted package to satisfy the review rules for manifest metadata and source directives so that the release is not blocked by the reported errors.

**Why this priority**: The reported errors prevent a clean review result and therefore block distribution of the release.

**Independent Test**: Run the same review checks against the updated package and confirm that every manifest and source-code error named in the input report is absent.

**Acceptance Scenarios**:

1. **Given** the updated plugin manifest, **When** metadata validation runs, **Then** the description contains no redundant host-application name and the author URL identifies the author rather than the plugin repository.
2. **Given** the updated source, **When** directive validation runs, **Then** none of the reported prohibited, unlimited, undescribed, or unused suppression directives are present.
3. **Given** the complete updated package, **When** the plugin review runs, **Then** it reports zero errors for all findings listed in this feature's input.

---

### User Story 2 - Preserve notebook and server behavior (Priority: P2)

As a plugin user, I want notebook views, link handling, console forwarding, view activation, and managed marimo servers to continue working after the compliance cleanup.

**Why this priority**: A review-compliant release is not useful if removing suppressions changes or breaks the behavior they surrounded.

**Independent Test**: Exercise the affected editor and server workflows before and after the change and confirm that their observable outcomes are unchanged.

**Acceptance Scenarios**:

1. **Given** a marimo view is opened or restored, **When** its embedded page loads, reloads, navigates, or emits a console message, **Then** the plugin handles the event without a visible regression.
2. **Given** a user opens a notebook in an active tab, **When** the view is created, **Then** the intended tab becomes visible and active.
3. **Given** a managed marimo process emits standard output, standard error, or an exit event, **When** the plugin receives it, **Then** the existing diagnostic information remains available.
4. **Given** the plugin unloads, **When** managed processes exist, **Then** the existing shutdown behavior still stops them.

---

### User Story 3 - Retain deliberate desktop capabilities (Priority: P3)

As a reviewer or maintainer, I want the plugin's filesystem and shell access to remain narrowly aligned with its stated desktop purpose so that expected security warnings are understandable and do not conceal an unintended capability expansion.

**Why this priority**: Filesystem access and process execution are necessary for locating notebooks, managing Python environments, and running marimo, but they are security-sensitive and must remain intentional.

**Independent Test**: Compare the capabilities before and after the change and confirm that the compliance work neither removes required behavior nor adds new filesystem, process-execution, or vault-write privileges.

**Acceptance Scenarios**:

1. **Given** the updated plugin, **When** behavior analysis runs, **Then** direct filesystem access and shell execution may remain as acknowledged desktop-only warnings rather than being treated as regressions to eliminate.
2. **Given** the updated plugin modifies a vault file, **When** the write occurs, **Then** it continues to use the host application's vault operations.
3. **Given** the compliance changes, **When** capability usage is compared with the prior release, **Then** no new external filesystem or shell behavior has been introduced.

### Edge Cases

- If a suppression appears unnecessary after the underlying types or calls are corrected, it is removed rather than replaced with another suppression.
- If an affected host or embedded-view event lacks a sufficiently specific built-in type, the event contract is represented with only the fields the plugin actually consumes.
- If a diagnostic message is empty, multiline, or emitted during process shutdown, forwarding it must not crash the plugin or prevent process cleanup.
- If the plugin unloads before all startup fields are initialized, cleanup remains safe and does not rely on a prohibited suppression.
- If activating a view requires behavior not accepted by the review rules, the user-visible activation outcome is preserved through an accepted interaction path.
- Existing untracked files and unrelated project changes are outside the scope of this feature and must remain untouched.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin description MUST accurately summarize its purpose without containing the word "Obsidian".
- **FR-002**: The author URL MUST point to the author's personal or organization profile and MUST NOT point to the plugin's own repository.
- **FR-003**: Every source location identified in the input report MUST be free of undescribed directive comments.
- **FR-004**: The source MUST NOT disable the explicit-any rule at any reported location.
- **FR-005**: The source MUST NOT contain an unlimited next-line suppression at the reported console-forwarding location.
- **FR-006**: The source MUST NOT disable prohibited review rules, including unsupported-host-API and custom-message rules, at the reported locations.
- **FR-007**: The source MUST NOT retain unused suppression directives.
- **FR-008**: Embedded-view capabilities and event payloads used by the plugin MUST have explicit, bounded contracts covering only the members the plugin consumes.
- **FR-009**: Informational, warning, and error console forwarding from embedded views MUST remain available without blanket rule suppression.
- **FR-010**: Managed server output, error output, exit diagnostics, and cleanup MUST remain available without prohibited custom-message suppression.
- **FR-011**: Opening an active notebook view MUST continue to make the intended view visible without relying on a review-prohibited host interaction.
- **FR-012**: Plugin unload MUST safely request shutdown of all managed marimo processes, including when startup did not complete.
- **FR-013**: The compliance changes MUST preserve current notebook loading, navigation interception, authentication retry, reload recovery, and file-change notification outcomes.
- **FR-014**: Required direct filesystem access and process execution MUST remain limited to the existing desktop-only notebook and marimo lifecycle responsibilities.
- **FR-015**: Vault content creation and modification MUST continue through the host application's vault operations.
- **FR-016**: The feature MUST NOT add mobile support, new filesystem privileges, new shell operations, or new user-facing functionality.
- **FR-017**: The package MUST pass the project's build, regression, and lint checks after the findings are resolved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A repeat review reports zero errors for the two manifest findings and all ten reported source directive locations.
- **SC-002**: The review contains no prohibited, unlimited, undescribed, or unused suppression-directive findings in the affected source files.
- **SC-003**: 100% of the project's automated build, regression, and lint checks complete successfully.
- **SC-004**: Manual verification of opening a notebook, restoring an embedded view, following an intercepted link, forwarding console output, and unloading the plugin completes with no observable regression.
- **SC-005**: The behavior review introduces zero new capability warnings; the existing direct-filesystem and shell-execution warnings remain documented as intentional desktop requirements.
- **SC-006**: 100% of tested vault-file creation and modification flows continue to use the host application's vault operations.

## Assumptions

- The author profile URL is `https://github.com/soakaye`.
- The direct-filesystem and shell-execution findings are warnings, not release-blocking errors, and are necessary for the plugin's declared desktop-only purpose.
- The goal is to remove the reported review errors, not to conceal or suppress the two intentional behavior warnings.
- Existing user-visible behavior is the compatibility baseline; this feature introduces no new settings or workflows.
- The official review rules and the repository's configured checks are the acceptance authorities for this feature.
- The untracked `temp/` directory is unrelated user work and is not modified.
