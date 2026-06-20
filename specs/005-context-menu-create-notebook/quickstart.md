# クイックスタートガイド (Quickstart) - コンテキストメニューへのノートブック作成機能の追加

**作成日**: 2026-06-19

## 概要
本ガイドは、開発環境における本機能のビルド、起動、および動作確認の手順を説明します。

## 開発環境のセットアップ

### 1. 依存関係のインストール
プロジェクトのルートディレクトリで以下を実行して、必要なパッケージをインストールします。

```bash
npm install
```

### 2. 開発サーバーの起動 (esbuild watch)
コードの変更を自動検知してビルドするために、次のコマンドを実行します。

```bash
npm run dev
```

### 3. プラグインの有効化
Obsidian を起動し、`Settings` > `Community plugins` から `marimo Bridge` を有効化または再読み込みします。

## 機能の検証手順

### シナリオ 1: フォルダを右クリックして新規ノートブック作成
1. Obsidian のファイルエクスプローラを開きます。
2. 任意のフォルダ（例: `notebooks`）を右クリックしてコンテキストメニューを表示します。
3. メニューに「Create new marimo notebook」という項目が表示されていることを確認します（アイコンは `plus` または `+`）。
4. 「Create new marimo notebook」をクリックします。
5. **結果**: `notebooks/untitled_marimo.py` が作成され、自動的に marimo エディタビューが新しいタブで開くことを確認します。

### シナリオ 2: ファイルを右クリックして新規ノートブック作成
1. Obsidian のファイルエクスプローラ内の任意のファイル（例: `scripts/helper.js` または `docs/README.md`）を右クリックしてコンテキストメニューを表示します。
2. 「Create new marimo notebook」をクリックします。
3. **結果**: 対象ファイルと同じフォルダ（例: `scripts/` または `docs/`）内に `untitled_marimo.py` が作成され、エディタで開くことを確認します。

### シナリオ 3: 名前衝突の確認
1. すでに `untitled_marimo.py` が存在するフォルダを右クリックし、「Create new marimo notebook」を実行します。
2. **結果**: 既存のファイルが上書きされることなく、`untitled_marimo_1.py`（さらに実行すると `untitled_marimo_2.py` ...）のように連番でファイルが新規作成され、正しく開くことを確認します。
