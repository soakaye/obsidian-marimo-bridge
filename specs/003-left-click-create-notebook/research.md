# 技術調査 (Research) - リボンアイコンの左クリックメニューによるノートブック作成機能の追加

**作成日**: 2026-06-19

## 調査の目的
リボンアイコンを左クリックした際に、設定が有効な場合のみ Obsidian のネイティブメニュー（「Open marimo home」と「Create new marimo notebook」）を表示する実装方法の確立と、既存実装の検証。

## 調査結果

### 1. Obsidian `Menu` API の使用方法
Obsidian の `Menu` クラスを使用することで、任意の位置にポップアップメニューを表示することができます。
- `new Menu()` でインスタンスを生成。
- `menu.addItem(item => item.setTitle(...).setIcon(...).onClick(...))` で項目を追加。
- `menu.showAtMouseEvent(evt)` でマウスのクリックイベントの位置に表示。

### 2. 既存コードベースの検証
既存のコードを確認したところ、すでに以下の実装が含まれていました。

- **設定項目 (`src/settings.ts`)**:
  `showRibbonMenu: boolean` トグル設定が「Enable ribbon left-click menu」という名前で追加されています。
- **リボンアイコンの処理 (`src/main.ts`)**:
  `addRibbonIcon` 内で `showRibbonMenu` が有効な場合、`Menu` インスタンスを作成し、「Open marimo home」と「Create new marimo notebook」の2つの項目を追加して `showAtMouseEvent(evt)` で表示する処理が実装されています。

### 3. 未解決の技術的課題 (NEEDS CLARIFICATION)
- 特にありません。既存の実装で仕様書の要件を満たしているか動作確認を行い、ビルドや動作に不具合がないかを検証するタスクとなります。
- 設定が動的に反映されるか（リロードなしで反映されるか）について、`showRibbonMenu` 設定の切り替えによって直ちに挙動が変化する設計になっているかを検証します。既存の `addRibbonIcon` ハンドラーはクリック時に `this.settings.showRibbonMenu` の現在の値を参照するため、動的反映の要件（SC-001）を完全に満たしています。

## 結論と意思決定
追加のコード修正は不要である可能性が高いですが、設定トグルやメニュー項目が仕様通りに正しく動作するかどうかの最終的な手動検証とビルドテストを実施します。
また、メニュー項目に表示されるアイコンが Obsidian の標準アイコンライブラリ（Lucide）に準拠していることを確認します（"notebook-pen" および "plus"）。
