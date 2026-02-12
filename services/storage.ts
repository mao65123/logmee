import { AppState, UserSettings, Currency } from '../types';

const STORAGE_KEY = 'logmee_data_v16';

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
  savedReports: [],
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      // Try to migrate from old versions
      const v15Data = localStorage.getItem('logmee_data_v15');
      const v14Data = v15Data || localStorage.getItem('logmee_data_v14');
      const v13Data = v14Data || localStorage.getItem('logmee_data_v13');
      const oldData = v13Data || localStorage.getItem('logmee_data_v12');
      if (oldData) {
        const oldState = JSON.parse(oldData);
        const migrated = migrateState(oldState);
        saveState(migrated);
        return migrated;
      }
      return INITIAL_STATE;
    }
    const state = JSON.parse(serialized);
    return migrateState(state);
  } catch (e) {
    console.error("Failed to load state", e);
    return INITIAL_STATE;
  }
};

function migrateState(state: any): AppState {
    // Migration logic
    if (!state.settings) state.settings = { ...DEFAULT_SETTINGS };
    if (!state.settings.themeColor) state.settings.themeColor = DEFAULT_SETTINGS.themeColor;
    if (state.settings.enableNotifications === undefined) state.settings.enableNotifications = false;

    // Ensure clients have new fields
    if (state.clients) {
      state.clients = state.clients.map((c: any) => {
        // Remove deprecated defaultFixedFee
        const { defaultFixedFee, ...rest } = c;
        return {
          ...rest,
          taskPresets: c.taskPresets || [],
          closingDate: c.closingDate || 99,
          defaultHourlyRate: c.defaultHourlyRate || 0,
          projects: (c.projects || []).map((p: any) => {
            // Remove deprecated hourlyRate, ensure fixedFee is required
            const { hourlyRate, ...pRest } = p;
            return {
              ...pRest,
              fixedFee: p.fixedFee ?? 0,
            };
          }),
          categories: c.categories || []
        };
      });
    }

    // Ensure entries have rateType, projectId, category
    if (state.entries) {
      state.entries = state.entries.map((e: any) => {
        return {
           ...e,
           rateType: e.rateType || 'hourly',
           projectId: e.projectId,
           category: e.category
        };
      });
    }

    // Reset monthlyFixedFees (migrated from clientId to projectId-based)
    // Old data is incompatible, so reset to empty
    if (!state.monthlyFixedFees || (state.monthlyFixedFees.length > 0 && state.monthlyFixedFees[0].clientId)) {
      state.monthlyFixedFees = [];
    }

    // Ensure savedReports exists
    if (!state.savedReports) {
      state.savedReports = [];
    }

    return state;
}

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
