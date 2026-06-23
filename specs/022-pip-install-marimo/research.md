# Research: Upgrade Existing marimo Installations

This document details the research and design decisions for upgrading existing `marimo` installations via `pip install --upgrade`.

## Decision: Check Installation Status & Apply --upgrade Option

When the user attempts to install `marimo` (either during onboarding or by pressing "Reinstall marimo" in the plugin settings), we check if `marimo` is already installed.
- If **not installed**: Run `python -m pip install marimo` (to install it).
- If **installed**: Run `python -m pip install --upgrade marimo` (to upgrade it to the latest version).

We will add a new constant `CMD_ARG_UPGRADE = "--upgrade"` to `src/constants.ts` to follow the constant externalization principle.

### Rationale
Using the `--upgrade` option is the standard way in `pip` to update a package. Checking if it's already installed via `getMarimoVersion()` allows us to distinguish the two user flows ("Install" vs. "Reinstall/Upgrade") and use the precise command args:
- Fresh install: `python -m pip install marimo`
- Reinstall / Upgrade: `python -m pip install --upgrade marimo`

### Alternatives Considered

1. **Always use `pip install --upgrade marimo`**:
   - Pros: Simpler code.
   - Cons: Unnecessary overhead on fresh installs. It is cleaner to only supply `--upgrade` when upgrading.
2. **Always use `pip install marimo`**:
   - Pros: Simple.
   - Cons: Does not satisfy the user request to upgrade. `pip` will exit immediately saying `Requirement already satisfied` without upgrading.

## Verification Plan
We will write a unit test in `tests/server-manager.test.ts` that mocks `runCapture` and verifies that:
1. When `getMarimoVersion()` returns `null`, `installMarimo()` invokes `runCapture` with `["-m", "pip", "install", "marimo"]`.
2. When `getMarimoVersion()` returns a version string, `installMarimo()` invokes `runCapture` with `["-m", "pip", "install", "--upgrade", "marimo"]`.
