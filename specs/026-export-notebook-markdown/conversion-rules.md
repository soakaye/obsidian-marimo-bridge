# marimo Notebook → Obsidian Markdown Conversion Rules

## Context

`marimo-bridge` already ships a notebook → Markdown export feature (feature 026):
`src/notebook-export.ts` (orchestration) and `src/html-to-markdown.ts` (HTML →
Markdown converter). The 13 notebooks under `test/` form a conversion test suite
that exercises one marimo display feature per file.

The current converter only handles the constrained tag subset marimo emits for
basic prose (headings, paragraphs, lists, `strong`/`em`/`code`, links, images,
tables, `marimo-tex`). Several constructs that **do** have an Obsidian-native
representation — callouts, mermaid, audio/video, tabs/accordion, interactive
charts — are currently dropped or flattened.

This document defines, per test file, how each marimo construct should map to
Obsidian Markdown. It is the acceptance baseline for implementation and
regression. It does not contain implementation; the "Recommended mapping" column
is the target behaviour.

### Principles
- Map constructs to **Obsidian-native** representations wherever one exists, even
  when there is no plain-Markdown equivalent.
- For genuinely interactive elements (Altair/Plotly/UI inputs), **aim for a static
  image** first, then fall back to a placeholder note.

---

## Current implementation (baseline)

| Area | Location | Current behaviour |
|---|---|---|
| HTML → MD | `src/html-to-markdown.ts` `htmlToMarkdown()` | headings / paragraphs / lists / inline / tables / marimo-table / marimo-tex |
| Output dispatch | `renderOutput()` (`html-to-markdown.ts:349`) | `<marimo-ui-element>` widgets dropped; payloads containing `<marimo-table>` are rendered as tables |
| Images | `convertImage()` + `CollectingImageSink` (`notebook-export.ts`) | data URI → attachment, http(s) → link |
| matplotlib | `renderBundle()` | `image/png` inside the marimo mimebundle → attachment |

**Structural premise (important):** marimo renders **only the last expression** of
a cell as that cell's output. In `test/07,09,10,13`, a `mo.md("## Heading")`
placed before an image/table in the same cell is never rendered and therefore
never reaches the converter. This is a property of the test notebooks, not the
converter (see "Known limitations").

Legend: ✅ implemented · ⚠️ partial · ❌ not handled (dropped/flattened)

---

## Export source: HTML vs ipynb (decision)

We evaluated whether exporting `.ipynb` (`marimo export ipynb --include-outputs`)
and converting that would be easier and more accurate than the current HTML
pipeline. We verified marimo's own implementation
(`marimo/_convert/ipynb/from_ir.py`).

**Decision: do not switch to ipynb.** Prose fidelity improves, but rich outputs
become *unrecoverable*. Two facts are decisive:

1. **marimo strips all of its own custom components when producing ipynb**
   (`from_ir.py:351-354`): for a `text/html` payload where
   `_is_marimo_component(content)` (contains `<marimo-`), the converter does
   `continue` and drops it. So `<marimo-table>` (DataFrames), mermaid, altair,
   plotly, tabs, accordion, UI inputs, audio/video **never appear in the ipynb**.
   The current HTML pipeline successfully renders `<marimo-table>` as a Markdown
   table, so ipynb would be a regression.
2. **f-string `mo.md` is not resolved.** ipynb emits `mo.md` cells as raw
   Markdown source cells (`new_markdown_cell` + `extract_markdown`), so
   `mo.md(f"…{slider.value}…")` (tests 01/11) keeps the literal `{slider.value}`.
   The HTML pipeline exports the resolved live value.

| Aspect | HTML (current) | ipynb |
|---|---|---|
| prose / admonition / math | △ parse rendered HTML | ◎ raw source |
| f-string `mo.md` | ◎ value resolved | ✗ unresolved |
| DataFrame table | ◎ Markdown table | ✗ stripped by marimo |
| mermaid / chart / tabs / media | △ recoverable | ✗ payload absent |
| structural simplicity | △ parse MOUNT_CONFIG | ◎ explicit cells |
| extra dependency | none | `nbformat` required |

### Adopted approach: hybrid (keep HTML, extract prose from source)
Keep **HTML** as the output source, and lift only the prose-fidelity win from
ipynb:
- The cell source is already available in `__MARIMO_MOUNT_CONFIG__`
  (`notebook.cells[].code`). For a Markdown cell whose code is a **non-f-string
  `mo.md(r"""…""")` literal**, convert from that **raw source** instead of the
  rendered HTML. This lets us map admonitions `/// note` and details
  `/// details` straight from source (cleaner than parsing the rendered
  `<div class="admonition">`).
- **f-string `mo.md` and all rich outputs keep using the rendered HTML** (so live
  values are resolved and `<marimo-table>` etc. are preserved).
- Dispatch: output is `text/markdown` AND code is a non-f-string `mo.md` string
  literal → source conversion; otherwise → existing `htmlToMarkdown()`.
- Reference: marimo extracts via `get_markdown_from_cell` → `extract_markdown`
  (AST-based). On the TS side, re-implement string-literal extraction of
  `mo.md(r?"""…""")` with a regex, excluding the `f` prefix.

This coexists with the "recover mermaid / tabs / accordion on the HTML side"
rules below (rich outputs from HTML, prose from source). The prose enhancement is
optional and is reflected in the 01_markdown.py row.

---

## Conversion rules (per test file)

### 01_markdown.py — Markdown basics / Admonitions / Details
| marimo construct | marimo output | Status | Recommended Obsidian mapping |
|---|---|---|---|
| bold / italic / inline code / link | `<strong>` `<em>` `<code>` `<a>` | ✅ | `**` `*` `` ` `` `[txt](url)` (keep) |
| bullet / ordered / nested list | `<ul>/<ol>/<li>` | ⚠️ | Preserve nesting depth (current output risks flattening) |
| `:rocket:` emoji | expanded to real emoji char | ✅ | keep |
| Admonition `/// note \| Note` | `<div class="admonition note"><p class="admonition-title">…` | ❌ | Prefer **source-based** conversion (see "hybrid" above): map `/// note \| Note` → callout `> [!note] Note`, body quoted with `> `. Map note/tip/warning/danger → `[!note]/[!tip]/[!warning]/[!danger]` |
| Details `/// details \| Title` | `<details><summary>Title</summary>…` | ❌ | Source-based: `/// details \| Title` → collapsible callout `> [!note]- Title` (the `-` collapses it). Fallback: keep raw `<details>` HTML |

### 02_latex_math.py — LaTeX / math
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| inline `$…$` | `<marimo-tex>…||(…||)…` | ✅ | `$…$` (keep) |
| block `$$…$$` / `pmatrix` | `<marimo-tex>…||[…||]…` | ✅ | `$$…$$` (Obsidian MathJax handles `\begin{pmatrix}`) |

No rule change needed. Add a test asserting matrix line breaks survive.

### 03_mermaid.py — Mermaid diagrams
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.mermaid("graph LR …")` | custom element (e.g. `<marimo-mermaid>`) carrying the diagram source | ❌ (stripped) | Extract the diagram source into a ` ```mermaid … ``` ` fence. Obsidian renders mermaid fences natively |

Impl note: capture the real element name/attribute holding the source from an
actual export HTML before implementing.

### 04_altair_chart.py / 05_plotly_chart.py — Interactive charts
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.ui.altair_chart(chart)` | `<marimo-ui-element>` wrapping a Vega-Lite spec (JSON) | ❌ (dropped) | **Aim for static image** (fallback ladder below) |
| `mo.ui.plotly(fig)` | `<marimo-ui-element>` wrapping a Plotly figure (JSON) | ❌ (dropped) | same |

Static-image fallback ladder (needs technical investigation):
1. Via the live session, rasterize the chart DOM inside the webview
   (canvas/SVG → PNG) and attach it.
2. Otherwise, attach the Vega/Plotly spec as JSON under `assets/` and link it.
3. Otherwise, emit a callout placeholder:
   `> [!note] Interactive chart (Altair/Plotly) — not exported`.

Treat option 1 as the goal and option 3 as the guaranteed floor.

### 06_matplotlib_plot.py — Static plot
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `fig` (last expression) | `image/png` inside the mimebundle | ✅ | data URI → Vault attachment (keep) |

### 07_dataframe.py — DataFrame viewer
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.ui.table(df)` | `<marimo-table data-data=…>` | ✅ | Preview rows → Markdown table (keep; note that only the first page is embedded, so large frames truncate) |
| `mo.ui.data_editor(df)` | `<marimo-ui-element>` (verify whether it contains `<marimo-table>`) | ⚠️/❌ | If it contains a `<marimo-table>`, render it; otherwise emit a static Markdown table, or at minimum a placeholder |

### 08_sql.py — SQL query
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.sql("SELECT …")` result | `<marimo-table>` | ✅ | Result → Markdown table (keep) |
| SQL query text | in cell code | ⚠️ | (optional enhancement) For `mo.sql` cells, emit the query in a ` ```sql ` fence instead of a Python fence for readability |

### 09_images.py — Images
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.image(src="https://…")` | `<img src="http…">` | ✅ | `![alt](url)` external link (keep) |
| `mo.image(src=PIL)` | data URI `<img>` | ✅ | Vault attachment + `![[…]]` (keep) |

### 10_media.py — Audio / video
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.audio(src=…)` | `<audio controls src=…>` | ❌ (stripped) | Keep raw `<audio controls src="…"></audio>` HTML (Obsidian renders HTML); fall back to a link `[audio](url)` |
| `mo.video(src=…)` | `<video controls src=…>` | ❌ | Keep raw `<video>`; fall back to a link |

### 11_ui_inputs.py — UI input elements
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.ui.slider/number/text/checkbox/dropdown/...` | `<marimo-ui-element>` | ✅ (dropped) | Keep dropping the input widgets themselves (optionally a static note `> [!note] UI: Slider (value=42)`). Meaningful content appears in derived markdown |
| derived `mo.md(f"…{slider.value}…")` | `text/markdown` (value already interpolated) | ✅ | keep (exports with the live value) |

### 12_layout.py — Layout (tabs / accordion / stacks)
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.ui.tabs({name: md})` | `<marimo-ui-element>` wrapping each tab's static content | ❌ (content lost with the widget) | Unwrap and render each tab as a `#### Tab name` heading followed by its content, in order |
| `mo.accordion({name: md})` | collapsible group | ❌ | Render each section as a collapsible callout `> [!note]- Section name` |
| `mo.hstack([...])` | flex row of divs | ⚠️ | Render children sequentially (vertically); Markdown has no horizontal layout, so join with paragraph breaks |
| `mo.vstack([...])` | column of divs | ⚠️ | Render children sequentially |

Impl note: tabs/accordion are "widgets, but the content is static", so
`renderOutput()` needs a "rescue the content" branch ahead of the blanket widget
drop — analogous to the existing `marimo-table` branch.

### 13_progress.py — Progress / status
| marimo construct | marimo output | Status | Recommended |
|---|---|---|---|
| `mo.status.progress_bar(...)` | progress bar (final state or empty) | ❌/empty | omit (optionally a placeholder); transient, low static value |
| `mo.status.spinner(...)` | transient spinner | ❌/empty | omit |
| `mo.md("Done :white_check_mark:")` | `text/markdown` | ✅ | keep |

---

## Known limitations
1. **Last expression only.** With multiple display expressions in one cell, only
   the last is rendered. The leading `mo.md("## …")` headings in `test/07,09,10,13`
   are not rendered. This is not a converter issue; splitting "heading cell" and
   "body cell" in the test notebooks is recommended (out of scope here, noted as
   guidance).
2. **Tables are first-page only.** marimo embeds only preview rows in `data-data`,
   so large DataFrames truncate.
3. **External media is not downloaded.** External image/audio/video URLs stay as
   link references and are not pulled into the Vault.

---

## Deliverable & next steps
- This document is the conversion-rules baseline. Reference its "Recommended"
  column as acceptance criteria (expected test outputs) during implementation.
- Add cross-links between `spec.md` / `plan.md` and this file.

## Validation (confirming the spec itself)
- Run `marimo export html` on the 13 test notebooks and capture the **actual HTML
  output (element names/attributes)** for each feature — especially mermaid,
  audio, video, tabs, accordion, altair, plotly — to confirm the "marimo output"
  column against real values.
- Reconcile any discrepancy by updating the rule tables before implementation.
