# Research: Fix Marimo Home Links

This document outlines the investigation and engineering choices made for resolving the issue where links inside the Marimo Home dashboard open in the default external system browser.

## Findings & Issue Root Cause

### 1. Injected Click Listener Behavior
The injected script in `src/editor-view.ts` overrides `window.open` and listens for `click` events to capture notebook link navigation.
However, the click event listener had a strict filter:
```javascript
if (targetAttr === "_blank" && href) { ... }
```
Only links explicitly targeting `_blank` were intercepted.

### 2. Marimo Dashboard Targets
When clicking a notebook from the Marimo Home dashboard (under Recent, Running, or the File Browser), Marimo uses specific iframe target names (e.g. `s_d71rnw-03_docs%5C...`).
Since this target string is not exactly `_blank`, the injected click listener ignored it.

### 3. Fallback to System Browser
Because the click event was not prevented, it fell back to the Electron webview's default behavior. Under Electron, when `allowpopups` is enabled and a link targets an unknown window/iframe name, it attempts to open it in a new window, which often delegates to the system's default browser or fails to route back into Obsidian's layout.

---

## Decisions & Rationale

### Intercepting New Window Targets
* **Decision**: Refine the click listener in the injected script to intercept any link where `target` represents a new window (i.e. not `_self`, `_parent`, or `_top`).
* **Rationale**: This is a robust approach that catches all link click attempts that would otherwise trigger popup window creation or external page navigation, while leaving normal iframe/in-page navigations untouched.
* **Implementation**:
  ```javascript
  const isNewWindowTarget = targetAttr && !["_self", "_parent", "_top"].includes(targetAttr.toLowerCase());
  ```

### Alternatives Considered

#### Using Electron's `setWindowOpenHandler`
* **Why rejected**: Standard Electron APIs on `webContents` are not directly exposed or fully configurable inside Obsidian's plugin environment for `<webview>` tags without executing deep node/electron context queries, which are prone to API breakages across Obsidian versions. Injecting a lightweight script directly into the webview DOM is standard and cross-platform safe.
