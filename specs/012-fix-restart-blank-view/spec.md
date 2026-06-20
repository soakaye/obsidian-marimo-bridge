# Feature Specification: Fix blank marimo view after Obsidian restart

**Feature Branch**: `012-fix-restart-blank-view`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Fix blank marimo view after Obsidian restart. When a marimo tab is open and Obsidian is quit and relaunched, the restored tab shows blank content — the embedded marimo view attaches but its page never loads and there is no retry. Add a readiness watchdog that reloads the view if it has not loaded within a few seconds (capped retries). Secondary fixes: only reuse a marimo server that accepts our access token (instead of trusting an unauthenticated health check), evicting and replacing a stale/incompatible leftover server, and prevent duplicate server spawns at startup that cause an address-already-in-use error."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restored marimo tab renders after restart (Priority: P1)

A user has one or more marimo notebooks (or the marimo home page) open in tabs. They quit Obsidian and later relaunch it. Obsidian restores the previous workspace, including the marimo tabs. The user expects each restored marimo tab to display its notebook/home page automatically, exactly as it did before quitting — without any manual action.

**Why this priority**: This is the reported defect. A blank restored tab makes the plugin appear broken on every restart and forces the user to manually recover (e.g. close and reopen the tab), which is the core daily-use path.

**Independent Test**: Open a marimo tab, fully quit and relaunch Obsidian, and confirm the restored tab shows the notebook/home content within a few seconds with no manual interaction.

**Acceptance Scenarios**:

1. **Given** a marimo notebook tab is open and active, **When** Obsidian is quit and relaunched, **Then** the restored tab displays the notebook content automatically within a few seconds.
2. **Given** the marimo home page tab is open, **When** Obsidian is quit and relaunched, **Then** the restored tab displays the home (notebook browser) page automatically.
3. **Given** a restored marimo view fails to load on first attempt, **When** the readiness watchdog elapses, **Then** the view is reloaded and subsequently renders, without the user doing anything.

---

### User Story 2 - Healthy startup when a leftover server is present (Priority: P2)

A marimo server from a previous session (or one started manually / by an older version of the plugin with different settings) is still listening on the configured port when Obsidian launches. The user expects the plugin to either reuse that server only if it is actually usable, or replace it — never to attach the view to a server that will render blank.

**Why this priority**: A leftover/incompatible server is a common cause of a broken view after a crash, force-quit, or plugin upgrade. Getting adoption right prevents a whole class of blank/broken-view reports, but it is secondary to the restore watchdog because the watchdog already recovers the visible symptom.

**Independent Test**: Start a marimo server on the configured port with auth settings that differ from the plugin's, then launch/enable the plugin and confirm the view still renders (the plugin replaced or correctly reused the server) rather than showing blank.

**Acceptance Scenarios**:

1. **Given** a leftover server on the configured port that does not accept the plugin's access token, **When** the plugin starts, **Then** the plugin does not adopt it and instead provides a working server, so the view renders.
2. **Given** a previously started server that *does* accept the plugin's current access token, **When** the plugin starts, **Then** the plugin reuses it without spawning a duplicate.

---

### User Story 3 - No duplicate server / port conflict at startup (Priority: P3)

When the plugin starts up, multiple internal triggers (auto-start on load and workspace restore) may both try to ensure the server is running. The user should never see a startup error or instability caused by two servers competing for the same port.

**Why this priority**: The duplicate-spawn race produces an alarming `address already in use` error in the console and wasted processes. It is mostly self-healing today, so it is the lowest priority of the three, but it should be eliminated for a clean startup.

**Independent Test**: Launch Obsidian with auto-start enabled and a marimo tab to restore, and confirm only one server process ends up running on the configured port and no bind error is reported.

**Acceptance Scenarios**:

1. **Given** auto-start is enabled and a marimo tab is being restored, **When** Obsidian launches, **Then** exactly one marimo server ends up running on the configured port and no `address already in use` error occurs.

---

### Edge Cases

- The marimo view never becomes ready even after reloading (e.g. the server is genuinely down): the plugin stops retrying after a capped number of attempts and surfaces the existing "server not available" guidance rather than reloading forever.
- A reload is triggered while the page is mid-load: the in-flight load is naturally superseded; benign aborted loads (caused by the normal access-token redirect) do not count as failures and do not trigger spurious reloads.
- The configured port is occupied by a foreign (non-marimo) process: the plugin does not silently attach to it; the user is informed the server is unavailable.
- A genuinely slow but healthy first load completes before the watchdog elapses, so no unnecessary reload occurs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a marimo view is shown, the system MUST detect whether its embedded page has actually loaded.
- **FR-002**: If an embedded marimo view has not signalled readiness within a short, bounded interval, the system MUST automatically reload it without requiring user action.
- **FR-003**: The system MUST limit the number of automatic reload attempts to a small cap to avoid an endless reload loop when the content genuinely cannot load.
- **FR-004**: The system MUST treat benign aborted loads (those produced by the normal authentication redirect) as non-failures so they do not trigger spurious reloads.
- **FR-005**: Before reusing an already-running server on the configured port, the system MUST verify that the server accepts the plugin's current access token, rather than relying solely on an unauthenticated availability check.
- **FR-006**: If a server already on the configured port is not usable by the plugin (wrong/absent auth, or otherwise incompatible), the system MUST evict it and provide a fresh, working server.
- **FR-007**: The system MUST reuse — without spawning a duplicate — a running server that does accept the plugin's current access token.
- **FR-008**: During startup, the system MUST ensure only a single server is started for the configured port even when multiple internal triggers request it, avoiding a port-bind conflict.
- **FR-009**: When the view cannot be made to render after the capped recovery attempts, the system MUST fall back to the existing user-facing "server not available / check settings" guidance rather than leaving an unexplained blank pane.

### Key Entities

- **Marimo view**: An embedded full-tab view that hosts a marimo notebook or the marimo home page; has a load/readiness state that this feature observes and recovers.
- **Edit server**: The shared local marimo server the views connect to; has a lifecycle (start, reuse, evict) and an authentication expectation (the access token) that determines whether it is usable by the plugin.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A restored marimo tab displays its content automatically within ~5 seconds of Obsidian finishing startup, with no manual interaction, in 100% of normal restart cases.
- **SC-002**: Manual recovery actions (closing/reopening the tab, manually reloading) are no longer required after a restart — the rate of restart-induced blank views drops to effectively zero.
- **SC-003**: When a leftover/incompatible server occupies the configured port, the view still renders after startup instead of showing blank.
- **SC-004**: Startup produces no `address already in use` error and leaves exactly one server running on the configured port.
- **SC-005**: When content genuinely cannot load, recovery stops after the capped attempts and the user sees an explanatory message instead of an indefinitely blank pane.

## Assumptions

- The view-restoration path that delivers the saved tab state is the only entry point that needs the readiness watchdog; user-initiated opens already render reliably but benefit from the same safeguard.
- A short watchdog interval (a few seconds) and a small retry cap (around three attempts) are sufficient to recover the observed blank state without harming genuinely slow loads; exact values are an implementation detail tuned during planning.
- The access token used to validate server adoption is the plugin's currently configured/active token, consistent with how views authenticate.
- Reusing a server that accepts the current token is safe and preferred over spawning a new one.
- This feature targets the desktop environment (the only environment where the embedded view and local server are supported).
