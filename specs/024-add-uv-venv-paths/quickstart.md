# Quickstart: Validate uv Virtual Environment Search Paths

## Prerequisites

- Obsidian Desktop with this plugin installed from the working tree.
- Node dependencies installed with `npm install`.
- A test vault where `.venv` can be created and removed.
- uv-managed package operations from the existing uv package-manager feature.

## Automated Validation

Run the standard project checks:

```bash
npm test
npm run build
npm run lint
```

Expected outcome:

- Server manager tests confirm the vault-local uv candidate is present in automatic discovery.
- Server manager tests confirm configured uv paths still take precedence and invalid configured paths do not fall back.
- Existing uv package-manager and pip behavior tests continue to pass.

## Manual Scenario 1: Linux/macOS local uv candidate

1. Clear the plugin's `uv command path` setting.
2. Ensure the vault contains a uv-managed `.venv`.
3. Ensure a usable uv command exists at `.venv/bin/uv`.
4. Trigger marimo package detection or `Install marimo`.

Expected outcome:

- The plugin discovers `.venv/bin/uv`.
- uv-backed marimo package detection or installation succeeds.
- No uv command path setting is required.

## Manual Scenario 2: Windows local uv candidate

1. Clear the plugin's `uv command path` setting.
2. Ensure the vault contains a uv-managed `.venv`.
3. Ensure a usable uv command exists at `.venv\Scripts\uv.exe`.
4. Trigger marimo package detection or `Install marimo`.

Expected outcome:

- The plugin discovers `.venv\Scripts\uv.exe`.
- uv-backed marimo package detection or installation succeeds.
- No uv command path setting is required.

## Manual Scenario 3: configured uv path still wins

1. Configure a valid absolute path in `uv command path`.
2. Ensure another usable uv command exists in the vault-local `.venv` command directory.
3. Trigger marimo package detection or installation for a uv-created vault `.venv`.

Expected outcome:

- The plugin uses the configured uv command path.
- The vault-local uv candidate is not selected.

## Manual Scenario 4: invalid configured uv path still fails

1. Configure a missing or unusable path in `uv command path`.
2. Ensure a usable uv command exists in the vault-local `.venv` command directory.
3. Trigger marimo package detection or installation for a uv-created vault `.venv`.

Expected outcome:

- The plugin reports the configured uv path problem.
- The plugin does not fall back to `.venv/bin/uv`, `.venv\Scripts\uv.exe`, PATH, default locations, or pip.

## Manual Scenario 5: existing default discovery remains available

1. Clear the plugin's `uv command path` setting.
2. Ensure no platform-appropriate uv command exists in the vault-local `.venv` command directory.
3. Ensure uv is installed in one of the previously supported automatic discovery locations.
4. Trigger marimo package detection or installation for a uv-created vault `.venv`.

Expected outcome:

- The plugin skips the missing vault-local uv candidate.
- The plugin discovers uv through the existing default discovery locations.

## References

- [uv command discovery contract](./contracts/uv-command-discovery.md)
- [Data model](./data-model.md)
