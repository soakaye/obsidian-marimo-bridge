# Phase 0 Research: Export marimo notebook to static Markdown

All decisions below are grounded in empirical inspection of real
`marimo export html` output (marimo 0.23.11) performed during planning.

## R1. Source of execution results

- **Decision**: Run `marimo export html <nb.py> -o <temp.html>` and read the
  `window.__MARIMO_MOUNT_CONFIG__` object embedded in a `<script>` tag of the
  produced HTML. Do **not** render the page with a headless browser or any
  external static-HTML tool.
- **Rationale**: The exported HTML already embeds, as structured data, both the
  source (`notebook.cells[].code`) and the fully rendered outputs
  (`session.cells[].outputs[].data` keyed by mime type). No JS execution is
  needed to obtain results; reading the embedded object is deterministic, fast,
  and works in Obsidian's restricted Electron context (which the user confirmed
  cannot run the export's dynamic scripts).
- **Alternatives considered**:
  - `marimo export md` — rejected: cannot include execution outputs.
  - `marimo export ipynb --include-outputs` then convert — workable but adds an
    intermediate notebook format and its own output schema; the HTML path gives
    pre-rendered HTML/Markdown for free.
  - Headless browser / external static-HTML converter — rejected: heavy
    dependency, and for interactive widgets it produces no meaningful static
    output anyway (see R5).

## R2. Extracting and parsing `__MARIMO_MOUNT_CONFIG__`

- **Decision**: Locate `__MARIMO_MOUNT_CONFIG__`, then the following
  `Object.freeze(` and its opening `{`, and brace-match to the matching `}`
  while tracking string state (quotes/escapes). The captured substring is a
  **JS object literal**, not strict JSON (it contains trailing commas), so
  normalize trailing commas (`,}` → `}`, `,]` → `]`) before `JSON.parse`. Treat
  a missing/unparseable config as an export failure.
- **Rationale**: Verified that `JSON.parse` fails on the raw literal with
  "trailing comma"; brace-matching with string-awareness is robust against
  braces inside string values. Avoids `eval` for safety/lint.
- **Alternatives considered**: `eval('('+literal+')')` — rejected (unsafe, and
  the test harness/eslint discourage it). Greedy regex for the whole object —
  rejected (fails on nested braces / embedded HTML).

## R3. Cell model and code/output pairing

- **Decision**: Use `notebook.cells[]` for code (index-aligned with
  `session.cells[]` for outputs; also share `code_hash`). With-code export keeps
  `code`; outputs-only is produced by `--no-include-code`, where `code` is empty
  — so the include-code switch is driven purely by the CLI flag, and the
  renderer emits a `python` fence only when `code` is non-empty. **Exception
  (clarified 2026-06-27):** a Markdown cell — identified by a `text/markdown`
  output — renders as native Markdown only, with no `python` fence, in both
  modes (matches `marimo export md`).
- **Rationale**: Matches observed structure; lets one renderer serve both modes.
- **Alternatives considered**: Always export with code and strip code in
  outputs-only mode — rejected: redundant data and divergence from spec FR-002's
  intent; the flag is the single source of truth.

## R4. Output mime handling

Observed mime types and chosen handling:

| mime | Source example | Handling |
|------|----------------|----------|
| `text/markdown` | `mo.md(...)` | HTML→Markdown convert (value is rendered HTML) |
| `text/html` | plain value (`<pre>3</pre>`), tables | HTML→Markdown convert |
| `application/vnd.marimo+mimebundle` | matplotlib figure | parse inner JSON, take `image/png` data URI → attachment |
| `image/png` (direct) | image outputs | data URI → attachment |
| `text/plain` | fallback text | emit as text / code block |
| `<img src="data:...">` inside HTML | `mo.image(data)` | extract data URI → attachment |
| `<img src="http(s)://...">` inside HTML | `mo.image(url)` | keep as link, do not download |

- **Decision**: A single output renderer dispatches on mime, with image
  extraction applied both to `image/png`/mimebundle entries and to `<img>` tags
  with `data:` sources found during HTML conversion.
- **Rationale**: Mirrors the empirically observed shapes; keeps one code path.
- **Alternatives considered**: Handling only top-level `image/png` — rejected:
  misses matplotlib (mimebundle) and `mo.image` (`<img>`), the common cases.

## R5. Interactive UI widgets

- **Decision**: Treat an output as an interactive widget only when its HTML
  contains `<marimo-ui-element>`, and **drop that output entirely** (no
  placeholder). Do **not** key on the broader `<marimo-*>` prefix — marimo also
  emits non-interactive custom elements (e.g. `<marimo-tex>` for math) that DO
  have a static form and must be converted, not dropped. Derived cells that
  referenced a widget's value still export normally (their output captured the
  value of the exported session).
- **Rationale**: Confirmed a slider exports as
  `<marimo-ui-element><marimo-slider .../></marimo-ui-element>` (no static
  rendering). An earlier `<marimo-*>` check wrongly dropped `<marimo-tex>` math
  cells; narrowing to `<marimo-ui-element>` fixed it.
- **Alternatives considered**: Render initial value / placeholder text —
  rejected by user. Broad `<marimo-*>` match — rejected (drops math).

## R5a. Rendered LaTeX / math (`<marimo-tex>`)

- **Decision**: Convert `<marimo-tex>` to native Obsidian math. marimo encodes
  delimiters as `||(` / `||)` (inline) and `||[` / `||]` (block); map these to
  `$...$` and `$$...$$` respectively and unwrap the element.
- **Rationale**: Verified an output `mo.md("$e^{x.value}=...$")` exports as
  `<marimo-tex class="arithmatex">||(e^1 = 2.718||)</marimo-tex>`; the browser
  renders it via KaTeX. Mapping to `$...$` lets Obsidian's MathJax render it.
- **Alternatives considered**: Leave `||(...||)` as text — rejected (not valid
  Obsidian math). Strip math entirely — rejected (loses content).

## R6. Console output (stdout/stderr)

- **Decision**: Ignore `session.cells[].console` entirely.
- **Rationale**: Clarification 2026-06-27 — only value outputs are exported.
- **Alternatives considered**: Emit console as code blocks — rejected by user.

## R7. HTML→Markdown conversion strategy

- **Decision**: Implement a **small in-house converter** in `html-to-markdown.ts`
  covering the limited tag set marimo emits (headings `h1–h6`, `strong`/`b`,
  `em`/`i`, `code`, `pre`, `a`, `img`, `ul`/`ol`/`li`, `p`/`span`, `br`, basic
  `table`), with unknown tags unwrapped to their text content. Do **not** add
  `turndown` or any runtime dependency.
- **Rationale**: Constitution "keep dependencies minimal" + the project ships
  **zero** runtime dependencies today (only devDependencies). marimo's rendered
  output is a constrained, known subset, so a focused converter is small,
  testable, and avoids bundling/`external` concerns. The converter is
  **dependency-free and DOM-free** (ordered regex/string transforms), so it runs
  identically under Node `node --test` and in the Obsidian renderer.
- **Alternatives considered**:
  - `turndown` — rejected: first runtime dependency, larger bundle, overkill for
    the tag subset.
  - Browser `DOMParser` — rejected: not available under `node --test`, would
    force a DOM shim and split prod/test behavior.

## R8. Running the export subprocess

- **Decision**: Add `ServerManager.exportNotebookHtml(absPath, includeCode,
  outPath)` that reuses the private `resolveCommand()` and `runCapture()` to run
  `[...prefixArgs, "export", "html", absPath, "-o", outPath, ...(includeCode ? []
  : ["--no-include-code"])]` with `cwd` = vault path; resolve `{ code, stdout,
  stderr }`. Non-zero exit ⇒ failure.
- **Rationale**: `runCapture` already centralizes spawn/timeout/error capture and
  `resolveCommand` already encodes venv/PATH precedence (Constitution V). Keeps a
  single execution path.
- **Alternatives considered**: New ad-hoc `spawn` in the orchestrator — rejected:
  duplicates env-resolution and process handling.

## R9. Destination path and never-overwrite

- **Decision**: Target is `<same folder>/<notebook-basename>.md`; if it exists,
  append `-1`, `-2`, … until a free vault path is found (mirrors
  `createUntitledNotebook`'s collision loop). Write with `vault.create`.
- **Rationale**: Clarification 2026-06-27 — never overwrite; reuse the existing
  collision-avoidance idiom.
- **Alternatives considered**: Overwrite / confirm modal — rejected by user.

## R10. Failure atomicity and temp cleanup

- **Decision**: Write outputs only after successful export + parse. Build the
  full Markdown string and persist image attachments, then `vault.create` the
  `.md`. The temp HTML is created under the OS temp dir (or vault-adjacent) and
  deleted in a `finally` block on both success and failure. On failure, no `.md`
  is created/modified and any partial temp file is removed.
- **Rationale**: Satisfies FR-013/FR-014 and SC-004/SC-005.
- **Open consideration**: image attachments are written before the `.md`; if
  `.md` creation fails after attachments are written, attachments may remain.
  Acceptable for v1 (attachments are valid files in the configured location);
  noted for tasks as a possible enhancement (write markdown first / track and
  roll back). Not required by spec.

## R11. Command/menu enablement

- **Decision**: Both commands use `checkCallback` gating on
  `activeFile.extension === "py"` (mirrors `CMD_OPEN_ACTIVE_FILE`). File-menu
  items are added in the existing `EVENT_FILE_MENU` handler for `.py` `TFile`s.
- **Rationale**: Matches established patterns in `main.ts`.
- **Alternatives considered**: Always-enabled commands with runtime guard —
  rejected: worse UX, inconsistent with existing command.

## R12. HTML source — live session vs CLI fallback

- **Decision**: Prefer the **live running session** when the notebook is open in
  a marimo editor: run JS in that view's `<webview>` to `POST /api/export/html`,
  which serializes the running kernel's `session_view` (current widget values)
  **without re-executing**. Fall back to the CLI (`marimo export html`, R8) when
  the notebook is not open or the live export returns nothing. Both produce the
  same `__MARIMO_MOUNT_CONFIG__` HTML, so the converter is source-agnostic.
- **Rationale**: Verified in marimo's server code that
  `Exporter.export_as_html(session_view=...)` only serializes the given
  session_view, while the CLI path calls `run_app_until_completion()` to re-run
  the notebook fresh (initial values). Only the server endpoint reflects the
  user's live interactions. The webview already holds an authenticated session,
  so calling the endpoint from inside it avoids re-implementing auth/session.
- **Session identity**: the injection script wraps `window.fetch` to capture the
  marimo client's request headers (which carry `Marimo-Session-Id` plus server
  token / auth); the export script replays them. This relies only on the public
  header contract, not on minified frontend internals.
- **Alternatives considered**:
  - Reverse-engineer the session id from the minified bundle — rejected: fragile
    across marimo versions.
  - Host-side Electron `webRequest` header capture — rejected: more invasive than
    a self-contained webview script.
  - `marimo export html-wasm` — rejected: heavy, and not what the editor session
    represents.

## R13. Warning before the not-open CLI fallback

- **Decision**: When the notebook is **not** open in a marimo editor, show a
  confirmation modal (`export-warning-modal.ts`) before the CLI fallback,
  explaining that initial (not live) values will be used, with "Export with
  initial values" / "Cancel". Cancel aborts with no note. When the notebook IS
  open but the live export fails, fall back silently (no modal).
- **Rationale**: Clarification 2026-06-27 (4) — users expect "what I see is what
  I get"; silently exporting initial values surprised them. The modal is a safety
  confirmation, distinct from the forbidden *mode-selection* prompt (FR-015).
- **Testability**: the confirm is exposed as `plugin.confirmExportWithoutLiveSession()`
  so the orchestrator stays unit-testable with a stubbed result; the modal class
  is a thin UI shell.
- **Alternatives considered**: Toast-and-proceed / silent fallback / hard-abort —
  rejected by user in favor of proceed-or-cancel.
