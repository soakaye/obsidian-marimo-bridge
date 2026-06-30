# Quickstart: Validate Interactive Chart Image Export

End-to-end validation that interactive charts export as static images, with the
placeholder fallback intact.

## Prerequisites

- Obsidian Desktop with the `marimo-bridge` plugin built from this branch
  (`028-interactive-chart-export`).
- A vault-local Python env with marimo and the chart libs (Altair/Vega, Plotly,
  pandas) — the repo `test/` fixtures rely on these.
- The experimental Markdown-export toggle **enabled** in the plugin settings
  (default off).

## Build

```bash
npm install
npm run build        # tsc type-check + production bundle → main.js
npm test             # unit suite (must pass)
npm run lint
```

## Scenario A — Altair chart exports as an image (FR-001/002, SC-001)

1. Open `test/04_altair_chart.py` in the marimo editor view (live session).
2. Wait for the chart to render.
3. Run the "Export notebook to Markdown" command (with-code or outputs-only).
4. **Expected**: a new `.md` note opens containing a static image of the Altair
   chart (NOT the `> [!note] Interactive chart (Altair) — not exported`
   placeholder), and a PNG attachment is saved next to the note and linked from it.
5. Confirm the image is sharp on a HiDPI display (FR-010).

## Scenario B — Plotly chart exports as an image (SC-002)

1. Open `test/05_plotly_chart.py` in the marimo editor.
2. Export to Markdown.
3. **Expected**: the note embeds a static image of the Plotly chart + a PNG
   attachment.

## Scenario C — Placeholder fallback without a live session (FR-005, SC-005)

1. Ensure `test/04_altair_chart.py` is **not** open in the marimo editor.
2. Run the export command for that notebook; confirm the "export without live
   values" warning, then proceed.
3. **Expected**: the note contains the placeholder callout for the chart and the
   export completes successfully (CLI-fallback path, `charts = {}`).

## Scenario D — Multiple charts map correctly (FR-003, SC-003)

1. Use a notebook (or extend a fixture) with two different charts in separate
   cells, open in the live session.
2. Export.
3. **Expected**: each chart embeds its own correct image — no swap, no duplicate,
   each at the right position.

## Unit-test checks (Node, no DOM)

`npm test` must cover, in `tests/html-to-markdown.test.ts`:

- `renderOutput` with a `charts` map containing the payload's `object-id` →
  returns an image token (not the placeholder) and the sink received the PNG data
  URI — for both `<marimo-vega>` and `<marimo-plotly>`.
- `renderOutput` with a non-matching/empty `charts` map → returns the placeholder
  (existing US5 behavior preserved).

## Notes

- The rasterization JavaScript runs only inside the Electron `<webview>` and is not
  exercised by the Node unit suite; Scenarios A–D are the authoritative checks for
  it.
- If a chart shows the placeholder despite a live session, verify the
  `object-id` on the live `<marimo-vega>`/`<marimo-plotly>` element matches the one
  in the exported HTML payload (see research.md correlation risk).
