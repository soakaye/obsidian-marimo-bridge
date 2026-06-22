# Research: Handle Null LoadData in LoadSettings

## Findings

### Problem
In Obsidian, `Plugin.prototype.loadData()` returns a Promise that resolves to `null` if the plugin has never saved any settings before (i.e. fresh installation, no `data.json` exists in the plugin's folder).
The current implementation in `src/main.ts`:
```typescript
const stored = (await this.loadData()) as Partial<MarimoBridgeSettings> & {
	host?: unknown;
};
delete stored.host;
```
If `loadData()` returns `null`, attempting to delete properties of `null` (`delete stored.host`) throws a `TypeError: Cannot delete property 'host' of null`.

### Solution
Use the nullish coalescing operator `??` to fall back to an empty object:
```typescript
const stored = ((await this.loadData()) ?? {}) as Partial<MarimoBridgeSettings> & {
	host?: unknown;
};
```
This ensures `stored` is always a valid object, preventing the crash.

## Decisions
- **Decision**: Fall back to `{}` when `loadData()` resolves to `null`.
- **Rationale**: Cleanest and standard TypeScript pattern for handling optional nullish objects before field manipulation.
- **Alternatives considered**:
  - `if (stored === null)` block: Add verbosity to the code.
  - `stored && delete stored.host`: Doesn't safeguard subsequent accesses if `stored` is still referenced (though it is merged into defaults afterward). Using `?? {}` is safer and cleaner.
