# Contract: Live Export & Chart Rasterization

Internal interfaces this feature changes. These are plugin-internal (no external
API); the "contract" is the shape passed across the webview ↔ host ↔ converter
boundaries.

## 1. Webview script result — `formatLiveExportScript(includeCode)`

Runs inside the marimo `<webview>`. Resolves to one of:

```jsonc
// success
{ "html": "<!doctype html>…",      // exported notebook HTML
  "charts": { "<object-id>": "data:image/png;base64,…" } }  // 0..N entries

// no live session / headers missing / fetch failed
null
```

Contract rules:
- Returns `null` (not a partial object) whenever `window.__marimoBridgeHeaders` is
  absent or `POST /api/export/html` is not `ok` → host falls back to CLI export.
- `charts` contains an entry only for charts whose capture succeeded. A chart that
  throws during capture is omitted (no entry), never a null/empty value.
- Keys are the `object-id` attribute of `<marimo-vega>` / `<marimo-plotly>` in the
  live DOM (light DOM or `shadowRoot`).
- Capture order does not matter; correlation is by key.

## 2. Host call — `MarimoEditorView.exportLiveHtml(includeCode)`

```ts
type LiveExportResult = { html: string; charts: Record<string, string> };
exportLiveHtml(includeCode: boolean): Promise<LiveExportResult | null>;
```

Contract rules:
- Resolves `null` when the webview is not ready or the script returns a non-object
  / missing `html` / throws.
- Validates `html` is a string; copies only string-valued `charts` entries
  (drops anything non-string defensively).

## 3. Converter — `renderOutput(output, sink, charts?)`

```ts
renderOutput(
  output: CellOutput,
  sink: ImageSink,
  charts?: Record<string, string>   // default {}
): string | null;
```

Contract rules (chart branch only; all other output handling unchanged):
- Detects a chart via `<marimo-vega>` (Altair) / `<marimo-plotly>` (Plotly) in any
  payload value (existing detection).
- Extracts `objectId` from the chart payload tag.
- If `charts[objectId]` is a non-empty string → returns the result of
  `sink.addDataUri(charts[objectId])` (an image token resolved to a vault PNG
  attachment downstream).
- Otherwise → returns `formatChartPlaceholder(kind)` (unchanged placeholder).
- Default empty `charts` ⇒ always placeholder ⇒ existing behavior and existing
  unit tests remain valid.

## 4. Pipeline reuse (unchanged)

Captured PNGs traverse the existing image path:
`sink.addDataUri` → `CollectingImageSink.pending` →
`vault.createBinary(dataUriToArrayBuffer(...))` →
`fileManager.generateMarkdownLink` (`src/notebook-export.ts:214-231`). No changes
to attachment naming/collision logic.
