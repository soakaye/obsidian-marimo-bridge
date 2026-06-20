# 技術調査 (Research) - 設定によるコンテキストメニュー有効/無効トグル機能の追加

**作成日**: 2026-06-19

## 調査の目的
設定タブにトグルスイッチを追加し、その有効・無効状態に基づいて右クリックメニューの項目表示を動的に制御する手法の調査と実装設計。

## 調査結果

### 1. トグル UI の追加方法
Obsidian の `Setting` クラスの `addToggle` メソッドを使用することで、トグル UI を設定タブに追加できます。
```typescript
new Setting(containerEl)
    .setName("Enable file explorer context menu")
    .setDesc("...")
    .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showContextMenu)
        .onChange(async (value) => {
            this.plugin.settings.showContextMenu = value;
            await this.plugin.saveSettings();
        })
    );
```
- `this.plugin.saveSettings()` は設定をローカルの `data.json` に保存します。

### 2. 動的な反映方法
右クリックメニューを構成するイベントハンドラー `file-menu` は、右クリックされたタイミングで毎回発火します。
そのため、イベントハンドラーのコールバック内で毎回 `this.settings.showContextMenu` の値をチェックして、`false` の場合は項目を追加せずにアーリーリターンすることで、設定の変更がリロードなしで即座にメニューに反映されます。

```typescript
this.registerEvent(
    this.app.workspace.on("file-menu", (menu, file) => {
        if (!this.settings.showContextMenu) return;
        // 項目追加ロジック...
    })
);
```

### 3. 未解決の技術的課題 (NEEDS CLARIFICATION)
- 特になし。

## 結論と意思決定
トグル設定 `showContextMenu`（デフォルト: `true`）を `src/settings.ts` に追加し、`src/main.ts` の `file-menu` ハンドラーの先頭でその設定値を動的に評価する設計とします。これにより、プラグインのリロードやアプリの再起動を必要とせず、ユーザーが設定を変更した直後から正しい動作が行われます。
