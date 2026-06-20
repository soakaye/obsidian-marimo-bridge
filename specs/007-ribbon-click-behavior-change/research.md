# 技術調査 (Research) - リボンボタンのマウス操作変更機能の追加

**作成日**: 2026-06-19

## 調査の目的
リボンアイコンに対する左クリックでの marimo home 直接起動、および右クリックでのカスタムコンテキストメニュー表示の実装方法、並びに旧設定項目の安全な削除手順の検証。

## 調査結果

### 1. リボンアイコンへの右クリックイベントバインド
Obsidian の `addRibbonIcon` API は `HTMLElement` を返します。
```typescript
const ribbonIconEl = this.addRibbonIcon("notebook-pen", "Open marimo home", () => {
    // 左クリック処理 (marimo home 直接起動)
    void this.openMarimo(undefined);
});
```
取得した `HTMLElement` に対して、右クリックを検出するために `contextmenu` イベントをバインドします。
メモリリークやプラグインアンロード時のイベントクリーンアップ漏れを防ぐため、直接 `addEventListener` を呼ぶのではなく、Obsidian のプラグインクラスが提供する `registerDomEvent` ヘルパーを使用します。
```typescript
this.registerDomEvent(ribbonIconEl, "contextmenu", (evt: MouseEvent) => {
    evt.preventDefault(); // デフォルトのOS/ブラウザ右クリックメニューを抑制
    // メニュー表示処理...
});
```

### 2. 設定項目の削除とクリーンアップ
不要になった `showRibbonMenu` トグルを以下のファイルから削除します。
- `src/settings.ts`:
  - `showRibbonMenu: boolean;` 型定義
  - `DEFAULT_SETTINGS` 内の `showRibbonMenu: false,` 初期値
  - `MarimoBridgeSettingTab` 内の UI コンポーネント構築コード
- これらを削除しても、型安全性が維持される（コンパイルエラーにならない）ことをビルド確認します。

### 3. 未解決の技術的課題 (NEEDS CLARIFICATION)
- 特になし。

## 結論と意思決定
リボンアイコンの左クリック時は直接 `openMarimo` を呼び、`registerDomEvent` を用いて右クリック (`contextmenu`) 時のみ `Menu` を構築して表示するアプローチを採用します。不要となった `showRibbonMenu` 設定は型エラーを避けるために設定ファイルから一貫して削除します。
