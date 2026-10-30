# Contract: Settings Schema & UI Definition

**Feature**: Notebook Tab Edit/Run Mode Selection  
**Branch**: `032-notebook-tab-mode`  
**Date**: 2026-10-30  

## Settings Interface

```typescript
export interface MarimoBridgeSettings {
    // ... existing properties ...

    /** Default mode for notebooks opened in tabs. */
    defaultNotebookMode: "edit" | "run";
}

export const DEFAULT_SETTINGS: MarimoBridgeSettings = {
    // ... existing defaults ...
    defaultNotebookMode: "edit",
};
```

## Declarative Setting Definition (`getSettingDefinitions()`)

```typescript
{
    name: SETTING_NOTEBOOK_MODE_NAME,
    desc: SETTING_NOTEBOOK_MODE_DESC,
    control: {
        type: CONTROL_TYPE_DROPDOWN,
        key: SETTINGS_KEY_DEFAULT_NOTEBOOK_MODE,
        options: {
            [MODE_EDIT]: TEXT_NOTEBOOK_MODE_EDIT,
            [MODE_RUN]: TEXT_NOTEBOOK_MODE_RUN,
        },
    },
}
```

## Legacy Settings Tab (`display()`)

```typescript
new Setting(containerEl)
    .setName(SETTING_NOTEBOOK_MODE_NAME)
    .setDesc(SETTING_NOTEBOOK_MODE_DESC)
    .addDropdown((d) =>
        d
            .addOption(MODE_EDIT, TEXT_NOTEBOOK_MODE_EDIT)
            .addOption(MODE_RUN, TEXT_NOTEBOOK_MODE_RUN)
            .setValue(this.plugin.settings.defaultNotebookMode)
            .onChange(async (value) => {
                this.plugin.settings.defaultNotebookMode = value as
                    | typeof MODE_EDIT
                    | typeof MODE_RUN;
                await this.plugin.saveSettings();
            })
    );
```
