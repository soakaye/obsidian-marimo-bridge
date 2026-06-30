# Phase 0 Research: Interactive Chart Image Export

All spec-level unknowns were resolved during `/speckit-clarify` (image resolution
= on-screen size × devicePixelRatio; correlation = identifier-only with
placeholder fallback). This document records the technical decisions for the
implementation seams.

## Where rasterization must happen

**Decision**: Capture chart images inside the live marimo `<webview>` only, in the
existing `formatLiveExportScript` IIFE (`src/constants.ts`).

**Rationale**: The rendered chart (canvas/SVG) exists only in the live editor DOM.
The `POST /api/export/html` snapshot and the `marimo export html` CLI both emit the
chart as a Vega-Lite / Plotly **JSON spec** wrapped in `<marimo-ui-element>` →
`<marimo-vega>` / `<marimo-plotly>`; there is no rendered raster. The converter
(`src/html-to-markdown.ts`) is intentionally dependency-free and Node/DOM-free
(`node --test` runs it without a browser), so it cannot render charts. The webview
path already calls `executeJavaScript` for export, so confining DOM work there
keeps the converter clean.

**Alternatives considered**:
- Headless re-render of the spec in Node (e.g. vega bundle) — rejected: pulls a
  heavy runtime dependency, duplicates marimo's rendering, and diverges from the
  user's current interactive state (violates FR-004).
- Embedding the Vega/Plotly JSON spec as an asset + link — rejected earlier
  (027 fallback ladder, and out of scope here); a static image is the goal.

## Chart → image correlation

**Decision**: Key captured images by the chart element's `object-id` attribute.
The webview returns `{ objectId → pngDataUri }`. In `renderOutput`, extract the
`object-id` from the chart payload and look it up; on miss → placeholder.

**Rationale**: `<marimo-vega object-id='…'>` / `<marimo-plotly object-id='…'>`
carry a stable id present in BOTH the exported HTML payload (what the converter
sees) and the live editor DOM (what the webview rasterizes), so the two sides
correlate without relying on order. Per clarification, position/order matching is
explicitly disallowed (avoids showing the wrong chart's image). The existing
attribute-extraction style (`attr(tag, /…/i)` used for mermaid `data-diagram`,
tabs `data-tabs`) is reused for `object-id`.

**Risk / verification**: assumes the snapshot and live DOM assign the same
`object-id` per chart. Validated in the manual E2E (quickstart). If they ever
diverge, the safe behavior is already the placeholder (no silent wrong image).

## Per-type rasterization technique

**Decision**:
- **Vega (Altair)** — find a child `<canvas>` and call
  `canvas.toDataURL("image/png")` (vega-embed's default renderer is canvas, so this
  is synchronous and lossless). If only `<svg>` is present, serialize via
  `XMLSerializer`, load into an `Image`, draw onto an offscreen `<canvas>` sized to
  the SVG bounding box, then `toDataURL` (async).
- **Plotly** — prefer `window.Plotly.toImage(plotEl, { format: "png" })` (Plotly's
  supported export API; async, returns a PNG data URI). Fall back to a child
  `<canvas>` then `<svg>` snapshot if `Plotly` is unavailable.
- Look inside `element.shadowRoot` as well as light DOM, since marimo custom
  elements may render into a shadow root.

**Rationale**: Use each library's native, highest-fidelity path first; degrade
gracefully. Canvas `toDataURL` may throw `SecurityError` on a tainted canvas — wrap
every capture in try/catch so a failure simply omits that `object-id` from the map
(→ placeholder), satisfying FR-006/FR-007 (never abort the export).

## Resolution / scaling (from clarification)

**Decision**: Capture at the chart's on-screen size × `window.devicePixelRatio`.
For canvas charts, the rendered canvas is already backing-store sized at the
device pixel ratio, so `toDataURL` yields the high-DPI image directly. For the
SVG→canvas fallback, size the offscreen canvas to `boundingRect × devicePixelRatio`
and scale the draw so the rasterized output is sharp on HiDPI/Retina displays
(FR-010).

## Data-flow change (return shape)

**Decision**: Change `exportLiveHtml` from `Promise<string | null>` to
`Promise<LiveExportResult | null>` where
`LiveExportResult = { html: string; charts: Record<string, string> }`. The webview
script returns `{ html, charts }`; `exportLiveHtml` validates `html` is a string
and copies only string-valued chart entries. `exportNotebookToMarkdown` uses
`live.html`/`live.charts`; the CLI fallback path supplies `charts = {}` (→ all
charts placeholder, unchanged behavior). `buildMarkdown` and `renderOutput` gain a
`charts: Record<string,string>` parameter defaulting to `{}` so existing call
sites and unit tests stay valid (empty map → placeholder).

**Rationale**: An additive, defaulted parameter keeps the change backward
compatible and keeps the converter pure (it receives a plain map, not a DOM).
Captured PNGs reuse `ImageSink.addDataUri` → `CollectingImageSink.pending` →
`createBinary` + `generateMarkdownLink`, identical to inline `image/png` outputs
(`src/html-to-markdown.ts:610`, `src/notebook-export.ts:214-231`); no new
attachment logic needed.

## Constant externalization (Principle VI)

**Decision**: DOM selectors and attribute names used inside the webview script
remain inside the script string in `src/constants.ts` (already the pattern for
`formatLiveExportScript`). Any new TS-side literal in `src/html-to-markdown.ts`
(the `object-id` attribute regex, and the image MIME/format string if needed) MUST
be declared as exported constants in `src/constants.ts` and imported, consistent
with the existing `TAG_MARIMO_VEGA` / `CHART_KIND_*` constants.

## Resolved unknowns

No `NEEDS CLARIFICATION` remain. Resolution and correlation-failure behavior are
fixed by the Session 2026-07-01 clarifications; rasterization technique and data
flow are decided above.
