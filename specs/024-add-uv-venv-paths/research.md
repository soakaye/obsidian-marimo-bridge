# Research: Add uv Virtual Environment Search Paths

## Decision: Add a platform-specific vault-local uv candidate

Automatic uv discovery will include the uv executable inside the vault-local `.venv` command directory:

- Windows: `<vault>\.venv\Scripts\uv.exe`
- Linux/macOS: `<vault>/.venv/bin/uv`

### Rationale

The plugin already prefers vault-local virtual environments for Python and marimo executable resolution. Adding the environment-local uv command keeps package-manager discovery aligned with that same local environment and removes the need for a manual uv path when uv is available only inside `.venv`.

### Alternatives Considered

- **Require users to configure the uv command path manually**: Rejected because the requested behavior is automatic path discovery.
- **Search both Windows and Unix-style directories on every platform**: Rejected because it can produce surprising cross-platform matches and weakens deterministic platform behavior.
- **Search arbitrary subdirectories under `.venv`**: Rejected because scanning is unnecessary, slower, and can select unintended files.

## Decision: Preserve configured uv path as the highest priority

When `settings.uvPath` is non-empty, the plugin will validate and use only that configured path. Vault-local discovery will run only when the setting is empty.

### Rationale

An explicit setting represents user intent. Falling back after an invalid configured path would hide configuration mistakes and could use a different uv executable than the user intended.

### Alternatives Considered

- **Fallback to `.venv` uv when configured uv is invalid**: Rejected because it silently ignores an explicit setting.
- **Prefer `.venv` uv over configured uv**: Rejected because it would make the settings screen unreliable.

## Decision: Prefer the vault-local uv candidate before PATH

The automatic discovery order will begin with the platform-appropriate vault `.venv` candidate, followed by `uv` on PATH, then the existing default/common candidates.

### Rationale

The purpose of this feature is to make the vault-local environment's uv command the preferred automatic candidate when no explicit uv command path is configured. This aligns uv command discovery with the plugin's virtual environment preference while still preserving PATH and default/common locations as fallbacks.

### Alternatives Considered

- **Keep PATH before the vault-local uv candidate**: Rejected because it can select a global uv executable even when the vault-local environment provides its own uv command.
- **Place the vault-local uv candidate after all default locations**: Rejected because it would leave local environments subordinate to unrelated user-level installations.

## Decision: Reuse existing command validation behavior

The new vault-local uv candidate will be validated with the same version-check command used for the existing PATH and default-location candidates.

### Rationale

The current validation proves that a candidate can be spawned and behaves like uv. Reusing that path keeps error handling and command timeout behavior consistent.

### Alternatives Considered

- **Accept the candidate if the file exists**: Rejected because file existence does not prove the command can run.
- **Add a separate validation command for local candidates**: Rejected because local and global uv executables should satisfy the same command contract.

## Decision: Keep uv package-manager selection unchanged

The new path candidate affects only uv command discovery. The plugin will still choose uv package operations only after the selected install target is positively identified as a uv-created vault `.venv`.

### Rationale

Discovery of a uv executable is not enough to prove that the selected Python environment should be managed by uv. The existing `pyvenv.cfg` ownership check remains the boundary that prevents uv from mutating non-uv environments.

### Alternatives Considered

- **Use uv whenever `.venv/bin/uv` or `.venv\Scripts\uv.exe` exists**: Rejected because executable presence alone does not prove the Python environment is uv-created.
- **Use uv for every package operation once local uv is found**: Rejected because configured Python and marimo paths must preserve existing behavior.
