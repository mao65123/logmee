# logmee

フリーランス向け時間管理・売上追跡アプリ。

クライアントごとの稼働時間を記録し、時給・固定報酬の売上を自動計算。レポート生成、分析、案件管理を一つのアプリで完結。

## 主な機能

- **タイマー計測**: ワンタップで作業時間を計測。フローティングタイマーで他ページ遷移中も継続
- **クライアント管理**: 時給設定・締め日・作業カテゴリ・タスクプリセットをクライアントごとに管理
- **案件管理**: クライアントに紐づく案件（プロジェクト）を登録。固定報酬の月次ON/OFF管理
- **履歴・ログ**: 月別・日付別の作業履歴閲覧。カテゴリ・案件ごとの集計表示
- **レポート生成**: 期間指定で作業報告書をHTML/PDF/CSV出力。保存・再利用可能
- **分析ダッシュボード**: クライアント別・カテゴリ別・日次の稼働分析グラフ
- **目標管理**: 月間稼働時間・売上目標の設定と達成率表示
- **テーマカスタマイズ**: テーマカラー変更（グラデーション対応）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | React 19 + TypeScript |
| スタイリング | Tailwind CSS (CDN) |
| 状態管理 | useReducer（App.tsx内に集約） |
| バックエンド | Supabase（認証・DB・リアルタイム同期） |
| 認証 | Google OAuth（Supabase Auth） |
| ビルド | Vite 6 |
| デプロイ | Netlify |
| グラフ | recharts |
| アイコン | lucide-react |
| D&D | @dnd-kit |
| ルーティング | react-router-dom v7 |

## セットアップ

### 前提条件

- Node.js 18+
- npm

### インストール

```bash
cd "logmee "
npm install
```

### 環境変数（必須）

Supabase の接続情報を `.env.local` に設定してください。テンプレートをコピーして値を入力:

```bash
cp .env.example .env.local
# .env.local を編集して Supabase の接続情報を入力
```

| 変数名 | 説明 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase プロジェクトURL（必須） |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key（必須） |

### 開発サーバー起動

```bash
npm run dev
# http://localhost:3000 で起動
```

### ビルド

```bash
npm run build
# dist/ ディレクトリに出力
```

### 型チェック

```bash
npx tsc --noEmit
```

## デプロイ

Netlify にデプロイ:

```bash
# プレビューデプロイ
npx netlify deploy --dir=dist

# 本番デプロイ
npx netlify deploy --prod --dir=dist
```

**本番URL**: https://logmee-app.netlify.app

## プロジェクト構造

```
logmee /
├── App.tsx                    # メインアプリ（全コンポーネント・状態管理・reducer）
├── types.ts                   # 型定義
├── index.html                 # エントリHTML（Tailwind CDN・CSS変数・importmap）
├── index.tsx                  # React エントリポイント
├── index.css                  # 追加CSS
├── components/
│   ├── LoginPage.tsx          # ログインページ
│   └── UIComponents.tsx       # 共通UI（Button, Card, Input, Select）
├── services/
│   ├── supabase.ts            # Supabase クライアント・CRUD操作・リアルタイム購読
│   ├── storage.ts             # ローカルストレージ管理・マイグレーション
│   └── pdfGenerator.ts        # PDF/CSV生成
├── hooks/
│   ├── useAuth.ts             # 認証フック
│   └── useSupabaseSync.ts     # Supabase同期フック（デバウンス付き）
├── supabase/
│   └── migrations/            # DBマイグレーションSQL
├── .claude/
│   └── agents/                # Claude Code カスタムエージェント
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## ライセンス

Private
