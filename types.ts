export enum Currency {
  JPY = 'JPY',
  USD = 'USD'
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  fixedFee: number;       // 固定報酬（必須）
  isActive: boolean;      // アクティブ/完了のフラグ
}

export interface Client {
  id: string;
  name: string;
  color: string; // Hex code for UI identification
  defaultHourlyRate?: number;

  closingDate?: number; // 99 for End of Month, or 5, 10, 15, 20, 25...
  taskPresets: string[]; // Frequently used tasks specifically for this client
  projects: Project[];   // このクライアントの案件リスト
  categories: string[];  // 作業カテゴリ（クライアントごとに管理）
}

export interface TimeEntry {
  id: string;
  clientId: string;
  startTime: number; // Timestamp
  endTime: number | null; // Null if currently running
  description: string; // "What was done"
  rateType?: 'hourly' | 'fixed'; // Determines if this entry adds to hourly revenue or burns down fixed retainer
  projectId?: string;     // 紐づく案件ID（任意）
  category?: string;      // 作業カテゴリ（自由入力テキスト）
}

export interface UserSettings {
  monthlyGoalHours: number;
  monthlyGoalRevenue: number; // Target revenue (manual estimation)
  currency: Currency;
  userName: string;
  themeColor: string;
  enableNotifications: boolean;
}

// 月別の固定報酬エントリ（案件単位）
export interface MonthlyFixedFee {
  id: string;
  projectId: string;      // 案件単位で月ON/OFF管理
  yearMonth: string; // "2024-01" 形式
  amount: number;
  note?: string;
}

export interface SavedReport {
  id: string;
  clientId: string;
  title: string;        // 報告書タイトル
  periodStart: string;  // "2024-01-01"
  periodEnd: string;    // "2024-01-31"
  createdAt: number;    // Date.now()
  htmlContent: string;  // 完全なHTML文書
}

export interface AppState {
  clients: Client[];
  entries: TimeEntry[];
  settings: UserSettings;
  activeEntryId: string | null;
  monthlyFixedFees: MonthlyFixedFee[];
  savedReports: SavedReport[];
}
