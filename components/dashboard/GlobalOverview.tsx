// ============================================================
// components/dashboard/GlobalOverview.tsx
// Section : Vue d'ensemble — Stats globales
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import { StatCard } from "./StatCard";
import type { GlobalStats, BehaviorStats, ListeningStreaks } from "../../lib/queries/types";

interface GlobalOverviewProps {
  global: GlobalStats;
  behavior: BehaviorStats | null;
  streaks: ListeningStreaks | null;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function GlobalOverview({ global, behavior, streaks }: GlobalOverviewProps) {
  return (
    <section className="dashboard-section" aria-labelledby="overview-title">
      <h2 id="overview-title" className="section-title">
        Vue d&apos;ensemble
      </h2>

      <div className="stats-grid stats-grid--4col">
        <StatCard
          title="Temps d'écoute total"
          value={`${global.totalHours.toLocaleString("fr-FR")}h`}
          subtitle={`${global.totalDays.toLocaleString("fr-FR")} jours`}
          icon="⏱"
          accent="green"
          size="lg"
        />
        <StatCard
          title="Titres écoutés"
          value={global.totalPlays.toLocaleString("fr-FR")}
          subtitle={`${global.uniqueTracks.toLocaleString("fr-FR")} titres uniques`}
          icon="🎵"
          accent="blue"
          size="lg"
        />
        <StatCard
          title="Artistes découverts"
          value={global.uniqueArtists.toLocaleString("fr-FR")}
          subtitle="artistes uniques"
          icon="🎤"
          accent="purple"
          size="lg"
        />
        <StatCard
          title="Fidélité Spotify"
          value={`${global.accountAgeYears} ans`}
          subtitle={`Depuis ${formatDate(global.firstPlay)}`}
          icon="📅"
          accent="yellow"
          size="lg"
        />
      </div>

      {(behavior || streaks) && (
        <div className="stats-grid stats-grid--3col" style={{ marginTop: "1rem" }}>
          {behavior && (
            <>
              <StatCard
                title="Taux de skip"
                value={formatPercent(behavior.skipRate)}
                subtitle="titres abandonnés < 30s"
                icon="⏭"
                accent="red"
              />
              <StatCard
                title="Écoute nocturne"
                value={formatPercent(behavior.nightOwlPercent / 100)}
                subtitle="des écoutes entre 0h et 5h"
                icon="🌙"
                accent="purple"
              />
              <StatCard
                title="Mode hors-ligne"
                value={`${behavior.offlineHours.toLocaleString("fr-FR")}h`}
                subtitle="écoutées sans connexion"
                icon="✈️"
                accent="blue"
              />
            </>
          )}
          {streaks && (
            <StatCard
              title="Meilleure série"
              value={`${streaks.longestStreakDays} jours`}
              subtitle={
                streaks.longestStreakStart
                  ? `du ${formatDate(streaks.longestStreakStart)}`
                  : undefined
              }
              icon="🔥"
              accent="yellow"
            />
          )}
        </div>
      )}
    </section>
  );
}
