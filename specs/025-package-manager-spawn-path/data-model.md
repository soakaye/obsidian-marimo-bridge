# Data Model: Enhance Package Manager Path Resolution for Spawned Processes

## Package Manager Path Directory

Represents one candidate directory considered for `PATH` injection.

| Field | Type | Meaning |
|-------|------|---------|
| `dir` | `string` | Absolute directory path to inject. |
| `origin` | enum-like label | Where the candidate came from: configured uv, vault-local `.venv`, active interpreter, user-level, or Homebrew. |
| `requiresExistence` | `boolean` | Always true; the directory must exist on disk before it is injected. |

### Validation Rules

- A candidate is included only when it is an absolute path.
- A candidate is included only when it exists on disk.
- A candidate is included only when it is not already collected (deduplicated).
- Homebrew candidates are included only on non-Windows platforms.

## Candidate Source Order

Represents the deterministic order in which candidate directories are collected.

| Order | Candidate | Platform |
|-------|-----------|----------|
| 1 | Configured uv command path directory (`path.dirname(settings.uvPath)`) | All, when `uvPath` is non-empty |
| 2 | Vault-local `.venv` command directory (`bin` / `Scripts`) | All |
| 3 | Active interpreter directory (`path.dirname(resolvePython())`) | All, when absolute |
| 4 | `~/.local/bin` | All |
| 5 | `~/.cargo/bin` | All |
| 6 | Homebrew ARM command directory (`/opt/homebrew/bin`) | Non-Windows |
| 7 | Homebrew Intel command directory (`/usr/local/bin`) | Non-Windows |

### Relationships

- The home directory is resolved as `process.env[ENV_USERPROFILE] ?? os.homedir()`.
- The platform branch uses `process.platform === PLATFORM_WIN32`.
- This order determines precedence in the injected `PATH`; lower order numbers resolve first.

## Spawn Environment

Represents the environment map passed to the spawned marimo server process.

| Field | Type | Meaning |
|-------|------|---------|
| `base` | `process.env` clone | The inherited environment. |
| `PATH` | `string` | Inherited `PATH` with new candidate directories prepended. |

### Construction Rules

- Start from a shallow clone of `process.env`.
- When there are no candidate directories, return the clone unchanged.
- Split the inherited `PATH` on `path.delimiter`; treat a missing `PATH` as empty.
- Prepend only candidate directories not already present among the inherited entries.
- When no new directories remain after filtering, return the clone unchanged.
- Join the prepended directories and the inherited entries with `path.delimiter`.

### State Preservation

- The inherited `PATH` entries keep their original relative order after the injected directories.
- No inherited `PATH` entry is removed or duplicated.
- Package-manager strategy selection and uv command discovery (spec 024) are unaffected.
