# Interface Contracts: API Token Configuration

This document specifies the interface contract between the Obsidian Plugin, the `marimo` process CLI, and the embedded `webview` URLs.

## 1. CLI Process Invocation Contract

When launching `marimo edit` or `marimo run` server processes, `ServerManager` MUST supply the token password argument.

### Arguments Pattern
```bash
marimo <edit|run> [file_path] --headless --token-password <token> --port <port> --host <host>
```

- **Authentication Flag**: `--token-password <token>`
- **Condition**: 
  - The `--token-password` parameter replaces the previous `--no-token` parameter.
  - The `<token>` value MUST be either `settings.apiToken` (if configured) or the generated secure session token (if not configured).

---

## 2. WebView URL Contract

When the Obsidian UI loads a marimo editor or run preview inside a `<webview>`, it MUST append the token to the URL query string.

### URL Structure

#### Edit Home URL
```
http://<host>:<port>/?access_token=<token>
```

#### Edit File URL
```
http://<host>:<port>/?file=<file_path>&access_token=<token>
```

#### Run Server (App View) URL
```
http://<host>:<port>/?access_token=<token>
```

- **Query Parameter Key**: `access_token`
- **Value**: The active authentication token.
- **URL Encoding**: The token and path parameters MUST be URL-encoded using `encodeURIComponent` before being embedded in the WebView `src` attribute.
