# Quickstart / Validation Guide: Notebook → Markdown Export

Validates the feature end-to-end. See [data-model.md](./data-model.md) and
[contracts/exporter.md](./contracts/exporter.md) for shapes and interfaces.

## Prerequisites

- Obsidian Desktop with this plugin built and enabled (`npm run dev` or `npm run build`).
- marimo resolvable by the existing logic (vault `.venv`, configured path, or PATH).
  For local CLI checks you can use `uvx marimo ...`.

## Automated checks

```bash
npm test        # runs tests/run-tests.mjs (esbuild bundle + node --test)
npm run build   # tsc -noEmit + production bundle
npm run lint    # eslint flat config (incl. eslint-plugin-obsidianmd)
```

Expected: all green. New tests cover config extraction, HTML→Markdown, image
extraction, widget/console ignoring, and `ServerManager.exportNotebookHtml` arg
construction (against fixtures captured from real `marimo export html`).

## Generating fixtures (one-time, for tests)

```bash
# basic: markdown + value cells
uvx marimo export html basic.py -o tests/fixtures/export-basic.html --no-include-code
# image: matplotlib figure (mimebundle) + mo.image
uvx --with matplotlib marimo export html image.py -o tests/fixtures/export-image.html --no-include-code
# widget: mo.ui.slider + a cell referencing its value
uvx marimo export html widget.py -o tests/fixtures/export-widget.html --no-include-code
```

## Manual validation scenarios

### Scenario A — Export with code (FR-001, FR-006, FR-012, FR-013)
1. Open/select a `.py` marimo notebook with executed cells.
2. Run command **"Export active marimo notebook to Markdown"**.
3. Expect: `notebook.md` appears in the same folder and opens; code cells render
   as ```python fences``` followed by their outputs; Markdown outputs render
   natively; no temp `.html` remains.

### Scenario B — Outputs only (FR-002)
1. Run **"Export active marimo notebook outputs only to Markdown"** on the same notebook.
2. Expect: outputs present, **no** `python` code fences.

### Scenario C — Images (FR-008, FR-009)
1. Use a notebook with a matplotlib figure and an `mo.image(url)`.
2. Export. Expect: the figure is saved as an attachment in the configured
   attachment location and embedded via a generated Markdown link and is visible
   in the note; the `mo.image(url)` remains an external link (not downloaded).

### Scenario D — Widgets & console ignored (FR-010, FR-018)
1. Use a notebook with `x = mo.ui.slider(1, 9); x`, a cell printing to stdout,
   and a cell `mo.md(f"value is {x.value}")`.
2. Export. Expect: no `<marimo-…>` markup anywhere; no stdout text; the derived
   `value is 1` line (export-time snapshot) is present.

### Scenario E — Never overwrite (FR-011)
1. Ensure `notebook.md` already exists next to `notebook.py`.
2. Export. Expect: a new `notebook-1.md` is created; the original `notebook.md`
   is byte-for-byte unchanged.

### Scenario F — Failure atomicity (FR-014, SC-005)
1. Make the notebook raise at import (or point marimo at a broken env).
2. Export. Expect: a failure `Notice`; no new/changed `.md`; no leftover temp `.html`.

### Scenario G — Enablement (FR-003)
1. Focus a non-`.py` file. Expect: both export commands are disabled/absent in the
   command palette; the file-menu items appear only on `.py` files.

## Success criteria cross-check

- SC-001 single action, no prompt → A/B.
- SC-002 md/text/image fidelity → A/C.
- SC-003 zero widget markup → D.
- SC-004 zero leftover temp files → A/F.
- SC-005 failure never destroys existing note → E/F.
- SC-006 with-code vs outputs-only differ only by code blocks → A vs B.
