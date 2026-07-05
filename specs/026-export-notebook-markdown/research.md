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

- **Decision**: Detect `<marimo-ui-element>` and any `<marimo-*>` custom element
  in an output's HTML and **drop that output entirely** (no placeholder).
  Derived cells that referenced a widget's value still export normally, because
  their output captured the value at export time.
- **Rationale**: Confirmed a slider exports as
  `<marimo-ui-element><marimo-slider .../></marimo-ui-element>` — a custom
  element with no static rendering. Per clarification, no placeholder is wanted.
- **Alternatives considered**: Render initial value / placeholder text —
  rejected by user.

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
  testable, and avoids bundling/`external` concerns. DOM parsing uses the
  Electron-provided `DOMParser`/`document` available in the Obsidian renderer.
- **Alternatives considered**:
  - `turndown` — rejected: first runtime dependency, larger bundle, overkill for
    the tag subset.
  - Regex-only stripping — rejected: fragile for nested lists/tables.

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
- **Alternatives considered**: Overwrite / confirm modal — rejected by user /
  by FR-015 (no modal).

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
