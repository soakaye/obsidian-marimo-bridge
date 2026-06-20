# データモデル設計 (Data Model) - リボンアイコンの左クリックメニューによるノートブック作成機能の追加

**作成日**: 2026-06-19

## 概要
本ドキュメントでは、本機能の実装で使用される設定データのスキーマについて定義します。

## 設定データモデル

本機能で追加される設定項目は、既存のプラグイン設定インターフェース `MarimoBridgeSettings` に含まれています。

### `MarimoBridgeSettings` の変更点

```typescript
export interface MarimoBridgeSettings {
    // 既存の設定項目...
    
    /**
     * リボンアイコンを左クリックした際に、直接ホームを開く代わりにコンテキストメニューを表示するかどうか。
     * true: メニューを表示する
     * false: 直接ホームを開く (デフォルト)
     */
    showRibbonMenu: boolean;
}
```

### デフォルト値

```typescript
export const DEFAULT_SETTINGS: MarimoBridgeSettings = {
    // 既存のデフォルト設定...
    showRibbonMenu: false,
};
```

### バリデーションルール
- `showRibbonMenu` は `boolean` 型でなければなりません。

### 状態遷移
1. ユーザーが設定タブで「Enable ribbon left-click menu」のトグルを切り替えます。
2. `MarimoBridgeSettingTab` の `onChange` ハンドラーが発火し、`this.plugin.settings.showRibbonMenu = value` が代入されます。
3. `this.plugin.saveSettings()` が呼び出され、設定が `data.json` に永続化されます。
4. 次回以降のリボンクリック時に、`this.settings.showRibbonMenu` の値に基づいて動的にメニュー表示処理が分岐します。
