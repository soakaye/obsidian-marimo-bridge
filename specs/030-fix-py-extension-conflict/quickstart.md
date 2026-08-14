# Quickstart Validation: Resilient `.py` Extension Takeover

**Feature**: `030-fix-py-extension-conflict` | **Date**: 2026-08-14

How to prove the feature works. See [contracts/startup-registration.md](./contracts/startup-registration.md)
for the guarantees being validated and [data-model.md](./data-model.md) for the
state transitions.

## Prerequisites

- Node.js 20+ and a completed `npm install` in the repository root.
- For the manual check: Obsidian Desktop 1.5.7+ and a local vault.

## 1. Automated validation

```bash
npm test
```

Expected: the whole suite passes, including the new `onload()` cases in
`tests/plugin-lifecycle.test.ts`:

| Case | Expected outcome |
|------|------------------|
| `registerExtensions` throws | `onload()` resolves; registrations 3–9 of C2 recorded; exactly one `NOTICE_PY_EXTENSION_CONFLICT`; one `console.warn` carrying the thrown error |
| `registerExtensions` succeeds | called once with `["py"]` and `VIEW_TYPE_MARIMO`; no conflict notice |
| takeover preference off | `registerExtensions` never called; no conflict notice |

Also expected to pass unchanged: `tests/constants-policy.test.ts` (new strings
live in `src/constants.ts`) and `tests/review-compliance.test.ts` (no
`eslint-disable-next-line` added to `src/main.ts`).

```bash
npm run build
```

Expected: `tsc -noEmit` reports no type errors and the production bundle is
written to `main.js`.

```bash
npm run lint
```

Expected: no errors. In particular no `eslint-plugin-obsidianmd` finding, since
the implementation touches no private Obsidian API.

## 2. Manual validation — conflicting environment

1. In a test vault, enable any other plugin that registers the `.py` extension
   as its own view (a code-runner style plugin), or temporarily add a second
   local plugin whose `onload()` calls `registerExtensions(["py"], …)`.
2. Ensure that plugin loads **before** marimo Bridge (it must win the claim).
3. Enable marimo Bridge with **Open .py files in marimo by default** turned on.

Expected:

- The marimo Bridge toggle stays **on**; no `Plugin failure: marimo-bridge`
  entry appears in the developer console.
- A notice appears once, explaining that another plugin handles `.py` and how to
  still open a notebook.
- The developer console shows the `[MarimoBridge]` conflict warning with the
  original error.
- Clicking a `.py` file opens the other plugin's view (it holds the claim), while
  right-click → **Open in marimo**, the command palette entries, the ribbon icon,
  and ` ```marimo ` embeds all work.

## 3. Manual validation — no regression

1. Disable the competing plugin and reload Obsidian.
2. Keep **Open .py files in marimo by default** on.

Expected: clicking a `.py` file opens the marimo editor, and **no** conflict
notice appears — identical to release 1.0.6.

Then turn the preference off and reload.

Expected: `.py` files no longer open in marimo, no conflict notice appears, and
the preference description states both that another plugin can take precedence
and that the change applies after a reload.

## Rollback

The change is confined to `src/main.ts`, `src/constants.ts`, and
`tests/plugin-lifecycle.test.ts`. Reverting the commit restores the previous
behavior with no data migration, because no persisted state is touched.
