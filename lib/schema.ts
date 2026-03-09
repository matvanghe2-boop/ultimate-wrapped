// ============================================================
// SCHEMA : Définition des types et de la structure IndexedDB
// Ultimate Wrapped - Sprint 1
// ============================================================

/**
 * Une entrée d'écoute normalisée depuis endsong.json ou StreamingHistory.json
 * La clé composite unique est : trackId + ts (timestamp en ms)
 */
export interface PlayEntry {
  // Clé primaire composite générée par le deduplicator
  id: string; // sha1-like: `${trackUri}_${ts}`

  // Données principales
  ts: number; // Timestamp UNIX en millisecondes
  trackUri: string; // "spotify:track:XXXX" ou null si podcast
  trackName: string;
  artistName: string;
  albumName: string;
  msPlayed: number; // Durée réellement écoutée en ms

  // Métadonnées comportementales (présentes dans endsong.json)
  reasonStart?: string; // "trackdone" | "clickrow" | "fwdbtn" | ...
  reasonEnd?: string; // "trackdone" | "fwdbtn" | "endplay" | ...
  shuffle?: boolean;
  skipped?: boolean;
  offline?: boolean;
  incognitoMode?: boolean;

  // Source de la donnée (pour débugging et stats)
  source: "archive" | "api_sync";
  importedAt: number; // Timestamp d'import
}

/**
 * Métadonnées de l'import (pour afficher l'historique des syncs)
 */
export interface ImportMeta {
  id: string; // "import_TIMESTAMP"
  importedAt: number;
  source: "archive" | "api_sync";
  fileNames?: string[]; // Noms des fichiers JSON uploadés
  totalEntries: number; // Entrées parsées
  newEntries: number; // Entrées réellement insérées (hors doublons)
  duplicatesSkipped: number;
  oldestEntryTs?: number; // Timestamp de l'écoute la plus ancienne
  newestEntryTs?: number; // Timestamp de l'écoute la plus récente
}

/**
 * Config utilisateur stockée en IndexedDB
 */
export interface UserConfig {
  id: "config"; // Singleton
  spotifyUserId?: string;
  spotifyDisplayName?: string;
  lastApiSync?: number;       // Timestamp de la dernière sync Web API
  totalEntriesCount?: number; // Cache du count total
  spotifyAccessToken?: string; // Token copié en IDB pour accès Service Worker
  spotifyTokenExpiry?: number; // Expiry du token
}

// ============================================================
// NORMALISATION : Convertit les formats Spotify bruts vers PlayEntry
// ============================================================

/**
 * Format endsong.json (Full Privacy Data - le plus complet)
 */
export interface RawEndSong {
  ts: string; // ISO 8601: "2023-01-15T14:32:00Z"
  username?: string;
  platform?: string;
  ms_played: number;
  conn_country?: string;
  ip_addr_decrypted?: string;
  user_agent_decrypted?: string;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  episode_name?: string | null;
  episode_show_name?: string | null;
  spotify_episode_uri?: string | null;
  reason_start?: string;
  reason_end?: string;
  shuffle?: boolean;
  skipped?: boolean | null;
  offline?: boolean;
  offline_timestamp?: number;
  incognito_mode?: boolean;
}

/**
 * Format StreamingHistory.json (données simplifiées, moins de champs)
 */
export interface RawStreamingHistory {
  endTime: string; // "2023-01-15 14:32"
  artistName: string;
  trackName: string;
  msPlayed: number;
}

/**
 * Format retourné par la Web API Spotify (recently played)
 */
export interface RawApiTrack {
  track: {
    id: string;
    name: string;
    uri: string;
    artists: Array<{ name: string }>;
    album: { name: string };
    duration_ms: number;
  };
  played_at: string; // ISO 8601
}

// ============================================================
// NORMALIZERS : Fonctions de conversion vers PlayEntry
// ============================================================

export function normalizeEndSong(raw: RawEndSong): PlayEntry | null {
  // Ignorer les podcasts et les écoutes < 30 secondes (skips)
  if (!raw.spotify_track_uri || !raw.master_metadata_track_name) return null;

  const ts = new Date(raw.ts).getTime();
  if (isNaN(ts)) return null;

  const id = generateId(raw.spotify_track_uri, ts);

  return {
    id,
    ts,
    trackUri: raw.spotify_track_uri,
    trackName: raw.master_metadata_track_name,
    artistName: raw.master_metadata_album_artist_name ?? "Unknown Artist",
    albumName: raw.master_metadata_album_album_name ?? "Unknown Album",
    msPlayed: raw.ms_played,
    reasonStart: raw.reason_start,
    reasonEnd: raw.reason_end,
    shuffle: raw.shuffle,
    skipped: raw.skipped ?? undefined,
    offline: raw.offline,
    incognitoMode: raw.incognito_mode,
    source: "archive",
    importedAt: Date.now(),
  };
}

export function normalizeStreamingHistory(raw: RawStreamingHistory): PlayEntry | null {
  if (!raw.trackName || !raw.artistName) return null;

  // StreamingHistory n'a pas d'URI, on crée un pseudo-URI basé sur nom+artiste
  const pseudoUri = `spotify:track:pseudo_${slugify(raw.artistName)}_${slugify(raw.trackName)}`;
  const ts = new Date(raw.endTime.replace(" ", "T") + ":00Z").getTime();
  if (isNaN(ts)) return null;

  const id = generateId(pseudoUri, ts);

  return {
    id,
    ts,
    trackUri: pseudoUri,
    trackName: raw.trackName,
    artistName: raw.artistName,
    albumName: "Unknown Album",
    msPlayed: raw.msPlayed,
    source: "archive",
    importedAt: Date.now(),
  };
}

export function normalizeApiTrack(raw: RawApiTrack): PlayEntry | null {
  if (!raw.track?.uri || !raw.track?.name) return null;

  const ts = new Date(raw.played_at).getTime();
  if (isNaN(ts)) return null;

  const id = generateId(raw.track.uri, ts);

  return {
    id,
    ts,
    trackUri: raw.track.uri,
    trackName: raw.track.name,
    artistName: raw.track.artists[0]?.name ?? "Unknown Artist",
    albumName: raw.track.album.name,
    msPlayed: raw.track.duration_ms, // L'API ne donne pas le ms_played réel
    source: "api_sync",
    importedAt: Date.now(),
  };
}

// ============================================================
// HELPERS
// ============================================================

export function generateId(trackUri: string, ts: number): string {
  // Clé composite simple et déterministe pour la déduplication
  return `${trackUri}__${ts}`;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 30);
}
