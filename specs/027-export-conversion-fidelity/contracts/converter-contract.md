# Contract: HTML→Markdown converter behavior

The plugin's only external surface here is the **exported Markdown**. This
contract pins the observable behavior of the converter functions in
`src/html-to-markdown.ts` so tests can assert against it. Signatures are stable;
new behavior is additive.

## `htmlToMarkdown(html: string, sink: ImageSink): string`

Converts a marimo-rendered HTML fragment to Obsidian Markdown. Pass order
(container/custom elements before generic passes):

1. `convertMarimoTables` (existing)
2. `convertAdmonitions` (new) → `> [!type]` callouts
3. `convertDetails` (new) → `> [!note]-` collapsed callouts
4. `convertMermaid` (new) → ` ```mermaid ` fences
5. `convertTabs` / `convertAccordion` (new) → headings / collapsed callouts
6. `convertMedia` (new) → preserved `<audio>`/`<video>` or link
7. existing tables/lists/headings/pre/paragraphs/inline passes
8. `collapseBlankLines` + trim (existing)

**Guarantees**:
- Output contains **no** raw `<marimo-*>` substring (SC-006, FR-010).
- Callout body lines are each prefixed with `> `.
- Mermaid fence contains the verbatim decoded diagram source.

## `renderOutput(output: CellOutput, sink: ImageSink): string | null`

Dispatch contract (additions in **bold**):

| Condition | Result |
|---|---|
| payload contains `<marimo-table>` | Markdown table (existing) |
| **payload contains `<marimo-tabs>`/`<marimo-accordion>`** | **converted, not dropped** |
| **payload recognized as Altair/Plotly chart** | **static image (stretch) or placeholder callout** |
| other `<marimo-ui-element>` (pure UI input) | `null` (dropped, existing) |
| `text/markdown` | `htmlToMarkdown(...)` (now incl. admonitions/details) |
| `image/png` | attachment via `sink` (existing) |
| `application/vnd.marimo+mimebundle` | `renderBundle` (existing) |
| `text/html` | `htmlToMarkdown(...)` (now incl. mermaid/media) |
| `text/plain` | trimmed text (existing) |
| empty/unknown | `null` |

**Guarantee**: no construct listed in spec FR-001–FR-007 returns `null` silently;
each yields a converted result or a visible placeholder (FR-008).

## Per-construct contract examples

| Input (abridged) | Output (abridged) |
|---|---|
| `<div class="admonition warning"><span class="admonition-title">Warning</span><span class="paragraph">Be careful.</span></div>` | `> [!warning] Warning`<br>`> Be careful.` |
| `<details><summary>More</summary><span class="paragraph">Hidden.</span></details>` | `> [!note]- More`<br>`> Hidden.` |
| `<marimo-mermaid data-diagram='"graph LR\n  A--&gt;B"'>` | ```` ```mermaid ````<br>`graph LR`<br>`  A-->B`<br>```` ``` ```` |
| `<marimo-tabs data-tabs='["…Overview…"]'><div data-kind='tab'>…body…</div></marimo-tabs>` | `#### Overview`<br>`…body…` |
| `<marimo-accordion data-labels='["…Section 1…"]'><div>…body…</div></marimo-accordion>` | `> [!note]- Section 1`<br>`> …body…` |
| `<audio src='https://x.ogg' controls></audio>` | `<audio src="https://x.ogg" controls></audio>` (or `[audio](https://x.ogg)`) |
| chart `<marimo-ui-element>` (no raster) | `> [!note] Interactive chart (Altair) — not exported` |

## Non-regression contract

All assertions currently passing in `tests/html-to-markdown.test.ts` and
`tests/notebook-export.test.ts` MUST keep passing unchanged (FR-009, SC-007).
