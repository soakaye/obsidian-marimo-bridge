# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Optional *Open in marimo* file-explorer context-menu entry for Markdown
  (`.md`) files. The new *Open Markdown files in marimo* setting is off by
  default and requires a compatible marimo Markdown integration such as
  `mkdocs-marimo` or `quarto-marimo`. (spec:
  `016-markdown-open-in-marimo`)
- Reliable termination of self-spawned marimo servers on exit. The plugin now
  persists a record (PID/port/kind) of every server it starts to a plugin-dir
  file and, on a full Obsidian quit, synchronously signals them via a
  `beforeunload` handler (Unix process-group / Windows tree kill). Any server
  that survives a crash or force-quit is reconciled on the next launch:
  leftovers are terminated only when positively confirmed alive **and**
  accepting the active token, so adopted or unrelated processes are never
  killed. (spec: `013-terminate-marimo-on-exit`)

### Fixed

- Fixed run-mode server reference accounting for concurrent embeds. Matching
  embeds now share one startup while each owns an independent lease; the server
  stops only after the final embed unloads, including unload-during-startup.
- Fixed capped webview recovery so exhausting reload attempts displays an
  explanatory failure instead of leaving a blank pane.
- Restored the 1000-attempt limit for generated notebook names and abort with a
  notice when every candidate is occupied.
- Restored incompatible edit-port eviction and prevented a spawn when the port
  cannot be released.
- Blank marimo view after an Obsidian restart: a restored tab whose embedded
  `<webview>` attached but never finished loading (no `dom-ready`) now recovers
  automatically via a readiness watchdog that reloads it (capped retries),
  ignoring benign aborted loads. (spec: `012-fix-restart-blank-view`)
- Stale/incompatible leftover marimo server on the configured port is no longer
  adopted via the unauthenticated `/health` check. The plugin now reuses a
  server only if it accepts the active access token (detected by redirect
  target), otherwise evicts it and starts a fresh one.
- Duplicate server spawn at startup that produced `address already in use` is
  prevented by serializing start through a single in-flight guard with a health
  recheck.
- Server eviction now targets only the LISTENING process on the port
  (`lsof … -sTCP:LISTEN`); previously it could also match client/`TIME_WAIT`
  sockets — including Obsidian's own connection — and terminate the wrong
  process.

### Changed

- The marimo bind host is now permanently fixed to `127.0.0.1`; the Host setting
  was removed and legacy persisted values are ignored.
- Runtime string and non-zero numeric literal externalization is enforced by an
  AST-based regression test.
- Edit-server adoption is token-aware, matching constitution v2.0.0 Principle IV
  (servers run headless **with** token validation, bound to `127.0.0.1`).

## [1.0.0] - 2026-06-17

### Added

- Support for macOS and Linux platforms (automatic path resolution for `.venv` and process group termination).
- Dynamic settings UI descriptions and placeholders tailored to the running OS (Windows vs macOS/Linux).
- Full-tab marimo editor view backed by an Electron `<webview>`.
- Inline notebook embeds via ` ```marimo ` code blocks (`edit` / `run` modes).
- Automatic marimo edit-server lifecycle management (start on load, stop on
  unload, Windows/Unix process-tree termination, restart command).
- marimo installation detection and one-click `pip install marimo` from
  settings; the server is not started when marimo is missing.
- Configurable Python interpreter path and marimo executable path, with
  `.venv` auto-detection.
- Commands: open active `.py`, open marimo home, create notebook, restart
  server; ribbon icon and `.py` context-menu entry.
