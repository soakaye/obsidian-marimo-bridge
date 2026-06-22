# Data Model: Add Marimo Loading Indicator

This feature adds no persisted data or settings. The model is transient state
owned by one `createMarimoWebview` invocation.

## Webview Loading Cycle

| Field | Type | Invariant |
|-------|------|-----------|
| `domReady` | boolean | `false` while the current page cycle is loading; `true` after its `dom-ready`. |
| `loadRetries` | non-negative integer | Counts recovery reloads in the current page cycle and never exceeds the existing maximum. |
| `loadFailureShown` | boolean | Becomes true at most once, after recovery is exhausted. |
| `loadingElement` | element or null | References at most one connected loading layer owned by this webview. |
| `isConnected` | derived boolean | UI and retry work is actionable only while the webview remains attached. |

## Loading Layer

| Field | Value / Rule |
|-------|--------------|
| Message | Exact text `Loading marimo…` |
| Activity indicator | One decorative spinner child |
| Scope | The containing full-tab view or inline embed |
| Visibility | Present only while the current page cycle is loading |
| Accessibility | Text is a polite status announcement; the spinner is decorative; text remains visible when animation is reduced. |
| Interaction | The opaque layer intercepts pointer input and the covered webview is inert until readiness. |

## State Transitions

```text
created
  -> loading (show layer, retries = 0)

loading
  -> ready on dom-ready (hide layer)
  -> loading on retry (keep layer, increment retries)
  -> failed when retry cap is exhausted (remove layer and webview; show guidance)
  -> removed when detached (perform no later UI or retry action)

ready
  -> loading on non-in-place main-frame navigation
     (show layer, reset retries, schedule watchdog)
  -> ready on in-place or subframe navigation
     (no loading-state change)

loading
  -> loading on additional main-frame navigation
     (keep the same retry count and loading layer)
```

## Validation Rules

- `showLoading()` is idempotent: it creates no second layer while the current
  layer exists.
- `hideLoading()` is idempotent: it safely handles an already absent layer.
- A new cycle starts only on initial creation or a ready-to-loading
  replacement-page transition.
- Recovery reloads and redirects during an active cycle do not reset retries.
- Readiness hides loading before usable content is exposed.
- Loading blocks pointer and keyboard interaction with covered content.
- Each new loading cycle exposes one polite text status while keeping the
  spinner out of the accessibility tree.
- Failure removes loading before displaying the existing guidance.
- Detached surfaces cannot receive a late loading or failure state.

## Relationships

- One full-tab view or inline embed contains one webview.
- One webview owns one active loading cycle at a time.
- One loading cycle owns zero or one loading layer.
- One webview may progress through multiple loading cycles over its lifetime.
- Bridge generation and loading cycle observe the same navigation/readiness
  events but retain separate state and responsibilities.
