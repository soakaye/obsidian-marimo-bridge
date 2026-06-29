# Contract: Spawned-Process Package Manager Path Resolution

This contract defines the observable behavior for the environment passed to spawned marimo server processes after adding package-manager `PATH` injection.

## Candidate Selection Contract

**Given** a standard package-manager install directory exists on disk and is absolute
**When** the plugin builds the spawned process `PATH`
**Then** that directory is included as an injection candidate.

**Given** a candidate directory does not exist on disk
**When** the plugin builds the spawned process `PATH`
**Then** the plugin skips that candidate and does not inject it.

**Given** a candidate path is not absolute
**When** the plugin builds the spawned process `PATH`
**Then** the plugin ignores that candidate.

**Given** the same directory is produced by more than one candidate source
**When** the plugin collects candidates
**Then** the directory is included only once.

## Ordering Contract

**Given** the configured uv command path directory exists
**When** the plugin orders injection candidates
**Then** the configured uv directory precedes the vault-local, interpreter, and standalone install directories.

**Given** the vault-local `.venv` command directory and the active interpreter directory exist
**When** the plugin orders injection candidates
**Then** those directories precede `~/.local/bin`, `~/.cargo/bin`, and the Homebrew directories.

**Given** the current platform is Windows
**When** the plugin orders injection candidates
**Then** the Homebrew ARM and Intel directories are not included.

## PATH Composition Contract

**Given** an inherited `PATH` that already contains a candidate directory
**When** the plugin composes the spawned process `PATH`
**Then** that directory is not added a second time.

**Given** an inherited `PATH` with existing entries
**When** the plugin prepends new candidate directories
**Then** the inherited entries are preserved in their original relative order after the injected directories.

**Given** there are no new candidate directories to inject
**When** the plugin builds the spawn environment
**Then** the spawned process receives the inherited environment unchanged.

**Given** the inherited environment has no `PATH` entry
**When** the plugin builds the spawn environment with candidate directories
**Then** the spawned process `PATH` is composed from the injected directories without error.

## Spawn Site Contract

**Given** the plugin spawns the marimo server at any spawn site
**When** the spawn occurs
**Then** the process is started with the environment produced by injecting the package-manager directories into the inherited `PATH`.

## Boundary Contract

**Given** the package-manager `PATH` injection is applied
**When** the plugin selects a package-manager strategy or discovers the uv command
**Then** that strategy selection and uv command discovery (spec 024) behave exactly as before.
