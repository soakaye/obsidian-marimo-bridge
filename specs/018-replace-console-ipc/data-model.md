# Data Model: Replace Console-Based Webview IPC

This feature introduces no persisted data. The model describes ephemeral state
shared conceptually across the host renderer and one current webview guest
context.

## Bridge Open Message

Represents one guest request to route a destination through the plugin.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | string literal `"open"` | Yes | Must exactly match the supported message type. |
| `url` | string | Yes | Must be non-empty; URL parsing and protocol policy remain in the existing router. |
| `disposition` | string | No | If present, must be a string; existing routing interprets background-tab semantics. |

Unknown fields are ignored. A value that fails any required validation is
discarded without invoking navigation.

## Guest Message Queue

The current guest context owns:

| Field | Type | Invariant |
|-------|------|-----------|
| `messages` | FIFO sequence of Bridge Open Message values | Oldest unconsumed message is returned first. |
| `waiter` | zero or one pending resolver | Present only when the queue was empty during `nextMessage()`. |

### Operations

- `enqueue(message)`: Resolve and clear `waiter` when present; otherwise append
  `message` to `messages`.
- `nextMessage()`: Remove and return the oldest message when available;
  otherwise create and retain one pending resolver.

The host contract permits only one active `nextMessage()` request per guest
context, so more than one waiter is invalid.

## Guest Context Generation

A monotonically increasing host-side number identifying the currently accepted
guest page context.

| Event | Transition |
|-------|------------|
| Non-in-place main-frame navigation begins | Increment generation, invalidating prior installation and receive work. |
| Subframe or in-page navigation begins | Keep the generation unchanged because the top-level guest context remains valid. |
| `dom-ready` fires | Increment generation again, capture it, and begin bridge installation for that ready context. |
| Webview detaches or closes | `isConnected` becomes false; all post-await work is rejected even if generation is unchanged. |

The exact numeric value has no meaning outside equality checks.

## Receive Cycle

One asynchronous host loop associated with a captured generation.

### States

1. **Inactive**: No bridge work is running for the context.
2. **Installing**: The host awaits installation of the guest queue and hooks.
3. **Waiting**: The host awaits the next queued message.
4. **Routing**: A validated open message is handled through existing routing.
5. **Stopped**: The cycle ended because the context became stale, detached, or
   its execution Promise rejected.

### Transitions

```text
Inactive -> Installing -> Waiting -> Routing -> Waiting
                |            |          |
                +----------> Stopped <---+
```

- Installation failure in a still-current connected context emits the existing
  injection diagnostic, then stops.
- Installation or receive completion for a stale/detached context stops without
  routing.
- Invalid received values transition directly back to **Waiting**.
- Receive rejection after successful installation transitions quietly to
  **Stopped**.

## Relationships

- One webview element may create many generations over its lifetime.
- Each generation has at most one active Receive Cycle.
- Each current guest context owns one Guest Message Queue.
- A Receive Cycle consumes Bridge Open Messages from its matching Guest Message
  Queue and passes validated messages to the existing URL router.
