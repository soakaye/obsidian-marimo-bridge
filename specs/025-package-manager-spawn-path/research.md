# Research: Enhance Package Manager Path Resolution for Spawned Processes

## Decision: Inject standard install directories rather than detect a single binary

The plugin will prepend the standard package-manager install directories themselves to the spawned process `PATH` when they exist, instead of probing for one specific package-manager binary.

### Rationale

marimo's in-UI package installer can use any of several managers (pip, uv, poetry, pixi, rye, pipx-installed tools) and resolves them with its own `shutil.which(...)` lookups. Gating on a single binary would only fix one manager. Injecting the directories where these tools are conventionally installed covers every manager marimo supports without the plugin needing to know which one the user has.

### Alternatives Considered

- **Detect and inject the path of one manager (e.g. uv) only**: Rejected because it leaves other managers undiscoverable in the minimal GUI `PATH`.
- **Run a login shell to capture the user's full `PATH`**: Rejected because it is slower, platform-fragile, and can execute arbitrary shell profile side effects.
- **Ask the user to configure `PATH` manually**: Rejected because the goal is automatic resolution under Obsidian's minimal GUI `PATH`.

## Decision: Order configured and environment directories ahead of global locations

The injected directory order is: configured uv directory first, then the vault-local `.venv` command directory and the active interpreter directory, then the standalone install locations (`~/.local/bin`, `~/.cargo/bin`, Homebrew directories).

### Rationale

An explicitly configured uv path and the active vault-local environment represent the user's intended tooling. Placing them ahead of unrelated global installations ensures marimo resolves the manager from the chosen environment when one exists, consistent with the plugin's virtual environment preference.

### Alternatives Considered

- **Append all directories after the inherited `PATH`**: Rejected because inherited global entries could then shadow the environment-local manager.
- **Inject only global locations**: Rejected because it ignores the configured uv path and the vault-local environment.

## Decision: Prepend while preserving and deduplicating the inherited PATH

New directories are prepended to the inherited `PATH`, skipping any directory already present, and the remaining inherited entries keep their original order.

### Rationale

Injection must be additive and predictable. Prepending makes the injected directories take precedence for resolution, while dedup and order preservation guarantee the change never disturbs entries the inherited `PATH` already provides.

### Alternatives Considered

- **Replace the inherited `PATH`**: Rejected because it would drop directories the process legitimately needs.
- **Append new directories at the end**: Rejected because inherited entries could resolve a different manager first.

## Decision: Only inject absolute directories that exist on disk

Each candidate is added only when it is an absolute path and exists on disk; missing or relative candidates are skipped.

### Rationale

Adding non-existent or relative directories to `PATH` is noise at best and can introduce ambiguous resolution at worst. Existence checks keep the injected `PATH` concrete and minimal.

### Alternatives Considered

- **Add all candidate directories unconditionally**: Rejected because it pollutes `PATH` with non-existent entries.
- **Resolve relative candidates against the working directory**: Rejected because the candidates are well-known absolute install locations and relative resolution would be surprising.

## Decision: Apply injection at every marimo server spawn site

The same `buildSpawnEnv(packageManagerPathDirs())` environment is used at every place the plugin spawns the marimo server, including the uv command probe/run spawn and the detached long-running server spawn.

### Rationale

The in-UI installer can run under any spawned server, so a single spawn site fix would leave other entry points with the minimal `PATH`. Applying it uniformly keeps behavior consistent regardless of which spawn path started the server.

### Alternatives Considered

- **Fix only the long-running server spawn**: Rejected because other spawn sites would still inherit the minimal `PATH`.

## Decision: Keep package-manager strategy and uv discovery unchanged

This change affects only the spawned process environment. uv command discovery (spec 024) and the pip/uv package-manager strategy selection are unchanged.

### Rationale

`PATH` injection improves what marimo's own installer can resolve at runtime. It does not change how the plugin itself chooses or discovers a package manager, so the existing discovery and strategy boundaries are preserved.

### Alternatives Considered

- **Re-route the plugin's own uv discovery through the injected `PATH`**: Rejected because discovery already has a deterministic, tested order in spec 024 and must remain independent of the spawn environment.
