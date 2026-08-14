# Quickstart Validation: Searchable Plugin Settings

**Feature**: `031-declarative-settings-api` | **Date**: 2026-08-14

How to prove the feature works. See
[contracts/settings-presentation.md](./contracts/settings-presentation.md) for
the guarantees being validated and [data-model.md](./data-model.md) for the
invariants.

## Prerequisites

- Node.js 20+ and a completed `npm install` at the repository root.
- For manual checks: **two** Obsidian Desktop installs — one at 1.13.0+ (for the
  search behavior) and, ideally, one below 1.13.0 (for the legacy path). The
  second is what the clarification decision protects, so if it is unavailable,
  say so rather than reporting the legacy path as verified.

## 1. Automated validation

```bash
npm test
```

Expected — new cases in `tests/settings.test.ts`:

| Case | Expected outcome |
|------|------------------|
| Structure | 13 rows in the documented order; each row's kind matches C1 |
| Key coverage (INV-2) | Every key in `DEFAULT_SETTINGS` bound by exactly one control; no key bound twice |
| Parity (FR-005b, INV-3) | Ordered names from `display()` (heading row dropped) equal the ordered declarative names |
| Defaults (FR-011a) | No control declares its own `defaultValue` |
| Trim on write (FR-009) | `setControlValue` stores each of the three path keys **and `apiToken`** trimmed; only the path keys re-run the installation check |
| Save path (FR-006, INV-4) | `setControlValue` invokes the plugin's `saveSettings()` |
| Numeric accept | `validate` returns void for an in-range value |
| Numeric reject (FR-008) | `validate` returns a non-empty message out of range. That a rejected value never reaches storage (INV-5) is ordering the host guarantees (contracts C3), so it is confirmed in section 2, not here |

Expected to keep passing unchanged: the two existing `display()`-based tests
(`renders uv command path between Python path and install status`, `trims and
saves uvPath from the settings tab`) — they are the legacy path's guard.

```bash
npm run build
```

Expected: `tsc -noEmit` clean. This is the step that proves the definitions
actually satisfy Obsidian's discriminated unions — a wrong `type`/`control`
combination fails here, which is why it is not optional.

```bash
npm run lint
```

Expected: no errors, including `tests/constants-policy.test.ts`'s sibling
concern — note that the *constants policy* itself is enforced by `npm test`, and
will fail if any control kind or settings key was inlined instead of being
declared in `src/constants.ts` (research.md R7).

## 2. Manual validation — settings search (Obsidian 1.13+)

1. Install the built plugin into a test vault and enable it.
2. Open Settings and use the global search box.
3. Search a distinctive word from each option's name — e.g. `port`, `token`,
   `timeout`, `embed`, `uv`.

Expected:

- Each search lists the matching marimo Bridge option (SC-001).
- Searching a word that appears only in a description (e.g. `loopback`-style
  wording from the token description) still surfaces the option (FR-002).
- Selecting a result opens that option ready to edit, without first locating and
  opening the plugin's settings tab (SC-002).
- Opening the plugin's settings tab directly shows all 13 options in the same
  order and with the same labels as release 1.0.7 (FR-005).

Then exercise behavior:

- Set **Port** to `70000` → rejected with an inline message; reopen the tab and
  confirm the previous port is still stored (FR-008).
- Set **Startup timeout** to `0` → rejected the same way.
- Type a path with trailing spaces into **Python interpreter path** → the stored
  value is trimmed and the **marimo installation** row re-checks itself (FR-009).
- With marimo absent, use the install button on the **marimo installation** row →
  the status refreshes on completion without reopening the tab (FR-007).
- Paste an **API token** with a trailing space → the stored value is trimmed, and
  opening a notebook restarts the server, proving `saveSettings()` still ran
  `invalidateAvailability()` (FR-006, FR-009).
- Close and reopen the settings tab several times in one session → no row is
  duplicated and no background check is left running (spec.md Edge Cases,
  FR-010).
- Quit Obsidian, hand-edit `data.json` to `"port": 70000`, then reopen the
  settings → the out-of-range message appears on mount **and `data.json` still
  reads `70000`**, i.e. the invalid value is surfaced, not silently rewritten
  (spec.md Edge Cases, research.md R5).

## 3. Manual validation — legacy host (Obsidian < 1.13)

1. Install the same build into a vault on a pre-1.13 Obsidian.
2. Open the plugin's settings tab.

Expected:

- All 13 options render and are editable, identical to release 1.0.7 (FR-003,
  SC-005).
- Each option appears exactly once — no duplication from the two presentations
  (FR-004).
- Edits persist and take effect as before.

If a pre-1.13 host is not available, report this step as **not performed**; the
automated parity test covers list drift but not rendering on that host.

## Rollback

The change is additive and confined to `src/settings.ts`, `src/constants.ts`,
and `tests/settings.test.ts`. Reverting the commit restores the previous
behavior with no data migration — no persisted state is touched (FR-011, INV-1).
