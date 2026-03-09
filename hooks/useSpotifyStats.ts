// ============================================================
// hooks/useSpotifyStats.ts
// Hook React principal — cache invalidant par empreinte
// Cache sessionStorage : vit le temps de l'onglet, jamais d'accumulation
// ============================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Dexie from "dexie";
import {
  buildDateFilter,
  PERIOD_OPTIONS,
  type PeriodKey,
  type DateFilter,
  type GlobalStats,
  type ArtistStat,
  type TrackStat,
  type AlbumStat,
  type YearStat,
  type MonthStat,
  type HourStat,
  type DayStat,
  type SkipStats,
  type ListeningStreaks,
  type BehaviorStats,
  type DiscoveryYear,
  type MoodMonth,
} from "../lib/queries/types";
import {
  getGlobalStats,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getMostSkippedTracks,
  getYearlyTrends,
  getMonthlyTrends,
  getListeningByHour,
  getListeningByDayOfWeek,
  getSkipStats,
  getListeningStreaks,
  getBehaviorStats,
  getDiscoveryTrends,
  getDarkestMonths,
} from "../lib/queries/stats";

// ============================================================
// TYPES
// ============================================================

export interface SpotifyStats {
  global: GlobalStats | null;
  topArtists: ArtistStat[];
  topTracks: TrackStat[];
  topAlbums: AlbumStat[];
  mostSkipped: TrackStat[];
  yearlyTrends: YearStat[];
  monthlyTrends: MonthStat[];
  byHour: HourStat[];
  byDayOfWeek: DayStat[];
  skipStats: SkipStats | null;
  streaks: ListeningStreaks | null;
  behavior: BehaviorStats | null;
  discoveryTrends: DiscoveryYear[];
  darkestMonths: MoodMonth[];
}

export interface UseSpotifyStatsReturn {
  stats: SpotifyStats;
  isLoading: boolean;
  error: string | null;
  period: PeriodKey;
  setPeriod: (key: PeriodKey) => void;
  currentFilter: DateFilter;
  periodOptions: typeof PERIOD_OPTIONS;
  refetch: () => Promise<void>;
  hasData: boolean;
  cacheHit: boolean; // pour debug/affichage optionnel
}

const EMPTY_STATS: SpotifyStats = {
  global: null,
  topArtists: [],
  topTracks: [],
  topAlbums: [],
  mostSkipped: [],
  yearlyTrends: [],
  monthlyTrends: [],
  byHour: [],
  byDayOfWeek: [],
  skipStats: null,
  streaks: null,
  behavior: null,
  discoveryTrends: [],
  darkestMonths: [],
};

// ============================================================
// CACHE — sessionStorage (vit le temps de l'onglet uniquement)
// Clé : "uw_cache_{period}_{count}_{lastTs}"
// Logique : si l'empreinte est identique → cache valide → pas de recalcul
// Si nouvelles écoutes → empreinte différente → recalcul + nouveau cache
// ============================================================

const CACHE_PREFIX = "uw_cache_";

interface CacheEntry {
  fingerprint: string;
  stats: SpotifyStats;
  cachedAt: number;
}

/** Calcule l'empreinte en UNE requête rapide (count + dernière écoute) */
async function computeFingerprint(db: Dexie, period: PeriodKey): Promise<string> {
  const table = db.table("plays");
  const filter = buildDateFilter(period);

  let count: number;
  let lastTs: number;

  try {
    if (!filter || (!filter.from && !filter.to)) {
      count = await table.count();
      // Récupérer uniquement le dernier ts via l'index
      const last = await table.orderBy("ts").last();
      lastTs = last?.ts ?? 0;
    } else {
      const query = filter.from && filter.to
        ? table.where("ts").between(filter.from, filter.to, true, true)
        : filter.from
        ? table.where("ts").aboveOrEqual(filter.from)
        : table.where("ts").belowOrEqual(filter.to!);

      count = await query.count();
      const entries = await query.sortBy("ts");
      lastTs = entries[entries.length - 1]?.ts ?? 0;
    }
  } catch {
    count = 0;
    lastTs = 0;
  }

  return `${period}_${count}_${lastTs}`;
}

function readCache(fingerprint: string): SpotifyStats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + fingerprint);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);

    // Sécurité : invalider les caches de plus de 30 min quand même
    const MAX_AGE = 30 * 60 * 1000;
    if (Date.now() - entry.cachedAt > MAX_AGE) {
      sessionStorage.removeItem(CACHE_PREFIX + fingerprint);
      return null;
    }

    // Reconstruire les objets Date (JSON.parse les sérialise en string)
    if (entry.stats.global) {
      entry.stats.global.firstPlay = entry.stats.global.firstPlay
        ? new Date(entry.stats.global.firstPlay)
        : null;
      entry.stats.global.lastPlay = entry.stats.global.lastPlay
        ? new Date(entry.stats.global.lastPlay)
        : null;
    }

    return entry.stats;
  } catch {
    return null;
  }
}

function writeCache(fingerprint: string, stats: SpotifyStats): void {
  try {
    // Nettoyer les anciens caches de cette session avant d'en écrire un nouveau
    // pour éviter l'accumulation si on change souvent de filtre
    const keysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) keysToDelete.push(key);
    }
    // Garder max 5 entrées (une par période utilisée dans la session)
    if (keysToDelete.length >= 5) {
      keysToDelete.slice(0, keysToDelete.length - 4).forEach(k =>
        sessionStorage.removeItem(k)
      );
    }

    const entry: CacheEntry = {
      fingerprint,
      stats,
      cachedAt: Date.now(),
    };
    sessionStorage.setItem(CACHE_PREFIX + fingerprint, JSON.stringify(entry));
  } catch {
    // sessionStorage plein ou désactivé → on ignore silencieusement
  }
}

// ============================================================
// HOOK
// ============================================================

export function useSpotifyStats(
  db: Dexie | null,
  initialPeriod: PeriodKey = "all_time"
): UseSpotifyStatsReturn {
  const [stats, setStats] = useState<SpotifyStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriodState] = useState<PeriodKey>(initialPeriod);
  const [cacheHit, setCacheHit] = useState(false);

  const abortRef = useRef(false);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    if (!db) return;

    abortRef.current = false;
    setError(null);

    try {
      // ── Étape 1 : calculer l'empreinte (ultra-rapide, ~5ms) ──
      const fingerprint = await computeFingerprint(db, period);

      // ── Étape 2 : vérifier le cache ──
      if (!forceRefresh) {
        const cached = readCache(fingerprint);
        if (cached) {
          setStats(cached);
          setCacheHit(true);
          setIsLoading(false);
          return; // Affichage instantané
        }
      }

      // ── Étape 3 : cache manquant ou invalidé → recalcul complet ──
      setCacheHit(false);
      setIsLoading(true);

      const filter = buildDateFilter(period);

      const [
        global,
        topArtists,
        topTracks,
        topAlbums,
        mostSkipped,
        yearlyTrends,
        monthlyTrends,
        byHour,
        byDayOfWeek,
        skipStats,
        streaks,
        behavior,
        discoveryTrends,
        darkestMonths,
      ] = await Promise.all([
        getGlobalStats(db, filter),
        getTopArtists(db, 20, filter),
        getTopTracks(db, 20, filter),
        getTopAlbums(db, 20, filter),
        getMostSkippedTracks(db, 10, filter),
        getYearlyTrends(db, filter),
        getMonthlyTrends(db, filter),
        getListeningByHour(db, filter),
        getListeningByDayOfWeek(db, filter),
        getSkipStats(db, filter),
        getListeningStreaks(db, filter),
        getBehaviorStats(db, filter),
        getDiscoveryTrends(db),
        getDarkestMonths(db, 5),
      ]);

      if (abortRef.current) return;

      const newStats: SpotifyStats = {
        global, topArtists, topTracks, topAlbums, mostSkipped,
        yearlyTrends, monthlyTrends, byHour, byDayOfWeek,
        skipStats, streaks, behavior, discoveryTrends, darkestMonths,
      };

      // ── Étape 4 : stocker en cache pour cette session ──
      writeCache(fingerprint, newStats);

      setStats(newStats);
    } catch (err) {
      if (!abortRef.current) {
        setError(
          `Erreur lors du chargement des stats: ${
            err instanceof Error ? err.message : "Inconnue"
          }`
        );
      }
    } finally {
      if (!abortRef.current) {
        setIsLoading(false);
      }
    }
  }, [db, period]);

  useEffect(() => {
    fetchAll();
    return () => { abortRef.current = true; };
  }, [fetchAll]);

  const setPeriod = useCallback((key: PeriodKey) => {
    abortRef.current = true;
    setPeriodState(key);
  }, []);

  return {
    stats,
    isLoading,
    error,
    period,
    setPeriod,
    currentFilter: buildDateFilter(period),
    periodOptions: PERIOD_OPTIONS,
    refetch: () => fetchAll(true), // forceRefresh = true ignore le cache
    hasData: stats.global !== null && stats.global.totalPlays > 0,
    cacheHit,
  };
}
