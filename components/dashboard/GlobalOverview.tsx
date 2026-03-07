// ============================================================
// components/dashboard/GlobalOverview.tsx
// Section : Vue d'ensemble — Redesign Sprint 3
// ============================================================

"use client";

import { StatCard } from "./StatCard";
import { SectionReveal, StaggerList, StaggerItem } from "../motion/MotionComponents";
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
    <SectionReveal>
      <section className="dashboard-section" aria-labelledby="overview-title">
        <h2 id="overview-title" className="section-title">
          Vue d&apos;ensemble
        </h2>

        <StaggerList className="stats-grid stats-grid--4col">
          <StaggerItem>
            <StatCard
              title="Temps d'écoute total"
              value={`${global.totalHours.toLocaleString("fr-FR")}h`}
              animatedValue={global.totalHours}
              animatedSuffix="h"
              subtitle={`${global.totalDays.toLocaleString("fr-FR")} jours`}
              icon="⏱"
              accent="green"
              size="lg"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Titres écoutés"
              value={global.totalPlays.toLocaleString("fr-FR")}
              animatedValue={global.totalPlays}
              subtitle={`${global.uniqueTracks.toLocaleString("fr-FR")} titres uniques`}
              icon="🎵"
              accent="blue"
              size="lg"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Artistes découverts"
              value={global.uniqueArtists.toLocaleString("fr-FR")}
              animatedValue={global.uniqueArtists}
              subtitle="artistes uniques"
              icon="🎤"
              accent="purple"
              size="lg"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Fidélité Spotify"
              value={`${global.accountAgeYears} ans`}
              animatedValue={global.accountAgeYears}
              animatedSuffix=" ans"
              subtitle={`Depuis ${formatDate(global.firstPlay)}`}
              icon="📅"
              accent="yellow"
              size="lg"
            />
          </StaggerItem>
        </StaggerList>

        {(behavior || streaks) && (
          <div style={{ marginTop: "0.875rem" }}>
          <StaggerList
            className="stats-grid stats-grid--3col"
            delay={0.2}
          >
            {behavior && (
              <>
                <StaggerItem>
                  <StatCard
                    title="Taux de skip"
                    value={formatPercent(behavior.skipRate)}
                    subtitle="titres abandonnés < 30s"
                    icon="⏭"
                    accent="red"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    title="Écoute nocturne"
                    value={`${behavior.nightOwlPercent}%`}
                    subtitle="des écoutes entre 0h et 5h"
                    icon="🌙"
                    accent="purple"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    title="Mode hors-ligne"
                    value={`${behavior.offlineHours.toLocaleString("fr-FR")}h`}
                    animatedValue={behavior.offlineHours}
                    animatedSuffix="h"
                    subtitle="écoutées sans connexion"
                    icon="✈️"
                    accent="blue"
                  />
                </StaggerItem>
              </>
            )}
            {streaks && (
              <StaggerItem>
                <StatCard
                  title="Meilleure série"
                  value={`${streaks.longestStreakDays} jours`}
                  animatedValue={streaks.longestStreakDays}
                  animatedSuffix=" jours"
                  subtitle={
                    streaks.longestStreakStart
                      ? `du ${formatDate(streaks.longestStreakStart)}`
                      : undefined
                  }
                  icon="🔥"
                  accent="yellow"
                />
              </StaggerItem>
            )}
          </StaggerList>
          </div>
        )}
      </section>
    </SectionReveal>
  );
}
