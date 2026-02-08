import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchBeats, fetchBeatById, searchBeats } from '../services/beatService';
import type { Beat } from '../types';

// Simple in-memory cache shared across hook instances
let beatsCache: Beat[] | null = null;
const beatByIdCache: Map<string, Beat> = new Map();

export function useBeats() {
  const [beats, setBeats] = useState<Beat[]>(beatsCache ?? []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!beatsCache || beatsCache.length === 0) {
      loadBeats();
    }
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBeats = useCallback(async (force = false) => {
    if (beatsCache && !force) {
      setBeats(beatsCache);
      return beatsCache;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBeats();
      beatsCache = data;
      data.forEach(b => beatByIdCache.set(b.id, b));
      if (mounted.current) setBeats(data);
      return data;
    } catch (err: any) {
      const msg = err?.message ?? 'Error fetching beats';
      setError(msg);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const getBeat = useCallback(async (id: string) => {
    const cached = beatByIdCache.get(id);
    if (cached) return cached;
    try {
      const beat = await fetchBeatById(id);
      if (beat) {
        beatByIdCache.set(id, beat);
      }
      return beat;
    } catch (err) {
      console.error('getBeat error', err);
      return null;
    }
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query || query.trim() === '') return [];
    try {
      return await searchBeats(query.trim());
    } catch (err) {
      console.error('search error', err);
      return [];
    }
  }, []);

  return {
    beats,
    loading,
    error,
    loadBeats,
    getBeat,
    search
  } as const;
}
