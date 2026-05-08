# システムアーキテクチャ

## システム全体構成図

```
┌─────────────────────────────────────────────────────────┐
│                      クライアント                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React SPA (Vite)                     │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ App.tsx  │  │  Hooks   │  │   Services    │  │  │
│  │  │(全コンポ) │  │useAuth   │  │supabase.ts   │  │  │
│  │  │          │  │useSync   │  │storage.ts    │  │  │
│  │  │ReducerPt│  │          │  │pdfGenerator  │  │  │
│  │  └──────────┘  └──────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────┼───────────────────────────┐  │
│  │           localStorage (logmee_data_v16)           │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼──────────────────────────────┐
│                    Supabase Cloud                        │
│  ┌───────────────────────┼───────────────────────────┐  │
│  │              Supabase Auth                         │  │
│  │         (Google OAuth Provider)                    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐ │  │
│  │  │profiles  │ │clients   │ │time_entries       │ │  │
│  │  │settings  │ │projects  │ │monthly_fixed_fees │ │  │
│  │  │          │ │          │ │saved_reports      │ │  │
│  │  └──────────┘ └──────────┘ └───────────────────┘ │  │
│  │              RLS (Row Level Security)              │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Realtime Engine                       │  │
│  │    (clients, time_entries の変更通知)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Netlify CDN                          │
│          静的ファイルホスティング + SPA リダイレクト        │
│          本番URL: https://logmee-app.netlify.app         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    外部サービス                           │
│  ┌───────────────┐  ┌────────────────┐                  │
│  │ Google OAuth  │  │ Google Fonts   │                  │
│  │ (認証)         │  │ (Noto Sans JP) │                  │
│  └───────────────┘  └────────────────┘                  │
│  ┌───────────────┐  ┌────────────────┐                  │
│  │ esm.sh CDN   │  │ Tailwind CDN   │                  │
│  │ (importmap)   │  │ (CSS)          │                  │
│  └───────────────┘  └────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## アーキテクチャパターン

### フロントエンド

**Single File Architecture**: 全コンポーネントと状態管理を `App.tsx` 1ファイルに集約。

```
App.tsx
├── AppState (useReducer)
│   ├── clients: Client[]
│   ├── entries: TimeEntry[]
│   ├── settings: UserSettings
│   ├── activeEntryId: string | null
│   ├── monthlyFixedFees: MonthlyFixedFee[]
│   └── savedReports: SavedReport[]
├── Reducer (19アクションタイプ)
│   ├── START_TIMER / STOP_TIMER
│   ├── ADD_ENTRY / UPDATE_ENTRY / DELETE_ENTRY
│   ├── ADD_CLIENT / UPDATE_CLIENT / DELETE_CLIENT / REORDER_CLIENTS
│   ├── UPDATE_SETTINGS
│   ├── SET_MONTHLY_FEE / DELETE_MONTHLY_FEE
│   ├── ADD_PROJECT / UPDATE_PROJECT / DELETE_PROJECT
│   ├── LOAD_DATA
│   ├── ADD_SAVED_REPORT / DELETE_SAVED_REPORT
│   └── SET_ACTIVE_ENTRY
└── ページコンポーネント
    ├── Dashboard
    ├── LogsPage
    ├── ReportPage
    ├── ClientsPage
    ├── ProjectsPage
    ├── AnalyticsPage
    ├── UsagePage
    └── AppLayout (ナビゲーション・設定モーダル)
```

### データフロー

```
ユーザー操作
    ↓
dispatch({ type: 'ACTION', payload: data })
    ↓
Reducer (状態更新)
    ↓
┌─────────────────────────┐
│  useEffect (状態変更検知) │
├─────────────────────────┤
│ 1. saveState(state)     │  → localStorage に保存
│ 2. syncXxx(data)        │  → Supabase に同期
└─────────────────────────┘
```

### 認証フロー

```
アプリ起動
    ↓
useAuth() → getCurrentSession()
    ↓
セッションあり?
├── Yes → loadAllUserData() → dispatch({ type: 'LOAD_DATA' })
└── No  → LoginPage 表示
              ↓
         signInWithGoogle()
              ↓
         Google OAuth リダイレクト
              ↓
         onAuthStateChange → セッション検知
              ↓
         loadAllUserData() → dispatch({ type: 'LOAD_DATA' })
```

### 同期戦略

**Optimistic Update + Background Sync**:
1. Reducer で即座に状態更新（UI即時反映）
2. localStorage に保存（オフライン対応）
3. Supabase に非同期同期（バックグラウンド）
4. 設定変更のみ 500ms デバウンス（頻繁な変更に対応）

**リアルタイム購読**:
- `clients` と `time_entries` テーブルの変更を Supabase Realtime で購読
- 他デバイスからの変更をリアルタイム反映

## 外部連携

| サービス | 用途 | 接続方式 |
|---|---|---|
| Supabase Auth | Google OAuth 認証 | SDK |
| Supabase Database | データ永続化 | SDK (PostgREST) |
| Supabase Realtime | 変更通知 | WebSocket |
| Google OAuth | ユーザー認証 | OAuth 2.0 (Supabase経由) |
| Google Fonts | フォント配信 | CDN |
| esm.sh | npm パッケージ配信 | CDN (importmap) |
| Tailwind CSS | CSSフレームワーク | CDN |
| Netlify | ホスティング・CDN | 静的デプロイ |

## インフラ構成

### ホスティング (Netlify)

- **タイプ**: 静的サイトホスティング
- **ビルド**: `vite build` → `dist/`
- **SPA対応**: 全パスを `index.html` にリダイレクト（200）
- **CDN**: Netlify Edge Network でグローバル配信

### データベース (Supabase)

- **エンジン**: PostgreSQL
- **セキュリティ**: RLS（Row Level Security）で全テーブル保護
- **バックアップ**: Supabase 管理（自動）
- **接続**: anon key による匿名接続 + RLS で認証ユーザーのデータのみアクセス可

### CDN依存

| リソース | CDN | 用途 |
|---|---|---|
| Tailwind CSS | cdn.tailwindcss.com | CSSフレームワーク |
| React / ReactDOM | esm.sh | UIライブラリ |
| recharts | esm.sh | グラフライブラリ |
| lucide-react | esm.sh | アイコン |
| react-router-dom | esm.sh | ルーティング |
| Noto Sans JP | fonts.googleapis.com | フォント |

> CDN から読み込むライブラリは `index.html` の importmap で定義。
> npm でもインストール済み（型定義・ビルド用）だが、ランタイムは CDN 版を使用。
