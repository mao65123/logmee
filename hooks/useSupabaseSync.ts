import { useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import {
  saveClient,
  deleteClient as deleteClientFromDb,
  saveTimeEntry,
  deleteTimeEntry as deleteEntryFromDb,
  saveUserSettings,
  saveMonthlyFixedFee,
  deleteMonthlyFixedFee as deleteFeeFromDb,
  saveProject,
  deleteProject as deleteProjectFromDb
} from '../services/supabase';
import { Client, TimeEntry, UserSettings, MonthlyFixedFee, Project } from '../types';

interface UseSupabaseSyncReturn {
  syncClient: (client: Client) => Promise<boolean>;
  syncDeleteClient: (clientId: string) => Promise<boolean>;
  syncEntry: (entry: TimeEntry) => Promise<boolean>;
  syncDeleteEntry: (entryId: string) => Promise<boolean>;
  syncSettings: (settings: UserSettings) => Promise<boolean>;
  syncMonthlyFee: (fee: MonthlyFixedFee) => Promise<boolean>;
  syncDeleteMonthlyFee: (feeId: string) => Promise<boolean>;
  syncProject: (project: Project) => Promise<boolean>;
  syncDeleteProject: (projectId: string) => Promise<boolean>;
}

export function useSupabaseSync(user: User | null): UseSupabaseSyncReturn {
  // Debounce timer refs
  const settingsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const syncClient = useCallback(async (client: Client): Promise<boolean> => {
    if (!user) return false;
    return saveClient(user.id, client);
  }, [user]);

  const syncDeleteClient = useCallback(async (clientId: string): Promise<boolean> => {
    if (!user) return false;
    return deleteClientFromDb(clientId);
  }, [user]);

  const syncEntry = useCallback(async (entry: TimeEntry): Promise<boolean> => {
    if (!user) return false;
    return saveTimeEntry(user.id, entry);
  }, [user]);

  const syncDeleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    if (!user) return false;
    return deleteEntryFromDb(entryId);
  }, [user]);

  const syncSettings = useCallback(async (settings: UserSettings): Promise<boolean> => {
    if (!user) return false;

    // Debounce settings sync to avoid too many writes
    if (settingsDebounceRef.current) {
      clearTimeout(settingsDebounceRef.current);
    }

    return new Promise((resolve) => {
      settingsDebounceRef.current = setTimeout(async () => {
        const result = await saveUserSettings(user.id, settings);
        resolve(result);
      }, 500);
    });
  }, [user]);

  const syncMonthlyFee = useCallback(async (fee: MonthlyFixedFee): Promise<boolean> => {
    if (!user) return false;
    return saveMonthlyFixedFee(user.id, fee);
  }, [user]);

  const syncDeleteMonthlyFee = useCallback(async (feeId: string): Promise<boolean> => {
    if (!user) return false;
    return deleteFeeFromDb(feeId);
  }, [user]);

  const syncProject = useCallback(async (project: Project): Promise<boolean> => {
    if (!user) return false;
    return saveProject(user.id, project);
  }, [user]);

  const syncDeleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user) return false;
    return deleteProjectFromDb(projectId);
  }, [user]);

  return {
    syncClient,
    syncDeleteClient,
    syncEntry,
    syncDeleteEntry,
    syncSettings,
    syncMonthlyFee,
    syncDeleteMonthlyFee,
    syncProject,
    syncDeleteProject
  };
}
