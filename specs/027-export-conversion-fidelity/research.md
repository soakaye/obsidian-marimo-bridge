# Phase 0 Research: Conversion fidelity

Method: ran `marimo export html` (marimo 0.23.x in the vault `.venv`) on the
relevant `test/` notebooks and parsed the embedded `__MARIMO_MOUNT_CONFIG__` to
capture the **actual** output HTML for each construct. Findings below are
verbatim element shapes, not assumptions.

---

## Admonitions (`/// note|tip|warning|danger`)

**Decision**: Map from the **rendered `text/markdown` HTML**, not from cell source.

**Captured HTML**:
```html
<div class="admonition note">
<span class="admonition-title">Note</span>
<span class="paragraph">This is a note admonition.</span>
</div>
```
Class is always `admonition <type>` with a `admonition-title` span and one or more
`paragraph` spans. Types observed: note, tip, warning, danger — all are valid
Obsidian callout types.

**Rationale**: The rendered HTML is already cleanly structured AND has f-string
values resolved, so a rendered-HTML mapping is both simpler and strictly better
than re-extracting Markdown source in TS. This **supersedes the spec's FR-003
source-extraction idea** — source extraction is not implemented.

**Mapping**: `<div class="admonition T">` → `> [!T] <title>` then each body block
quoted with `> `. Title from `admonition-title`; if absent, use the type
capitalized.

**Alternatives considered**: source extraction (rejected — breaks f-string
interpolation, duplicates marimo's AST logic); leaving as-is (rejected — loses the
box).

---

## Collapsible details (`/// details | Title`)

**Decision**: Map from rendered HTML to a collapsed callout.

**Captured HTML**:
```html
<details>
<summary>Click to expand</summary>
<span class="paragraph">Hidden content revealed on click.</span>
</details>
```

**Mapping**: `<details><summary>T</summary>…` → `> [!note]- T` (the `-` makes the
callout start collapsed) with the body quoted with `> `.

**Alternative**: keep raw `<details>` HTML (Obsidian renders it) — acceptable
fallback, but the collapsed callout is more idiomatic and matches the admonition
treatment.

---

## Mermaid (`mo.mermaid(...)`)

**Decision**: Extract `data-diagram` and emit a ` ```mermaid ` fence.

**Captured HTML**:
```html
<marimo-mermaid data-diagram='"\n    graph LR\n        A[Edit .py file] --> B{...}..."'>
```
`data-diagram` is an HTML-entity-encoded **JSON string** (note `\n`, `>` for
`>`). Decode entities, then `JSON.parse` the value to get the raw diagram source.

**Mapping**: ` ```mermaid\n<source>\n``` `. Trim leading/trailing blank lines from
the decoded source.

**Note**: This mirrors the existing `convertMarimoTables()` pattern, which already
reads an entity-encoded JSON attribute (`data-data`) — reuse the same
`decodeTableData` + double-parse approach.

---

## Tabs (`mo.ui.tabs`)

**Decision**: Unwrap and render each tab as a heading + panel content.

**Captured HTML**:
```html
<marimo-ui-element ...><marimo-tabs data-tabs='[<labelHtml>,<labelHtml>,...]'
  data-orientation='"horizontal"'>
  <div data-kind='tab'><span class="paragraph">Content of the <strong>Overview</strong> tab.</span></div>
  <div data-kind='tab'>...</div>
</marimo-tabs></marimo-ui-element>
```
Labels live in `data-tabs` (entity-encoded JSON array of HTML label spans).
Panels are the `<div data-kind='tab'>` children in order.

**Mapping**: for each panel i → `#### <label_i text>` then the converted panel
content. Label text = strip tags from `data-tabs[i]`.

**Critical**: tabs are wrapped in `<marimo-ui-element>`, which `renderOutput()`
currently drops wholesale. Add a "rescue" branch (like the existing
`tableSource()` branch) that detects `<marimo-tabs>`/`<marimo-accordion>` inside a
widget and converts instead of dropping.

---

## Accordion (`mo.accordion`)

**Decision**: Render each section as a collapsed callout.

**Captured HTML**:
```html
<marimo-accordion data-labels='[<labelHtml>,...]' data-multiple='false'>
  <div><span class="paragraph">First collapsible section.</span></div>
  <div><span class="paragraph">Second collapsible section.</span></div>
</marimo-accordion>
```
Labels in `data-labels` (entity-encoded JSON array). Sections are the direct
`<div>` children in order. (Accordion is **not** wrapped in `marimo-ui-element`.)

**Mapping**: for each section i → `> [!note]- <label_i text>` with the converted
section content quoted with `> `.

---

## Stacks (`mo.hstack` / `mo.vstack`)

**Decision**: Render children as sequential Markdown blocks.

Stacks render as flex/column `<div>`s containing the children's markdown spans.
The existing paragraph/inline passes already extract the inner text; the main work
is ensuring children are separated by blank lines (block boundaries) rather than
concatenated. Markdown has no horizontal layout, so hstack and vstack both
linearize vertically.

---

## Audio / Video (`mo.audio` / `mo.video`)

**Decision**: Preserve as HTML5 media elements; link fallback.

**Captured HTML**:
```html
<audio src='https://…ogg' controls ...></audio>
<video src='https://…webm' controls style='width: 480px'></video>
```
These are already valid HTML Obsidian renders inline. The current converter
strips them via `stripTags`. Fix: in `convertInline` (or a dedicated pass),
preserve `<audio>`/`<video>` (and any `<source>` children) verbatim, or emit
`[audio](src)` / `[video](src)` as a fallback when no `src` is resolvable.

**Note**: external URLs are referenced, not downloaded (consistent with the
existing external-image rule).

---

## Interactive charts (`mo.ui.altair_chart` / `mo.ui.plotly`)

**Decision** (per Session 2026-06-28 clarification): Live-session rasterization to
a static image is **in scope** for this feature; the placeholder callout is the
guaranteed fallback.

Charts render as `<marimo-ui-element>` wrapping a Vega/Plotly element whose spec
is JSON. A static image cannot be produced inside the Node/DOM-free converter
(no JS chart runtime), so rasterization is done in the **live session**:
- **Primary (live path)**: in `editor-view.ts:exportLiveHtml`, rasterize the
  rendered chart DOM inside the webview (canvas → PNG, or SVG → PNG) and route the
  PNG through the existing `ImageSink` so it is saved as a vault attachment.
- **Fallback**: when no live session is available or rasterization fails, emit
  `> [!note] Interactive chart (Altair/Plotly) — not exported` so nothing is
  silently dropped (FR-007/FR-008). SC-005 is satisfied by either outcome.

**Rationale**: the converter stays dependency-free and DOM-free; the rasterization
that genuinely needs a DOM is confined to the live webview path, which already
executes JS for export. **Note**: this widens the plan's original scope (which had
deferred rasterization) — `plan.md` Summary/Structure reflect that the live-export
path is now also touched.

---

## Dispatch / ordering decisions

- New block converters (admonitions, details, mermaid, tabs, accordion, media)
  run inside `htmlToMarkdown()` in an order that handles container/custom elements
  **before** the generic paragraph/strip passes, mirroring how
  `convertMarimoTables` runs first today.
- `renderOutput()` gains a rescue branch: a `<marimo-ui-element>` containing
  `<marimo-tabs>`/`<marimo-accordion>`/`<marimo-table>` is converted, not dropped;
  a widget with none of these (pure UI input) is still dropped (FR per spec US/11).
- Charts: a `<marimo-ui-element>` recognized as a chart yields the placeholder
  rather than being dropped.

## Resolved unknowns

All Technical Context items are known; no NEEDS CLARIFICATION remain. Static-chart
rasterization is intentionally scoped out (placeholder floor), not unresolved.
