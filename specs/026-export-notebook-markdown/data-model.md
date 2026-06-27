# Phase 1 Data Model: Export marimo notebook to static Markdown

These are in-memory shapes parsed from `__MARIMO_MOUNT_CONFIG__` and the
internal types the exporter passes around. No persistent schema beyond the
emitted `.md` file and image attachments.

## ExportRequest

The user's intent, derived from which command/menu item was invoked.

| Field | Type | Notes |
|-------|------|-------|
| `notebookPath` | `string` | Vault-relative path to the active `.py` notebook |
| `includeCode` | `boolean` | `true` → with-code command; `false` → outputs-only (`--no-include-code`) |

Validation: `notebookPath` must resolve to an existing `.py` file inside the
vault (reuse `resolveVaultNotebook`).

## MarimoMountConfig (parsed)

Subset of `__MARIMO_MOUNT_CONFIG__` actually consumed.

| Field | Type | Notes |
|-------|------|-------|
| `notebook.cells[]` | `NotebookCell[]` | Source code per cell (index-aligned with session cells) |
| `session.cells[]` | `SessionCell[]` | Outputs per cell |

### NotebookCell

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | Empty when exported with `--no-include-code` |
| `code_hash` | `string` | Pairing key with `SessionCell` |

### SessionCell

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | marimo cell id |
| `code_hash` | `string` | Pairing key with `NotebookCell` |
| `console` | `unknown[]` | **Ignored** (FR-018) |
| `outputs` | `CellOutput[]` | Zero or more value outputs |

Pairing rule: zip `notebook.cells` and `session.cells` by array index; assert
agreement on `code_hash` when both present, else fall back to index order.

## CellOutput

| Field | Type | Notes |
|-------|------|-------|
| `type` | `string` | e.g. `"data"` |
| `data` | `Record<string, string> \| string` | mime → rendered string |

Recognized mime keys (see research R4):
`text/markdown`, `text/html`, `application/vnd.marimo+mimebundle`,
`image/png`, `text/plain`.

Classification (determines rendering / ignore):

- **markdown** — `text/markdown` present → HTML→Markdown.
- **html** — `text/html` present → HTML→Markdown (with image extraction).
- **imageBundle** — `application/vnd.marimo+mimebundle` whose inner object has
  `image/png` → attachment.
- **image** — direct `image/png` data URI → attachment.
- **text** — `text/plain` only → plain text.
- **math** — HTML contains `<marimo-tex>` → convert `||(...||)`/`||[...||]` to
  `$...$`/`$$...$$` (NOT a widget).
- **widget** — HTML contains `<marimo-ui-element>` (interactive `mo.ui.*`) →
  **ignored**. Detection is specifically `<marimo-ui-element>`, not any
  `<marimo-*>` (so `<marimo-tex>` is not dropped).
- **unsupported** — none of the above → ignored.

## RenderedImage

Produced when an output yields an embedded raster image.

| Field | Type | Notes |
|-------|------|-------|
| `dataUri` | `string` | `data:image/png;base64,...` |
| `mime` | `string` | `image/png` |
| `bytes` | `Uint8Array` | Decoded from base64 for `vault.createBinary` |
| `attachmentPath` | `string` | From `fileManager.getAvailablePathForAttachment(name, mdPath)` |
| `markdownLink` | `string` | From `fileManager.generateMarkdownLink(file, mdPath)` |

External (`http(s)://`) `<img>` sources are **not** RenderedImages; they remain
inline links in the converted Markdown.

## ExportResult

| Field | Type | Notes |
|-------|------|-------|
| `markdownPath` | `string` | Final vault path actually written (may be `notebook-1.md`, …) |
| `markdown` | `string` | Full note contents |
| `images` | `RenderedImage[]` | Attachments saved |

## ExportSource

How the HTML is obtained (see research R12). The converter is agnostic to which.

| Source | When | Values | Re-runs notebook? |
|--------|------|--------|-------------------|
| `live` | notebook open in a marimo editor | current widget values | No (serializes the running `session_view`) |
| `cli` | not open, or live export returned nothing | initial values | Yes (`marimo export html`) |

## State / flow

```text
ExportRequest
  → resolveVaultNotebook (must be a .py inside the vault)         [fail ⇒ notice, abort]
  → liveView = findOpenNotebookView(notebookPath)
  → html = liveView ? await liveView.exportLiveHtml(includeCode) : null   (source = live)
  → if html === null:
        if NOT liveView:                                          (notebook not open)
            proceed = await confirmExportWithoutLiveSession()     [cancel ⇒ abort, no .md]
        run `marimo export html` to temp .html (source = cli)     [non-zero ⇒ notice, abort]
        html = read temp .html text
  → extract+normalize+parse __MARIMO_MOUNT_CONFIG__               [null ⇒ notice, abort]
  → for each (NotebookCell, SessionCell):
        let isMarkdownCell = any output has `text/markdown`
        emit ```python fence``` ONLY if include-code AND code non-empty AND NOT isMarkdownCell
        for each CellOutput: classify → render (md/html/math) | save image | ignore (widget/console)
        (Markdown cells render as native Markdown only, no code fence — FR-006 exception)
  → choose non-colliding markdownPath
  → save image attachments (createBinary) + build links
  → vault.create(markdownPath, markdown)
  → cleanup temp .html  (finally, always — only created on the CLI path)
  → open markdownPath in Obsidian + success notice
```

Invariants:
- Existing files are never overwritten (FR-011).
- Temp `.html` never survives the operation (FR-013/FR-014); the live path
  creates no temp file at all.
- Console output and widgets never appear in the result (FR-010/FR-018); math is
  converted, not dropped (FR-010a).
- The not-open warning is always shown before a CLI export; cancelling writes
  nothing (FR-022).
