// ============================================================
// hooks/useDB.ts
// Fournit l'instance Dexie singleton à tous les composants
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Dexie, { type Table } from "dexie";
import type { PlayEntry, ImportMeta, UserConfig } from "../lib/schema";

// ============================================================
// DB CLASS (dupliquée ici pour éviter les imports circulaires)
// Note: si indexedDB.ts est déjà dans lib/, utilisez celui-là.
// ============================================================

class UltimateWrappedDB extends Dexie {
  plays!: Table<PlayEntry, string>;
  imports!: Table<ImportMeta, string>;
  config!: Table<UserConfig, string>;

  constructor() {
    super("UltimateWrappedDB");
    this.version(1).stores({
      plays:   "id, ts, trackUri, artistName, source",
      imports: "id, importedAt, source",
      config:  "id",
    });
  }
}

// Singleton module-level
let dbInstance: UltimateWrappedDB | null = null;

export function getDB(): UltimateWrappedDB {
  if (!dbInstance) {
    dbInstance = new UltimateWrappedDB();
  }
  return dbInstance;
}

// ============================================================
// HOOK
// ============================================================

export interface UseDBReturn {
  db: UltimateWrappedDB | null;
  isReady: boolean;
  hasData: boolean;
  totalEntries: number;
}

export function useDB(): UseDBReturn {
  const [isReady, setIsReady] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const db = getDB();
        await db.open();
        const count = await db.plays.count();

        if (mounted) {
          setIsReady(true);
          setHasData(count > 0);
          setTotalEntries(count);
        }
      } catch (err) {
        console.error("[useDB] Erreur d'initialisation:", err);
        if (mounted) setIsReady(true);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  return {
    db: isReady ? getDB() : null,
    isReady,
    hasData,
    totalEntries,
  };
}
