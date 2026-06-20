# Phase 0 Research: Intercepting Webview Navigations

## Decision
We choose to register `will-navigate` and `new-window` listeners directly on the Electron `<webview>` DOM element created by `createMarimoWebview`. We will parse target URLs using standard Web APIs (`URL`) and handle them based on hostname and query parameters. We determine tab focus options using Chromium's `disposition` property provided by the `new-window` event.

## Rationale
- `<webview>` runs as a separate guest process. Keydown events do not bubble up to the host window when focused inside the webview.
- Using Chromium's `disposition` field (`background-tab` vs `foreground-tab`) allows us to determine key modifiers (Ctrl/Cmd) and click types (middle-click) without needing complex IPC bridge communication, preload scripts, or global key state tracking.
- Intercepting events at the `<webview>` boundary using `event.preventDefault()` avoids guest-side page changes or blank popups.

## Alternatives Considered
- **Preload Script with IPC**: We could inject a script to catch click events and inspect `e.ctrlKey`/`e.metaKey`. While robust, this requires creating a separate preload JS bundle/file and configuring partition IPC, introducing excessive overhead for simple navigation checking.
- **Global Key States in Host Window**: Tracking Control/Command key down events in the main Obsidian window. Rejected because webview focus eats key events, leading to out-of-sync modifier states.
