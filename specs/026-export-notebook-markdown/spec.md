# Feature Specification: Export marimo notebook to static Obsidian Markdown

**Feature Branch**: `026-export-notebook-markdown`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Export marimo notebook execution results to a static Obsidian Markdown note. Use `marimo export html` and extract the embedded `__MARIMO_MOUNT_CONFIG__` JSON to obtain code and outputs (no headless browser or external static-HTML conversion tool). Two commands: one including code, one outputs-only. Add the same two operations to the `.py` right-click menu. Convert outputs to Markdown, save images per Obsidian attachment settings, ignore interactive UI widgets. Save next to the original notebook, open the result, clean up temp files."

## Clarifications

### Session 2026-06-27

- Q: When a Markdown file with the target name already exists at the export destination, what should happen? → A: Save under a non-colliding name (e.g. `notebook-1.md`); never overwrite an existing file.
- Q: Should console output (stdout/stderr) from cells be included in the exported Markdown? → A: No; console output is ignored. Only each cell's value output (Markdown/HTML/image/text) is exported.

### Session 2026-06-27 (2)

- Q: In the with-code export, how should Markdown cells (`mo.md(...)`) be rendered? → A: Markdown cells render as native Markdown only, with no `python` code fence, even in the with-code export (matches `marimo export md`); a cell is treated as a Markdown cell when its output is `text/markdown`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export a notebook with code and results to Markdown (Priority: P1)

A user editing a marimo `.py` notebook in Obsidian wants a static, shareable Markdown note that captures both the notebook's code and its most recent execution results, so they can read, link, and archive the notebook content without running marimo.

**Why this priority**: This is the core value of the feature — turning a live notebook into a durable Markdown artifact inside the vault. Without it, none of the other variations matter.

**Independent Test**: With a `.py` marimo notebook active, run "Export active marimo notebook to Markdown" and confirm a `notebook.md` appears in the same folder containing fenced `python` code blocks followed by each cell's rendered output, and that it opens automatically.

**Acceptance Scenarios**:

1. **Given** an active marimo `.py` notebook with executed cells, **When** the user runs the export-with-code command, **Then** a Markdown file named after the notebook is created in the same folder, containing each code cell as a `python` fenced block followed by its rendered output, and the new note opens in Obsidian.
2. **Given** a notebook whose cells produce Markdown output (e.g. `mo.md(...)`), **When** exported, **Then** that output appears as native Markdown (headings, bold, etc.), not as raw HTML.
3. **Given** the export completes successfully, **When** the user inspects the folder, **Then** no temporary HTML file from the export remains.
4. **Given** a file named `notebook.md` already exists next to `notebook.py`, **When** the user exports, **Then** the export is written to a new non-colliding name (e.g. `notebook-1.md`) and the existing file is left unchanged.

---

### User Story 2 - Export results only (no code) to Markdown (Priority: P2)

A user wants a clean, reader-facing Markdown note that shows only the execution results without the source code, suitable for notes or documentation where code is noise.

**Why this priority**: A common presentation need that reuses the same pipeline as P1 with a single switch; valuable but secondary to producing any export at all.

**Independent Test**: With a `.py` marimo notebook active, run "Export active marimo notebook outputs only to Markdown" and confirm the resulting `.md` contains the outputs but no `python` code blocks.

**Acceptance Scenarios**:

1. **Given** an active marimo `.py` notebook, **When** the user runs the outputs-only export command, **Then** the resulting Markdown contains each cell's rendered output but omits the source code blocks.
2. **Given** a cell whose value depends on an interactive widget, **When** exported, **Then** the derived output reflects the value captured at export time.

---

### User Story 3 - Trigger export from the file context menu (Priority: P3)

A user browsing the vault's file tree wants to export a `.py` notebook without first opening it, by right-clicking the file.

**Why this priority**: A convenience entry point that broadens access to the same two operations; not required for the feature to deliver value.

**Independent Test**: Right-click a `.py` file in the file explorer and confirm both export operations appear and produce the same result as the command palette.

**Acceptance Scenarios**:

1. **Given** a `.py` file shown in the file explorer, **When** the user right-clicks it, **Then** both "Export ... to Markdown" and "Export ... outputs only to Markdown" actions are offered.
2. **Given** the user selects a context-menu export action, **When** it runs, **Then** the outcome matches running the equivalent command from the command palette.

---

### Edge Cases

- **Active file is not a `.py` notebook**: The two export commands are unavailable/disabled, so the user cannot trigger an export against an unsupported file.
- **Interactive UI widgets** (e.g. `mo.ui.slider`): Their output has no meaningful static form and is omitted entirely, with no placeholder; surrounding content and any derived values remain.
- **Images in output**: Embedded raster images (data URIs, including those inside marimo mime bundles) are saved as attachments per the user's Obsidian attachment settings and embedded via a generated Markdown link; images referenced by external URL are kept as links rather than downloaded.
- **Export tool fails** (e.g. marimo errors, notebook raises): No existing `.md` is modified or overwritten, and any temporary file produced during the attempt is removed.
- **A Markdown note with the target name already exists**: The export is written under a non-colliding name (e.g. `notebook-1.md`, `notebook-2.md`); no existing file is ever overwritten.
- **Output type that is neither recognized rich content nor an image**: It is ignored or replaced with a brief "unsupported" note rather than breaking the export.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a command "Export active marimo notebook to Markdown" that exports the active `.py` notebook's code and execution results to a Markdown note.
- **FR-002**: The system MUST provide a command "Export active marimo notebook outputs only to Markdown" that exports only the execution results, omitting source code.
- **FR-003**: Both export commands MUST be available only when the active file is a marimo `.py` notebook.
- **FR-004**: The system MUST add both export operations to the right-click context menu of `.py` files in the file explorer, producing identical results to the command palette.
- **FR-005**: The system MUST obtain code and outputs by running marimo's HTML export and reading the execution data embedded in the exported HTML, without launching a browser to render the page or relying on any external static-HTML conversion tool.
- **FR-006**: The system MUST render each code cell (in the with-code export) as a fenced `python` code block, followed by that cell's output. EXCEPTION: a cell whose output is `text/markdown` (a Markdown cell, e.g. `mo.md(...)`) MUST be rendered as that native Markdown only, with no `python` code fence, in both export modes.
- **FR-007**: The system MUST convert Markdown and HTML outputs into native Obsidian Markdown.
- **FR-008**: The system MUST save embedded raster image outputs as attachments according to the user's Obsidian attachment-location settings and embed them using an Obsidian-generated Markdown link.
- **FR-009**: The system MUST keep externally-URL-referenced images as links without downloading them.
- **FR-010**: The system MUST omit interactive UI widget outputs entirely, with no placeholder text.
- **FR-011**: The system MUST write the Markdown note into the same folder as the source notebook, named after the notebook (`notebook.py` → `notebook.md`). If that name is already taken, the system MUST choose a non-colliding name (e.g. `notebook-1.md`) and MUST NOT overwrite any existing file.
- **FR-012**: On successful export, the system MUST open the generated Markdown note in Obsidian.
- **FR-013**: On successful export, the system MUST delete the temporary HTML file produced during export.
- **FR-014**: On a failed export, the system MUST leave any existing Markdown note unchanged and MUST delete any temporary files created during the attempt.
- **FR-015**: The system MUST NOT prompt the user with a selection dialog during export; the choice of including code is determined solely by which command/menu item was invoked.
- **FR-016**: The system MUST NOT introduce a watch/auto-export mode or new user-facing settings for this feature.
- **FR-017**: The system MUST reuse the existing marimo execution-environment resolution logic to locate and run the export.
- **FR-018**: The system MUST ignore cell console output (stdout/stderr); only each cell's value output (Markdown, HTML, image, plain text) is exported.

### Key Entities *(include if feature involves data)*

- **Notebook export request**: The user's intent to export a specific `.py` notebook, with a single attribute distinguishing "include code" from "outputs only".
- **Notebook session data**: The structured representation extracted from the exported HTML, consisting of an ordered list of cells, each with optional source code and zero or more outputs.
- **Cell output**: A single result of a cell, identified by content type (e.g. Markdown, HTML, image, plain text, interactive widget), determining how it is converted or whether it is ignored.
- **Exported Markdown note**: The resulting `.md` file in the vault plus any saved image attachments it references.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can export an active notebook to Markdown in a single action (one command or one menu click) with no intermediate prompts.
- **SC-002**: For a notebook containing Markdown, text, and image outputs, 100% of those output types appear correctly in the resulting note (Markdown rendered, text preserved, images embedded and viewable in the vault).
- **SC-003**: Interactive widget outputs produce zero leftover markup in the exported note.
- **SC-004**: After any export attempt (success or failure), zero temporary export files remain in the vault.
- **SC-005**: A failed export never alters or destroys a pre-existing Markdown note for that notebook.
- **SC-006**: The with-code and outputs-only exports differ only by the presence of source-code blocks; their outputs are otherwise identical for the same notebook state.

## Assumptions

- The marimo HTML export embeds per-cell code and rendered outputs as structured data in the exported HTML, which can be read directly without rendering the page (verified against the marimo version in use).
- The feature targets Obsidian desktop only, consistent with the plugin's existing desktop-only constraints (process execution, filesystem, webview).
- The existing marimo execution-environment resolution (interpreter/`uv`/path discovery) is available and is the single source of truth for how export commands are run.
- Image attachment placement follows the vault's existing Obsidian attachment settings; this feature adds no new configuration.
- On success, the exported note is written to `notebook.md`, or to the next non-colliding name (`notebook-1.md`, ...) when that path is taken; existing files are never overwritten, and bespoke output paths and merge/append behavior are out of scope.
- Watch mode, batch/multi-notebook export, and a selection modal are explicitly out of scope for the initial implementation.
