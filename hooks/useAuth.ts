import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  signInWithGoogle,
  signOut as supabaseSignOut,
  getCurrentSession,
  onAuthStateChange,
  loadAllUserData,
  AppData
} from '../services/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loadUserData: () => Promise<AppData | null>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const initializeAuth = async () => {
      try {
        const currentSession = await getCurrentSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('認証の初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = onAuthStateChange((newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (!result) {
        setError('Googleログインに失敗しました');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('ログイン中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await supabaseSignOut();
      if (!success) {
        setError('ログアウトに失敗しました');
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Sign out error:', err);
      setError('ログアウト中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserData = useCallback(async (): Promise<AppData | null> => {
    if (!user) {
      return null;
    }
    try {
      return await loadAllUserData(user.id);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('データの読み込みに失敗しました');
      return null;
    }
  }, [user]);

  return {
    session,
    user,
    loading,
    error,
    signIn,
    signOut,
    loadUserData
  };
}
