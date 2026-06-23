# Feature Specification: Upgrade Existing marimo Installations

**Feature Branch**: `022-pip-install-marimo`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "pip install 次にすでにmarimo がインストールされている場合は、--upgrade オプションを付けてupgradeする。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fresh Installation of marimo (Priority: P1)

As a user without marimo installed in my resolved Python environment,
I want the plugin to install marimo automatically
so that I can start using the plugin's notebook features.

**Why this priority**: Crucial for onboarding new users who do not have marimo installed yet.

**Independent Test**: Can be fully tested by using a clean virtual environment where `marimo` is not installed, clicking the install button, and verifying `pip install marimo` (without `--upgrade`) is run.

**Acceptance Scenarios**:

1. **Given** `marimo` is not installed in the resolved Python environment, **When** the user clicks "Install marimo" in settings or triggers auto-install, **Then** the plugin executes `pip install marimo` (without `--upgrade` option) and notifies the user upon successful installation.

---

### User Story 2 - Upgrade Existing marimo Installation (Priority: P1)

As a user who already has an older version of marimo installed,
I want the plugin to upgrade it to the latest version when I click the install button,
so that I can benefit from bug fixes and new features in marimo.

**Why this priority**: Required to fulfill the main user request and allows existing users to update their marimo package cleanly without manual terminal operations.

**Independent Test**: Can be fully tested by installing an older version of `marimo` in the Python environment, clicking the install/upgrade button in the plugin, and verifying that `pip install --upgrade marimo` is run and the version is updated.

**Acceptance Scenarios**:

1. **Given** `marimo` is already installed in the resolved Python environment, **When** the user triggers the installation (e.g. via "Install marimo" button in settings), **Then** the plugin detects the existing installation, executes `pip install --upgrade marimo` (with `--upgrade` option), and notifies the user of the successful upgrade and the new version.

---

### Edge Cases

- **What happens when pip fails during upgrade?**
  - The plugin must log the error stderr and show a notice indicating that the upgrade/installation failed. It should not break the existing (older) installation if it's still usable.
- **What happens if no internet connection is available during upgrade?**
  - `pip install --upgrade` will fail or timeout. The plugin should handle this gracefully by catching the error, notifying the user, and leaving the previous version intact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plugin MUST check if `marimo` is already installed in the resolved Python environment before initiating the installation process.
- **FR-002**: If `marimo` is NOT installed, the plugin MUST execute the installation command without the `--upgrade` option.
- **FR-003**: If `marimo` IS already installed, the plugin MUST execute the installation command with the `--upgrade` option (i.e. `pip install --upgrade marimo`).
- **FR-004**: The plugin MUST handle errors during the pip upgrade command, log the failure, and display a user-friendly error notification.
- **FR-005**: The plugin MUST refresh its availability check and cached version details after the pip command completes.

### Key Entities *(include if feature involves data)*

- **Python Interpreter**: The resolved Python environment where `pip` commands and `marimo` run.
- **Marimo Installation Status**: Represents whether `marimo` is installed and its version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of installation attempts on an environment with `marimo` already present use the `--upgrade` option.
- **SC-002**: 100% of installation attempts on a clean environment without `marimo` do not use the `--upgrade` option.
- **SC-003**: The plugin successfully detects and reports the upgraded version within 5 seconds after the upgrade process completes.

## Assumptions

- The target environment has a functional python interpreter with `pip` module available.
- The user has internet access to reach PyPI when attempting to install or upgrade marimo.
