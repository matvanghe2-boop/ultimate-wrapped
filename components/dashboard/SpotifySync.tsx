// ============================================================
// components/dashboard/SpotifySync.tsx
// Bouton connexion Spotify + sync temps réel — Sprint 3
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initiateLogin, getValidToken, clearTokens, getStoredToken } from "../../lib/auth";
import { syncRecentTracks, shouldSync } from "../../lib/syncRecent";

interface SpotifySyncProps {
  onSyncComplete?: (inserted: number) => void;
}

type SyncStatus = "idle" | "syncing" | "done" | "error";

export function SpotifySync({ onSyncComplete }: SpotifySyncProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  // Vérifier si un token valide est présent au montage
  useEffect(() => {
    const token = getStoredToken();
    setIsConnected(!!token);

    // Récupérer le nom depuis localStorage si stocké
    const name = localStorage.getItem("spotify_display_name");
    if (name) setDisplayName(name);
  }, []);

  const handleConnect = async () => {
    try {
      await initiateLogin();
    } catch (err) {
      console.error("[SpotifySync] Login error:", err);
    }
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setLastSyncMessage(null);

    try {
      const token = await getValidToken();
      if (!token) {
        setIsConnected(false);
        setSyncStatus("error");
        setLastSyncMessage("Session expirée. Reconnectez-vous.");
        return;
      }

      const result = await syncRecentTracks(token);
      setSyncStatus("done");
      setLastSyncMessage(
        result.inserted > 0
          ? `+${result.inserted} nouvelles écoutes synchronisées`
          : "Déjà à jour"
      );
      onSyncComplete?.(result.inserted);

      // Reset du message après 4s
      setTimeout(() => {
        setSyncStatus("idle");
        setLastSyncMessage(null);
      }, 4000);
    } catch (err) {
      setSyncStatus("error");
      setLastSyncMessage("Erreur lors de la synchronisation");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const handleDisconnect = () => {
    clearTokens();
    localStorage.removeItem("spotify_display_name");
    setIsConnected(false);
    setDisplayName(null);
    setSyncStatus("idle");
    setLastSyncMessage(null);
  };

  // ======== RENDU ========

  if (!isConnected) {
    return (
      <motion.button
        className="spotify-sync-btn"
        onClick={handleConnect}
        whileTap={{ scale: 0.95 }}
        title="Connecter Spotify pour synchroniser vos écoutes récentes"
      >
        <span>♫</span> Connecter Spotify
      </motion.button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
      {/* Badge utilisateur connecté */}
      {displayName && (
        <div className="spotify-user-badge" title="Compte Spotify connecté">
          <span className="spotify-user-badge__dot" />
          <span>{displayName}</span>
        </div>
      )}

      {/* Message de statut */}
      <AnimatePresence>
        {lastSyncMessage && (
          <motion.span
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: "0.75rem",
              color: syncStatus === "error" ? "#f15e6c" : "#1DB954",
              fontWeight: 600,
            }}
          >
            {lastSyncMessage}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Bouton sync */}
      <motion.button
        className="spotify-sync-btn spotify-sync-btn--ghost"
        onClick={handleSync}
        disabled={syncStatus === "syncing"}
        whileTap={{ scale: 0.95 }}
        title="Synchroniser les 50 dernières écoutes"
      >
        <motion.span
          animate={syncStatus === "syncing" ? { rotate: 360 } : { rotate: 0 }}
          transition={
            syncStatus === "syncing"
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }
          style={{ display: "inline-block" }}
        >
          ↻
        </motion.span>
        {syncStatus === "syncing" ? "Sync..." : "Sync"}
      </motion.button>

      {/* Bouton déconnexion discret */}
      <button
        className="btn-icon"
        onClick={handleDisconnect}
        title="Déconnecter Spotify"
        style={{ fontSize: "0.75rem" }}
      >
        ✕
      </button>
    </div>
  );
}
