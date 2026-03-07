// ============================================================
// hooks/useSpotifyStats.ts
// Hook React principal — orchestre toutes les requêtes stats
// Ultimate Wrapped — Sprint 2
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

  // Ref pour annuler les requêtes obsolètes si le filtre change pendant le chargement
  const abortRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!db) return;

    abortRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const filter = buildDateFilter(period);

      // Lancement en parallèle pour maximiser les performances
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
        getDiscoveryTrends(db),        // Toujours all_time (mesure la découverte historique)
        getDarkestMonths(db, 5),        // Toujours all_time (comparaison globale)
      ]);

      if (abortRef.current) return; // Le filtre a changé, on abandonne

      setStats({
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
      });
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

  // Recharge quand la DB ou la période change
  useEffect(() => {
    fetchAll();
    return () => {
      abortRef.current = true;
    };
  }, [fetchAll]);

  const setPeriod = useCallback((key: PeriodKey) => {
    abortRef.current = true; // Annule la requête en cours
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
    refetch: fetchAll,
    hasData: stats.global !== null && stats.global.totalPlays > 0,
  };
}
