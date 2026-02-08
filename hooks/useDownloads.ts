import { useState, useEffect, useCallback } from 'react';
import { downloadService, DownloadPermission, DownloadStats } from '../services/downloadService';
import type { PlanTier } from '../types';

export function useDownloads(userId?: string) {
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    setError(null);
    try {
      const s = await downloadService.getUserDownloadStats(userId);
      setStats(s);
      return s;
    } catch (err: any) {
      setError(err?.message ?? 'Could not fetch download stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    } else {
      setStats(null);
    }
  }, [userId, refresh]);

  const canDownload = useCallback(async (format: 'mp3' | 'wav' | 'stems', beatLicenseTier: PlanTier): Promise<DownloadPermission> => {
    if (!userId) return { allowed: false, reason: 'Not signed in', remaining: 0, requiresUpgrade: false };
    return downloadService.canUserDownload(userId, format, beatLicenseTier);
  }, [userId]);

  const recordDownload = useCallback(async (beatId: string, format: 'mp3' | 'wav' | 'stems') => {
    if (!userId) return false;
    const ok = await downloadService.recordDownload(userId, beatId, format);
    if (ok) await refresh();
    return ok;
  }, [userId, refresh]);

  return {
    stats,
    loading,
    error,
    refresh,
    canDownload,
    recordDownload
  } as const;
}
