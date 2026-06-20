# Feature Specification: API Token Configuration

**Feature Branch**: `011-api-token-configuration`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "APIトークン設定画面を追加しmarimoサーバとはapiトークンを介した処理にする"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Custom API Token and Connect (Priority: P1)

Users can configure a custom, persistent API token in the plugin settings tab. Once configured, all launched marimo servers will require this token for authentication, and the plugin will seamlessly authenticate the embedded web editor WebView.

**Why this priority**: Core user capability to secure the local marimo server using a custom token and ensure only the authorized Obsidian plugin instance can view or edit the notebooks.

**Independent Test**: Can be tested by configuring a custom token in the settings, launching the marimo server, verifying that direct browser access to the server port requires a token, and verifying that the Obsidian editor view opens the notebook automatically.

**Acceptance Scenarios**:

1. **Given** the plugin settings tab is open, **When** the user inputs a token `"my-secret-token"` into the "API token" field and saves, **Then** restarting the server launches `marimo` with `--token-password my-secret-token`.
2. **Given** the marimo server is running with token `"my-secret-token"`, **When** the plugin opens a marimo notebook in a WebView, **Then** the WebView URL includes `access_token=my-secret-token` and the editor loads without prompting for password.

---

### User Story 2 - Secure Auto-Generated Session Token fallback (Priority: P2)

To maintain safety by default, if the user does not specify a custom API token (the field is empty), the plugin automatically generates a secure, random session token on startup, configures the marimo server with it, and uses it for WebView authentication.

**Why this priority**: Ensures that the marimo server is always protected by authentication by default, even if the user has not configured a custom token, replacing the insecure `--no-token` option.

**Independent Test**: Can be tested by clearing the API token setting, starting the server, and verifying that the server requires a token that matches the generated session token.

**Acceptance Scenarios**:

1. **Given** the "API token" setting is empty, **When** the plugin starts the marimo server, **Then** it generates a cryptographically secure random token (e.g. 32 characters) for the session and runs the server with `--token-password <session_token>`.
2. **Given** the server is running with the generated session token, **When** the user opens a notebook in a WebView, **Then** the WebView URL includes `access_token=<session_token>` and loads successfully.

---

### Edge Cases

- **Special Characters in Token**:
  - What happens when the configured API token contains special characters (like quotes, backslashes, spaces, or ampersands)?
  - The CLI argument must be safely escaped when spawning the process, and the query parameter value must be URL-encoded (e.g. `encodeURIComponent`) when appended to the WebView URL.
- **Port Conflict or Server Reuse**:
  - If a marimo server is already running outside Obsidian or from a previous session on the same port, how do we handle it?
  - If the health check on the port passes but the token does not match, the health check will fail (HTTP 401 Unauthorized instead of 200). In this case, the server manager should recognize it as a port conflict and fail/warn the user or try to kill/restart, rather than incorrectly attaching to the unauthorized server.
- **Token Dynamic Updates**:
  - What happens if the user changes the token in the settings while a server is already running?
  - The UI should display a warning indicating that changing this setting requires restarting the server, and the user must manually restart the server (or the plugin restarts it) for the changes to take effect.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The settings tab MUST include an "API token" text input field.
- **FR-002**: If the "API token" setting is empty, the plugin MUST automatically generate a secure random session token on plugin initialization/startup.
- **FR-003**: The plugin MUST store the custom API token in the plugin settings (`data.json`) persistently.
- **FR-004**: The `ServerManager` MUST run the marimo server process using the `--token-password` command argument instead of `--no-token`.
- **FR-005**: All web views (editor-view, embeds) loading the marimo server URL MUST append the `access_token` query parameter with the active token (configured or session-generated).
- **FR-006**: The `/health` endpoint check in `ServerManager` MUST handle authentication (e.g., passing the token via the `Authorization` header or query parameter) to accurately check server health since the server now requires authentication.
- **FR-007**: The settings UI MUST show a warning indicating that the server must be restarted for token changes to take effect.

### Key Entities

- **API Token**: A secret string used to authenticate clients with the marimo server. It can be:
  - User-configured (stored in settings).
  - Session-generated (temporary, recreated on startup, not stored).
- **Marimo Server**: The local backend server process. Its lifecycle is managed by Obsidian, and it is configured with the active API token.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of marimo edit and run servers spawned by the plugin are protected by token authentication (no `--no-token` used by default).
- **SC-002**: Opening any marimo notebook within Obsidian loads in less than 3 seconds without any manual authentication prompt.
- **SC-003**: Direct requests to the marimo server endpoint (e.g., via a standard browser or external tool) without the correct token are rejected with a 401 Unauthorized status or redirect to the login page.

## Assumptions

- The `marimo edit` and `marimo run` commands support the `--token-password <password>` flag.
- The WebView in Electron (used by Obsidian) can load local URLs with query parameters properly and persists session storage/cookies for authentication if needed.
- Using query parameter `access_token` is supported by the marimo web interface for automatic login.
