# logmee

フリーランス向け時間管理・売上追跡アプリ。

## スタック

- **フロントエンド**: React 19 + TypeScript + Tailwind CSS (CDN)
- **状態管理**: useReducer（App.tsx 内に集約）
- **バックエンド**: Supabase（認証・DB・同期）
- **ビルド**: Vite 6
- **デプロイ**: Netlify
- **ライブラリ**: recharts, lucide-react, @dnd-kit, react-router-dom v7

## プロジェクト構造

```
App.tsx              # メインアプリ（全コンポーネント・状態管理・reducer）
types.ts             # 型定義（Client, TimeEntry, Project, UserSettings 等）
index.html           # エントリHTML（Tailwind CDN・カスタムCSS・importmap）
index.tsx            # React エントリポイント
components/
  LoginPage.tsx      # ログインページ
  UIComponents.tsx   # 共通UI（Button, Card, Input, Select）
services/
  supabase.ts        # Supabase クライアント・CRUD操作
  storage.ts         # ローカルストレージ管理
  pdfGenerator.ts    # PDF生成
hooks/
  useAuth.ts         # 認証フック
  useSupabaseSync.ts # Supabase同期フック
```

## 重要な注意事項

- **App.tsx は巨大ファイル（約200KB）**。全コンポーネントと状態管理を含む。編集時は行番号を確認して対象箇所を特定すること。
- **ディレクトリ名に末尾スペースあり**: `logmee ` （`logmee` ではない）。パス指定時は引用符で囲むこと。
- **Tailwind は CDN版**。`tailwind.config` は `index.html` の `<script>` タグ内に定義。カスタムユーティリティは `index.html` の `<style>` タグに追加。
- **外部ライブラリは importmap 経由**（`index.html` 内）で esm.sh から読み込み。

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動（localhost:3000）
npm run build        # 本番ビルド（dist/）
npx tsc --noEmit     # 型チェック（変更後に必ず実行）
```

## デプロイ

```bash
npx netlify deploy --dir=dist       # プレビューデプロイ
npx netlify deploy --prod --dir=dist # 本番デプロイ
```

本番デプロイ前にプレビューで確認すること。

## コーディング規約

- **日本語**: UIテキスト・コメントは日本語
- **スタイル**: Tailwind ユーティリティクラス。テーマカラーは CSS変数 `--theme-color` 経由
- **フォント**: Noto Sans JP（Google Fonts）
- **アイコン**: lucide-react
- **状態変更**: `dispatch({ type: 'ACTION_TYPE', payload: ... })` パターン。型定義やdispatchアクションの追加は `App.tsx` 内の reducer を参照
- **コンポーネント**: 現状 App.tsx 内に定義。新規コンポーネントも App.tsx に追加（分割しない）

## セキュリティ

- APIキー、パスワード等は環境変数で管理（ハードコード禁止）
- **環境変数は必須**: `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を `.env.local` に設定すること。フォールバック値はコードに含めない
- `.env.example` をテンプレートとして使用。実際の値は `.env.local` に設定（`.gitignore` 済み）
- すべての外部入力を検証

## ドキュメント管理

以下のドキュメントファイルをプロジェクトルートに管理している。
**システム要件・仕様・DB設計・UI設計等に変更があった場合は、関連するドキュメントファイルを必ず更新すること。**

| ファイル | 内容 |
|---|---|
| README.md | プロジェクト概要・セットアップ手順 |
| PRODUCT_REQUIREMENTS.md | 機能要件・非機能要件 |
| TECH_STACK.md | 技術スタック・ライブラリ・構成ルール |
| DATA_MODEL.md | ER図・スキーマ定義・型定義 |
| API_SPEC.md | Supabase API関数・認証フロー |
| SYSTEM_ARCHITECTURE.md | システム構成図・外部連携・インフラ |
| UI_UX_SPEC.md | 画面遷移・デザインシステム・コンポーネント |
| DEVELOPMENT_GUIDE.md | Git運用・命名規則・テスト方針 |
| CONTEXT.md | 進捗状況・特記事項・制約事項 |

## カスタムエージェント

`.claude/agents/` に5つのエージェント:

| エージェント | 役割 |
|---|---|
| team-lead | 開発タスクの全体把握・エージェント案内 |
| code-reviewer | 最厳格コードレビュー |
| tester | テストケース作成・手動テスト手順 |
| deployer | Netlify ビルド・デプロイ |
| documenter | ドキュメント作成・更新 |
