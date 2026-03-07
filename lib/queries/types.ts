// ============================================================
// lib/queries/types.ts
// Types & interfaces pour toutes les statistiques
// Ultimate Wrapped — Sprint 2
// ============================================================

// ============================================================
// FILTRES TEMPORELS
// ============================================================

export type PeriodKey =
  | "all_time"
  | "last_30_days"
  | "last_90_days"
  | "last_6_months"
  | "last_year"
  | "year_2024"
  | "year_2023"
  | "year_2022"
  | "year_2021"
  | "year_2020";

export interface DateFilter {
  from?: number; // timestamp ms (undefined = pas de borne inférieure)
  to?: number;   // timestamp ms (undefined = pas de borne supérieure)
  label: string;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "all_time",      label: "Tout le temps" },
  { key: "last_30_days",  label: "30 derniers jours" },
  { key: "last_90_days",  label: "90 derniers jours" },
  { key: "last_6_months", label: "6 derniers mois" },
  { key: "last_year",     label: "12 derniers mois" },
  { key: "year_2024",     label: "2024" },
  { key: "year_2023",     label: "2023" },
  { key: "year_2022",     label: "2022" },
  { key: "year_2021",     label: "2021" },
  { key: "year_2020",     label: "2020" },
];

export function buildDateFilter(key: PeriodKey): DateFilter {
  const now = Date.now();
  const DAY_MS = 86_400_000;

  const yearRange = (y: number): DateFilter => ({
    from: new Date(`${y}-01-01T00:00:00.000Z`).getTime(),
    to:   new Date(`${y}-12-31T23:59:59.999Z`).getTime(),
    label: String(y),
  });

  switch (key) {
    case "all_time":      return { label: "Tout le temps" };
    case "last_30_days":  return { from: now - 30  * DAY_MS, to: now, label: "30 derniers jours" };
    case "last_90_days":  return { from: now - 90  * DAY_MS, to: now, label: "90 derniers jours" };
    case "last_6_months": return { from: now - 180 * DAY_MS, to: now, label: "6 derniers mois" };
    case "last_year":     return { from: now - 365 * DAY_MS, to: now, label: "12 derniers mois" };
    case "year_2024":     return yearRange(2024);
    case "year_2023":     return yearRange(2023);
    case "year_2022":     return yearRange(2022);
    case "year_2021":     return yearRange(2021);
    case "year_2020":     return yearRange(2020);
  }
}

// ============================================================
// TIER 1 — Stats globales
// ============================================================

export interface GlobalStats {
  totalMs: number;
  totalHours: number;
  totalDays: number;
  totalPlays: number;
  uniqueArtists: number;
  uniqueTracks: number;
  firstPlay: Date | null;
  lastPlay: Date | null;
  accountAgeYears: number;
}

// ============================================================
// TIER 2 — Tops & Rankings
// ============================================================

export interface ArtistStat {
  artistName: string;
  totalMs: number;
  totalHours: number;
  playCount: number;
  uniqueTracksCount: number;
}

export interface TrackStat {
  trackUri: string;
  trackName: string;
  artistName: string;
  albumName: string;
  totalMs: number;
  totalHours: number;
  playCount: number;
  skipCount: number;
  skipRate: number; // 0–1
}

export interface AlbumStat {
  albumName: string;
  artistName: string;
  totalMs: number;
  totalHours: number;
  playCount: number;
}

// ============================================================
// TIER 3 — Tendances temporelles
// ============================================================

export interface YearStat {
  year: number;
  totalMs: number;
  totalHours: number;
  playCount: number;
  uniqueArtists: number;
  uniqueTracks: number;
}

export interface MonthStat {
  year: number;
  month: number;       // 1–12
  monthLabel: string;  // "Jan 2023"
  totalMs: number;
  totalHours: number;
  playCount: number;
}

export interface HourStat {
  hour: number;       // 0–23
  label: string;      // "14h"
  playCount: number;
  totalMs: number;
}

export interface DayStat {
  dayIndex: number;   // 0=Lundi … 6=Dimanche
  dayLabel: string;
  playCount: number;
  totalMs: number;
}

// ============================================================
// TIER 4 — Comportemental
// ============================================================

export interface SkipStats {
  totalPlays: number;
  skippedPlays: number;
  skipRate: number;          // 0–1
  avgListenPercent: number;  // % moyen du titre écouté (approx)
}

export interface ListeningStreaks {
  longestStreakDays: number;
  longestStreakStart: Date | null;
  longestStreakEnd: Date | null;
  currentStreakDays: number;
  totalActiveDays: number;
}

export interface BehaviorStats {
  skipRate: number;
  shuffleRate: number;
  offlineMs: number;
  offlineHours: number;
  nightOwlPercent: number;  // % écoutes 0h–5h
  morningPercent: number;   // % écoutes 6h–10h
}

export interface DiscoveryYear {
  year: number;
  newArtistsCount: number;
  totalArtistsCount: number;
  discoveryRate: number; // 0–1
}

// ============================================================
// TIER 5 — "Mois Sombres"
// ============================================================

export interface MoodMonth {
  year: number;
  month: number;
  monthLabel: string;
  darknessScore: number;       // 0–100 score composite
  skipRate: number;
  shuffleRate: number;
  nightListeningRate: number;  // % écoutes nocturnes (0h–5h)
  compulsiveSkips: number;     // titres joués < 30 secondes
  totalPlays: number;
  topArtist: string;
}
