# Feature Specification: Open Markdown Notebooks in marimo

**Feature Branch**: `016-markdown-open-in-marimo`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "mkdocs-marimo , quarto-marimo がインストールされている場合、.py 以外に .md ファイルにも `Open in marimo` context メニューを追加しmarimo でmdファイルを開ける様にする。 設定画面によって有効無効切り替え。"

## Clarifications

### Session 2026-06-21

- Q: How should the `.md` "Open in marimo" item be gated — by the settings toggle alone, by the toggle plus runtime detection of an installed integration, or by detection only? → A: Toggle-only gating. The item appears whenever the setting is ON; the user is responsible for having a marimo Markdown integration installed. No runtime package detection is performed.
- Q: What should the default value of the Markdown context-menu setting be on a fresh install / first upgrade? → A: Default OFF (disabled). The option is opt-in; users who use Markdown notebooks enable it explicitly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a Markdown notebook in marimo from the file explorer (Priority: P1)

A user who keeps marimo notebooks in Markdown format (enabled by a marimo Markdown integration such as `mkdocs-marimo` or `quarto-marimo`) right-clicks a `.md` file in the Obsidian file explorer and chooses "Open in marimo" to launch that Markdown file directly in the marimo editor, exactly as they already can with `.py` notebooks.

**Why this priority**: This is the core value of the feature. Without it, Markdown-format notebook users must fall back to the terminal or convert files, which is the entire pain point this feature removes. Delivering only this story already provides a complete, usable capability.

**Independent Test**: With the feature enabled, right-click a `.md` file, select "Open in marimo", and confirm the file opens in the marimo editor view. Fully testable on its own.

**Acceptance Scenarios**:

1. **Given** the Markdown context-menu option is enabled, **When** the user right-clicks a `.md` file in the file explorer, **Then** an "Open in marimo" item appears in the context menu.
2. **Given** the "Open in marimo" item is shown for a `.md` file, **When** the user clicks it, **Then** that Markdown file is opened in the marimo editor.
3. **Given** a `.py` file is right-clicked, **When** the context menu opens, **Then** the existing "Open in marimo" behavior for `.py` files is unchanged.

---

### User Story 2 - Control the Markdown option from settings (Priority: P2)

A user opens the plugin settings and turns the "Open Markdown files in marimo" option on or off, controlling whether the "Open in marimo" item is offered on `.md` files.

**Why this priority**: Users who do not use Markdown notebooks should not see an option that does not apply to them, and the request explicitly asks for an enable/disable toggle. It builds directly on Story 1 but is not required for the core capability to function.

**Independent Test**: Toggle the setting off, right-click a `.md` file, and confirm no "Open in marimo" item appears; toggle it on and confirm the item returns. Testable independently of how the file ultimately opens.

**Acceptance Scenarios**:

1. **Given** the Markdown context-menu setting is disabled, **When** the user right-clicks a `.md` file, **Then** no "Open in marimo" item is shown for that file.
2. **Given** the user changes the Markdown context-menu setting, **When** they next open a `.md` context menu, **Then** the new setting value takes effect without requiring a plugin reload.
3. **Given** the setting is toggled, **When** the change is made, **Then** the choice persists across Obsidian restarts.

---

### User Story 3 - Understand the integration requirement (Priority: P3)

A user discovers and enables the Markdown option and understands from its settings label/description that a marimo Markdown integration (such as `mkdocs-marimo` or `quarto-marimo`) must be installed for the opened file to render as a notebook.

**Why this priority**: Because the option is gated only by the toggle (no runtime detection), a user who enables it without the supporting integration could be confused when a Markdown file does not behave as a notebook. Clear labeling prevents that confusion. It refines the experience rather than providing new core capability.

**Independent Test**: Open the plugin settings and confirm the Markdown option's label and description make the integration requirement explicit before the user enables it.

**Acceptance Scenarios**:

1. **Given** the user is viewing the plugin settings, **When** they read the Markdown option, **Then** the description states that a marimo Markdown integration (e.g., `mkdocs-marimo` or `quarto-marimo`) is required.
2. **Given** the integration is not installed and the user opens a `.md` file via the item, **When** marimo loads the file, **Then** the outcome is whatever marimo itself produces for that file; the plugin does not pre-validate or block the open.

---

### Edge Cases

- What happens when the user right-clicks a `.md` file that is not actually a marimo notebook (plain prose Markdown)? The option is still offered (the plugin does not inspect file contents); opening a non-notebook Markdown file is the user's choice and marimo handles the file as given.
- How does the system handle a folder or a non-`.md`, non-`.py` file? No marimo "Open in marimo" item is added for it.
- What happens when the option is enabled but no marimo Markdown integration is installed? The item still appears and opening proceeds; the resulting behavior is whatever marimo produces. The plugin does not detect or warn at click time (the settings description carries the requirement notice).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST add an "Open in marimo" context-menu item to `.md` files in the Obsidian file explorer, in addition to the existing `.py` support.
- **FR-002**: The `.md` "Open in marimo" item MUST open the selected Markdown file in the marimo editor using the same open path as `.py` files.
- **FR-003**: The system MUST provide a settings toggle that enables or disables the `.md` "Open in marimo" context-menu item.
- **FR-004**: The presence of the `.md` "Open in marimo" item MUST be gated solely by the settings toggle; the system MUST NOT perform runtime detection of installed marimo Markdown integrations as a condition for showing the item.
- **FR-005**: When the settings toggle is disabled, the system MUST NOT offer the "Open in marimo" item on `.md` files.
- **FR-006**: When the settings toggle is enabled, the system MUST offer the "Open in marimo" item on `.md` files.
- **FR-007**: The settings toggle value MUST persist across Obsidian restarts.
- **FR-008**: Changes to the settings toggle MUST take effect for subsequent context-menu invocations without requiring a plugin reload or Obsidian restart.
- **FR-009**: The feature MUST NOT change the existing "Open in marimo" behavior for `.py` files.
- **FR-010**: The settings option MUST be clearly labeled and described so a user understands it controls opening Markdown files in marimo and that a supporting marimo Markdown integration (e.g., `mkdocs-marimo` or `quarto-marimo`) is required for the file to render as a notebook.
- **FR-011**: The Markdown context-menu setting MUST default to disabled (OFF) on a fresh install and on first upgrade for existing users.

### Key Entities *(include if data involved)*

- **Markdown context-menu setting**: A persisted on/off user preference that governs whether the `.md` "Open in marimo" item is offered. Defaults to OFF (disabled).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with the feature enabled can open a `.md` notebook in marimo from the file explorer in a single right-click → click action (two interactions total).
- **SC-002**: When the feature is disabled in settings, 100% of `.md` right-clicks show no "Open in marimo" item for the Markdown file.
- **SC-003**: When the feature is enabled, 100% of `.md` right-clicks show the "Open in marimo" item, regardless of which Python packages are installed.
- **SC-004**: Existing `.py` "Open in marimo" behavior remains unchanged, with no regression in how `.py` files are opened.
- **SC-005**: Toggling the setting changes context-menu behavior on the next menu invocation, with no plugin reload required, in 100% of cases.

## Assumptions

- "Markdown notebooks" refers to `.md` files that marimo can open as notebooks when a marimo Markdown integration (such as `mkdocs-marimo` or `quarto-marimo`) is present; whether that integration is installed is the user's responsibility, communicated via the settings description rather than enforced by the plugin.
- The `.md` option uses the same marimo open mechanism already used for `.py` files; no separate launch flow or new server type is introduced.
- The `.md` option is gated solely by the settings toggle (per the 2026-06-21 clarification); no runtime package detection is performed.
- The plugin does not inspect Markdown file contents to decide eligibility; any `.md` file qualifies for the option when the toggle is enabled.
- Scope is limited to the file-explorer right-click context menu for `.md` files; ribbon actions, command palette, and bulk operations are out of scope for this feature.
