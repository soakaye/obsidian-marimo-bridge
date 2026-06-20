# Data Model: API Token Configuration

This document specifies the data model and state changes required for token-based authentication.

## Configuration Schema

We will add a new setting `apiToken` to the persistent plugin settings stored in `data.json`.

### `MarimoBridgeSettings` Interface (`src/settings.ts`)

```typescript
export interface MarimoBridgeSettings {
	// ... existing settings ...
	
	/**
	 * Custom API token configured by the user.
	 * If empty, a secure random session token is generated on startup.
	 */
	apiToken: string;
}
```

### Default Value (`src/constants.ts`)

- `DEFAULT_API_TOKEN`: `""` (empty string, triggering session token generation).

## In-Memory Runtime State

Within `ServerManager`, we maintain the resolved active token in memory:

### `ServerManager` Properties (`src/server-manager.ts`)

- `private activeToken: string`:
  - Resolved once during plugin initialization.
  - If `this.settings.apiToken` is non-empty, `activeToken` takes that value.
  - If `this.settings.apiToken` is empty, `activeToken` is populated with a cryptographically secure random string (e.g. using `crypto.randomBytes(16).toString("hex")` or equivalent Node/Web API).
  - This token is read-only for the lifecycle of the `ServerManager` (until settings change and server restarts).
