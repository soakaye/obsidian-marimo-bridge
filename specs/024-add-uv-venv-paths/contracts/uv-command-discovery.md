# Contract: uv Command Discovery

This contract defines the observable behavior for uv command resolution after adding vault-local virtual environment search paths.

## Configured Path Contract

**Given** `settings.uvPath` is non-empty  
**When** uv package operations are required  
**Then** the plugin validates and uses `settings.uvPath` before any automatic discovery candidate.

**Given** `settings.uvPath` is non-empty and invalid  
**When** uv package operations are required  
**Then** the plugin fails the uv operation with a clear configured-path message and does not search PATH, the vault-local `.venv`, or default locations.

## Empty Setting Discovery Contract

**Given** `settings.uvPath` is empty  
**When** uv package operations are required on Linux or macOS  
**Then** the plugin searches candidates in this deterministic order:

1. `<vault>/.venv/bin/uv`.
2. `uv` on PATH.
3. Existing user-level, legacy, and common Linux/macOS uv locations.

**Given** `settings.uvPath` is empty  
**When** uv package operations are required on Windows  
**Then** the plugin searches candidates in this deterministic order:

1. `<vault>\.venv\Scripts\uv.exe`.
2. `uv` on PATH.
3. Existing user-level and legacy Windows uv locations.

## Candidate Validation Contract

**Given** an automatic non-PATH uv candidate does not exist  
**When** uv discovery evaluates candidates  
**Then** the plugin skips that candidate and continues to the next one.

**Given** an automatic uv candidate exists but cannot run as uv  
**When** uv discovery validates that candidate  
**Then** the plugin treats it as unusable and continues to the next automatic candidate.

**Given** all automatic uv candidates are missing or unusable  
**When** uv package operations are required  
**Then** the plugin fails the uv operation and does not fall back to pip.

## Package Strategy Boundary

**Given** a uv command is discovered from the vault-local `.venv` command directory  
**When** the selected install target is not positively identified as a uv-created vault `.venv`  
**Then** the plugin preserves the existing pip behavior.

**Given** the selected install target is a uv-created vault `.venv` and a uv command is discovered from the vault-local command directory  
**When** the plugin checks or installs marimo  
**Then** it uses the existing uv package command contract with that discovered uv command.
