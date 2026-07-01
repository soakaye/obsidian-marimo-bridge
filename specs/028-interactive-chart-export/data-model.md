# Phase 1 Data Model: Interactive Chart Image Export

This feature introduces no persisted schema; the "entities" are in-memory values
passed between the webview, the live-export call, and the converter.

## Entities

### Chart output

A chart in a cell's rendered output that may be matched to a captured image.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `objectId` | string | `object-id` attr on the `<marimo-ui-element>` wrapper (e.g. `bkHC-0`), NOT on the inner `<marimo-vega>`/`<marimo-plotly>` | Stable id shared by the exported HTML payload and the live editor DOM; correlation key. |
| `kind` | `"Altair" \| "Plotly"` | tag (`<marimo-vega>` → Altair, `<marimo-plotly>` → Plotly) | Drives placeholder text and capture technique. |

Identity: a chart output is identified by `objectId`. If `objectId` is absent or
not found in the captured map, the chart falls back to the placeholder (no
order-based matching).

### Captured chart image

A static raster image of a rendered chart.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `objectId` | string | live DOM `<marimo-ui-element>` wrapper `object-id` (via `el.closest`) | Map key linking back to the chart output. |
| `dataUri` | string | `canvas.toDataURL("image/png")` / `Plotly.toImage` / SVG→canvas | PNG data URI; consumed by `ImageSink.addDataUri`. |

Resolution: produced at on-screen size × `devicePixelRatio` (FR-010).

### LiveExportResult (webview → host)

The value `exportLiveHtml` resolves to (or `null` when no live session).

| Field | Type | Notes |
|-------|------|-------|
| `html` | string | Exported notebook HTML (the existing `/api/export/html` body). |
| `charts` | `Record<string, string>` | `objectId → pngDataUri`; empty when no charts captured. |

## Relationships & flow

```text
live webview DOM ──rasterize──▶ charts: { objectId → pngDataUri }
exported HTML ─────parse──────▶ chart output: { objectId, kind }

renderOutput(output, sink, charts):
  objectId = objectId(output payload)
  if charts[objectId] exists → sink.addDataUri(png) → image token → vault PNG attachment
  else                       → formatChartPlaceholder(kind)
```

## Validation rules (from requirements)

- A captured image is embedded only when its `objectId` matches a chart output's
  `objectId` (FR-003; no positional matching).
- Capture/lookup failure for one chart never affects other outputs or aborts the
  export (FR-006, FR-007).
- CLI-fallback export path uses `charts = {}` → every chart placeholder (FR-005).
- Both export variants (with-code / outputs-only) thread the same `charts` map
  (FR-008).

## State transitions

A chart output resolves to exactly one terminal state per export:

```text
chart output ──▶ [image embedded]      (objectId matched + capture succeeded)
            └──▶ [placeholder callout]  (no live session | capture failed | objectId unmatched)
```
