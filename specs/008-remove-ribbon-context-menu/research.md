# Research: Remove Ribbon Context Menu

## Context
The user requested to remove the ribbon icon's right-click context menu. Currently, right-clicking the ribbon icon displays a custom menu with "Open marimo home" and "Create new marimo notebook" options.

## Findings
In `src/main.ts`, the ribbon icon click and right-click event listeners are registered during plugin initialization:

```typescript
// Ribbon: left-click directly opens the marimo home dashboard.
const ribbonIconEl = this.addRibbonIcon("notebook-pen", "Open marimo home", () => {
    void this.openMarimo(undefined);
});

// Right-click (contextmenu) on the ribbon icon displays the context menu.
this.registerDomEvent(ribbonIconEl, "contextmenu", (evt: MouseEvent) => {
    evt.preventDefault();
    const menu = new Menu();
    menu.addItem((item) =>
        item
            .setTitle("Open marimo home")
            .setIcon("notebook-pen")
            .onClick(() => void this.openMarimo(undefined))
    );
    menu.addItem((item) =>
        item
            .setTitle("Create new marimo notebook")
            .setIcon("plus")
            .onClick(() => void this.createNotebook())
    );
    menu.showAtMouseEvent(evt);
});
```

## Decisions
1. **Remove `contextmenu` event registration**: We will completely remove the `this.registerDomEvent(ribbonIconEl, "contextmenu", ...)` block from `src/main.ts`.
2. **Retain left-click handler**: The left-click handler (`this.addRibbonIcon(...)`) will remain unchanged to allow opening the marimo home dashboard directly.
3. **Retain global commands**: The commands `open-marimo-home` and `create-marimo-notebook` registered with Obsidian will not be modified, so users can still run these actions via Command Palette.

## Rationale
- Completely removing the `contextmenu` registration block is cleaner than leaving an empty handler or calling `preventDefault()` without actions. It allows standard browser/OS behavior and minimizes code complexity.
- No settings need to be modified as the toggles for this menu were already cleaned up in a previous implementation step.

## Alternatives Considered
- **Alternative**: Suppress context menu without action (i.e. keep handler but do nothing).
  - **Reason for rejection**: Confusing user experience where right-clicking does absolutely nothing, not even standard OS options. Removing the listener entirely is standard practice.
