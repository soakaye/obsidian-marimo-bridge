# Quickstart: Validate Spawned-Process Package Manager Path Resolution

## Prerequisites

- Obsidian Desktop with this plugin installed from the working tree.
- Node dependencies installed with `npm install`.
- A test vault where `.venv` can be created and removed.
- A package manager (e.g. uv or pip) installed in one of the standard install directories.

## Automated Validation

Run the standard project checks:

```bash
npm test
npm run build
npm run lint
```

Expected outcome:

- Server manager tests confirm that existing standard directories are injected and that missing or non-absolute candidates are skipped.
- Server manager tests confirm the configured uv directory and the vault-local/interpreter directories are ordered ahead of the standalone install directories.
- Server manager tests confirm injected directories do not duplicate inherited `PATH` entries and preserve their order.
- Server manager tests confirm an empty candidate list passes the inherited environment through unchanged.

## Manual Scenario 1: minimal GUI PATH on macOS

1. Launch Obsidian as a normal GUI application (Finder/Dock), not from a terminal, so it inherits the minimal GUI `PATH`.
2. Ensure a package manager is installed in `~/.local/bin`, `~/.cargo/bin`, or a Homebrew directory.
3. Open a marimo notebook and trigger the in-UI package installer to add a package.

Expected outcome:

- marimo's installer finds the package manager through the injected `PATH`.
- The package install completes without manual `PATH` configuration.

## Manual Scenario 2: configured uv directory wins

1. Configure a valid absolute path in `uv command path` whose directory contains uv.
2. Ensure other package-manager directories also exist on disk.
3. Spawn the marimo server.

Expected outcome:

- The configured uv directory appears first in the spawned process `PATH`, ahead of the vault-local, interpreter, and standalone install directories.

## Manual Scenario 3: vault-local environment ahead of global locations

1. Clear the `uv command path` setting.
2. Ensure the vault has a `.venv` with a resolvable interpreter.
3. Ensure `~/.local/bin` or `~/.cargo/bin` also exists.
4. Spawn the marimo server.

Expected outcome:

- The vault-local `.venv` command directory and the interpreter directory appear ahead of `~/.local/bin`, `~/.cargo/bin`, and the Homebrew directories.

## Manual Scenario 4: existing PATH preserved without duplication

1. Start Obsidian from a terminal whose `PATH` already includes one of the standard directories.
2. Spawn the marimo server.

Expected outcome:

- The already-present directory is not duplicated in the spawned process `PATH`.
- The inherited `PATH` entries keep their original relative order after any injected directories.

## Manual Scenario 5: no candidate directories exist

1. Use an environment where none of the standard directories exist on disk.
2. Spawn the marimo server.

Expected outcome:

- The spawned process inherits the unmodified environment.
- No spurious directories are added to `PATH`.

## References

- [Spawned-process package manager path resolution contract](./contracts/spawn-path-resolution.md)
- [Data model](./data-model.md)
- [uv command discovery (spec 024)](../024-add-uv-venv-paths/spec.md)
