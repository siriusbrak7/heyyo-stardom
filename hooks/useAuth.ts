import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentUser,
  signIn,
  signUp,
  signOut as signOutService,
  onAuthStateChange,
  resetPassword as resetPasswordService,
  updateUserProfile as updateUserProfileService
} from '../services/authService';

import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const current = await getCurrentUser();
        if (mounted) setUser((current as any) ?? null);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Could not get current user');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const sub = onAuthStateChange((u: any) => {
      setUser(u ?? null);
    });

    return () => {
      mounted = false;
      // Supabase returns an object with `subscription` that has unsubscribe. Try to unsubscribe gracefully.
      try {
        (sub as any)?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await signIn(email, password);
      if (resp.error) {
        setError(resp.error.message || 'Sign in failed');
        return null;
      }
      setUser((resp.data as any)?.user ?? null);
      return resp.data;
    } catch (err: any) {
      setError(err?.message ?? 'Sign in exception');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await signUp(email, password);
      if (resp.error) {
        setError(resp.error.message || 'Sign up failed');
        return null;
      }
      setUser((resp.data as any)?.user ?? null);
      return resp.data;
    } catch (err: any) {
      setError(err?.message ?? 'Sign up exception');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await signOutService();
      if (ok) setUser(null);
      return ok;
    } catch (err) {
      console.error('Sign out error', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const ok = await resetPasswordService(email);
      return ok;
    } catch (err: any) {
      setError(err?.message ?? 'Reset password failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: any) => {
    setLoading(true);
    try {
      const ok = await updateUserProfileService(userId, updates);
      if (ok) {
        // Merge shallowly
        setUser(prev => prev ? { ...prev, ...updates } : prev);
      }
      return ok;
    } catch (err: any) {
      setError(err?.message ?? 'Update profile failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    resetPassword,
    updateProfile
  } as const;
}
