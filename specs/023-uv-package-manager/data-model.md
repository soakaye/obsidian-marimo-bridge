# Data Model: Support uv Package Manager for marimo Installation

## MarimoBridgeSettings

Existing persisted plugin settings gain one optional string field.

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `uvPath` | `string` | `""` | Trim whitespace before saving. Empty means auto-detect. Non-empty must point to a runnable uv executable when uv package operations are required. |

### Migration

Existing settings files do not include `uvPath`. Loading settings merges stored data over `DEFAULT_SETTINGS`, so older settings must automatically receive `uvPath: ""`.

### Relationships

- `uvPath` affects only uv package-manager command resolution.
- `uvPath` does not replace `pythonPath` or `marimoPath`.
- `pythonPath` and `marimoPath` continue to control explicit interpreter/executable selection.

## VaultVirtualEnvironment

Represents the vault-local `.venv` directory.

| Field | Source | Meaning |
|-------|--------|---------|
| `rootPath` | `<vault>/.venv` | Virtual environment root. |
| `pythonPath` | `<rootPath>/Scripts/python.exe` on Windows, `<rootPath>/bin/python` elsewhere | Python interpreter targeted by package operations. |
| `pyvenvConfigPath` | `<rootPath>/pyvenv.cfg` | Metadata file used to determine uv ownership. |
| `createdByUv` | derived boolean | True only when `pyvenv.cfg` is readable and contains a `uv` entry such as `uv = <version>`. |

### Validation

- `createdByUv` is false when `pyvenv.cfg` is missing, unreadable, or lacks a `uv` entry.
- uv package operations require both `createdByUv = true` and a runnable `pythonPath`.
- Existing broken-venv behavior remains for missing Python interpreters.

## UvCommandResolution

Represents how the uv executable was selected.

| Field | Type | Meaning |
|-------|------|---------|
| `source` | `"configured" | "path" | "default-location" | "unavailable"` | Where the uv executable came from. |
| `command` | `string | null` | Executable to pass to process spawning. |
| `diagnostic` | `string` | User/log-friendly reason when unavailable or invalid. |

### Resolution Rules

1. If `settings.uvPath` is non-empty, validate it and use it as `source = "configured"`.
2. If `settings.uvPath` is non-empty and invalid, stop with `source = "unavailable"`; do not continue to discovery.
3. If `settings.uvPath` is empty, try `uv` on PATH.
4. If PATH lookup fails, try deterministic OS/default/common install-location candidates.
5. If all candidates fail, return `source = "unavailable"`.

## PackageManagerStrategy

Represents which package manager handles marimo inspection and installation.

| Field | Type | Meaning |
|-------|------|---------|
| `kind` | `"uv" | "pip"` | Package-manager path selected for install decisions. |
| `pythonPath` | `string` | Python environment targeted by the package operation. |
| `uvCommand` | `string | null` | Resolved uv command when `kind = "uv"`. |

### Selection Rules

- Use `kind = "uv"` only when the selected install target is the vault-local `.venv` and `createdByUv = true`.
- Use `kind = "pip"` for configured Python paths, configured marimo paths, non-uv `.venv`, and system fallback.
- Never downgrade from `kind = "uv"` to `kind = "pip"` because uv is unavailable.

## MarimoInstallationStatus

Represents whether marimo exists in the selected package environment.

| Field | Type | Meaning |
|-------|------|---------|
| `installed` | `boolean` | True when package inspection or launch detection finds marimo. |
| `version` | `string | null` | Version detected after package operations or launch checks. |
| `strategy` | `PackageManagerStrategy` | Strategy used for package inspection/install. |

### State Transitions

```text
unknown
  -> not-installed      package inspection reports missing
  -> installed          package inspection or launch detection succeeds
not-installed
  -> installed          install succeeds and version re-check succeeds
installed
  -> installed          upgrade succeeds and version re-check succeeds
installed/not-installed
  -> error              package-manager command fails
```
