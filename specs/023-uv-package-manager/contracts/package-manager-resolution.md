# Contract: Package Manager Resolution

This contract defines the observable behavior of marimo package-manager selection and uv command resolution.

## Settings Contract

### uv command path

- Setting key: `uvPath`
- Default value: `""`
- UI label: `uv command path`
- Empty value means automatic uv discovery.
- Non-empty value is trimmed before persistence.

## uv Command Resolution Contract

### Configured path

**Given** `settings.uvPath` is non-empty  
**When** uv package operations are required  
**Then** the plugin validates and uses `settings.uvPath` before any discovery candidate.

**Given** `settings.uvPath` is non-empty and invalid  
**When** uv package operations are required  
**Then** the plugin fails the uv operation with a clear message and does not search another uv executable.

### Empty setting

**Given** `settings.uvPath` is empty  
**When** uv package operations are required  
**Then** the plugin searches candidates in deterministic order:

1. `uv` on PATH.
2. macOS/Linux: `~/.local/bin/uv`.
3. Windows: `%USERPROFILE%\.local\bin\uv.exe`.
4. macOS/Linux legacy: `~/.cargo/bin/uv`.
5. Windows legacy: `%USERPROFILE%\.cargo\bin\uv.exe`.
6. macOS Homebrew: `/opt/homebrew/bin/uv`.
7. macOS Homebrew/Intel: `/usr/local/bin/uv`.

**Given** all candidates fail  
**When** uv package operations are required  
**Then** the plugin fails the uv operation and does not fall back to pip.

## Package Strategy Contract

### uv-created vault `.venv`

**Given** the selected install target is `<vault>/.venv`  
**And** `<vault>/.venv/pyvenv.cfg` contains a `uv` entry such as `uv = <version>`  
**When** the plugin checks whether marimo is installed for the install button  
**Then** it runs:

```text
<uv-command> pip show marimo --python <vault-venv-python>
```

**Given** marimo is not installed  
**When** the user triggers install  
**Then** it runs:

```text
<uv-command> pip install marimo --python <vault-venv-python>
```

**Given** marimo is already installed  
**When** the user triggers reinstall/upgrade  
**Then** it runs:

```text
<uv-command> pip install --upgrade marimo --python <vault-venv-python>
```

### Non-uv targets

**Given** the selected install target is not positively identified as a uv-created vault `.venv`  
**When** the plugin checks or installs marimo  
**Then** it preserves the existing pip behavior:

```text
<python> -m pip install marimo
<python> -m pip install --upgrade marimo
```

## Error Contract

- uv command resolution failure must name uv as the missing or invalid command.
- uv package operation failure must log captured stderr.
- pip package operation failure must keep existing error logging behavior.
- User-facing notices should be short and actionable.
- Failed uv operations must not clear or alter an existing marimo installation.
