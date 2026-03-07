// ============================================================
// lib/queries/stats.ts
// Toutes les fonctions de requêtage IndexedDB via Dexie.js
// Ultimate Wrapped — Sprint 2
// ============================================================
// Chaque fonction est autonome, typée, et gère les cas
// limites (base vide, données manquantes, valeurs nulles).
// ============================================================

import Dexie from "dexie";
import type { PlayEntry } from "../schema";
import type {
  DateFilter,
  GlobalStats,
  ArtistStat,
  TrackStat,
  AlbumStat,
  YearStat,
  MonthStat,
  HourStat,
  DayStat,
  SkipStats,
  ListeningStreaks,
  BehaviorStats,
  DiscoveryYear,
  MoodMonth,
} from "./types";

// ============================================================
// HELPERS INTERNES
// ============================================================

/**
 * Récupère toutes les entrées de la DB avec un filtre optionnel.
 * On charge tout en mémoire : IndexedDB local, pas de réseau.
 * Pour des archives de 500k entrées, ça reste <100ms sur machine moderne.
 */
async function fetchEntries(
  db: Dexie,
  filter?: DateFilter
): Promise<PlayEntry[]> {
  const table = db.table<PlayEntry>("plays");

  if (!filter || (!filter.from && !filter.to)) {
    return table.toArray();
  }

  // Utilise l'index "ts" pour un filtre efficace
  let query = table.where("ts");

  if (filter.from && filter.to) {
    return query.between(filter.from, filter.to, true, true).toArray();
  } else if (filter.from) {
    return query.aboveOrEqual(filter.from).toArray();
  } else if (filter.to) {
    return query.belowOrEqual(filter.to).toArray();
  }

  return table.toArray();
}

/** Formate un numéro de mois en label lisible */
function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

/** ms → heures arrondies à 1 décimale */
const msToHours = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10;

// ============================================================
// TIER 1 — STATS GLOBALES
// ============================================================

export async function getGlobalStats(
  db: Dexie,
  filter?: DateFilter
): Promise<GlobalStats> {
  const entries = await fetchEntries(db, filter);

  if (entries.length === 0) {
    return {
      totalMs: 0,
      totalHours: 0,
      totalDays: 0,
      totalPlays: 0,
      uniqueArtists: 0,
      uniqueTracks: 0,
      firstPlay: null,
      lastPlay: null,
      accountAgeYears: 0,
    };
  }

  const totalMs = entries.reduce((sum, e) => sum + e.msPlayed, 0);
  const uniqueArtists = new Set(entries.map((e) => e.artistName.toLowerCase())).size;
  const uniqueTracks = new Set(entries.map((e) => e.trackUri)).size;

  const timestamps = entries.map((e) => e.ts);
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const firstPlay = new Date(minTs);
  const lastPlay = new Date(maxTs);
  const accountAgeYears =
    Math.round(((maxTs - minTs) / (365.25 * 86_400_000)) * 10) / 10;

  return {
    totalMs,
    totalHours: msToHours(totalMs),
    totalDays: Math.round((totalMs / 86_400_000) * 10) / 10,
    totalPlays: entries.length,
    uniqueArtists,
    uniqueTracks,
    firstPlay,
    lastPlay,
    accountAgeYears,
  };
}

// ============================================================
// TIER 2 — TOPS & RANKINGS
// ============================================================

export async function getTopArtists(
  db: Dexie,
  limit: number,
  filter?: DateFilter
): Promise<ArtistStat[]> {
  const entries = await fetchEntries(db, filter);

  const map = new Map<string, ArtistStat>();

  for (const e of entries) {
    const key = e.artistName.toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.totalMs += e.msPlayed;
      existing.playCount += 1;
      // On compte les tracks uniques via un Set stocké temporairement
      (existing as ArtistStat & { _tracks: Set<string> })._tracks.add(e.trackUri);
    } else {
      const stat: ArtistStat & { _tracks: Set<string> } = {
        artistName: e.artistName,
        totalMs: e.msPlayed,
        totalHours: 0,
        playCount: 1,
        uniqueTracksCount: 0,
        _tracks: new Set([e.trackUri]),
      };
      map.set(key, stat);
    }
  }

  return Array.from(map.values())
    .map((s) => {
      const withTracks = s as ArtistStat & { _tracks: Set<string> };
      return {
        artistName: s.artistName,
        totalMs: s.totalMs,
        totalHours: msToHours(s.totalMs),
        playCount: s.playCount,
        uniqueTracksCount: withTracks._tracks.size,
      };
    })
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
}

export async function getTopTracks(
  db: Dexie,
  limit: number,
  filter?: DateFilter
): Promise<TrackStat[]> {
  const entries = await fetchEntries(db, filter);

  const map = new Map<
    string,
    {
      trackUri: string;
      trackName: string;
      artistName: string;
      albumName: string;
      totalMs: number;
      playCount: number;
      skipCount: number;
    }
  >();

  for (const e of entries) {
    const key = e.trackUri;
    const existing = map.get(key);
    const isSkip = e.msPlayed < 30_000; // < 30s = skip

    if (existing) {
      existing.totalMs += e.msPlayed;
      existing.playCount += 1;
      if (isSkip) existing.skipCount += 1;
    } else {
      map.set(key, {
        trackUri: e.trackUri,
        trackName: e.trackName,
        artistName: e.artistName,
        albumName: e.albumName,
        totalMs: e.msPlayed,
        playCount: 1,
        skipCount: isSkip ? 1 : 0,
      });
    }
  }

  return Array.from(map.values())
    .map((s) => ({
      ...s,
      totalHours: msToHours(s.totalMs),
      skipRate: s.playCount > 0 ? s.skipCount / s.playCount : 0,
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
}

export async function getTopAlbums(
  db: Dexie,
  limit: number,
  filter?: DateFilter
): Promise<AlbumStat[]> {
  const entries = await fetchEntries(db, filter);

  const map = new Map<
    string,
    { albumName: string; artistName: string; totalMs: number; playCount: number }
  >();

  for (const e of entries) {
    const key = `${e.albumName}__${e.artistName}`.toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.totalMs += e.msPlayed;
      existing.playCount += 1;
    } else {
      map.set(key, {
        albumName: e.albumName,
        artistName: e.artistName,
        totalMs: e.msPlayed,
        playCount: 1,
      });
    }
  }

  return Array.from(map.values())
    .map((s) => ({ ...s, totalHours: msToHours(s.totalMs) }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
}

export async function getMostSkippedTracks(
  db: Dexie,
  limit: number,
  filter?: DateFilter
): Promise<TrackStat[]> {
  const all = await getTopTracks(db, 10_000, filter);
  // Filtre : au moins 5 écoutes pour que le taux soit significatif
  return all
    .filter((t) => t.playCount >= 5)
    .sort((a, b) => b.skipRate - a.skipRate)
    .slice(0, limit);
}

// ============================================================
// TIER 3 — TENDANCES TEMPORELLES
// ============================================================

export async function getYearlyTrends(
  db: Dexie,
  filter?: DateFilter
): Promise<YearStat[]> {
  const entries = await fetchEntries(db, filter);

  const map = new Map<
    number,
    { totalMs: number; playCount: number; artists: Set<string>; tracks: Set<string> }
  >();

  for (const e of entries) {
    const year = new Date(e.ts).getUTCFullYear();
    const existing = map.get(year);

    if (existing) {
      existing.totalMs += e.msPlayed;
      existing.playCount += 1;
      existing.artists.add(e.artistName.toLowerCase());
      existing.tracks.add(e.trackUri);
    } else {
      map.set(year, {
        totalMs: e.msPlayed,
        playCount: 1,
        artists: new Set([e.artistName.toLowerCase()]),
        tracks: new Set([e.trackUri]),
      });
    }
  }

  return Array.from(map.entries())
    .map(([year, s]) => ({
      year,
      totalMs: s.totalMs,
      totalHours: msToHours(s.totalMs),
      playCount: s.playCount,
      uniqueArtists: s.artists.size,
      uniqueTracks: s.tracks.size,
    }))
    .sort((a, b) => a.year - b.year);
}

export async function getMonthlyTrends(
  db: Dexie,
  filter?: DateFilter
): Promise<MonthStat[]> {
  const entries = await fetchEntries(db, filter);

  const map = new Map<
    string,
    { year: number; month: number; totalMs: number; playCount: number }
  >();

  for (const e of entries) {
    const d = new Date(e.ts);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const existing = map.get(key);

    if (existing) {
      existing.totalMs += e.msPlayed;
      existing.playCount += 1;
    } else {
      map.set(key, { year, month, totalMs: e.msPlayed, playCount: 1 });
    }
  }

  return Array.from(map.values())
    .map((s) => ({
      ...s,
      monthLabel: monthLabel(s.year, s.month),
      totalHours: msToHours(s.totalMs),
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
}

export async function getListeningByHour(
  db: Dexie,
  filter?: DateFilter
): Promise<HourStat[]> {
  const entries = await fetchEntries(db, filter);

  const counts = new Array(24).fill(0).map((_, hour) => ({
    hour,
    label: `${hour}h`,
    playCount: 0,
    totalMs: 0,
  }));

  for (const e of entries) {
    const hour = new Date(e.ts).getHours();
    counts[hour].playCount += 1;
    counts[hour].totalMs += e.msPlayed;
  }

  return counts;
}

export async function getListeningByDayOfWeek(
  db: Dexie,
  filter?: DateFilter
): Promise<DayStat[]> {
  const entries = await fetchEntries(db, filter);
  const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const counts = DAY_LABELS.map((dayLabel, dayIndex) => ({
    dayIndex,
    dayLabel,
    playCount: 0,
    totalMs: 0,
  }));

  for (const e of entries) {
    // getDay() : 0=Dimanche, 1=Lundi … → on convertit en 0=Lundi
    const jsDay = new Date(e.ts).getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    counts[dayIndex].playCount += 1;
    counts[dayIndex].totalMs += e.msPlayed;
  }

  return counts;
}

// ============================================================
// TIER 4 — COMPORTEMENTAL
// ============================================================

export async function getSkipStats(
  db: Dexie,
  filter?: DateFilter
): Promise<SkipStats> {
  const entries = await fetchEntries(db, filter);

  if (entries.length === 0) {
    return { totalPlays: 0, skippedPlays: 0, skipRate: 0, avgListenPercent: 0 };
  }

  // Un "skip" = titre joué moins de 30 secondes
  const skipped = entries.filter((e) => e.msPlayed < 30_000);

  // avgListenPercent : on ne peut pas calculer sans durée totale du titre,
  // donc on utilise une heuristique : ms_played / 210_000 (3min30 = durée moyenne)
  const AVG_TRACK_DURATION_MS = 210_000;
  const avgListenPercent = Math.min(
    100,
    Math.round(
      (entries.reduce((sum, e) => sum + e.msPlayed, 0) /
        (entries.length * AVG_TRACK_DURATION_MS)) *
        100
    )
  );

  return {
    totalPlays: entries.length,
    skippedPlays: skipped.length,
    skipRate: skipped.length / entries.length,
    avgListenPercent,
  };
}

export async function getListeningStreaks(
  db: Dexie,
  filter?: DateFilter
): Promise<ListeningStreaks> {
  const entries = await fetchEntries(db, filter);

  if (entries.length === 0) {
    return {
      longestStreakDays: 0,
      longestStreakStart: null,
      longestStreakEnd: null,
      currentStreakDays: 0,
      totalActiveDays: 0,
    };
  }

  // Récupère les jours d'activité uniques (YYYY-MM-DD)
  const activeDays = new Set(
    entries.map((e) => {
      const d = new Date(e.ts);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    })
  );

  const sortedDays = Array.from(activeDays).sort();
  const totalActiveDays = sortedDays.length;

  let longestStreak = 1;
  let longestStart = sortedDays[0];
  let longestEnd = sortedDays[0];
  let currentStreak = 1;
  let streakStart = sortedDays[0];

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStart = streakStart;
        longestEnd = sortedDays[i];
      }
    } else {
      currentStreak = 1;
      streakStart = sortedDays[i];
    }
  }

  // Calcul du streak actuel (depuis aujourd'hui en remontant)
  const today = new Date();
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  let currentStreakDays = 0;

   for (let i = sortedDays.length - 1; i >= 0; i--) {
    if (sortedDays[i] === todayStr || currentStreakDays > 0) {
      const diff = i < sortedDays.length - 1
        ? Math.round((new Date(sortedDays[i + 1]).getTime() - new Date(sortedDays[i]).getTime()) / 86_400_000)
        : sortedDays[i] === todayStr ? 0 : 1;

      if (diff <= 1) currentStreakDays++;
      else break;
    }
  }

  void todayStr; // suppress unused warning

  return {
    longestStreakDays: longestStreak,
    longestStreakStart: new Date(longestStart),
    longestStreakEnd: new Date(longestEnd),
    currentStreakDays,
    totalActiveDays,
  };
}

export async function getBehaviorStats(
  db: Dexie,
  filter?: DateFilter
): Promise<BehaviorStats> {
  const entries = await fetchEntries(db, filter);

  if (entries.length === 0) {
    return {
      skipRate: 0,
      shuffleRate: 0,
      offlineMs: 0,
      offlineHours: 0,
      nightOwlPercent: 0,
      morningPercent: 0,
    };
  }

  const total = entries.length;
  const skipped = entries.filter((e) => e.msPlayed < 30_000).length;

  // Shuffle : seulement si le champ est présent (endsong.json)
  const shuffleEntries = entries.filter((e) => e.shuffle !== undefined);
  const shuffled = shuffleEntries.filter((e) => e.shuffle === true).length;
  const shuffleRate = shuffleEntries.length > 0
    ? shuffled / shuffleEntries.length
    : 0;

  // Offline
  const offlineEntries = entries.filter((e) => e.offline === true);
  const offlineMs = offlineEntries.reduce((sum, e) => sum + e.msPlayed, 0);

  // Heures nocturnes (0h–5h) et matinales (6h–10h)
  const nightEntries = entries.filter((e) => {
    const h = new Date(e.ts).getHours();
    return h >= 0 && h <= 5;
  });
  const morningEntries = entries.filter((e) => {
    const h = new Date(e.ts).getHours();
    return h >= 6 && h <= 10;
  });

  return {
    skipRate: skipped / total,
    shuffleRate,
    offlineMs,
    offlineHours: msToHours(offlineMs),
    nightOwlPercent: Math.round((nightEntries.length / total) * 100),
    morningPercent: Math.round((morningEntries.length / total) * 100),
  };
}

export async function getDiscoveryTrends(
  db: Dexie
): Promise<DiscoveryYear[]> {
  // Pas de filtre ici : on analyse tout pour mesurer les "nouveaux" artistes par an
  const entries = await fetchEntries(db);

  // Trie chronologiquement
  entries.sort((a, b) => a.ts - b.ts);

  const seenArtists = new Set<string>();
  const yearMap = new Map<
    number,
    { newArtists: Set<string>; totalArtists: Set<string> }
  >();

  for (const e of entries) {
    const year = new Date(e.ts).getUTCFullYear();
    const artistKey = e.artistName.toLowerCase();

    if (!yearMap.has(year)) {
      yearMap.set(year, { newArtists: new Set(), totalArtists: new Set() });
    }

    const yearData = yearMap.get(year)!;
    yearData.totalArtists.add(artistKey);

    if (!seenArtists.has(artistKey)) {
      seenArtists.add(artistKey);
      yearData.newArtists.add(artistKey);
    }
  }

  return Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      newArtistsCount: data.newArtists.size,
      totalArtistsCount: data.totalArtists.size,
      discoveryRate:
        data.totalArtists.size > 0
          ? Math.round((data.newArtists.size / data.totalArtists.size) * 100) / 100
          : 0,
    }))
    .sort((a, b) => a.year - b.year);
}

// ============================================================
// TIER 5 — "MOIS SOMBRES"
// ============================================================

export async function getDarkestMonths(
  db: Dexie,
  limit: number
): Promise<MoodMonth[]> {
  const entries = await fetchEntries(db);

  if (entries.length === 0) return [];

  // Groupe par mois
  const monthMap = new Map<
    string,
    {
      year: number;
      month: number;
      plays: PlayEntry[];
    }
  >();

  for (const e of entries) {
    const d = new Date(e.ts);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, { year, month, plays: [] });
    }
    monthMap.get(key)!.plays.push(e);
  }

  const results: MoodMonth[] = [];

  for (const [, data] of monthMap) {
    const { year, month, plays } = data;
    if (plays.length < 10) continue; // Pas assez de données

    const total = plays.length;

    // Skip rate
    const skipped = plays.filter((e) => e.msPlayed < 30_000).length;
    const skipRate = skipped / total;

    // Shuffle rate
    const shuffleable = plays.filter((e) => e.shuffle !== undefined);
    const shuffled = shuffleable.filter((e) => e.shuffle === true).length;
    const shuffleRate = shuffleable.length > 0 ? shuffled / shuffleable.length : 0;

    // Écoutes nocturnes (0h–5h)
    const nightPlays = plays.filter((e) => {
      const h = new Date(e.ts).getHours();
      return h >= 0 && h <= 5;
    });
    const nightListeningRate = nightPlays.length / total;

    // Skips compulsifs : titres joués < 30 secondes
    const compulsiveSkips = plays.filter((e) => e.msPlayed < 30_000).length;

    // Top artiste du mois
    const artistCount = new Map<string, number>();
    for (const e of plays) {
      artistCount.set(e.artistName, (artistCount.get(e.artistName) ?? 0) + 1);
    }
    const topArtist = Array.from(artistCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Inconnu";

    // Score de "noirceur" composite (0–100)
    // Formule : 40% skip rate + 25% shuffle + 25% nuit + 10% skips compulsifs normalisés
    const normalizedCompulsive = Math.min(1, compulsiveSkips / (total * 0.5));
    const darknessScore = Math.round(
      skipRate * 40 +
      shuffleRate * 25 +
      nightListeningRate * 25 +
      normalizedCompulsive * 10
    );

    results.push({
      year,
      month,
      monthLabel: monthLabel(year, month),
      darknessScore,
      skipRate,
      shuffleRate,
      nightListeningRate,
      compulsiveSkips,
      totalPlays: total,
      topArtist,
    });
  }

  return results
    .sort((a, b) => b.darknessScore - a.darknessScore)
    .slice(0, limit);
}
