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
- **widget** — HTML contains `<marimo-ui-element>` / `<marimo-*>` → **ignored**.
- **unsupported** — none of the above → ignored or brief "unsupported" note.

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

## State / flow

```text
ExportRequest
  → resolve env (ServerManager.resolveCommand)
  → run `marimo export html` to temp .html        [fail ⇒ cleanup temp, abort, no .md]
  → read temp .html text
  → extract+normalize+parse __MARIMO_MOUNT_CONFIG__ [fail ⇒ cleanup temp, abort]
  → for each (NotebookCell, SessionCell):
        let isMarkdownCell = any output has `text/markdown`
        emit ```python fence``` ONLY if include-code AND code non-empty AND NOT isMarkdownCell
        for each CellOutput: classify → render | save image | ignore
        (Markdown cells render as native Markdown only, no code fence — FR-006 exception)
  → choose non-colliding markdownPath
  → save image attachments (createBinary) + build links
  → vault.create(markdownPath, markdown)            [fail ⇒ abort]
  → cleanup temp .html  (finally, always)
  → open markdownPath in Obsidian
```

Invariants:
- Existing files are never overwritten (FR-011).
- Temp `.html` never survives the operation (FR-013/FR-014).
- Console output and widgets never appear in the result (FR-010/FR-018).
