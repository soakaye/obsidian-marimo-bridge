# Feature Specification: Interactive Chart Image Export

**Feature Branch**: `028-interactive-chart-export`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Rasterize interactive Altair and Plotly charts to static PNG images when exporting a marimo notebook to Obsidian Markdown, captured from the live webview session, with the existing placeholder callout as the fallback when rasterization is unavailable"

## Context

The Markdown export feature converts a marimo notebook's cells and rendered
outputs into a static Obsidian note. Interactive charts produced by
`mo.ui.altair_chart(...)` and `mo.ui.plotly(...)` currently cannot be displayed
in the exported note: they have no static equivalent in the converted output, so
the export emits only a visible placeholder callout
(`> [!note] Interactive chart (Altair) — not exported`) so the chart's position
is never silently lost. The earlier conversion-fidelity work decided that
capturing a static image of these charts is the desired behavior but left it
unbuilt; this feature delivers that image capture so a reader of the exported
note sees the actual chart rather than a placeholder.

## Clarifications

### Session 2026-07-01

- Q: At what resolution should a captured chart image be produced? → A: Capture
  at the chart's on-screen size multiplied by the display's device pixel ratio
  (sharp on HiDPI/Retina displays, faithful to what the user sees).
- Q: When a chart cannot be reliably matched to its captured image by identifier,
  what should happen? → A: Fall back to the placeholder callout for that chart;
  never match by position/order, to avoid showing another chart's image.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the chart as an image in the exported note (Priority: P1)

A user has a notebook open in the marimo editor that contains an interactive
Altair (or Plotly) chart. They run the "export to Markdown" command. The
resulting note shows the chart as a static image embedded inline, reflecting the
chart exactly as it currently appears in the live session (including the user's
current interactions/selections).

**Why this priority**: This is the entire purpose of the feature — turning a lost
visualization into a viewable one. Without it, the export is materially
incomplete for any analytical notebook.

**Independent Test**: Open a notebook with an Altair chart in marimo, run the
export, and confirm the note embeds a static image of that chart (not the
placeholder) and that a corresponding image attachment is saved alongside the
note.

**Acceptance Scenarios**:

1. **Given** a notebook open in the marimo editor containing an
   `mo.ui.altair_chart` output, **When** the user exports to Markdown, **Then**
   the note embeds a static image of the rendered chart and the image is saved as
   a vault attachment linked from the note.
2. **Given** the same for an `mo.ui.plotly` output, **When** the user exports,
   **Then** the note embeds a static image of the Plotly chart.
3. **Given** a notebook containing both a chart and other outputs (text, tables,
   images), **When** the user exports, **Then** the chart image appears in the
   correct position relative to the other outputs and the other outputs are
   unaffected.

---

### User Story 2 - Graceful fallback when an image cannot be produced (Priority: P1)

When a static image of a chart cannot be produced — the notebook is not open in a
live session (export runs from a fresh process), the chart has not finished
rendering, or image capture fails — the export must still complete and clearly
mark where the chart was, exactly as today.

**Why this priority**: The export must never fail or silently drop a chart.
Preserving the existing placeholder as a guaranteed floor is as important as the
image itself, and it keeps the feature safe to ship.

**Independent Test**: Export a notebook that is not open in the marimo editor and
confirm the note still contains the placeholder callout for the chart and the
export otherwise succeeds.

**Acceptance Scenarios**:

1. **Given** a notebook that is NOT open in the marimo editor, **When** the user
   exports it to Markdown, **Then** the chart is represented by the placeholder
   callout and the export completes successfully.
2. **Given** a notebook open in a live session where chart image capture fails for
   one chart, **When** the user exports, **Then** that chart falls back to the
   placeholder while any other charts that captured successfully are embedded as
   images.

---

### Edge Cases

- A notebook containing multiple charts: each chart must map to its own image;
  images must not be swapped between charts or duplicated.
- A chart that renders as vector graphics rather than a pixel canvas: the export
  must still produce a non-blank image, or fall back to the placeholder.
- A cell whose chart output is empty or still loading at export time: falls back
  to the placeholder rather than embedding a blank image.
- The outputs-only (no code) export variant and the with-code variant must both
  embed chart images identically.
- Re-running the export must not overwrite the previously exported note or its
  attachments; new files use non-colliding names, consistent with existing
  export behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a notebook is exported while open in a live marimo session, the
  system MUST attempt to capture each interactive chart (Altair/Vega and Plotly)
  as a static raster image.
- **FR-002**: A successfully captured chart image MUST be saved as a vault
  attachment and embedded in the exported note at the chart output's position,
  using the same attachment-naming and linking behavior as other exported images.
- **FR-003**: Each chart MUST be matched to its own captured image using a stable
  per-chart identifier so that, when multiple charts exist, every chart embeds its
  corresponding image and none are swapped or duplicated. A chart that cannot be
  matched by identifier MUST fall back to the placeholder callout; the system MUST
  NOT match charts to images by position or order.
- **FR-004**: The captured image MUST reflect the chart as rendered in the live
  session at export time (i.e. current interactive state), not a re-rendered or
  default rendering.
- **FR-005**: When no live session is available (the notebook is not open in the
  marimo editor), the system MUST emit the existing placeholder callout for each
  chart and complete the export.
- **FR-006**: When image capture for a particular chart fails or yields no usable
  image, the system MUST fall back to the placeholder callout for that chart
  without aborting the export or affecting other outputs.
- **FR-007**: Chart image capture MUST NOT introduce any failure path that
  prevents the rest of the export from completing; a capture problem degrades only
  the affected chart.
- **FR-008**: Both export variants (with code and outputs-only) MUST embed chart
  images identically.
- **FR-009**: The feature MUST remain behind the existing experimental
  Markdown-export toggle and inherit its default-off state; no new always-on
  behavior is introduced for users who have not enabled export.
- **FR-010**: A captured chart image MUST be produced at the chart's on-screen
  size scaled by the display's device pixel ratio, so the embedded image is sharp
  on high-DPI displays and matches the chart as the user sees it.

### Key Entities *(include if feature involves data)*

- **Chart output**: An interactive chart in a cell's rendered output, identified
  by a stable identifier, that may be matched to a captured image.
- **Captured chart image**: A static raster image of a rendered chart, associated
  with its chart output's identifier, persisted as a vault attachment and embedded
  in the note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a notebook open in the live session containing one Altair chart,
  100% of exports embed a static image of that chart instead of the placeholder.
- **SC-002**: For a notebook open in the live session containing one Plotly chart,
  100% of exports embed a static image of that chart instead of the placeholder.
- **SC-003**: For a notebook with N charts, every chart in the exported note shows
  its own correct image (no swaps, no duplicates, no missing positions).
- **SC-004**: 100% of exports complete successfully (no abort, no silently dropped
  chart) regardless of whether image capture succeeds — failures degrade to the
  placeholder only.
- **SC-005**: When the notebook is not open in a live session, exports continue to
  show the placeholder callout for charts, identical to current behavior.

## Assumptions

- The live marimo editor session renders the chart in a form from which a static
  image can be captured at export time; this capture path is the only supported
  source of chart images (no separate headless re-rendering is introduced).
- Charts in the exported snapshot and in the live session can be correlated by a
  stable per-chart identifier; if correlation is not possible, the placeholder
  fallback applies.
- External assets referenced by a chart are handled consistently with the existing
  external-image rule (referenced, not downloaded), and the captured image is a
  self-contained raster.
- The experimental Markdown-export feature and its existing image-attachment
  pipeline are reused; this feature extends them rather than replacing them.
- Plotly is included alongside Altair because both are interactive charts handled
  by the same export path; the user's request named Altair, and Plotly is covered
  by the same mechanism.
