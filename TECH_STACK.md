# 技術スタック詳細

## 言語・フレームワーク

### TypeScript (~5.8)

- 全ソースコードを TypeScript で記述
- strict モード有効
- 型チェック: `npx tsc --noEmit`

### React 19

- 関数コンポーネントのみ（クラスコンポーネント不使用）
- Hooks: useState, useEffect, useCallback, useMemo, useReducer, useRef
- importmap 経由で esm.sh から読み込み（index.html内で定義）

### Vite 6

- 開発サーバー: HMR対応、ポート3000
- ビルド: `vite build` → `dist/`
- プラグイン: `@vitejs/plugin-react`

## 主要ライブラリ

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `react` | ^19.2.4 | UIフレームワーク |
| `react-dom` | ^19.2.4 | DOMレンダリング |
| `react-router-dom` | ^7.13.0 | SPA ルーティング |
| `@supabase/supabase-js` | ^2.94.0 | Supabase クライアント（認証・DB・リアルタイム） |
| `recharts` | ^3.7.0 | グラフ描画（棒・円グラフ） |
| `lucide-react` | ^0.563.0 | アイコン |
| `@dnd-kit/core` | ^6.3.1 | ドラッグ&ドロップ |
| `@dnd-kit/sortable` | ^10.0.0 | ソート可能リスト |
| `@dnd-kit/utilities` | ^3.2.2 | D&D ユーティリティ |

### 開発依存

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `typescript` | ~5.8.2 | 型チェック |
| `vite` | ^6.2.0 | ビルドツール |
| `@vitejs/plugin-react` | ^5.0.0 | React プラグイン |
| `@types/node` | ^22.14.0 | Node.js 型定義 |

## スタイリング

### Tailwind CSS (CDN)

- `<script src="https://cdn.tailwindcss.com">` で読み込み（npm パッケージではない）
- カスタム設定は `index.html` の `<script>` タグ内に `tailwind.config` で定義
- カスタムユーティリティは `index.html` の `<style>` タグに記述

### CSS変数（テーマシステム）

```css
:root {
  --theme-color: #FFD700;
  --theme-bg-gradient: #FFD700;
  --theme-contrast-text: #1E293B;
}
```

- `.theme-bg`: テーマカラー背景
- `.theme-text`: テーマカラーテキスト
- `.theme-border`: テーマカラーボーダー
- `.contrast-text`: コントラストテキスト

### フォント

- Noto Sans JP（Google Fonts）
- ウェイト: 300, 400, 500, 700

## ディレクトリ構成ルール

```
logmee /
├── App.tsx              # 全コンポーネント・状態管理・reducer（分割しない）
├── types.ts             # 型定義（全インターフェース）
├── index.html           # Tailwind CDN・CSS変数・importmap
├── index.tsx            # React エントリポイント
├── index.css            # 追加CSS
├── components/          # ログインページ・共通UIのみ
│   ├── LoginPage.tsx
│   └── UIComponents.tsx
├── services/            # 外部サービス連携
│   ├── supabase.ts      # Supabase CRUD・認証・リアルタイム
│   ├── storage.ts       # localStorage
│   └── pdfGenerator.ts  # PDF/CSV生成
├── hooks/               # カスタムフック
│   ├── useAuth.ts
│   └── useSupabaseSync.ts
└── supabase/
    └── migrations/      # SQLマイグレーション
```

### 構成ルール

1. **App.tsx に集約**: 新規コンポーネントは App.tsx 内に定義（ファイル分割しない）
2. **型は types.ts**: 全インターフェース・enum は types.ts に定義
3. **サービス層**: 外部連携（Supabase, localStorage, PDF）は services/ に分離
4. **フック**: 認証・同期ロジックは hooks/ に分離
5. **UIコンポーネント**: 汎用UI（Button, Card 等）のみ components/UIComponents.tsx

## バックエンド (Supabase)

### 使用サービス

- **Auth**: Google OAuth プロバイダー
- **Database**: PostgreSQL（7テーブル、RLS有効）
- **Realtime**: clients, time_entries テーブルの変更購読

### プロジェクト情報

- URL: `https://iefnonbwfronqhbqxnib.supabase.co`
- Region: 自動選択

## デプロイ (Netlify)

- ビルドコマンド: `vite build`
- 出力ディレクトリ: `dist/`
- 本番URL: https://logmee-app.netlify.app
- SPA リダイレクト: `/*` → `/index.html`（200）
