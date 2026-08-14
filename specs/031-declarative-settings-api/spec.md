# Feature Specification: Searchable Plugin Settings

**Feature Branch**: `031-declarative-settings-api`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Adopt Obsidian 1.13 declarative settings API (getSettingDefinitions) so plugin settings appear in Obsidian's global settings search, while keeping display() as a fallback for older versions"

## Clarifications

### Session 2026-08-14

- Q: How should the option list be kept consistent across the two rendering presentations? → A: Leave the legacy presentation's existing code untouched and add the searchable presentation alongside it; enforce parity (same options, keys, and order) with a regression test.
- Q: How deep should automated coverage of the searchable presentation go? → A: Verify its structure (options, keys, order, control kinds) plus parity, and unit-test the plugin's own validation and value read/write logic by calling it directly; do not simulate the host's rendering framework.
- Q: Two of the thirteen options have no description, so FR-002 could not hold for them. How should this be resolved? → A: Scope description-based discovery to the options that have a description; leave all displayed text unchanged, so those two stay discoverable by name only.
- Q: Should options carry search-only keyword metadata (invisible in the UI) to improve discoverability? → A: No, not in this release; rely on the existing names and descriptions and revisit only if users report options they cannot find.
- Q: Should each control in the searchable presentation declare its own default value? → A: No; the existing settings-defaults table stays the single source of defaults, and a test asserts no control declares one.
- Q: SC-002 depended on an unverifiable persona condition and overlapped SC-001. How should it be measured? → A: Restate it as reaching an editable option directly from a search result, without navigating the plugin list — leaving SC-001 to cover appearing in results.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find a Plugin Setting From the Global Search (Priority: P1)

As someone who remembers *what* they want to change but not *where* it lives, I want to type a word like "port" or "token" into the settings search and see marimo Bridge's matching options, so that I can reach a setting without knowing it belongs to this plugin.

**Why this priority**: This is the entire point of the feature. Every plugin option is currently invisible to the search box, so a user who does not already know the plugin's settings tab cannot find them.

**Independent Test**: On a host that supports settings search, search for a term from each setting's name and confirm the matching marimo Bridge options are listed and open the right place.

**Acceptance Scenarios**:

1. **Given** a host version that provides global settings search, **When** the user searches for a word appearing in a marimo Bridge setting's name, **Then** that setting is listed in the results.
2. **Given** the same, **When** the user searches for a word appearing only in a setting's description, **Then** that setting is still listed.
3. **Given** the same, **When** the user selects a search result, **Then** the plugin's settings are shown with that option available to edit.
4. **Given** the same, **When** the user opens the plugin's settings tab directly, **Then** every option appears in the same order and with the same labels as before this change.

---

### User Story 2 - Settings Keep Working on Older Hosts (Priority: P2)

As someone running a host version older than the one that introduced settings search, I want the plugin's settings tab to keep working exactly as it does today, so that upgrading the plugin never costs me access to its configuration.

**Why this priority**: The plugin's declared minimum supported host version predates settings search by several releases. Breaking those users would trade a discovery convenience for a total loss of configurability.

**Independent Test**: Load the plugin on a host older than the search-capable version and confirm every option renders, edits, and persists as before.

**Acceptance Scenarios**:

1. **Given** a host older than the search-capable version, **When** the user opens the plugin's settings tab, **Then** every option is rendered and editable.
2. **Given** the same, **When** the user changes any option, **Then** the change is persisted and takes effect exactly as it does today.
3. **Given** a host that supports settings search, **When** the settings tab is rendered, **Then** each option appears exactly once — the two rendering paths never both draw the same option.

---

### User Story 3 - Dynamic and Validated Options Still Behave Correctly (Priority: P3)

As a user configuring interpreter paths, ports, and timeouts, I want the live installation status, the install action, and the input validation to behave as they do today, so that the more complex options are not degraded by the move to a searchable presentation.

**Why this priority**: Most options are simple values, but a handful carry live state (the detected installation status and its install action) or reject invalid input. These are the ones most at risk of regressing, though the plugin remains usable if only the simple options move first.

**Independent Test**: Exercise each non-trivial option — installation status, the install action, and every numeric field — and confirm the status text refreshes, the action runs, and invalid input is rejected without corrupting the stored value.

**Acceptance Scenarios**:

1. **Given** the settings are open, **When** the plugin finishes checking whether the notebook runtime is installed, **Then** the status text and its action button reflect the result.
2. **Given** the runtime is not installed, **When** the user triggers the install action and it completes, **Then** the status refreshes without the user reopening the settings.
3. **Given** a numeric option, **When** the user enters a value outside the accepted range, **Then** the value is not persisted and the user is told the input was rejected.
4. **Given** a path option, **When** the user finishes editing it, **Then** the value is stored trimmed of surrounding whitespace and the installation status is re-checked.
5. **Given** any option is changed, **When** the change is persisted, **Then** the plugin's existing save path runs, so a change that affects a running server still invalidates it.

---

### Edge Cases

- A user upgrades the host across the search-capable boundary while the plugin is installed: the settings tab must switch presentations without any migration step or data change.
- An option's stored value is already invalid (persisted by an older plugin version): opening the settings must surface the problem without silently rewriting or discarding the stored value.
- The installation check is still in flight when the user leaves the settings tab: any pending work must not write into a torn-down settings view.
- A setting whose stored value is missing entirely (fresh install): the documented default is presented, matching today's behavior.
- The host renders the settings tab more than once in a session: repeated renders must not accumulate duplicated rows or leak background work.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On hosts that provide global settings search, every plugin option MUST be discoverable by searching for words in its name.
- **FR-002**: On hosts that provide global settings search, every plugin option **that carries a description** MUST also be discoverable by searching for words in that description. Two of the thirteen options have no description today; they remain discoverable by name only, and this feature MUST NOT add, remove, or alter any description to change that.
- **FR-003**: The plugin MUST continue to present and persist every option on hosts older than the search-capable version, with no loss of function.
- **FR-004**: Each option MUST be rendered exactly once, regardless of host version — the searchable presentation and the legacy presentation MUST never both render.
- **FR-005**: The set of options, their order, their labels, and their descriptions MUST be unchanged from the current release.
- **FR-005a**: The legacy presentation MUST be preserved as-is; this feature adds the searchable presentation alongside it rather than rewriting or regenerating the legacy one.
- **FR-005b**: The two presentations MUST expose the same options, identified by the same persisted keys, in the same order; a regression test MUST fail if they diverge.
- **FR-006**: Every option change MUST be persisted through the plugin's existing save path, so side effects of saving (such as invalidating a running server) continue to occur.
- **FR-007**: The installation-status option MUST continue to show the detected runtime version or a not-installed state, and MUST refresh after its install action completes.
- **FR-008**: Numeric options MUST reject values outside their accepted range, leave the previously stored value untouched, and make the rejection visible to the user.
- **FR-009**: Every option that is trimmed today MUST continue to store its value trimmed of surrounding whitespace — the three path options **and the API token**. Trimming a path option MUST additionally trigger a re-check of the installation status; trimming the token MUST NOT.
- **FR-010**: Background work started while the settings are open MUST be cleaned up when the settings view is torn down.
- **FR-011**: No persisted settings data, schema, or default value MUST change; users upgrading MUST keep every configured value.
- **FR-011a**: The existing settings-defaults table MUST remain the single source of default values. No control in the searchable presentation may declare its own default, and a regression test MUST assert that none does.
- **FR-012**: All user-visible text introduced or moved by this feature MUST be defined as named constants rather than inline literals, per the project's constant-externalization rule.
- **FR-013**: The regression suite MUST cover that every option is exposed for search, that the two presentations stay in parity per FR-005b, and that numeric rejection leaves the stored value unchanged.
- **FR-013a**: Automated coverage MUST verify the searchable presentation's structure — which options it exposes, their persisted keys, their order, and the kind of control each uses.
- **FR-013b**: The plugin's own validation and value read/write logic MUST be verifiable by calling it directly, without simulating the host's rendering framework. Rendering itself is the host's responsibility and is verified manually (see Assumptions).

### Key Entities

- **Setting option**: A single row in the settings tab, with a name, an optional description, and a control for editing it. Thirteen exist today: twelve carry a persisted key, and the thirteenth is the installation status described below, which stores nothing. Eleven of the thirteen carry a description. This feature changes how they are described to the host, not what they are.
- **Setting presentation**: How the option set is handed to the host. Two exist after this change — a searchable description consumed by newer hosts, and the legacy step-by-step drawing used by older hosts. Exactly one is active per host version, and both are maintained by hand but held in parity by test (FR-005b).
- **Installation status**: A live, asynchronously-determined value (runtime detected or not) with an attached install action. Unlike the other options it is not a stored user preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the plugin's options are returned by a global settings search for a distinctive word in their name.
- **SC-002**: Selecting an option from the search results opens it ready to edit, with no need to locate and open the plugin's settings tab first — measured per option, for 100% of the options SC-001 covers.
- **SC-003**: Zero options are lost, reordered, relabelled, or duplicated relative to the current release, on either host version.
- **SC-004**: Zero persisted settings values change as a result of upgrading to this version.
- **SC-005**: On hosts older than the search-capable version, the settings tab behaves identically to the current release.
- **SC-006**: The regression suite fails if the two presentations disagree on which options exist, their keys, or their order — so an option added to one and forgotten in the other cannot ship.

## Assumptions

- The host's minimum supported version stays where it is; the legacy presentation is retained rather than dropped, so both paths must coexist in this release.
- The host decides which presentation to use, and does so exclusively — when the searchable description is non-empty the legacy drawing is not invoked. This is treated as the mechanism guaranteeing FR-004 rather than something the plugin arbitrates itself.
- Invalid numeric input is rejected by refusing to persist it and showing the user an inline message. This differs slightly from today's behavior, which also resets the visible text back to the stored value; leaving the user's text in place alongside an explanation is accepted as an improvement rather than a regression.
- The current flat ordering of options is preserved. Regrouping options into sections or sub-pages is explicitly out of scope, even though the searchable presentation supports it.
- Adding, removing, or renaming settings is out of scope; this feature changes presentation only. This includes descriptions: the two options that have none keep none.
- Search-only keyword metadata — additional search terms that never appear in the interface — is out of scope for this release. Discoverability rests on the existing names and the eleven existing descriptions. Adding such keywords is a separate follow-up, warranted only if users report options they cannot find.
- Verifying the search behavior itself requires a host at or above the search-capable version; automated coverage is limited to the plugin's side of the contract (which options are offered, their keys, order, and control kinds; parity between the two presentations; and the plugin's own validation and read/write logic). Actual rendering, search indexing, and the visual result are verified manually on a real host.
