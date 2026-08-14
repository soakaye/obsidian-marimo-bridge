# Contract: Plugin Start-up Registration

**Feature**: `030-fix-py-extension-conflict` | **Date**: 2026-08-14

The interface this plugin exposes to its host is what it registers with Obsidian
during `onload()`. This contract states what a host may rely on after start-up,
in both the granted and the rejected `.py` claim.

## C1 — `onload()` completion

```text
MarimoBridgePlugin.onload(): Promise<void>
```

| Condition | Guarantee |
|-----------|-----------|
| `.py` claim granted | Resolves. Plugin stays enabled. |
| `.py` claim rejected (any throwable) | Resolves. Plugin stays enabled. |
| Vault is not a local file-system vault | Resolves after an early return with the existing `NOTICE_LOCAL_VAULT_REQUIRED` notice. **Pre-existing behavior, unchanged.** |

`onload()` MUST NOT reject or throw for a `.py` extension conflict. A rejection
causes Obsidian to report `Plugin failure` and disable the plugin.

## C2 — Registrations performed

Performed unconditionally on every non-early-return start-up, in this order:

| # | Registration | Host-visible effect |
|---|--------------|---------------------|
| 1 | `registerView(VIEW_TYPE_MARIMO, …)` | marimo editor view type exists |
| 2 | `registerExtensions(["py"], VIEW_TYPE_MARIMO)` | **Optional.** Requested only when the takeover preference is on; may be rejected |
| 3 | `registerMarkdownCodeBlockProcessor("marimo", …)` | ` ```marimo ` embeds render |
| 4 | `addRibbonIcon(...)` | Ribbon opens the marimo home dashboard |
| 5 | `addCommand(...)` ×4 | Open home, open active file, create notebook, restart server |
| 6 | `workspace.on("file-menu", …)` ×2 | "Open in marimo", "Create new marimo notebook" |
| 7 | `addSettingTab(...)` | Plugin preferences |
| 8 | `registerDomEvent(window, "beforeunload"/"unload", …)` | Synchronous server shutdown (Constitution III) |
| 9 | `workspace.onLayoutReady(...)` | Orphan reconciliation and optional auto-start |

Rows 3–9 MUST be reached regardless of the outcome of row 2.

## C3 — Extension claim semantics

```text
private registerPyExtension(): void
```

| Input state | Output |
|-------------|--------|
| Extension free | `.py` is associated with `VIEW_TYPE_MARIMO`; no notice; no log |
| Extension owned by another component | No association; exactly one `Notice` with `NOTICE_PY_EXTENSION_CONFLICT`; one `console.warn(LOG_PY_EXTENSION_CONFLICT, error)` |

- The method MUST NOT throw.
- The method MUST NOT be called when the takeover preference is off.
- The caught value MUST be forwarded to the log unmodified.

## C4 — User-visible text

| Constant | Surface | Requirement |
|----------|---------|-------------|
| `NOTICE_PY_EXTENSION_CONFLICT` | Obsidian notice | States that another plugin handles `.py`, that the default-editor takeover was skipped, and names the remaining way to open a notebook |
| `LOG_PY_EXTENSION_CONFLICT` | Developer console | `[MarimoBridge]`-prefixed label, consistent with existing `LOG_*` constants |
| `SETTING_TAKEOVER_DESC` | Plugin preferences | States that another plugin claiming `.py` takes precedence, and (existing sentence) that a change applies after reloading |

All three MUST be defined in `src/constants.ts`; `tests/constants-policy.test.ts`
fails the build otherwise.

## C5 — Backward compatibility

- Settings schema, defaults, and persisted data are unchanged.
- With the extension free, observable behavior is identical to release 1.0.6.
- No public method signature of `MarimoBridgePlugin` changes;
  `registerPyExtension` is private and added, not replacing a public member.
