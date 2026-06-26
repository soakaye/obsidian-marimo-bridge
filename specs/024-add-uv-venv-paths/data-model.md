# Data Model: Add uv Virtual Environment Search Paths

## uv Command Candidate

Represents one possible uv command location evaluated during automatic discovery.

| Field | Type | Meaning |
|-------|------|---------|
| `command` | `string` | Command or absolute path to validate and use. |
| `source` | existing uv command source value | Where the candidate came from for diagnostics and tests. |
| `requiresExistenceCheck` | `boolean` | Whether the candidate must exist on disk before validation. |

### Validation Rules

- `uv` on PATH is validated even though it is not an absolute filesystem path.
- Non-PATH candidates must exist before validation is attempted.
- A candidate is usable only when the existing uv version check succeeds.

## Vault Virtual Environment uv Candidate

Represents the uv executable location inside the vault-local virtual environment command directory.

| Field | Source | Meaning |
|-------|--------|---------|
| `venvRoot` | `<vault>/.venv` | Virtual environment root. |
| `commandDirectory` | platform-specific | `.venv/Scripts` on Windows, `.venv/bin` on Linux/macOS. |
| `uvExecutableName` | platform-specific | `uv.exe` on Windows, `uv` on Linux/macOS. |
| `commandPath` | derived string | Full uv candidate path under the vault-local `.venv`. |

### Validation Rules

- The Windows candidate is `<vault>\.venv\Scripts\uv.exe`.
- The Linux/macOS candidate is `<vault>/.venv/bin/uv`.
- Only the current platform's candidate is included in automatic discovery.
- Missing local uv candidates are skipped without user-facing errors.
- Unusable local uv candidates are handled like other automatic discovery candidates when the uv path setting is empty.

## Automatic Discovery Order

Represents the deterministic order used when `settings.uvPath` is empty.

| Order | Candidate |
|-------|-----------|
| 1 | Platform-appropriate vault-local `.venv` uv candidate |
| 2 | `uv` on PATH |
| 3+ | Existing user-level, legacy, and common install-location candidates |

### Relationships

- `settings.uvPath` bypasses automatic discovery entirely when non-empty.
- The vault-local uv candidate does not change the package-manager strategy by itself.
- uv package operations still require the selected install target to be a uv-created vault `.venv`.

## Package Manager Strategy

No new package-manager strategy fields are required.

### State Preservation

- `kind = "uv"` remains valid only for positively identified uv-created vault `.venv` targets.
- `kind = "pip"` remains valid for non-uv targets and explicit Python or marimo path settings.
- Failed uv discovery for a uv-created vault `.venv` remains an error state, not a pip fallback.
