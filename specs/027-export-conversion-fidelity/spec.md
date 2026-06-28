# Feature Specification: Improve marimo → Obsidian Markdown conversion fidelity

**Feature Branch**: `027-export-conversion-fidelity`

**Created**: 2026-06-28

**Status**: Draft

**Conversion rules**: [../026-export-notebook-markdown/conversion-rules.md](../026-export-notebook-markdown/conversion-rules.md) — the per-feature mapping baseline this spec implements

**Input**: User description: "実装仕様作成" — turn the agreed conversion-rules baseline (feature 026) into an implementable specification for raising the fidelity of marimo notebook → Obsidian Markdown export.

## Context

Feature 026 shipped notebook → Markdown export. It converts the constrained tag
subset marimo emits for basic prose, plus images, DataFrame tables and LaTeX.
Several marimo constructs that **do** have an Obsidian-native representation are
currently dropped or flattened: admonitions / collapsible details, mermaid
diagrams, audio/video, layout containers (tabs / accordion / stacks), and
interactive charts. This feature closes those gaps so an exported note reads as a
faithful, native Obsidian document. The export source stays HTML (feature 026);
admonitions and details are mapped from the already-structured rendered output
(see FR-003), which keeps interpolated values intact.

## Clarifications

### Session 2026-06-28

- Q: Is interactive-chart (Altair/Plotly) static-image rasterization in scope for this feature? → A: Yes — attempt live-session webview rasterization to a static image in this feature, with the placeholder as the fallback.
- Q: Convert admonitions/details from rendered HTML or from cell source (FR-003)? → A: From the rendered HTML; the cell-source extraction path is dropped (rendered HTML is already structured and resolves f-string values).
- Q: Default representation for audio/video? → A: Preserve the HTML5 `<audio>`/`<video>` element verbatim; use a link fallback only when the source cannot be resolved.
- Q: How are pure interactive UI input widgets (slider/text/checkbox/dropdown, test 11) represented? → A: Omitted (dropped); their meaningful values already surface via derived Markdown cells.
- Q: How are progress bars and spinners (test 13) handled? → A: Out of scope — omitted; transient status has low static value.
- Q: How is the Markdown export feature surfaced given it is not a faithful reproduction of marimo's live rendering? → A: Gate the whole export feature behind an experimental settings toggle, off by default, grouped under an "Experimental" section whose description states it does not reproduce marimo's display.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admonitions and collapsible sections become Obsidian callouts (Priority: P1)

A user who wrote marimo Markdown using admonition blocks (`/// note | …`,
`/// tip`, `/// warning`, `/// danger`) and collapsible details
(`/// details | …`) exports the notebook and finds those blocks rendered as
native Obsidian callouts, including a collapsed callout for details — not flat
paragraphs that lost their boxes.

**Why this priority**: Admonitions and details are the most common
"structured prose" constructs and currently degrade to plain text, which is the
most visible loss in a typical knowledge-base notebook.

**Independent Test**: Export `test/01_markdown.py` and confirm each admonition
type maps to the matching `> [!type]` callout and the details block maps to a
collapsed `> [!note]-` callout, with body text preserved.

**Acceptance Scenarios**:

1. **Given** a Markdown cell containing `/// note | Note` … `///`, **When** the
   notebook is exported, **Then** the output contains a `> [!note] Note` callout
   whose body lines are quoted with `> `.
2. **Given** `/// warning`, `/// tip`, `/// danger` admonitions, **When**
   exported, **Then** each maps to `> [!warning]`, `> [!tip]`, `> [!danger]`
   respectively.
3. **Given** `/// details | Click to expand` … `///`, **When** exported, **Then**
   the output contains a collapsed callout `> [!note]- Click to expand` with the
   hidden content as its body.
4. **Given** a Markdown cell that interpolates a Python value
   (`mo.md(f"… {name} …")`), **When** exported, **Then** the interpolated value
   appears resolved (not the literal `{name}`), confirming the hybrid path does
   not regress value resolution.

---

### User Story 2 - Mermaid diagrams export as native diagrams (Priority: P1)

A user with `mo.mermaid(...)` cells exports the notebook and the diagrams appear
as Obsidian-rendered mermaid diagrams rather than disappearing.

**Why this priority**: Mermaid is fully supported natively by Obsidian, so the
loss is entirely avoidable and the gain is a faithful diagram with zero manual
fix-up.

**Independent Test**: Export `test/03_mermaid.py` and confirm each diagram source
appears inside a ` ```mermaid ` fenced block that Obsidian renders.

**Acceptance Scenarios**:

1. **Given** a `mo.mermaid("graph LR …")` output, **When** exported, **Then** the
   output contains a fenced block opening with ` ```mermaid ` and containing the
   original diagram source.
2. **Given** multiple mermaid cells (graph and sequence diagrams), **When**
   exported, **Then** each becomes its own mermaid fence in document order.

---

### User Story 3 - Layout containers keep their content (Priority: P2)

A user with `mo.ui.tabs`, `mo.accordion`, `mo.hstack`, and `mo.vstack` layouts
exports the notebook and the static content inside those containers is preserved
instead of vanishing with the surrounding widget.

**Why this priority**: Tabs and accordions are common for organizing notes; today
their inner Markdown is dropped along with the interactive wrapper, silently
losing real content.

**Independent Test**: Export `test/12_layout.py` and confirm tab and accordion
contents appear, and stack children render in order.

**Acceptance Scenarios**:

1. **Given** `mo.ui.tabs({"Overview": …, "Details": …})`, **When** exported,
   **Then** each tab renders as a heading (the tab name) followed by its content,
   in order.
2. **Given** `mo.accordion({"Section 1": …})`, **When** exported, **Then** each
   section renders as a collapsed callout `> [!note]- Section 1` with its content.
3. **Given** `mo.hstack([...])` / `mo.vstack([...])` of Markdown children, **When**
   exported, **Then** the children render as separate Markdown blocks in order.

---

### User Story 4 - Audio and video outputs are preserved (Priority: P2)

A user with `mo.audio(...)` and `mo.video(...)` cells exports the notebook and the
media remains playable or at least linked, rather than disappearing.

**Why this priority**: Media references carry real information; dropping them
leaves no trace that media existed.

**Independent Test**: Export `test/10_media.py` and confirm the audio and video
sources survive as playable embeds or links.

**Acceptance Scenarios**:

1. **Given** `mo.audio(src=URL)`, **When** exported, **Then** the output preserves
   the audio as a playable HTML5 `<audio>` element (or, as a fallback, a labeled
   link to the source URL).
2. **Given** `mo.video(src=URL)`, **When** exported, **Then** the output preserves
   the video as a playable HTML5 `<video>` element (or a labeled link fallback).

---

### User Story 5 - Interactive charts export as static images or a clear placeholder (Priority: P3)

A user with `mo.ui.altair_chart(...)` and `mo.ui.plotly(...)` cells exports the
notebook and gets a static image of each chart when one can be produced;
otherwise a clear placeholder marks where the interactive chart was, so the
export never silently swallows a chart.

**Why this priority**: Genuinely interactive charts have no native static
equivalent; a best-effort image is valuable but the guaranteed floor (a visible
placeholder) is what prevents silent data loss.

**Independent Test**: Export `test/04_altair_chart.py` and `test/05_plotly_chart.py`
and confirm each chart yields either an embedded static image attachment or a
visible placeholder callout.

**Acceptance Scenarios**:

1. **Given** a live session export of an Altair/Plotly chart and a successful
   rasterization, **When** exported, **Then** a static image attachment is
   embedded at the chart's position.
2. **Given** rasterization is not possible, **When** exported, **Then** a visible
   placeholder callout (e.g. `> [!note] Interactive chart (Altair) — not
   exported`) appears at the chart's position.

---

### Edge Cases

- A Markdown cell mixes an admonition with interpolated values
  (`mo.md(f"/// note … {x} …")`): value resolution MUST win, so such cells fall
  back to the rendered-HTML path rather than source extraction.
- A cell renders only its last expression: leading `mo.md("## Heading")` followed
  by another output in the same cell never reaches export (a property of the
  notebook, not the converter) — documented as a known limitation, not fixed here.
- Nested admonitions/details or admonitions containing lists/code: body content
  MUST remain quoted and readable even if nesting is flattened.
- A layout container nests another container or a rich output (e.g. a tab holding
  a table): inner rich outputs MUST still be rendered, not dropped.
- An audio/video source is a local/attachment path rather than a remote URL: it
  MUST still resolve to a working embed or link.
- A chart cell produces no rasterizable representation and no spec: the placeholder
  MUST still appear (never an empty gap).
- Unknown or future `<marimo-*>` elements: MUST degrade gracefully (placeholder or
  inner text) rather than emitting raw custom-element markup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The export MUST convert marimo admonition blocks
  (`note`/`tip`/`warning`/`danger`) into the corresponding Obsidian callout
  (`> [!note]` / `> [!tip]` / `> [!warning]` / `> [!danger]`) with body text
  quoted.
- **FR-002**: The export MUST convert collapsible details blocks into a collapsed
  Obsidian callout (`> [!note]- Title`).
- **FR-003**: The export MUST convert admonitions and collapsible details from the
  **rendered Markdown output** (which is already structured — `div.admonition`,
  `<details>` — and has interpolated f-string values resolved). A cell-source
  extraction path is explicitly NOT used.
- **FR-004**: The export MUST convert mermaid outputs into a native ` ```mermaid `
  fenced code block containing the original diagram source.
- **FR-005**: The export MUST preserve the static content of layout containers:
  tabs render as a heading per tab followed by its content; accordion sections
  render as collapsed callouts; horizontal/vertical stacks render their children
  as sequential Markdown blocks.
- **FR-006**: The export MUST preserve audio and video outputs as playable HTML5
  media elements, falling back to a labeled link to the source when an embed is
  not viable.
- **FR-007**: The export MUST attempt to render interactive charts (Altair,
  Plotly) as a static image attachment by rasterizing the chart in the live marimo
  session when one is available; when rasterization is not possible it MUST emit a
  visible placeholder marking the chart's position.
- **FR-008**: The export MUST NOT silently drop any of the constructs in
  FR-001–FR-007; every such construct MUST yield either a converted result or a
  visible placeholder.
- **FR-009**: The export MUST NOT regress existing behavior validated by feature
  026 (basic prose, lists, links, images, LaTeX, DataFrame/SQL tables, matplotlib
  images, value-resolved Markdown).
- **FR-010**: The export MUST NOT emit raw `<marimo-*>` custom-element markup in
  the final Markdown; unrecognized custom elements degrade to inner text or a
  placeholder.
- **FR-011**: All new string and numeric literals introduced MUST be externalized
  as constants per the project's Constant Externalization principle.
- **FR-012**: The conversion MUST remain dependency-free (no new runtime
  dependency) and unit-testable without a browser DOM, consistent with the
  existing converter.
- **FR-013**: Pure interactive UI input widgets (e.g. slider, number, text, text
  area, checkbox, switch, dropdown, radio, date) MUST be omitted from the export;
  their meaningful values surface through derived Markdown cells. This is distinct
  from FR-008, which forbids silently dropping only the FR-001–FR-007 constructs.
- **FR-014**: Transient progress bars and spinners are out of scope and MUST be
  omitted from the export.
- **FR-015**: The Markdown export feature (its commands and file-explorer
  context-menu items) MUST be gated behind an experimental settings toggle that is
  OFF by default. The toggle MUST live under an "Experimental" section of the
  settings tab whose description states that the export is a best-effort static
  conversion and does NOT faithfully reproduce marimo's live rendering. While the
  toggle is OFF, the export commands and context-menu items MUST NOT be exposed.

### Key Entities *(include if feature involves data)*

- **Notebook cell (source)**: per-cell code from the export payload; used to
  detect plain `mo.md` literals for source-based prose conversion.
- **Cell output**: a mime-typed rendered output (markdown/html/image/table/
  custom element); the unit the converter dispatches on.
- **Callout**: an Obsidian block (`> [!type]` / `> [!type]-`) representing an
  admonition, details block, accordion section, or chart placeholder.
- **Mermaid block**: a fenced ` ```mermaid ` block carrying a diagram's source.
- **Media element**: an audio/video embed (HTML5 element or link) representing a
  marimo media output.
- **Chart placeholder / image**: the static representation (attachment image or
  placeholder callout) standing in for an interactive chart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exporting `test/01_markdown.py` produces native callouts for 100% of
  its admonition and details blocks (4 admonition types + 1 details).
- **SC-002**: Exporting `test/03_mermaid.py` produces one native mermaid block per
  diagram, with 100% of diagram sources preserved verbatim.
- **SC-003**: Exporting `test/12_layout.py` preserves 100% of tab and accordion
  text content and renders all stack children, with zero content silently lost.
- **SC-004**: Exporting `test/10_media.py` yields a playable embed or labeled link
  for 100% of audio/video outputs.
- **SC-005**: Exporting `test/04_altair_chart.py` and `test/05_plotly_chart.py`
  yields either a static image or a visible placeholder for 100% of charts, with
  zero silent drops.
- **SC-006**: Across all 13 `test/` notebooks, the exported Markdown contains zero
  raw `<marimo-*>` custom-element strings.
- **SC-007**: The full existing regression suite continues to pass, and
  feature-026 outputs remain unchanged for the constructs it already handled.

## Assumptions

- Export source remains the marimo HTML export (feature 026); this feature adds
  conversion rules, not a new export pipeline. ipynb export was evaluated and
  rejected because marimo strips its own components and does not resolve f-string
  Markdown (see conversion-rules.md).
- Static-image rendering of interactive charts is in scope for this feature,
  implemented best-effort via live-session rasterization; it depends on an open
  live session, and the placeholder is the guaranteed fallback when no image can
  be produced.
- The "last expression only" behavior of marimo cells is out of scope; test
  notebooks that hide headings behind a later output are an authoring concern.
- Obsidian renders standard callouts, mermaid fences, and inline HTML5 media
  elements (default desktop Obsidian behavior).
- External media and external chart assets are referenced, not downloaded into the
  vault, consistent with feature 026's external-image handling.
- Because the conversion is best-effort and not a faithful reproduction of
  marimo's live rendering, the feature ships as experimental and OFF by default;
  users opt in via the "Experimental" settings toggle (FR-015).
