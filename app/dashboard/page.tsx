// ============================================================
// app/dashboard/page.tsx
// Dashboard — Accès direct + import intégré — Sprint 3
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDB } from "../../hooks/useDB";
import { useSpotifyStats } from "../../hooks/useSpotifyStats";
import { initBackgroundSync } from "../../lib/serviceWorker";
import { PeriodFilter } from "../../components/dashboard/PeriodFilter";
import { GlobalOverview } from "../../components/dashboard/GlobalOverview";
import { TopLists } from "../../components/dashboard/TopLists";
import { Trends } from "../../components/dashboard/Trends";
import { BehaviorPanel } from "../../components/dashboard/BehaviorPanel";
import { DarkMonths } from "../../components/dashboard/DarkMonths";
import { SpotifySync } from "../../components/dashboard/SpotifySync";
import { WrappedCard } from "../../components/dashboard/WrappedCard";
import { PageTransition } from "../../components/motion/MotionComponents";
import { FileDropzone } from "../../components/upload/FileDropzone";

// ============================================================
// ÉTATS UI
// ============================================================

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Analyse de votre historique...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-state" role="alert">
      <p>⚠ Erreur : {message}</p>
    </div>
  );
}

// ============================================================
// PANNEAU D'IMPORT (drawer latéral ou modale)
// ============================================================

function ImportDrawer({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 150,
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(480px, 100vw)",
              background: "#181818",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              zIndex: 151,
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {/* Header drawer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                📂 Importer une archive
              </h2>
              <button className="btn-icon" onClick={onClose}>✕</button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Importez vos fichiers <code style={{
                background: "var(--bg-highlight)",
                padding: "0.1rem 0.4rem",
                borderRadius: 4,
                color: "var(--sp-green)",
                fontSize: "0.78rem",
              }}>endsong_X.json</code> depuis votre archive Spotify.
              Vous pouvez en importer plusieurs à la fois, depuis votre téléphone ou votre ordinateur.
            </p>

            <FileDropzone
              onImportComplete={() => {
                onImportComplete();
                onClose();
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// ÉTAT VIDE — dashboard sans données
// ============================================================

function EmptyDashboard({
  onOpenImport,
}: {
  onOpenImport: () => void;
}) {
  return (
    <motion.div
      className="empty-dashboard"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="empty-dashboard__icon">🎵</div>
      <h2>Aucune donnée importée</h2>
      <p>
        Importez votre archive Spotify pour voir votre historique complet,
        ou connectez votre compte pour synchroniser vos écoutes récentes.
      </p>

      <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
        <button className="btn-primary" onClick={onOpenImport}>
          📂 Importer une archive
        </button>
      </div>

      <div style={{
        marginTop: "1.5rem",
        padding: "1.25rem",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        maxWidth: 400,
        textAlign: "left",
      }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
          📦 Comment obtenir mon archive ?
        </p>
        <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {[
            "Ouvrez Spotify → Compte → Confidentialité",
            'Cliquez "Demander vos données"',
            'Choisissez "Données d\'historique étendu"',
            "Spotify vous envoie un email sous 3 à 30 jours",
            "Extrayez le ZIP et importez les fichiers endsong_X.json",
          ].map((step, i) => (
            <li key={i} style={{ fontSize: "0.78rem", color: "var(--text-subdued)", lineHeight: 1.5 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function DashboardPage() {
  const { db, isReady } = useDB();
  const { stats, isLoading, error, period, setPeriod, hasData, currentFilter, refetch } =
    useSpotifyStats(db);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [bgSyncToast, setBgSyncToast] = useState<string | null>(null);

  // Initialiser la sync arrière-plan au montage
  useEffect(() => {
    initBackgroundSync((result) => {
      if ((result.inserted ?? 0) > 0) {
        setBgSyncToast(`↻ ${result.inserted} nouvelle${result.inserted! > 1 ? "s" : ""} écoute${result.inserted! > 1 ? "s" : ""} synchronisée${result.inserted! > 1 ? "s" : ""}`);
        setTimeout(() => setBgSyncToast(null), 4000);
        refetch(); // Recharge les stats avec le cache invalidé
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chargement initial de la DB
  if (!isReady) {
    return (
      <main className="dashboard-layout">
        <LoadingState />
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="dashboard-layout">

        {/* ====== HEADER ====== */}
        <header className="dashboard-header">
          <div className="dashboard-header__left">
            <a href="/" className="back-link">← Accueil</a>
            <h1 className="dashboard-title">
              <span className="logo-icon">◉</span>
              Ultimate Wrapped
            </h1>
          </div>

          <div className="dashboard-header__right">
            {/* Bouton import — toujours visible */}
            <motion.button
              className="btn-icon"
              onClick={() => setIsImportOpen(true)}
              whileTap={{ scale: 0.93 }}
              title="Importer une archive Spotify"
              style={{ fontSize: "1rem" }}
            >
              📂
            </motion.button>

            {/* Export PNG — visible si données */}
            {hasData && (
              <motion.button
                className="export-btn"
                onClick={() => setIsWrappedOpen(true)}
                whileTap={{ scale: 0.95 }}
              >
                ↓ Exporter
              </motion.button>
            )}

            {/* Spotify Sync */}
            <SpotifySync
              onSyncComplete={(inserted) => {
                if (inserted > 0) refetch();
              }}
            />

            {/* Filtre période — visible si données */}
            {hasData && (
              <PeriodFilter
                value={period}
                onChange={setPeriod}
                disabled={isLoading}
              />
            )}
          </div>
        </header>

        {/* ====== ERREUR ====== */}
        {error && <ErrorState message={error} />}

        {/* ====== OVERLAY CHARGEMENT ====== */}
        {isLoading && hasData && (
          <div className="loading-overlay" aria-live="polite">
            <div className="loading-spinner loading-spinner--sm" />
            <span>Mise à jour...</span>
          </div>
        )}

        {/* ====== CONTENU ====== */}
        <div className={`dashboard-content ${isLoading ? "dashboard-content--loading" : ""}`}>

          {/* Pas de données → état vide */}
          {!isLoading && !hasData && !error && (
            <EmptyDashboard onOpenImport={() => setIsImportOpen(true)} />
          )}

          {/* Données présentes → dashboard complet */}
          {hasData && (
            <>
              {stats.global && (
                <GlobalOverview
                  global={stats.global}
                  behavior={stats.behavior}
                  streaks={stats.streaks}
                />
              )}
              <TopLists
                topArtists={stats.topArtists}
                topTracks={stats.topTracks}
                topAlbums={stats.topAlbums}
                mostSkipped={stats.mostSkipped}
              />
              <Trends
                yearlyTrends={stats.yearlyTrends}
                monthlyTrends={stats.monthlyTrends}
                byHour={stats.byHour}
                byDayOfWeek={stats.byDayOfWeek}
              />
              <BehaviorPanel
                behavior={stats.behavior}
                skipStats={stats.skipStats}
                streaks={stats.streaks}
                discoveryTrends={stats.discoveryTrends}
              />
              <DarkMonths data={stats.darkestMonths} />
            </>
          )}
        </div>

        {/* ====== FOOTER ====== */}
        {hasData && (
          <footer className="dashboard-footer">
            <p>🔒 Toutes vos données restent sur votre appareil · Aucun serveur</p>
            {stats.global?.firstPlay && (
              <p className="footer-range">
                Données du{" "}
                {stats.global.firstPlay.toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
                {" "}au{" "}
                {stats.global.lastPlay?.toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            )}
          </footer>
        )}

        {/* ====== DRAWER IMPORT ====== */}
        <ImportDrawer
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImportComplete={() => {
            refetch();
          }}
        />

        {/* ====== TOAST SYNC ARRIÈRE-PLAN ====== */}
        <AnimatePresence>
          {bgSyncToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                position: "fixed",
                bottom: "calc(1.5rem + var(--safe-bottom))",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--bg-elevated)",
                border: "1px solid rgba(29,185,84,0.4)",
                borderRadius: "500px",
                padding: "0.6rem 1.25rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--sp-green)",
                zIndex: 300,
                whiteSpace: "nowrap",
                boxShadow: "var(--shadow)",
              }}
            >
              {bgSyncToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====== EXPORT MODAL ====== */}
        <WrappedCard
          global={stats.global}
          topArtists={stats.topArtists}
          periodLabel={currentFilter.label}
          isOpen={isWrappedOpen}
          onClose={() => setIsWrappedOpen(false)}
        />

      </main>
    </PageTransition>
  );
}
