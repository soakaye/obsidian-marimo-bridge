# Internal Interface Contracts: Notebook Markdown Export

This feature exposes **no** network/public API. The "contracts" are the internal
module boundaries and the Obsidian command/menu surface the user interacts with.

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
- **No prompts**: invocation alone determines `includeCode` (FR-015).

## 2. `ServerManager.exportNotebookHtml` (new public method)

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
  `<img src="http(s)">` kept as a Markdown image link.
- `renderOutput` classifies by mime (see data-model) and returns Markdown, or
  `null` for widget/ignored/console-derived outputs.
- Guarantees: pure/synchronous; DOM access via the renderer-provided `DOMParser`
  is injected/abstracted so tests can run under Node.

## 5. `notebook-export.ts` (orchestration)

```ts
exportNotebookToMarkdown(
    plugin: MarimoBridgePlugin,
    notebookPath: string,
    includeCode: boolean,
): Promise<void>
```

- Orchestrates the flow in data-model.md: resolve → run export → parse → build
  markdown (collecting images) → choose non-colliding path → save attachments →
  `vault.create` → cleanup temp (finally) → open note → user `Notice` on
  success/failure.
- Image persistence uses:
  - `app.fileManager.getAvailablePathForAttachment(fileName, markdownPath)`
  - `app.vault.createBinary(attachmentPath, bytes)`
  - `app.fileManager.generateMarkdownLink(imageFile, markdownPath)`
- Contract: on any failure (export non-zero, parse null, write error) creates **no**
  `.md`, deletes the temp HTML, and surfaces a failure `Notice`.

## Acceptance mapping

| Contract | Spec requirement |
|----------|------------------|
| §1 commands + enablement | FR-001, FR-002, FR-003, FR-015 |
| §1 file menu | FR-004 |
| §2 export method | FR-005, FR-017 |
| §3 config extraction | FR-005 |
| §4 conversion | FR-006, FR-007, FR-008, FR-009, FR-010, FR-018 |
| §5 orchestration | FR-011, FR-012, FR-013, FR-014, FR-016 |
