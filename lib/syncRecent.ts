// ============================================================
// SPOTIFY SYNC : Web API → IndexedDB
// Récupère les 50 derniers titres et les merge sans doublons
// ============================================================

import { normalizeApiTrack, type RawApiTrack } from "../lib/schema";
import { insertPlays, getConfig, saveConfig } from "../db/indexedDB";

// ============================================================
// TYPES
// ============================================================

export interface SyncResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  syncedAt: number;
}

// ============================================================
// SYNC FUNCTION
// ============================================================

/**
 * Synchronise les 50 dernières écoutes depuis la Web API Spotify
 * Nécessite un access token OAuth valide
 */
export async function syncRecentTracks(
  accessToken: string
): Promise<SyncResult> {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Spotify API error ${response.status}: ${error}`
    );
  }

  const data = await response.json();
  const rawTracks: RawApiTrack[] = data.items ?? [];

  // Normaliser
  const entries = rawTracks
    .map(normalizeApiTrack)
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // Insérer avec déduplication
  const { inserted, duplicates } = await insertPlays(entries);

  // Mettre à jour le timestamp de dernière sync
  const syncedAt = Date.now();
  await saveConfig({ lastApiSync: syncedAt });

  return {
    fetched: rawTracks.length,
    inserted,
    duplicates,
    syncedAt,
  };
}

/**
 * Vérifie si une sync est nécessaire (toutes les 30 minutes minimum)
 */
export async function shouldSync(): Promise<boolean> {
  const config = await getConfig();
  if (!config.lastApiSync) return true;

  const thirtyMinutes = 30 * 60 * 1000;
  return Date.now() - config.lastApiSync > thirtyMinutes;
}

/**
 * Sync automatique si le token est disponible et si la période est écoulée
 */
export async function autoSync(accessToken: string | null): Promise<SyncResult | null> {
  if (!accessToken) return null;
  if (!(await shouldSync())) return null;

  try {
    return await syncRecentTracks(accessToken);
  } catch (err) {
    console.warn("[AutoSync] Échec de la sync:", err);
    return null;
  }
}
