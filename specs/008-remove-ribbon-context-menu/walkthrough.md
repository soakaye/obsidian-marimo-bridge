# Walkthrough: Remove Ribbon Context Menu

We have successfully removed the custom context menu from the marimo ribbon icon in the Obsidian plugin.

## Changes Made

### `src/main.ts`

- Removed the imports of `Menu` which became unused.
- Removed the `const ribbonIconEl` variable assignment as it is no longer used for registering additional DOM events.
- Removed the `contextmenu` (right-click) DOM event listener on the ribbon icon entirely.
- The left-click handler remains unchanged and continues to open the marimo home dashboard directly.

```diff
-import {
-	FileSystemAdapter,
-	Menu,
-	Notice,
-	Plugin,
-	TFile,
-	TFolder,
-	normalizePath,
-} from "obsidian";
+import {
+	FileSystemAdapter,
+	Notice,
+	Plugin,
+	TFile,
+	TFolder,
+	normalizePath,
+} from "obsidian";
```

```diff
 		// Ribbon: left-click directly opens the marimo home dashboard.
-		const ribbonIconEl = this.addRibbonIcon("notebook-pen", "Open marimo home", () => {
+		this.addRibbonIcon("notebook-pen", "Open marimo home", () => {
 			void this.openMarimo(undefined);
 		});
 
-		// Right-click (contextmenu) on the ribbon icon displays the context menu.
-		this.registerDomEvent(ribbonIconEl, "contextmenu", (evt: MouseEvent) => {
-			evt.preventDefault();
-			const menu = new Menu();
-			menu.addItem((item) =>
-				item
-					.setTitle("Open marimo home")
-					.setIcon("notebook-pen")
-					.onClick(() => void this.openMarimo(undefined))
-			);
-			menu.addItem((item) =>
-				item
-					.setTitle("Create new marimo notebook")
-					.setIcon("plus")
-					.onClick(() => void this.createNotebook())
-			);
-			menu.showAtMouseEvent(evt);
-		});
-
```

## Verification

### Build & Lint
- Verified that `npm run build` succeeds.
- Verified that `npm run lint` generates no errors or warnings for `src/main.ts`.

### Manual Behavior
- Left-click on the ribbon icon triggers `this.openMarimo(undefined)` which opens the marimo dashboard.
- Right-click on the ribbon icon no longer captures the event, yielding to default behavior (no custom menu shown).
