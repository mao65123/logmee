export enum Currency {
  JPY = 'JPY',
  USD = 'USD'
}

export interface Client {
  id: string;
  name: string;
  color: string; // Hex code for UI identification
  defaultHourlyRate?: number;
  defaultFixedFee?: number;
  closingDate?: number; // 99 for End of Month, or 5, 10, 15, 20, 25...
  taskPresets: string[]; // Frequently used tasks specifically for this client
}

export interface TimeEntry {
  id: string;
  clientId: string;
  startTime: number; // Timestamp
  endTime: number | null; // Null if currently running
  description: string; // "What was done"
  rateType?: 'hourly' | 'fixed'; // Determines if this entry adds to hourly revenue or burns down fixed retainer
}

export interface UserSettings {
  monthlyGoalHours: number;
  monthlyGoalRevenue: number; // Target revenue (manual estimation)
  currency: Currency;
  userName: string;
  themeColor: string;
  enableNotifications: boolean;
}

// 月別の固定報酬エントリ
export interface MonthlyFixedFee {
  id: string;
  clientId: string;
  yearMonth: string; // "2024-01" 形式
  amount: number;
  note?: string;
}

export interface AppState {
  clients: Client[];
  entries: TimeEntry[];
  settings: UserSettings;
  activeEntryId: string | null;
  monthlyFixedFees: MonthlyFixedFee[];
}