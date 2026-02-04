import { createClient, Session, User } from '@supabase/supabase-js';
import { Client, TimeEntry, UserSettings, MonthlyFixedFee, Currency } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iefnonbwfronqhbqxnib.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllZm5vbmJ3ZnJvbnFoYnF4bmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODg4NDYsImV4cCI6MjA4NTc2NDg0Nn0.q-mTqJkMmni_baUWYTvASybmylgLpfLnrFWYjC1xwuo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// Database Types (matching Supabase tables)
// ============================================

export interface DbProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserSettings {
  id: string;
  user_id: string;
  monthly_goal_hours: number;
  monthly_goal_revenue: number;
  currency: string;
  user_name: string;
  theme_color: string;
  enable_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbClient {
  id: string;
  user_id: string;
  name: string;
  color: string;
  default_hourly_rate: number | null;
  default_fixed_fee: number | null;
  closing_date: number | null;
  task_presets: string[];
  created_at: string;
  updated_at: string;
}

export interface DbTimeEntry {
  id: string;
  user_id: string;
  client_id: string;
  start_time: number;
  end_time: number | null;
  description: string;
  rate_type: 'hourly' | 'fixed';
  created_at: string;
  updated_at: string;
}

export interface DbMonthlyFixedFee {
  id: string;
  user_id: string;
  client_id: string;
  year_month: string;
  amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Type Converters
// ============================================

function dbClientToClient(dbClient: DbClient): Client {
  return {
    id: dbClient.id,
    name: dbClient.name,
    color: dbClient.color,
    defaultHourlyRate: dbClient.default_hourly_rate ?? undefined,
    defaultFixedFee: dbClient.default_fixed_fee ?? undefined,
    closingDate: dbClient.closing_date ?? undefined,
    taskPresets: dbClient.task_presets || []
  };
}

function clientToDbClient(client: Client, userId: string): Omit<DbClient, 'created_at' | 'updated_at'> {
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    color: client.color,
    default_hourly_rate: client.defaultHourlyRate ?? null,
    default_fixed_fee: client.defaultFixedFee ?? null,
    closing_date: client.closingDate ?? null,
    task_presets: client.taskPresets || []
  };
}

function dbEntryToEntry(dbEntry: DbTimeEntry): TimeEntry {
  return {
    id: dbEntry.id,
    clientId: dbEntry.client_id,
    startTime: dbEntry.start_time,
    endTime: dbEntry.end_time,
    description: dbEntry.description,
    rateType: dbEntry.rate_type
  };
}

function entryToDbEntry(entry: TimeEntry, userId: string): Omit<DbTimeEntry, 'created_at' | 'updated_at'> {
  return {
    id: entry.id,
    user_id: userId,
    client_id: entry.clientId,
    start_time: entry.startTime,
    end_time: entry.endTime,
    description: entry.description,
    rate_type: entry.rateType || 'hourly'
  };
}

function dbSettingsToSettings(dbSettings: DbUserSettings): UserSettings {
  return {
    monthlyGoalHours: dbSettings.monthly_goal_hours,
    monthlyGoalRevenue: dbSettings.monthly_goal_revenue,
    currency: dbSettings.currency as Currency,
    userName: dbSettings.user_name,
    themeColor: dbSettings.theme_color,
    enableNotifications: dbSettings.enable_notifications
  };
}

function settingsToDbSettings(settings: UserSettings, userId: string): Partial<DbUserSettings> {
  return {
    user_id: userId,
    monthly_goal_hours: settings.monthlyGoalHours,
    monthly_goal_revenue: settings.monthlyGoalRevenue,
    currency: settings.currency,
    user_name: settings.userName,
    theme_color: settings.themeColor,
    enable_notifications: settings.enableNotifications
  };
}

function dbFeeToFee(dbFee: DbMonthlyFixedFee): MonthlyFixedFee {
  return {
    id: dbFee.id,
    clientId: dbFee.client_id,
    yearMonth: dbFee.year_month,
    amount: dbFee.amount,
    note: dbFee.note ?? undefined
  };
}

function feeToDbFee(fee: MonthlyFixedFee, userId: string): Omit<DbMonthlyFixedFee, 'created_at' | 'updated_at'> {
  return {
    id: fee.id,
    user_id: userId,
    client_id: fee.clientId,
    year_month: fee.yearMonth,
    amount: fee.amount,
    note: fee.note ?? null
  };
}

// ============================================
// Authentication Functions
// ============================================

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }

  return data;
};

export const signOut = async (): Promise<boolean> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  return true;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

// ============================================
// Profile Functions
// ============================================

export const getProfile = async (userId: string): Promise<DbProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

// ============================================
// User Settings Functions
// ============================================

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No settings found, return default
      return null;
    }
    console.error('Error fetching user settings:', error);
    return null;
  }

  return dbSettingsToSettings(data);
};

export const saveUserSettings = async (userId: string, settings: UserSettings): Promise<boolean> => {
  const { error } = await supabase
    .from('user_settings')
    .upsert(settingsToDbSettings(settings, userId), {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving user settings:', error);
    return false;
  }

  return true;
};

// ============================================
// Client Functions
// ============================================

export const getClients = async (userId: string): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return (data || []).map(dbClientToClient);
};

export const saveClient = async (userId: string, client: Client): Promise<boolean> => {
  const { error } = await supabase
    .from('clients')
    .upsert(clientToDbClient(client, userId), {
      onConflict: 'id'
    });

  if (error) {
    console.error('Error saving client:', error);
    return false;
  }

  return true;
};

export const deleteClient = async (clientId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    console.error('Error deleting client:', error);
    return false;
  }

  return true;
};

// ============================================
// Time Entry Functions
// ============================================

export const getTimeEntries = async (userId: string): Promise<TimeEntry[]> => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time entries:', error);
    return [];
  }

  return (data || []).map(dbEntryToEntry);
};

export const saveTimeEntry = async (userId: string, entry: TimeEntry): Promise<boolean> => {
  const { error } = await supabase
    .from('time_entries')
    .upsert(entryToDbEntry(entry, userId), {
      onConflict: 'id'
    });

  if (error) {
    console.error('Error saving time entry:', error);
    return false;
  }

  return true;
};

export const deleteTimeEntry = async (entryId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('Error deleting time entry:', error);
    return false;
  }

  return true;
};

// ============================================
// Monthly Fixed Fee Functions
// ============================================

export const getMonthlyFixedFees = async (userId: string): Promise<MonthlyFixedFee[]> => {
  const { data, error } = await supabase
    .from('monthly_fixed_fees')
    .select('*')
    .eq('user_id', userId)
    .order('year_month', { ascending: false });

  if (error) {
    console.error('Error fetching monthly fixed fees:', error);
    return [];
  }

  return (data || []).map(dbFeeToFee);
};

export const saveMonthlyFixedFee = async (userId: string, fee: MonthlyFixedFee): Promise<boolean> => {
  const { error } = await supabase
    .from('monthly_fixed_fees')
    .upsert(feeToDbFee(fee, userId), {
      onConflict: 'id'
    });

  if (error) {
    console.error('Error saving monthly fixed fee:', error);
    return false;
  }

  return true;
};

export const deleteMonthlyFixedFee = async (feeId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('monthly_fixed_fees')
    .delete()
    .eq('id', feeId);

  if (error) {
    console.error('Error deleting monthly fixed fee:', error);
    return false;
  }

  return true;
};

// ============================================
// Bulk Data Operations (for initial sync)
// ============================================

export interface AppData {
  clients: Client[];
  entries: TimeEntry[];
  settings: UserSettings;
  monthlyFixedFees: MonthlyFixedFee[];
}

export const loadAllUserData = async (userId: string): Promise<AppData | null> => {
  try {
    const [clients, entries, settings, monthlyFixedFees] = await Promise.all([
      getClients(userId),
      getTimeEntries(userId),
      getUserSettings(userId),
      getMonthlyFixedFees(userId)
    ]);

    // Default settings if none exist
    const defaultSettings: UserSettings = {
      monthlyGoalHours: 160,
      monthlyGoalRevenue: 0,
      currency: Currency.JPY,
      userName: '',
      themeColor: 'blue',
      enableNotifications: true
    };

    return {
      clients,
      entries,
      settings: settings || defaultSettings,
      monthlyFixedFees
    };
  } catch (error) {
    console.error('Error loading all user data:', error);
    return null;
  }
};

export const syncClientToSupabase = async (userId: string, client: Client): Promise<boolean> => {
  return saveClient(userId, client);
};

export const syncEntryToSupabase = async (userId: string, entry: TimeEntry): Promise<boolean> => {
  return saveTimeEntry(userId, entry);
};

export const syncSettingsToSupabase = async (userId: string, settings: UserSettings): Promise<boolean> => {
  return saveUserSettings(userId, settings);
};

export const syncMonthlyFeeToSupabase = async (userId: string, fee: MonthlyFixedFee): Promise<boolean> => {
  return saveMonthlyFixedFee(userId, fee);
};

// ============================================
// Real-time Subscriptions
// ============================================

export const subscribeToClients = (userId: string, callback: (clients: Client[]) => void) => {
  return supabase
    .channel('clients_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        // Refetch all clients when any change occurs
        const clients = await getClients(userId);
        callback(clients);
      }
    )
    .subscribe();
};

export const subscribeToTimeEntries = (userId: string, callback: (entries: TimeEntry[]) => void) => {
  return supabase
    .channel('time_entries_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_entries',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        const entries = await getTimeEntries(userId);
        callback(entries);
      }
    )
    .subscribe();
};
