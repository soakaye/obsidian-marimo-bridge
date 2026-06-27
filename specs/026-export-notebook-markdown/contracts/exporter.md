# Internal Interface Contracts: Notebook Markdown Export

This feature exposes **no** new public network API. It *consumes* one existing
marimo server endpoint (`POST /api/export/html`) from inside the editor webview
for the live path. The remaining "contracts" are the internal module boundaries
and the Obsidian command/menu surface the user interacts with.

## 1. User-facing command contract

Two commands (Constitution VI: ids/names live in `src/constants.ts`):

| Command id | Command name | Behavior |
|------------|--------------|----------|
| `export-marimo-notebook-markdown` | `Export active marimo notebook to Markdown` | Export with code |
| `export-marimo-notebook-outputs-markdown` | `Export active marimo notebook outputs only to Markdown` | Export outputs only |

- **Enablement**: `checkCallback` returns true only when
  `app.workspace.getActiveFile()?.extension === "py"`.
- **File menu**: For a `.py` `TFile`, the `EVENT_FILE_MENU` handler adds two
  items with the same titles, invoking the same orchestrator with the file path.
- **No mode prompt**: invocation alone determines `includeCode` (FR-015). A
  safety confirmation (§6) may appear for the not-open case.

## 2. `ServerManager.exportNotebookHtml` (new public method — CLI fallback)

```ts
exportNotebookHtml(
    notebookAbsPath: string,
    includeCode: boolean,
    outHtmlPath: string,
): Promise<{ code: number | null; stdout: string; stderr: string }>
```

- Builds args: `[...prefixArgs, "export", "html", notebookAbsPath, "-o",
  outHtmlPath]` plus `"--no-include-code"` when `includeCode === false`.
- Uses `resolveCommand()` for `cmd`/`prefixArgs` and `runCapture()` to spawn with
  `cwd` = vault path.
- Contract: resolves with the captured result; **never throws** for non-zero
  exit (caller treats `code !== 0` as failure). Reuses existing timeout/error
  semantics of `runCapture`.

## 3. `marimo-mount-config.ts` (pure)

```ts
extractMountConfig(html: string): MarimoMountConfig | null
```

- Input: full text of an exported `.html`.
- Output: parsed config object, or `null` when the marker/object is absent or
  unparseable.
- Guarantees: normalizes JS-object-literal trailing commas before `JSON.parse`;
  is string-state aware during brace matching; does not use `eval`.

## 4. `html-to-markdown.ts` (pure)

```ts
htmlToMarkdown(html: string, ctx: ImageSink): string
renderOutput(output: CellOutput, ctx: ImageSink): string | null   // null ⇒ ignored
interface ImageSink { addDataUri(dataUri: string, mime: string): string } // returns placeholder/link token
```

- `htmlToMarkdown` converts the known marimo tag subset (see research R7);
  unknown tags unwrap to text; `<img src="data:">` routed through `ImageSink`;
  `<img src="http(s)">` kept as a Markdown image link; `<marimo-tex>` → Obsidian
  math `$...$`/`$$...$$` (R5a).
- `renderOutput` classifies by mime (see data-model) and returns Markdown, or
  `null` for outputs containing `<marimo-ui-element>` (widgets) and for
  empty/unsupported/console-derived outputs. `<marimo-tex>` math is NOT a widget.
- Guarantees: pure, synchronous, and **DOM-free** (regex/string transforms), so
  it runs identically under Node `node --test` and in the renderer.

## 5. `notebook-export.ts` (orchestration)

```ts
exportNotebookToMarkdown(
    plugin: MarimoBridgePlugin,
    notebookPath: string,
    includeCode: boolean,
): Promise<void>
```

- Orchestrates the flow in data-model.md: pick HTML source (live via
  `findOpenNotebookView(...)?.exportLiveHtml()`, else — after the not-open
  confirm — CLI) → parse → build markdown (collecting images) → choose
  non-colliding path → save attachments → `vault.create` → cleanup temp
  (finally) → open note → user `Notice` on success/failure.
- Image persistence uses:
  - `app.fileManager.getAvailablePathForAttachment(fileName, markdownPath)`
  - `app.vault.createBinary(attachmentPath, bytes)`
  - `app.fileManager.generateMarkdownLink(imageFile, markdownPath)`
- Contract: on any failure (CLI non-zero, parse null, write error) creates **no**
  `.md`, deletes any temp HTML, and surfaces a failure `Notice`. Cancelling the
  not-open confirm aborts silently with no note.

## 6. Live session export (consumed marimo endpoint + webview glue)

- `MarimoEditorView.exportLiveHtml(includeCode): Promise<string | null>` — runs a
  script in its `<webview>` that `POST`s to `/api/export/html` with body
  `{ download:false, files:[], includeCode, assetUrl:null }`, replaying the
  marimo client headers captured by the injection script
  (`window.__marimoBridgeHeaders`). Resolves the HTML text, or `null` when no
  session/headers are available. Never throws.
- `MarimoBridgePlugin.findOpenNotebookView(notebookPath): MarimoEditorView | null`
  — locates an open editor showing that notebook.
- Contract: the live HTML has the same `__MARIMO_MOUNT_CONFIG__` shape as the CLI
  output, so §3/§4 consume it unchanged; the difference is only that the
  `session.cells` outputs reflect current (live) widget values.

## 7. Not-open warning (confirm)

- `MarimoBridgePlugin.confirmExportWithoutLiveSession(): Promise<boolean>` — opens
  `ExportWarningModal` and resolves `true` (proceed → CLI fallback) or `false`
  (cancel → abort). Dismissing the modal resolves `false`.
- Exposed on the plugin so the orchestrator stays unit-testable with a stub.

## Acceptance mapping

| Contract | Spec requirement |
|----------|------------------|
| §1 commands + enablement | FR-001, FR-002, FR-003, FR-015 |
| §1 file menu | FR-004 |
| §2 CLI export method | FR-005, FR-017, FR-020 |
| §3 config extraction | FR-005 |
| §4 conversion | FR-006, FR-007, FR-008, FR-009, FR-010, FR-010a, FR-018 |
| §5 orchestration | FR-011, FR-012, FR-013, FR-014, FR-016, FR-021 |
| §6 live export | FR-005, FR-019 |
| §7 not-open warning | FR-022 |
