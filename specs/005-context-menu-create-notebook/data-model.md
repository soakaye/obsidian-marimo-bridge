# データモデル設計 (Data Model) - コンテキストメニューへのノートブック作成機能の追加

**作成日**: 2026-06-19

## 概要
本ドキュメントでは、本機能のコンテキストメニュー処理で用いられるエンティティの構造および関係性について定義します。新しい設定データモデルは導入しませんが、Obsidian API の提供するオブジェクトを操作します。

## エンティティモデル

### 1. `TAbstractFile` (Obsidian API 内の型)
コンテキストメニューがトリガーされた際に対象となるリソース。
- 属性:
  - `path`: `string` (Vaultルートからの相対パス。例: `workbooks/analysis`)
  - `name`: `string` (ファイルまたはフォルダ名)
  - `parent`: `TFolder | null` (親フォルダオブジェクト)

### 2. `TFolder` (Inherits from `TAbstractFile`)
右クリックされた対象がフォルダである場合のエンティティ。
- 本機能における解釈: 新しいノートブック `.py` ファイルは、このオブジェクトの `path` 直下に作成されます。

### 3. `TFile` (Inherits from `TAbstractFile`)
右クリックされた対象がファイルである場合のエンティティ。
- 本機能における解釈: 新しいノートブック `.py` ファイルは、このオブジェクトの親フォルダである `parent.path` 配下に作成されます。

## 状態遷移とフロー

1. **イベント検知 (Right-Click)**:
   ユーザーがファイルエクスプローラ上で項目を右クリックすると、Obsidian が `file-menu` イベントをトリガーします。
2. **メニューアイテム登録**:
   イベントハンドラーが `menu.addItem()` を介して「Create new marimo notebook」という項目を追加します。
3. **パス解決 (OnClick)**:
   ユーザーが項目をクリックすると、イベントコールバックが実行され、クリック対象オブジェクト `file` の型チェックを行います：
   - `file instanceof TFile` の場合: `folderPath = file.parent?.path`
   - それ以外（`TFolder` など）の場合: `folderPath = file.path`
4. **ノートブック生成**:
   解決された `folderPath` を指定して `createNotebook(folderPath)` が実行され、Vault 内に新しい `untitled_marimo.py`（または衝突回避の連番名）が物理的に作成されます。
5. **ビューの表示**:
   新しく作成されたファイルのパスを指定して `openMarimo(target)` が呼び出され、エディタビューがアクティブ化されます。
