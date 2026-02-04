import { AppState, UserSettings, Currency } from '../types';

const STORAGE_KEY = 'logmee_data_v12'; 

const DEFAULT_SETTINGS: UserSettings = {
  monthlyGoalHours: 160,
  monthlyGoalRevenue: 500000,
  currency: Currency.JPY,
  userName: 'Freelancer',
  themeColor: '#FFD700',
  enableNotifications: false,
};

const INITIAL_STATE: AppState = {
  clients: [],
  entries: [],
  settings: DEFAULT_SETTINGS,
  activeEntryId: null,
  monthlyFixedFees: [],
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return INITIAL_STATE;
    const state = JSON.parse(serialized);
    
    // Migration logic
    if (!state.settings) state.settings = { ...DEFAULT_SETTINGS };
    if (!state.settings.themeColor) state.settings.themeColor = DEFAULT_SETTINGS.themeColor;
    if (state.settings.enableNotifications === undefined) state.settings.enableNotifications = false;
    
    // Ensure clients have new fields
    if (state.clients) {
      state.clients = state.clients.map((c: any) => ({
        ...c,
        taskPresets: c.taskPresets || [],
        closingDate: c.closingDate || 99, // Default to End of Month
        // Ensure rates exist even if 0
        defaultHourlyRate: c.defaultHourlyRate || 0,
        defaultFixedFee: c.defaultFixedFee || 0
      }));
    }

    // Ensure entries have rateType
    if (state.entries) {
      state.entries = state.entries.map((e: any) => {
        return {
           ...e,
           rateType: e.rateType || 'hourly'
        };
      });
    }

    // Ensure monthlyFixedFees exists
    if (!state.monthlyFixedFees) {
      state.monthlyFixedFees = [];
    }

    return state;
  } catch (e) {
    console.error("Failed to load state", e);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

export const seedData = (): AppState => {
  return INITIAL_STATE;
};