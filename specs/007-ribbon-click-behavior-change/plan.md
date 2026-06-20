# 実装計画: リボンボタンのマウス操作変更機能の追加

**ブランチ**: `007-ribbon-click-behavior-change` | **作成日**: 2026-06-19 | **仕様書**: [spec.md](file:///C:/Users/asuzuki.SSL/Documents/obsidian/working/.obsidian/plugins/obsidian-marimo-bridge/specs/007-ribbon-click-behavior-change/spec.md)

**インプット**: `/specs/007-ribbon-click-behavior-change/spec.md` の機能仕様書

## 概要

本機能の目的は、Obsidian リボンアイコンに対するマウス操作の挙動を変更することです。
- **左クリック**: メニューを挟まず、即座に marimo のホームダッシュボードを新しいタブで開く挙動に戻します。
- **右クリック**: これまで左クリックで表示されていたリボンメニュー（「Open marimo home」と「Create new marimo notebook」）を表示します。

また、本機能の標準化に伴い、不要となる旧設定項目 `showRibbonMenu` （「Enable ribbon left-click menu」）をコードベース（データモデル、設定UI）から削除してクリーンアップします。

## 技術的コンテキスト

**言語/version**: TypeScript 5.4+ / ES2022

**主要な依存関係**: Obsidian API (特に `registerDomEvent`、`Menu`、`addRibbonIcon`、`saveData` / `loadData`)

**ストレージ**: Obsidian ローカルデータ (不要になった設定項目 `showRibbonMenu` の削除)

**テスト**: Obsidian デスクトップ環境における手動検証

**対象プラットフォーム**: Desktop (Obsidian Desktop のみ)

**プロジェクトタイプ**: desktop-app (Obsidian プラグイン)

**パフォーマンス目標**: 左クリックによるホーム画面起動、および右クリックによるメニュー表示が即時（200ms未満）に完了すること

**制約事項**: 右クリックによるブラウザ標準のコンテキストメニューの表示を抑制するため、`evt.preventDefault()` を確実に実行すること

## 憲法チェック

*ゲート: フェーズ 0 研究の前にパスする必要があります。フェーズ 1 設計の後に再チェックします。*

- **原則 I (言語区分)**: パス。最優先指示に従い、アーティファクトは日本語で作成し、コミュニケーションも日本語で行います。
- **原則 II (デスクトップ限定)**: パス。モバイルサポートは追加せず、デスクトップ専用 API (`registerDomEvent` など) を使用します。
- **原則 III (プロセスライフサイクル)**: パス。サーバープロセス管理には影響しません。
- **原則 IV (安全なローカルバインディング)**: パス。バインディングへの変更はありません。
- **原則 V (仮想環境の優先)**: パス。Python パス解決には影響しません。
- **コーディング規約 (インデントにタブ、コメント維持)**: パス。タブインデントを使用し、既存のコメントを維持します。

## プロジェクト構成

### ドキュメント (本機能)

```text
specs/007-ribbon-click-behavior-change/
├── plan.md              # 本ファイル
├── research.md          # フェーズ0 成果物
├── data-model.md        # フェーズ1 成果物
└── quickstart.md        # フェーズ1 成果物
```

### ソースコード (リポジトリルート)

```text
src/
├── main.ts             # addRibbonIcon の挙動変更、右クリックイベントリスナーの登録
└── settings.ts         # showRibbonMenu 設定項目の定義・デフォルト値・UIの削除
```

**構造決定**: 単一プロジェクトのレイアウト。変更は `src/main.ts` と `src/settings.ts` に限定されます。

## 複雑度トラッキング

*ゲート違反はないため空欄*

| 違反内容 | 必要とされる理由 | よりシンプルな代替案を却下した理由 |
|---|---|---|
| なし | - | - |
