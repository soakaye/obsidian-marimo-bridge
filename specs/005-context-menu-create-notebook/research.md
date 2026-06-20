# 技術調査 (Research) - コンテキストメニューへのノートブック作成機能の追加

**作成日**: 2026-06-19

## 調査の目的
Obsidian のファイルエクスプローラ上での右クリックメニュー（コンテキストメニュー）に項目を追加し、クリックされたフォルダやファイルの親ディレクトリに新規ノートブックを作成・表示するための API 仕様および最適なパス解決方法の検証。

## 調査結果

### 1. `file-menu` イベントの仕様と対象オブジェクト
Obsidian API の `Workspace` クラスは `file-menu` イベントを提供しており、これを利用してコンテキストメニューをカスタマイズできます。
```typescript
this.registerEvent(
    this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => { ... })
);
```
- 引数 `file` は `TAbstractFile` 型であり、実際には `TFile`（ファイル）または `TFolder`（フォルダ）のインスタンスになります。
- ファイルエクスプローラ内の項目（フォルダやファイル）を右クリックしたときにこのイベントがトリガーされます。

### 2. パス解決と新規ノートブック作成ロジック
右クリックされた対象に応じて、作成先フォルダのパス (`folderPath`) を以下のように決定します：
- **`TFolder` の場合**:
  右クリックされた対象そのものがフォルダであるため、`file.path` を作成先フォルダとします。
- **`TFile` の場合**:
  右クリックされた対象がファイルであるため、その親フォルダである `file.parent?.path` を作成先フォルダとします。親フォルダが解決できない（null の）場合は、Vault ルート（空文字列 `""`）をデフォルト値とします。

### 3. 実装アプローチの比較
既存の `createNotebook()` メソッドは、アクティブファイル (`getActiveFile()`) の親フォルダ配下にノートブックを作成するようにハードコーディングされていました。
```typescript
private async createNotebook(): Promise<void> {
    const folder = this.app.workspace.getActiveFile()?.parent?.path ?? "";
    ...
}
```
これを拡張し、引数で `folderPath?: string` を受け取れるように変更します。
```typescript
private async createNotebook(folderPath?: string): Promise<void> {
    const folder = folderPath ?? this.app.workspace.getActiveFile()?.parent?.path ?? "";
    ...
}
```
これにより、既存のコマンド呼び出し（引数なし）との互換性を保ちつつ、コンテキストメニューからのフォルダ指定作成（引数あり）に対応できます。

### 4. 未解決の技術的課題 (NEEDS CLARIFICATION)
- 特になし。

## 結論と意思決定
既存の `createNotebook` メソッドのシグネチャを `createNotebook(folderPath?: string)` に拡張し、`file-menu` イベントハンドラー内で `file instanceof TFolder ? file.path : file.parent?.path` によって解決されたパスを渡して呼び出します。これにより、最小限のコード修正で安全かつ要件を満たす実装が実現可能です。
