# marimo Bridge for Obsidian

<a href="https://www.buymeacoffee.com/soakage" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

View and edit [marimo](https://marimo.io/) notebooks (`.py` files) directly
inside [Obsidian](https://obsidian.md/).

marimo notebooks are plain Python files and marimo's editor is a local web app.
This plugin starts and manages a local marimo server for you and embeds its UI
in an Electron `<webview>` — both as a full editor tab and inline inside your
notes. Edits are written straight back to the real `.py` file on disk.

> **Desktop only.** The plugin relies on Node's `child_process` and Electron's
> `<webview>` tag, so it does not run on Obsidian Mobile.

---

## Features

- **Full notebook editing** — open a `.py` notebook in a dedicated tab with
  marimo's reactive editor. Saves go straight to the file.
- **Inline embeds** — drop a notebook into any note with a ` ```marimo ` block,
  in either editable or read-only "app" mode.
- **Automatic server management** — the marimo edit server starts when Obsidian
  loads (configurable) and is stopped when the plugin unloads. On Windows, the
  whole process tree is terminated; on macOS and Linux, the server is spawned
  detached and its process group is signalled, so no orphan marimo workers are
  left behind.
- **Reliable termination on exit** — every server the plugin spawns is recorded
  (PID/port/kind) to a file in the plugin directory. A full Obsidian quit
  signals them synchronously, and any server that survives a crash or force-quit
  is reconciled on the next launch — terminated only when positively confirmed
  both alive **and** accepting the plugin's token. Unrelated processes are not
  touched during cleanup; the configured edit port is the deliberate exception,
  where an incompatible listener is evicted before the plugin starts its server.
- **Token-authenticated servers** — servers run headless with
  `--token-password`, always bound to `127.0.0.1`. The bind address is fixed and
  cannot be changed in settings. Use a generated per-session token by default,
  or set your own in settings.
- **Built-in installer** — a settings section detects whether marimo is
  installed and offers a one-click `pip install marimo` (modeled after the
  JupyMD plugin). If marimo is not installed, the server is simply not started.
  A broken vault `.venv` (its Python interpreter missing after a Homebrew/pyenv
  upgrade) is detected and called out so you can recreate it.
- **Configurable interpreter** — point the plugin at a specific Python
  interpreter and/or marimo executable (e.g. a project `.venv`).

---

## Requirements

- Obsidian **1.5.0+** (desktop).
- [Python](https://www.python.org/) with [marimo](https://marimo.io/) installed.
  You can install marimo from the plugin settings, or manually:

  ```bash
  python -m pip install marimo
  ```

A virtual environment inside the vault (e.g. `<vault>/.venv`) is auto-detected.

---

## Installation

### From source (manual)

1. Clone or download this repository.
2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

3. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at
   `<vault>/.obsidian/plugins/marimo-bridge/`.
4. In Obsidian, enable **marimo Bridge** under *Settings → Community plugins*.

### With BRAT

Add this repository to the
[BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin to install and keep
it updated from GitHub releases.

---

## Usage

### Open / create notebooks

- **Click a `.py` file** — opens it in the marimo editor (when *Open .py files
  in marimo by default* is enabled).
- **Command palette**
  - `Open active .py file in marimo`
  - `Open marimo home` — a browser of the notebooks in your vault.
  - `Create new marimo notebook` — scaffolds a minimal notebook and opens it.
  - `Restart marimo server`
- **Ribbon icon** (notebook) — opens the marimo home page.
- **Right-click a `.py` file** → *Open in marimo*.
- **Right-click a file or folder** → *Create new marimo notebook* (when the
  *Enable file explorer context menu* setting is on).

### Embedding a notebook in a note

Add a fenced ` ```marimo ` block with one `key: value` per line:

````markdown
```marimo
file: 02_Tools/analysis.py
mode: edit        # edit (full editor) | run (read-only app)
height: 600
```
````

- `file` (**required**) — vault-relative path to the notebook.
- `mode` — `edit` uses the always-on edit server; `run` lazily starts a
  dedicated read-only "app" server for that notebook.
- `height` — embed height in pixels.

Blank lines and `#` comments inside the block are ignored; omitted keys fall
back to the defaults configured in settings.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| **marimo executable path** | *(auto-detect)* | Absolute path to `marimo` (e.g. `.venv/Scripts/marimo.exe` on Windows or `.venv/bin/marimo` on macOS/Linux). |
| **Python interpreter path** | *(auto-detect)* | Interpreter used for installing marimo and running `python -m marimo`. |
| **marimo installation** | — | Shows the detected version (or "Not installed") and an install / upgrade button. |
| **Port** | `2718` | Port for the edit server. |
| **Auto-start server on load** | `on` | Start the edit server when Obsidian launches. |
| **Startup timeout (seconds)** | `30` | How long to wait for the server health check. |
| **Open .py files in marimo by default** | `on` | Turn off to keep `.py` as plain text and open via command / menu. Takes effect after reloading the plugin. |
| **Default embed mode / height** | `edit` / `600` | Defaults for ` ```marimo ` blocks. |
| **Enable file explorer context menu** | `on` | Show the *Create new marimo notebook* item when right-clicking files and folders. |
| **API token** | *(auto-generated)* | Token the servers authenticate with (`--token-password`). Leave empty for a secure random per-session token. Changing it requires restarting the server. |

### Resolution order

**marimo command:** configured marimo path → `<vault>/.venv/Scripts/marimo.exe` (Windows) or `<vault>/.venv/bin/marimo` (macOS/Linux)
→ configured Python `-m marimo` → `<vault>/.venv/Scripts/python.exe -m marimo` (Windows) or `<vault>/.venv/bin/python -m marimo` (macOS/Linux)
→ `marimo` on `PATH`.

The vault `.venv` is only preferred when its Python interpreter is actually
runnable. If the venv's `marimo` launcher is present but its Python is a
dangling symlink (e.g. after a Homebrew/pyenv upgrade), it is bypassed and
flagged as broken in the installer section rather than silently failing.

**Python (install / `-m marimo`):** configured interpreter →
`<vault>/.venv/Scripts/python.exe` (Windows) or `<vault>/.venv/bin/python` (macOS/Linux) → `python` / `python3` on `PATH`.

---

## How it works

```
src/main.ts            MarimoBridgePlugin — wiring, commands, lifecycle
├── src/server-manager.ts    starts/stops marimo servers; detection & pip install
├── src/server-records.ts    crash-safe PID/port/kind store for orphan cleanup
├── src/editor-view.ts       full-tab editor — <webview> on the edit server
├── src/embed-processor.ts   ```marimo blocks -> <webview>
├── src/constants.ts         shared strings, defaults, command arguments
└── src/settings.ts          settings schema + settings tab
```

1. On load, `ServerManager` launches
   `marimo edit --headless --token-password <token> --port <port> --host 127.0.0.1`
   with the vault as the working directory, and persists a record of the spawned
   process for crash recovery.
2. Views and embeds load
   `http://127.0.0.1:<port>/?file=<relative-path>&access_token=<token>` in a
   `<webview>`. The marimo server reads and writes the real file, so edits
   persist with no extra file handling in the plugin.
3. `run`-mode embeds get a separate, lazily started `marimo run` server.
4. A pre-existing server on the port is reused only if it accepts the active
   token; an incompatible or foreign listener is evicted and replaced. If the
   port cannot be released, startup stops without spawning a conflicting server.
5. On exit the spawned servers are signalled synchronously; on the next launch
   any record left behind is reconciled (terminated only when confirmed alive
   and ours).

---

## Security note

The servers run headless with `--token-password`, bound to `127.0.0.1`. Every
view and embed URL carries an `access_token`, so a request without the token is
bounced to marimo's login page. By default the plugin generates a secure random
token per session; you can pin your own under **API token** in settings (it
takes effect after a server restart). The host is fixed to `127.0.0.1`; avoid
forwarding or otherwise exposing the port.

---

## Development

```bash
npm install
npm run dev     # esbuild watch build
npm run build   # type-check (tsc) + production bundle -> main.js
npm test        # regression tests with the Node built-in test runner
npm run lint    # eslint (flat config + eslint-plugin-obsidianmd)
```

The entry point is `src/main.ts`; the bundle is produced by
[esbuild](https://esbuild.github.io/) (`esbuild.config.mjs`) into `main.js`.
`npm version <patch|minor|major>` runs `version-bump.mjs` to keep
`manifest.json` and `versions.json` in sync.

### Obsidian CLI for desktop testing

Desktop integration tests and manual plugin validation use the
[Obsidian CLI](https://help.obsidian.md/cli). Install an Obsidian version that
supports the CLI, then enable it before testing:

1. Open Obsidian and go to **Settings → General**.
2. Enable **Command line interface**.
3. Follow the prompt to register the `obsidian` command.
4. Keep Obsidian running while executing CLI-based tests.

Verify the development environment with:

```bash
obsidian version
obsidian plugin:reload id=marimo-bridge
obsidian dev:errors
```

---

## License

[MIT](LICENSE) © soakaye
