# データモデル設計 (Data Model) - リボンボタンのマウス操作変更機能の追加

**作成日**: 2026-06-19

## 概要
本ドキュメントでは、本機能の仕様変更（マウス操作の役割固定）に伴う不要な設定データの削除（デクリメント）について定義します。

## 設定データモデル

### `MarimoBridgeSettings` の変更点

不要になった `showRibbonMenu` トグル変数を `MarimoBridgeSettings` インターフェースから削除します。

```diff
 export interface MarimoBridgeSettings {
 	pythonPath: string;
 	marimoPath: string;
 	port: number;
 	host: string;
 	autoStart: boolean;
 	startupTimeout: number;
 	takeOverPyExtension: boolean;
 	defaultEmbedMode: "edit" | "run";
 	defaultEmbedHeight: number;
-	showRibbonMenu: boolean;
 	showContextMenu: boolean;
 }
```

### デフォルト値

`DEFAULT_SETTINGS` オブジェクトから該当の設定キーを削除します。

```diff
 export const DEFAULT_SETTINGS: MarimoBridgeSettings = {
 	pythonPath: "",
 	marimoPath: "",
 	port: 2718,
 	host: "127.0.0.1",
 	autoStart: true,
 	startupTimeout: 30,
 	takeOverPyExtension: true,
 	defaultEmbedMode: "edit",
 	defaultEmbedHeight: 600,
-	showRibbonMenu: false,
 	showContextMenu: true,
 };
```

### 状態移行と後方互換性
`data.json` 内に既存の `showRibbonMenu` キーが残っていた場合、TypeScript レベルで参照されなくなるため、実行時エラーは発生せず無視されます。クリーンアップのため、次に設定が保存（`saveSettings`）されたタイミングで、ファイルから自動的に `showRibbonMenu` キーが除去されます。
