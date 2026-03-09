// ============================================================
// public/sw.js — Service Worker Ultimate Wrapped
// Sync Spotify en arrière-plan (Background Sync + Periodic Sync)
// Compatible iOS Safari 16.4+ et Android Chrome
// ============================================================

const SW_VERSION = "uw-v1";
const SYNC_TAG = "spotify-background-sync";
const PERIODIC_SYNC_TAG = "spotify-periodic-sync";

// ============================================================
// INSTALLATION & ACTIVATION
// ============================================================

self.addEventListener("install", (event) => {
  // Prendre le contrôle immédiatement sans attendre le reload
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Prendre le contrôle de tous les onglets ouverts
      self.clients.claim(),
    ])
  );
});

// ============================================================
// BACKGROUND SYNC — déclenché quand la connexion revient
// (fonctionne même si l'onglet est fermé sur Android Chrome)
// ============================================================

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(performSync("background-sync"));
  }
});

// ============================================================
// PERIODIC BACKGROUND SYNC — toutes les 15 minutes
// Nécessite : Chrome Android + site installé comme PWA
// L'OS décide du timing exact selon la batterie / connexion
// ============================================================

self.addEventListener("periodicsync", (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(performSync("periodic-sync"));
  }
});

// ============================================================
// MESSAGES depuis l'app (pour déclencher une sync manuelle)
// ============================================================

self.addEventListener("message", (event) => {
  if (event.data?.type === "TRIGGER_SYNC") {
    performSync("manual").then((result) => {
      // Notifier tous les onglets ouverts du résultat
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "SYNC_COMPLETE",
            result,
          });
        });
      });
    });
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================
// LOGIQUE DE SYNC
// ============================================================

async function performSync(source) {
  console.log(`[SW] Sync déclenchée (${source})`);

  try {
    // Récupérer le token depuis IndexedDB (localStorage inaccessible en SW)
    const token = await getTokenFromIDB();
    if (!token) {
      console.log("[SW] Pas de token Spotify, sync annulée");
      return { success: false, reason: "no_token" };
    }

    // Vérifier si assez de temps s'est écoulé depuis la dernière sync
    const lastSync = await getLastSyncTime();
    const MIN_INTERVAL = 14 * 60 * 1000; // 14 minutes minimum entre syncs
    if (lastSync && Date.now() - lastSync < MIN_INTERVAL) {
      console.log("[SW] Sync trop récente, ignorée");
      return { success: false, reason: "too_recent" };
    }

    // Appeler l'API Spotify
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 401) {
      // Token expiré — on ne peut pas refresh depuis le SW sans risque
      // L'app principale gère le refresh au prochain focus
      console.log("[SW] Token expiré, sync annulée");
      await saveLastSyncTime(Date.now()); // éviter les boucles
      return { success: false, reason: "token_expired" };
    }

    if (!response.ok) {
      throw new Error(`Spotify API ${response.status}`);
    }

    const data = await response.json();
    const items = data.items ?? [];

    if (items.length === 0) {
      return { success: true, inserted: 0, reason: "no_new_tracks" };
    }

    // Insérer dans IndexedDB directement depuis le SW
    const inserted = await insertTracksToIDB(items);
    await saveLastSyncTime(Date.now());

    console.log(`[SW] Sync OK: ${inserted} nouvelles écoutes insérées`);

    // Notifier les onglets ouverts pour qu'ils rechargent les stats
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_COMPLETE",
        result: { success: true, inserted, source },
      });
    });

    return { success: true, inserted, source };
  } catch (err) {
    console.error("[SW] Erreur sync:", err);
    return { success: false, reason: err.message };
  }
}

// ============================================================
// ACCÈS IndexedDB depuis le Service Worker
// ============================================================

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("UltimateWrappedDB", 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Récupère le token Spotify depuis les clés IDB config
    Note: localStorage est inaccessible en SW, on lit via IDB */
async function getTokenFromIDB() {
  // Le token est dans localStorage de la page principale
  // On utilise une astuce : la page doit le copier dans IDB config
  // lors de chaque save. Voir syncRecent.ts saveConfig()
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction("config", "readonly");
      const req = tx.objectStore("config").get("main");
      req.onsuccess = () => {
        const config = req.result;
        resolve(config?.spotifyAccessToken ?? null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function getLastSyncTime() {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction("config", "readonly");
      const req = tx.objectStore("config").get("main");
      req.onsuccess = () => resolve(req.result?.lastApiSync ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveLastSyncTime(ts) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction("config", "readwrite");
      const store = tx.objectStore("config");
      const getReq = store.get("main");
      getReq.onsuccess = () => {
        const config = getReq.result ?? { id: "main" };
        config.lastApiSync = ts;
        store.put(config);
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** Normalise et insère les tracks dans IDB plays */
async function insertTracksToIDB(items) {
  try {
    const db = await openIDB();
    const tx = db.transaction("plays", "readwrite");
    const store = tx.objectStore("plays");
    let inserted = 0;

    for (const item of items) {
      if (!item.track || !item.played_at) continue;

      const ts = new Date(item.played_at).getTime();
      const trackUri = item.track.uri ?? "";
      const id = `${trackUri}__${ts}`;

      // bulkPut style — vérifier si existe déjà
      const existing = await new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (!existing) {
        const entry = {
          id,
          ts,
          trackName: item.track.name ?? "Unknown",
          artistName: item.track.artists?.[0]?.name ?? "Unknown",
          albumName: item.track.album?.name ?? "",
          trackUri,
          msPlayed: item.track.duration_ms ?? 0,
          skipped: false,
          shuffle: false,
          source: "api",
          platform: "web",
        };

        await new Promise((resolve) => {
          const req = store.put(entry);
          req.onsuccess = () => { inserted++; resolve(true); };
          req.onerror = () => resolve(false);
        });
      }
    }

    return inserted;
  } catch (err) {
    console.error("[SW] insertTracksToIDB error:", err);
    return 0;
  }
}
