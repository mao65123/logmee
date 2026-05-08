# API仕様書

## 概要

logmee はフロントエンドSPAで、バックエンドAPIは Supabase が提供。
フロントエンドから `@supabase/supabase-js` クライアントを通じて直接DBを操作する。
REST APIエンドポイントの定義はなく、Supabase クライアントの関数呼び出しでCRUDを実行。

## 認証フロー

### Google OAuth ログイン

```
1. ユーザーがログインボタンをクリック
2. supabase.auth.signInWithOAuth({ provider: 'google' })
3. Google OAuth 認可画面にリダイレクト
4. 認可後、元のURLにリダイレクト（コールバック）
5. Supabase がセッションを自動管理
6. onAuthStateChange コールバックでセッション検知
7. loadAllUserData() でユーザーデータを一括読み込み
```

### セッション管理

- セッションは Supabase が自動管理（localStorage にトークン保存）
- `useAuth` フックがセッション状態を監視
- ページリロード時は `getCurrentSession()` で復元
- ログアウト時は `supabase.auth.signOut()` でセッション破棄

## Supabase クライアント関数

### 認証関数（services/supabase.ts）

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `signInWithGoogle()` | - | `OAuthResponse \| null` | Google OAuth ログイン開始 |
| `signOut()` | - | `boolean` | ログアウト |
| `getCurrentSession()` | - | `Session \| null` | 現在のセッション取得 |
| `getCurrentUser()` | - | `User \| null` | 現在のユーザー取得 |
| `onAuthStateChange(callback)` | `(session) => void` | `Subscription` | 認証状態変更の購読 |

### プロフィール

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getProfile(userId)` | `string` | `DbProfile \| null` | プロフィール取得 |

### ユーザー設定

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getUserSettings(userId)` | `string` | `UserSettings \| null` | 設定取得 |
| `saveUserSettings(userId, settings)` | `string, UserSettings` | `boolean` | 設定保存（upsert） |

### クライアント

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getClients(userId)` | `string` | `Client[]` | クライアント一覧取得 |
| `saveClient(userId, client)` | `string, Client` | `boolean` | クライアント保存（upsert） |
| `deleteClient(clientId)` | `string` | `boolean` | クライアント削除 |

### 案件

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getProjects(userId)` | `string` | `Project[]` | 案件一覧取得 |
| `saveProject(userId, project)` | `string, Project` | `boolean` | 案件保存（upsert） |
| `deleteProject(projectId)` | `string` | `boolean` | 案件削除 |

### 作業時間エントリ

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getTimeEntries(userId)` | `string` | `TimeEntry[]` | エントリ一覧取得 |
| `saveTimeEntry(userId, entry)` | `string, TimeEntry` | `boolean` | エントリ保存（upsert） |
| `deleteTimeEntry(entryId)` | `string` | `boolean` | エントリ削除 |

### 月次固定報酬

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getMonthlyFixedFees(userId)` | `string` | `MonthlyFixedFee[]` | フィー一覧取得 |
| `saveMonthlyFixedFee(userId, fee)` | `string, MonthlyFixedFee` | `boolean` | フィー保存（upsert） |
| `deleteMonthlyFixedFee(feeId)` | `string` | `boolean` | フィー削除 |

### 保存済みレポート

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `getSavedReports(userId)` | `string` | `SavedReport[]` | レポート一覧取得 |
| `saveSavedReport(userId, report)` | `string, SavedReport` | `boolean` | レポート保存（upsert） |
| `deleteSavedReport(reportId)` | `string` | `boolean` | レポート削除 |

### 一括読み込み

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `loadAllUserData(userId)` | `string` | `AppData \| null` | 全データを並列取得。clients に projects をマージして返す |

### 同期ヘルパー

| 関数 | パラメータ | 戻り値 | 説明 |
|---|---|---|---|
| `syncClientToSupabase(userId, client)` | `string, Client` | `boolean` | saveClient のエイリアス |
| `syncEntryToSupabase(userId, entry)` | `string, TimeEntry` | `boolean` | saveTimeEntry のエイリアス |
| `syncSettingsToSupabase(userId, settings)` | `string, UserSettings` | `boolean` | saveUserSettings のエイリアス |
| `syncMonthlyFeeToSupabase(userId, fee)` | `string, MonthlyFixedFee` | `boolean` | saveMonthlyFixedFee のエイリアス |
| `syncProjectToSupabase(userId, project)` | `string, Project` | `boolean` | saveProject のエイリアス |

## リアルタイム購読

### subscribeToClients

```typescript
subscribeToClients(userId: string, callback: (clients: Client[]) => void)
```

`clients` テーブルの変更（INSERT/UPDATE/DELETE）を監視。変更時に全クライアントを再取得してコールバック。

### subscribeToTimeEntries

```typescript
subscribeToTimeEntries(userId: string, callback: (entries: TimeEntry[]) => void)
```

`time_entries` テーブルの変更を監視。変更時に全エントリを再取得してコールバック。

## 同期フック（useSupabaseSync）

`useSupabaseSync(user)` フックが提供する関数:

| 関数 | 説明 | 特記事項 |
|---|---|---|
| `syncClient` | クライアント保存 | 即時実行 |
| `syncDeleteClient` | クライアント削除 | 即時実行 |
| `syncEntry` | エントリ保存 | 即時実行 |
| `syncDeleteEntry` | エントリ削除 | 即時実行 |
| `syncSettings` | 設定保存 | **500msデバウンス** |
| `syncMonthlyFee` | フィー保存 | 即時実行 |
| `syncDeleteMonthlyFee` | フィー削除 | 即時実行 |
| `syncProject` | 案件保存 | 即時実行 |
| `syncDeleteProject` | 案件削除 | 即時実行 |

## 型変換

フロントエンド型（camelCase）⇔ DB型（snake_case）の変換は `services/supabase.ts` 内の変換関数が担当:

| 変換関数 | 方向 |
|---|---|
| `dbClientToClient` | DB → フロントエンド |
| `clientToDbClient` | フロントエンド → DB |
| `dbProjectToProject` | DB → フロントエンド |
| `projectToDbProject` | フロントエンド → DB |
| `dbEntryToEntry` | DB → フロントエンド |
| `entryToDbEntry` | フロントエンド → DB |
| `dbSettingsToSettings` | DB → フロントエンド |
| `settingsToDbSettings` | フロントエンド → DB |
| `dbFeeToFee` | DB → フロントエンド |
| `feeToDbFee` | フロントエンド → DB |
| `dbSavedReportToSavedReport` | DB → フロントエンド |
| `savedReportToDbSavedReport` | フロントエンド → DB |
