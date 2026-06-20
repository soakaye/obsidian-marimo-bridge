# データモデル設計 (Data Model) - 設定によるコンテキストメニュー有効/無効トグル機能の追加

**作成日**: 2026-06-19

## 概要
本ドキュメントでは、本機能の実装で使用される設定データのスキーマについて定義します。

## 設定データモデル

### `MarimoBridgeSettings` の変更点

```typescript
export interface MarimoBridgeSettings {
    // 既存の設定項目...
    
    /**
     * ファイルエクスプローラ上での右クリックコンテキストメニューに
     * 「Create new marimo notebook」を表示するかどうか。
     * true: メニューを表示する (デフォルト)
     * false: メニューを表示しない
     */
    showContextMenu: boolean;
}
```

### デフォルト値

```typescript
export const DEFAULT_SETTINGS: MarimoBridgeSettings = {
    // 既存のデフォルト設定...
    showContextMenu: true,
};
```

### バリデーションルール
- `showContextMenu` は `boolean` 型でなければなりません。

### 状態遷移
1. ユーザーが設定タブで「Enable file explorer context menu」のトグルを切り替えます。
2. `MarimoBridgeSettingTab` の `onChange` ハンドラーが発火し、`this.plugin.settings.showContextMenu = value` が代入されます。
3. `this.plugin.saveSettings()` が呼び出され、設定が `data.json` に永続化されます。
4. 次回以降の右クリック時に、`this.settings.showContextMenu` の値が参照され、`false` の場合はメニュー項目の生成がスキップされます。
