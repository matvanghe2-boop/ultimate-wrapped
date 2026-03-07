// ============================================================
// app/dashboard/page.tsx
// Page principale Dashboard — Ultimate Wrapped Sprint 3
// ============================================================

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDB } from "../../hooks/useDB";
import { useSpotifyStats } from "../../hooks/useSpotifyStats";
import { PeriodFilter } from "../../components/dashboard/PeriodFilter";
import { GlobalOverview } from "../../components/dashboard/GlobalOverview";
import { TopLists } from "../../components/dashboard/TopLists";
import { Trends } from "../../components/dashboard/Trends";
import { BehaviorPanel } from "../../components/dashboard/BehaviorPanel";
import { DarkMonths } from "../../components/dashboard/DarkMonths";
import { SpotifySync } from "../../components/dashboard/SpotifySync";
import { WrappedCard } from "../../components/dashboard/WrappedCard";
import { PageTransition } from "../../components/motion/MotionComponents";

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Analyse de votre historique...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-dashboard">
      <div className="empty-dashboard__icon">🎵</div>
      <h2>Aucune donnée trouvée</h2>
      <p>Importez d&apos;abord votre archive Spotify depuis la page d&apos;accueil.</p>
      <a href="/" className="btn-primary" style={{ marginTop: "0.5rem" }}>
        Importer mon archive →
      </a>
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

export default function DashboardPage() {
  const { db, isReady } = useDB();
  const { stats, isLoading, error, period, setPeriod, hasData, currentFilter } =
    useSpotifyStats(db);

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  if (!isReady) {
    return (
      <main className="dashboard-layout">
        <LoadingState />
      </main>
    );
  }

  if (!isLoading && !hasData && !error) {
    return (
      <main className="dashboard-layout">
        <EmptyState />
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
            {/* Export PNG */}
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
                // Rafraîchir les stats si de nouvelles écoutes ont été ajoutées
                if (inserted > 0) {
                  window.location.reload();
                }
              }}
            />

            {/* Filtre période */}
            <PeriodFilter
              value={period}
              onChange={setPeriod}
              disabled={isLoading}
            />
          </div>
        </header>

        {/* ====== ALERTES ====== */}
        {error && <ErrorState message={error} />}

        {isLoading && (
          <div className="loading-overlay" aria-live="polite">
            <div className="loading-spinner loading-spinner--sm" />
            <span>Mise à jour...</span>
          </div>
        )}

        {/* ====== CONTENU ====== */}
        <div
          className={`dashboard-content ${isLoading ? "dashboard-content--loading" : ""}`}
        >
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
        </div>

        {/* ====== FOOTER ====== */}
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
