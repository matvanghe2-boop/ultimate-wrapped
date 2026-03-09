// ============================================================
// lib/serviceWorker.ts
// Enregistrement du SW + Periodic Background Sync
// À appeler une seule fois depuis le dashboard ou layout
// ============================================================

export interface SWSyncResult {
  success: boolean;
  inserted?: number;
  reason?: string;
  source?: string;
}

// ============================================================
// ENREGISTREMENT
// ============================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Service Workers non supportés sur ce navigateur");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[SW] Enregistré avec succès:", registration.scope);

    // Mettre à jour si une nouvelle version est disponible
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[SW] Nouvelle version disponible");
          }
        });
      }
    });

    return registration;
  } catch (err) {
    console.error("[SW] Erreur d'enregistrement:", err);
    return null;
  }
}

// ============================================================
// PERIODIC BACKGROUND SYNC
// Demande à l'OS de déclencher une sync toutes les ~15 min
// Fonctionne même app fermée sur Android Chrome (PWA installée)
// iOS Safari 16.4+ : supporte le SW mais pas le Periodic Sync
// → on utilise le fallback visibilitychange sur iOS
// ============================================================

export async function requestPeriodicSync(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  if (!("periodicSync" in registration)) {
    console.log("[SW] Periodic Background Sync non supporté (iOS ou navigateur ancien)");
    return false;
  }

  try {
    // Vérifier la permission
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });

    if (status.state === "denied") {
      console.log("[SW] Permission Periodic Sync refusée");
      return false;
    }

    await (registration as any).periodicSync.register("spotify-periodic-sync", {
      minInterval: 15 * 60 * 1000, // 15 minutes minimum
    });

    console.log("[SW] Periodic Sync enregistré (15 min)");
    return true;
  } catch (err) {
    console.warn("[SW] Periodic Sync échec:", err);
    return false;
  }
}

// ============================================================
// SYNC AU RETOUR EN PREMIER PLAN
// Fallback universel : iOS + tous navigateurs
// Déclenché quand l'utilisateur revient sur l'onglet/app
// ============================================================

type SyncCallback = (result: SWSyncResult) => void;

let visibilityHandler: (() => void) | null = null;

export function setupVisibilitySync(
  onSyncComplete: SyncCallback,
  minIntervalMs = 15 * 60 * 1000
): () => void {
  if (typeof document === "undefined") return () => {};

  // Nettoyer un éventuel handler précédent
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
  }

  let lastSyncAttempt = 0;

  visibilityHandler = () => {
    if (document.visibilityState !== "visible") return;

    const now = Date.now();
    if (now - lastSyncAttempt < minIntervalMs) return;
    lastSyncAttempt = now;

    // Déclencher la sync via message au SW
    triggerSWSync().then((result) => {
      if (result && result.success && (result.inserted ?? 0) > 0) {
        onSyncComplete(result);
      }
    });
  };

  document.addEventListener("visibilitychange", visibilityHandler);

  // Retourner la fonction de nettoyage
  return () => {
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  };
}

// ============================================================
// DÉCLENCHER UNE SYNC VIA MESSAGE AU SW
// ============================================================

export function triggerSWSync(): Promise<SWSyncResult | null> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker?.controller) {
      resolve(null);
      return;
    }

    // Écouter la réponse
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        navigator.serviceWorker.removeEventListener("message", handler);
        resolve(event.data.result ?? null);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    // Timeout 10s
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", handler);
      resolve(null);
    }, 10_000);

    // Envoyer le message
    navigator.serviceWorker.controller.postMessage({ type: "TRIGGER_SYNC" });
  });
}

// ============================================================
// INITIALISATION COMPLÈTE (à appeler au montage du dashboard)
// ============================================================

export async function initBackgroundSync(
  onNewTracksDetected: SyncCallback
): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Enregistrer le SW
  const registration = await registerServiceWorker();
  if (!registration) return;

  // Attendre que le SW soit actif
  await navigator.serviceWorker.ready;

  // 2. Demander le Periodic Sync (Android Chrome PWA)
  await requestPeriodicSync(registration);

  // 3. Écouter les messages SW (résultats de sync background)
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SYNC_COMPLETE") {
      const result: SWSyncResult = event.data.result;
      if (result.success && (result.inserted ?? 0) > 0) {
        console.log(`[SW] ${result.inserted} nouvelles écoutes en arrière-plan`);
        onNewTracksDetected(result);
      }
    }
  });

  // 4. Fallback visibilitychange (iOS + tous navigateurs)
  setupVisibilitySync(onNewTracksDetected, 15 * 60 * 1000);

  console.log("[SW] Background sync initialisé");
}
