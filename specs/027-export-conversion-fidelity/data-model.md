# Phase 1 Data Model: Conversion fidelity

This feature adds conversion rules to an existing converter; it introduces no
persisted data. The "model" is the in-memory shapes the converter reads and the
Markdown constructs it emits.

## Input shapes (already defined in `src/marimo-mount-config.ts`)

- **NotebookCell** `{ code: string }` — per-cell source. Read for the optional
  code fence only; not used for prose extraction (see research.md).
- **CellOutput** `{ data?: Record<string,string> | string }` — mime→HTML map.
  Dispatched by `renderOutput()`.
- **SessionCell** `{ outputs?: CellOutput[] }`.

No changes to these interfaces are required.

## Recognized marimo output elements (input vocabulary)

| Element / marker | Where | Carried data | Becomes |
|---|---|---|---|
| `<div class="admonition T">` | `text/markdown` HTML | title span + paragraph spans | Obsidian callout `> [!T]` |
| `<details><summary>` | `text/markdown` HTML | summary + body | collapsed callout `> [!note]-` |
| `<marimo-mermaid data-diagram>` | `text/html` | entity-encoded JSON diagram source | ` ```mermaid ` fence |
| `<marimo-tabs data-tabs>` + `<div data-kind='tab'>` | inside `<marimo-ui-element>` | label array + panel divs | `#### label` + content per tab |
| `<marimo-accordion data-labels>` + `<div>` | `text/html` | label array + section divs | `> [!note]- label` per section |
| `<div>` stack children (hstack/vstack) | `text/html` | child markdown spans | sequential blocks |
| `<audio src>` / `<video src>` | `text/html` | media src (+ attrs) | preserved HTML5 element / link |
| chart `<marimo-ui-element>` (Vega/Plotly) | `text/html` | spec JSON | static image (stretch) / placeholder callout |

## Output constructs (emitted vocabulary)

- **Callout** — `> [!type]` (open) or `> [!type]-` (collapsed). Body lines each
  prefixed `> `. Types: note/tip/warning/danger.
- **Mermaid block** — fence opened with ` ```mermaid `, diagram source, closing
  fence.
- **Heading** — `#### ` for tab labels (reuses `formatHeadingPrefix`).
- **Media element** — verbatim `<audio>`/`<video>` (or `[label](src)` fallback).
- **Chart placeholder** — a `> [!note]` callout with fixed text.

## New constants (to add in `src/constants.ts`, per constitution VI)

Representative (not exhaustive) — exact names decided in tasks/implementation:

- Tag/marker strings: `TAG_MARIMO_MERMAID`, `TAG_MARIMO_TABS`,
  `TAG_MARIMO_ACCORDION`, `TAG_AUDIO`, `TAG_VIDEO`, `CLASS_ADMONITION`,
  `CLASS_ADMONITION_TITLE`, `TAG_DETAILS`, `TAG_SUMMARY`, `ATTR_DATA_DIAGRAM`,
  `ATTR_DATA_TABS`, `ATTR_DATA_LABELS`, `ATTR_DATA_KIND_TAB`.
- Output tokens: `MD_CALLOUT_PREFIX` (`> [!`), `MD_CALLOUT_OPEN_SUFFIX` (`] `),
  `MD_CALLOUT_COLLAPSE` (`-`), `MD_QUOTE_PREFIX` (`> `), `MD_LANG_MERMAID`
  (`mermaid`), and the admonition-type→callout-type map.
- Helper formatters: `formatCallout(type, title, collapsed)`,
  `formatMermaidBlock(source)`, `formatChartPlaceholder(kind)`.

## Validation rules

- Admonition type not in {note,tip,warning,danger} → default to `note`.
- Missing tab/accordion label → empty heading text / `note` title placeholder.
- Mermaid `data-diagram` unparrseable → omit fence, fall back to placeholder text
  (never emit raw `<marimo-mermaid>`).
- Media with no resolvable `src` → drop element but keep a link/placeholder; never
  emit raw broken HTML.
- Any unrecognized `<marimo-*>` → inner text or placeholder; never raw markup
  (FR-010, SC-006).
