# Research: Support uv Package Manager for marimo Installation

## Decision: Identify uv-created vault `.venv` via `pyvenv.cfg`

The plugin will positively identify a vault-local `.venv` as uv-created only when `<vault>/.venv/pyvenv.cfg` is readable and contains a `uv` entry, such as `uv = <version>`.

### Rationale

`uv venv` records a `uv` entry in `pyvenv.cfg`, and this file already belongs to the virtual environment being inspected. A positive key check avoids guessing based on directory names alone.

### Alternatives Considered

- **Treat every `.venv` as uv-managed when uv is installed**: Rejected because it would mutate non-uv environments with uv.
- **Infer uv ownership from package layout**: Rejected because package layout is less stable and less explicit than `pyvenv.cfg`.
- **Require a user setting that marks `.venv` as uv-managed**: Rejected because it adds manual state that can drift from the environment.

## Decision: Add a user-configurable uv command path with discovery fallback

The settings screen will include an optional uv command path. If configured, it is used before discovery. If empty, the plugin searches `uv` on PATH and default/common install locations.

### Rationale

Obsidian Desktop may launch with a different PATH than the user's interactive shell, so relying only on PATH would fail for many desktop launches. A setting gives a precise override. Empty-setting discovery keeps the default workflow lightweight.

### Discovery Candidates

When the uv path setting is empty, candidates are checked in deterministic order:

1. `uv` on PATH.
2. macOS/Linux standalone installer default: `~/.local/bin/uv`.
3. Windows standalone installer default: `%USERPROFILE%\.local\bin\uv.exe`.
4. Legacy uv installer location: `~/.cargo/bin/uv` or `%USERPROFILE%\.cargo\bin\uv.exe`.
5. macOS Homebrew common locations: `/opt/homebrew/bin/uv` and `/usr/local/bin/uv`.

The official uv installation documentation shows standalone installer binaries under `~/.local/bin` and notes that prior uv versions used `~/.cargo/bin`. Homebrew is also an official installation method, so Homebrew's common macOS prefixes are included as practical desktop-app discovery candidates.

### Alternatives Considered

- **PATH only**: Rejected because desktop apps often do not inherit shell initialization.
- **Search the entire filesystem**: Rejected because it is slow, surprising, and can select unintended executables.
- **Search inside the vault**: Rejected for this feature because uv is a package-manager executable, not a vault artifact, and scanning the vault increases false-positive risk.

## Decision: Invalid configured uv path fails without fallback

If the user explicitly configures a uv command path and it is missing or cannot run, the plugin fails the uv operation and asks the user to fix or clear the setting.

### Rationale

An explicit setting is user intent. Silently ignoring it and choosing a different uv executable could mutate the environment with an unexpected package-manager version.

### Alternatives Considered

- **Fallback to auto-discovery after invalid configured path**: Rejected because it hides configuration mistakes and weakens predictability.
- **Fallback to pip after invalid configured path**: Rejected because uv-created environments must not be silently mutated by pip.

## Decision: Use uv package commands only for package inspection and installation

The existing marimo launch availability check remains based on the resolved marimo command. The install decision path adds uv package inspection for uv-created vault `.venv` environments:

- Detect installed package: `uv pip show marimo --python <venv-python>`.
- Fresh install: `uv pip install marimo --python <venv-python>`.
- Upgrade: `uv pip install --upgrade marimo --python <venv-python>`.

### Rationale

Using `--python <venv-python>` keeps uv package operations targeted at the same vault-local environment used by the plugin. Keeping launch availability separate preserves the existing resolution order for configured marimo and Python paths.

### Alternatives Considered

- **Use `uv run marimo --version` for detection**: Rejected because this blends command launch behavior with package inspection and can introduce project/workspace effects not needed for package installation.
- **Replace all marimo version detection with `uv pip show`**: Rejected because non-uv configured executables and existing pip environments must keep current behavior.

## Decision: Keep uv support scoped to vault-local `.venv`

uv-specific package operations apply only when the selected install target is the auto-detected vault-local `.venv` and that environment is positively identified as uv-created.

### Rationale

The feature request targets uv-created `.venv` directories. Explicit Python and marimo paths can point anywhere; overriding those with vault uv detection would violate existing settings precedence.

### Alternatives Considered

- **Use uv whenever uv is installed**: Rejected because it can target the wrong environment.
- **Use uv for configured Python paths when their `pyvenv.cfg` has a `uv` entry**: Deferred; this can be added later if users need uv support outside the vault-local auto-detected `.venv`.

## References

- [uv Installation documentation](https://docs.astral.sh/uv/getting-started/installation/)
