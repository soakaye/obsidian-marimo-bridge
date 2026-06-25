# Quickstart: Validate uv Package Manager Support

## Prerequisites

- Obsidian Desktop with this plugin installed from the working tree.
- Node dependencies installed with `npm install`.
- uv installed for uv-managed scenarios.
- A local vault path where test `.venv` directories can be created and removed.

## Automated Validation

Run the standard project checks:

```bash
npm test
npm run build
npm run lint
```

Expected outcome:

- Settings tests confirm `uvPath` defaults and persists correctly.
- Server manager tests confirm uv-created `.venv` package operations use uv.
- Existing pip tests continue to pass.

## Manual Scenario 1: uv-created `.venv`, auto-discovered uv

1. Clear the plugin's `uv command path` setting.
2. Create a uv virtual environment at the vault root:

   ```bash
   uv venv .venv
   ```

3. Ensure uv is available on PATH or in a default/common install location.
4. Open plugin settings.
5. Trigger `Install marimo`.

Expected outcome:

- The plugin detects that `.venv` was created by uv.
- The plugin uses uv package operations for the install.
- The install succeeds and the settings tab reports the detected marimo version.

## Manual Scenario 2: uv-created `.venv`, configured uv path

1. Enter an absolute uv executable path in `uv command path`.
2. Use a uv-created `.venv` at the vault root.
3. Trigger `Install marimo` or `Reinstall / upgrade`.

Expected outcome:

- The plugin uses the configured uv path before any discovered uv candidate.
- marimo is installed or upgraded in the vault-local `.venv`.

## Manual Scenario 3: invalid configured uv path

1. Enter a non-existent or non-runnable path in `uv command path`.
2. Use a uv-created `.venv` at the vault root.
3. Trigger `Install marimo`.

Expected outcome:

- The plugin reports that the configured uv command path is unusable.
- The plugin does not fall back to another uv executable.
- The plugin does not fall back to pip.

## Manual Scenario 4: non-uv `.venv`

1. Create a non-uv virtual environment at the vault root using Python's `venv`.
2. Leave `uv command path` empty.
3. Trigger `Install marimo`.

Expected outcome:

- The plugin does not classify the environment as uv-created.
- The existing pip flow is used.
- marimo installs or upgrades successfully through `python -m pip`.

## Manual Scenario 5: configured Python outside vault `.venv`

1. Configure `Python interpreter path` to an interpreter outside the vault-local `.venv`.
2. Ensure the vault-local `.venv`, if present, is uv-created.
3. Trigger `Install marimo`.

Expected outcome:

- The explicit Python interpreter remains the install target.
- The plugin preserves the existing pip flow for that configured target.

## References

- [Package manager resolution contract](./contracts/package-manager-resolution.md)
- [Data model](./data-model.md)
