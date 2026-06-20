# Research: API Token Configuration

This document outlines research findings, technical decisions, and alternatives considered for securing the local marimo server with API tokens.

## Decisions & Findings

### 1. CLI Authentication Mechanism
- **Decision**: Use the `--token-password <token>` CLI argument to configure the marimo server's authentication token.
- **Rationale**: Setting a specific password via `--token-password` allows Obsidian to determine the token beforehand (either custom-configured or cryptographically auto-generated) and pass it securely.
- **Alternatives Considered**: 
  - Using the `--token` flag alone: This causes marimo to auto-generate a random token, but it prints it to stdout. Intercepting stdout to read the token is complex and prone to timing issues.
  - Environment variables: Passing the token via environment variables isn't officially documented for `marimo edit`, making the command-line flag the more robust option.

### 2. WebView Seamless Login
- **Decision**: Authenticate the WebView by appending the `access_token` query parameter to the loading URL (e.g., `http://127.0.0.1:port/?access_token=YOUR_TOKEN`).
- **Rationale**: marimo natively supports automatic login when the token is passed in the URL using the `access_token` query parameter. This ensures the user is not prompted with a login dialog in Obsidian.
- **Alternatives Considered**: 
  - `Basic` HTTP Authentication headers: Electron's `<webview>` can send custom headers, but query parameters are simpler, more reliable, and survive user-initiated navigation or page reloads within the WebView better.

### 3. Server Health Checks
- **Decision**: Keep the health check requests to `/health` exactly as they are without adding authorization headers.
- **Rationale**: Research confirms that the `/health` and `/healthz` endpoints in marimo do not enforce token authentication and return `200 OK` directly when the server is alive.
