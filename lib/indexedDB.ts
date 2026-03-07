// ============================================================
// INDEXEDDB : Wrapper Dexie.js pour Ultimate Wrapped
// ============================================================
// Installation requise : npm install dexie
// ============================================================

import Dexie, { type Table } from "dexie";
import type { PlayEntry, ImportMeta, UserConfig } from "./schema";
// ============================================================
// DATABASE CLASS
// ============================================================

class UltimateWrappedDB extends Dexie {
  plays!: Table<PlayEntry, string>;
  imports!: Table<ImportMeta, string>;
  config!: Table<UserConfig, string>;

  constructor() {
    super("UltimateWrappedDB");

    this.version(1).stores({
      // "id" = clé primaire
      // Les autres champs indexés permettent des requêtes rapides
      plays: "id, ts, trackUri, artistName, source",
      imports: "id, importedAt, source",
      config: "id",
    });
  }
}

// Singleton - une seule instance dans toute l'app
let db: UltimateWrappedDB | null = null;

export function getDB(): UltimateWrappedDB {
  if (!db) {
    db = new UltimateWrappedDB();
  }
  return db;
}

// ============================================================
// OPERATIONS : Fonctions utilitaires pour manipuler les données
// ============================================================

/**
 * Insère un batch d'écoutes en ignorant les doublons (via bulkPut)
 * Retourne le nombre de nouvelles entrées réellement insérées
 */
export async function insertPlays(
  entries: PlayEntry[]
): Promise<{ inserted: number; duplicates: number }> {
  const db = getDB();

  if (entries.length === 0) return { inserted: 0, duplicates: 0 };

  // Vérifie quels IDs existent déjà
  const ids = entries.map((e) => e.id);
  const existingIds = new Set(
    await db.plays
      .where("id")
      .anyOf(ids)
      .primaryKeys()
  );

  const newEntries = entries.filter((e) => !existingIds.has(e.id));
  const duplicates = entries.length - newEntries.length;

  if (newEntries.length > 0) {
    await db.plays.bulkAdd(newEntries);
  }

  return { inserted: newEntries.length, duplicates };
}

/**
 * Récupère le nombre total d'écoutes
 */
export async function getTotalCount(): Promise<number> {
  return getDB().plays.count();
}

/**
 * Récupère la plage temporelle des données
 */
export async function getDateRange(): Promise<{
  oldest: Date | null;
  newest: Date | null;
}> {
  const db = getDB();
  const oldest = await db.plays.orderBy("ts").first();
  const newest = await db.plays.orderBy("ts").last();

  return {
    oldest: oldest ? new Date(oldest.ts) : null,
    newest: newest ? new Date(newest.ts) : null,
  };
}

/**
 * Vérifie si la DB contient des données
 */
export async function hasData(): Promise<boolean> {
  return (await getDB().plays.count()) > 0;
}

/**
 * Sauvegarde un rapport d'import
 */
export async function saveImportMeta(meta: ImportMeta): Promise<void> {
  await getDB().imports.put(meta);
}

/**
 * Récupère tous les rapports d'import
 */
export async function getImportHistory(): Promise<ImportMeta[]> {
  return getDB().imports.orderBy("importedAt").reverse().toArray();
}

/**
 * Récupère ou crée la config utilisateur
 */
export async function getConfig(): Promise<UserConfig> {
  const db = getDB();
  const config = await db.config.get("config");
  return config ?? { id: "config" };
}

export async function saveConfig(config: Partial<UserConfig>): Promise<void> {
  const existing = await getConfig();
  await getDB().config.put({ ...existing, ...config, id: "config" });
}

/**
 * Purge complète (pour tests / reset)
 */
export async function clearAllData(): Promise<void> {
  const db = getDB();
  await db.plays.clear();
  await db.imports.clear();
  await db.config.clear();
}

export type { PlayEntry, ImportMeta, UserConfig };
