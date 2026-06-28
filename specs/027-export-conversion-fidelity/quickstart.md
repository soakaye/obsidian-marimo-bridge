# Quickstart: Validate conversion fidelity

End-to-end validation that the new conversion rules work. Uses the existing
`test/` notebooks as fixtures.

## Prerequisites

- Node (for the test suite) and the vault `.venv` with `marimo` installed
  (`/Users/soakaye/Documents/Obsidian Vault/.venv/bin/marimo`).
- Repo dependencies installed: `npm install`.

## 1. Unit + integration tests (primary gate)

```bash
npm test          # Node built-in suite (tests/run-tests.mjs)
npm run lint      # eslint, incl. eslint-plugin-obsidianmd
npm run build     # tsc type-check + production bundle
```

Expected: all green, including new per-construct assertions in
`tests/html-to-markdown.test.ts` and the "no raw `<marimo-*>`" check in
`tests/notebook-export.test.ts`.

## 2. Fixture-level conversion checks

For each construct, the unit tests assert the contract in
`contracts/converter-contract.md`. Minimum coverage:

- **Admonitions**: each of note/tip/warning/danger → matching `> [!type]` callout.
- **Details**: `<details>` → `> [!note]-` collapsed callout.
- **Mermaid**: `<marimo-mermaid data-diagram>` → ` ```mermaid ` fence with source.
- **Tabs**: `<marimo-tabs>` → `#### <label>` + content per tab.
- **Accordion**: `<marimo-accordion>` → `> [!note]- <label>` per section.
- **Media**: `<audio>`/`<video>` preserved (or link fallback).
- **Charts**: chart widget → static image or placeholder callout (never dropped).

New HTML fixtures derived from real captures live under `tests/fixtures/`.

## 3. Manual end-to-end in Obsidian (smoke)

1. `npm run dev` and load the plugin in the desktop vault.
2. Open a `test/` notebook (e.g. `test/01_markdown.py`, `test/03_mermaid.py`,
   `test/12_layout.py`) in the marimo editor, run it.
3. Run the command **"Export active marimo notebook to Markdown"**.
4. Open the produced `.md` next to the notebook and verify in Reading view:
   - admonitions/details render as callouts (details collapsed),
   - mermaid diagrams render,
   - tabs appear as headings+content, accordion as collapsed callouts,
   - audio/video are playable,
   - charts show an image or a visible placeholder.
5. Confirm no literal `<marimo-…>` text appears anywhere.

## 4. Regenerate reference HTML (optional)

To refresh captured shapes after a marimo upgrade:

```bash
.venv/bin/marimo export html test/03_mermaid.py -o /tmp/03.html
# inspect the __MARIMO_MOUNT_CONFIG__ outputs for element/attribute changes
```

If marimo's element names/attributes change, update the constants in
`src/constants.ts` and the fixtures, then re-run `npm test`.

## Success mapping

| Spec | Validated by |
|---|---|
| SC-001 admonitions/details | unit tests + step 3 (01_markdown) |
| SC-002 mermaid | unit tests + step 3 (03_mermaid) |
| SC-003 tabs/accordion/stacks | unit tests + step 3 (12_layout) |
| SC-004 audio/video | unit tests + step 3 (10_media) |
| SC-005 charts | unit tests + step 3 (04/05 charts) |
| SC-006 no raw `<marimo-*>` | `tests/notebook-export.test.ts` |
| SC-007 no regression | full `npm test` suite |
