# 開発ガイド

## Git運用ルール

### ブランチ戦略

- **main**: 本番ブランチ。直接コミット可（個人プロジェクト）
- 機能ブランチ: 大きな変更時のみ使用（任意）

### コミットメッセージ

Conventional Commits 形式:

```
<type>: <description>

例:
feat: ダッシュボードにタイマー機能を追加
fix: モバイルでのレイアウト崩れを修正
refactor: レポート生成ロジックを整理
docs: README.mdを更新
```

| type | 用途 |
|---|---|
| feat | 新機能 |
| fix | バグ修正 |
| refactor | リファクタリング |
| docs | ドキュメント |
| style | スタイル変更（機能変更なし） |
| chore | ビルド・設定変更 |

### コミット前チェック

```bash
npx tsc --noEmit   # 型チェック必須
npm run build       # ビルド確認（デプロイ前）
```

## 命名規則

### ファイル名

| 種類 | 規則 | 例 |
|---|---|---|
| コンポーネント | PascalCase | `LoginPage.tsx`, `UIComponents.tsx` |
| サービス | camelCase | `supabase.ts`, `storage.ts` |
| フック | camelCase (use-) | `useAuth.ts`, `useSupabaseSync.ts` |
| 型定義 | camelCase | `types.ts` |
| SQL | snake_case (連番) | `001_create_tables.sql` |

### TypeScript

| 種類 | 規則 | 例 |
|---|---|---|
| インターフェース | PascalCase | `Client`, `TimeEntry`, `AppState` |
| enum | PascalCase | `Currency` |
| 関数 | camelCase | `saveClient`, `loadAllUserData` |
| 変数 | camelCase | `activeEntryId`, `monthlyFixedFees` |
| 定数 | UPPER_SNAKE_CASE | `STORAGE_KEY`, `DEFAULT_SETTINGS` |
| DBインターフェース | PascalCase (Db-) | `DbClient`, `DbTimeEntry` |
| Reducer アクション | UPPER_SNAKE_CASE | `START_TIMER`, `ADD_CLIENT` |

### CSS / Tailwind

- Tailwind ユーティリティクラスを優先
- カスタムクラス: kebab-case（`.theme-bg`, `.contrast-text`）
- CSS変数: `--theme-color` 形式

### データベース

- テーブル名: snake_case 複数形（`time_entries`, `monthly_fixed_fees`）
- カラム名: snake_case（`user_id`, `start_time`, `created_at`）

## コーディング規約

### React

1. **関数コンポーネントのみ**（クラスコンポーネント不使用）
2. **App.tsx に集約**: 新規コンポーネントは App.tsx 内に定義
3. **useReducer パターン**: 状態変更は `dispatch({ type: 'ACTION', payload })` 経由
4. **useMemo**: グラフ計算などの重い処理に使用
5. **useCallback**: イベントハンドラに使用

### スタイリング

1. **Tailwind ユーティリティクラスを使用**
2. **テーマカラーは CSS 変数経由**: `var(--theme-color)`
3. **レスポンシブ**: モバイルファースト（デフォルト = モバイル、`md:` `lg:` でデスクトップ）
4. **カスタムCSS は index.html の `<style>` タグに追加**

### 状態管理

1. **グローバル状態**: `AppState` を `useReducer` で管理
2. **ローカル状態**: コンポーネント内の `useState` で管理（フォーム入力、UI状態等）
3. **永続化**: 状態変更 → localStorage 保存 → Supabase 同期

### Supabase 操作

1. **CRUD は services/supabase.ts 経由**
2. **upsert パターン**: 保存は全て upsert（INSERT or UPDATE）
3. **型変換**: DB型 ⇔ フロントエンド型の変換関数を使用
4. **エラーハンドリング**: console.error + false/null を返す

## テスト方針

### 現状

- 自動テスト: 未導入
- 手動テスト: 開発サーバーでの目視確認

### 手動テスト手順

1. `npm run dev` で開発サーバー起動
2. ブラウザで http://localhost:3000 にアクセス
3. デスクトップ / モバイル（DevTools）両方で確認
4. 主要フローを操作:
   - タイマー開始/停止
   - エントリ編集/削除
   - クライアント追加/編集
   - レポート生成
   - 設定変更

### 型チェック

```bash
npx tsc --noEmit
```

変更後に必ず実行。TypeScript エラーが0件であることを確認。

## デプロイ手順

### 1. ビルド確認

```bash
npm run build
```

### 2. プレビューデプロイ

```bash
npx netlify deploy --dir=dist
```

プレビューURLで動作確認。

### 3. 本番デプロイ

```bash
npx netlify deploy --prod --dir=dist
```

### 注意事項

- 本番デプロイ前にプレビューで確認すること
- `npx tsc --noEmit` でエラーがないことを確認
- `npm run build` でビルドが成功することを確認

## トラブルシューティング

### ポート競合

Vite が3000番ポートを使えない場合、自動的に3001, 3002... と探索する。

### Tailwind が効かない

CDN 版のため、カスタム設定は `index.html` の `tailwind.config` に記述。
`tailwind.config.js` ファイルは存在しない。

### Supabase 接続エラー

- anon key がハードコードされているため、通常は接続可能
- CORS エラーの場合: Supabase ダッシュボードで許可ドメインを確認

### ビルドエラー

- `npx tsc --noEmit` で型エラーを確認
- importmap と npm パッケージのバージョン不一致に注意
