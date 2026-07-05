# Project

`marimo-bridge` is an Obsidian **desktop** plugin that views and edits
[marimo](https://marimo.io/) notebooks (`.py`) by managing a local marimo
server and embedding its web UI in an Electron `<webview>`.

## Layout

- `src/main.ts` — plugin entry point (`MarimoBridgePlugin`).
- `src/server-manager.ts` — marimo process lifecycle, detection, `pip install`.
- `src/editor-view.ts` — full-tab `<webview>` editor view.
- `src/embed-processor.ts` — ` ```marimo ` code-block embeds.
- `src/settings.ts` — settings schema, defaults, and settings tab.
- Build: `esbuild.config.mjs` bundles `src/main.ts` → `main.js`.

## Commands

```bash
npm install
npm run dev     # esbuild watch
npm run build   # tsc type-check + production bundle
npm test        # Node built-in regression suite
npm run lint    # eslint (flat config, eslint-plugin-obsidianmd)
```

## Conventions

- Tabs for indentation (see `.editorconfig`).
- Language Policy: Project artifacts (specifications, plans, tasks, code) and Git commit messages MUST be written in English. Communication with the user MUST be written in Japanese.
- Keep all Node/Electron/Obsidian modules in the esbuild `external` list.
- Desktop-only APIs (`child_process`, `fs`, `<webview>`) are expected; do not
  add mobile support without replacing those.
- Always stop spawned marimo processes on `onunload`; on Windows kill the whole
  process tree.


<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/026-export-notebook-markdown/plan.md`
<!-- SPECKIT END -->
