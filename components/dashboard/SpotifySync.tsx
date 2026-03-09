"use client";
// ============================================================
// components/dashboard/SpotifySync.tsx
// Connexion Spotify persistante — auto-reconnexion au refresh
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  initiateLogin,
  getValidToken,
  clearTokens,
  getRefreshToken,
} from "../../lib/auth";
import { syncRecentTracks } from "../../lib/syncRecent";

type SyncState = "idle" | "syncing" | "success" | "error";
type AuthState = "unknown" | "connected" | "disconnected";

interface Props {
  onSyncComplete?: (inserted: number) => void;
}

export function SpotifySync({ onSyncComplete }: Props) {
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [displayName, setDisplayName] = useState<string>("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedCount, setLastSyncedCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);

  // ── Vérification au montage (et à chaque focus de page) ──
  const checkAuth = useCallback(async () => {
    const token = await getValidToken();
    if (token) {
      setAuthState("connected");
      // Récupérer le nom stocké ou le rafraîchir
      const stored = localStorage.getItem("spotify_display_name");
      if (stored) {
        setDisplayName(stored);
      } else {
        try {
          const res = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            const name = profile.display_name || profile.id || "";
            setDisplayName(name);
            localStorage.setItem("spotify_display_name", name);
          }
        } catch { /* silencieux */ }
      }
    } else if (getRefreshToken()) {
      // Refresh token présent mais access token expiré → tenter refresh auto
      const refreshed = await getValidToken();
      if (refreshed) {
        setAuthState("connected");
      } else {
        setAuthState("disconnected");
      }
    } else {
      setAuthState("disconnected");
    }
  }, []);

  useEffect(() => {
    checkAuth();
    // Re-vérifier quand l'onglet reprend le focus (ex: retour depuis Spotify)
    const onFocus = () => checkAuth();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkAuth]);

  // ── Sync ──
  const handleSync = async () => {
    setSyncState("syncing");
    setErrorMsg("");
    try {
      const token = await getValidToken();
      if (!token) throw new Error("Token invalide, reconnectez-vous");
      const result = await syncRecentTracks(token);
      setLastSyncedCount(result.inserted);
      setSyncState("success");
      onSyncComplete?.(result.inserted);
      setTimeout(() => setSyncState("idle"), 3000);
    } catch (err) {
      setSyncState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur de sync");
      setTimeout(() => setSyncState("idle"), 4000);
    }
  };

  // ── Déconnexion ──
  const handleDisconnect = () => {
    clearTokens();
    localStorage.removeItem("spotify_display_name");
    setAuthState("disconnected");
    setDisplayName("");
    setShowMenu(false);
  };

  // ── Connexion ──
  const handleLogin = () => initiateLogin();

  // ── Rendu ──

  // Chargement initial
  if (authState === "unknown") {
    return (
      <div className="spotify-sync spotify-sync--loading">
        <div className="loading-spinner loading-spinner--sm" />
      </div>
    );
  }

  // Non connecté
  if (authState === "disconnected") {
    return (
      <motion.button
        className="spotify-sync__connect-btn"
        onClick={handleLogin}
        whileTap={{ scale: 0.96 }}
        title="Connecter Spotify"
      >
        <span className="spotify-sync__icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </span>
        Connecter Spotify
      </motion.button>
    );
  }

  // Connecté
  return (
    <div className="spotify-sync" style={{ position: "relative" }}>
      {/* Bouton principal — affiche le menu */}
      <motion.button
        className="spotify-sync__user-btn"
        onClick={() => setShowMenu((v) => !v)}
        whileTap={{ scale: 0.96 }}
      >
        <span className="spotify-sync__dot" />
        <span className="spotify-sync__name">
          {displayName || "Spotify"}
        </span>
        <span style={{ fontSize: "0.65rem", opacity: 0.5 }}>▾</span>
      </motion.button>

      {/* Menu déroulant */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay pour fermer */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 90 }}
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              className="spotify-sync__menu"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {/* Sync */}
              <button
                className="spotify-sync__menu-item"
                onClick={() => { handleSync(); setShowMenu(false); }}
                disabled={syncState === "syncing"}
              >
                {syncState === "syncing" ? (
                  <><div className="loading-spinner loading-spinner--sm" /> Synchronisation...</>
                ) : syncState === "success" ? (
                  <><span>✓</span> {lastSyncedCount > 0 ? `${lastSyncedCount} nouvelles écoutes` : "Déjà à jour"}</>
                ) : (
                  <><span>↻</span> Synchroniser maintenant</>
                )}
              </button>

              {syncState === "error" && (
                <p className="spotify-sync__menu-error">{errorMsg}</p>
              )}

              <div className="spotify-sync__menu-divider" />

              {/* Déconnexion */}
              <button
                className="spotify-sync__menu-item spotify-sync__menu-item--danger"
                onClick={handleDisconnect}
              >
                <span>⏏</span> Déconnecter
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
