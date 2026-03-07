// ============================================================
// components/dashboard/BehaviorPanel.tsx
// Section : Comportement & Découverte — Redesign Sprint 3
// ============================================================

"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts";
import { SectionReveal, StaggerList, StaggerItem } from "../motion/MotionComponents";
import { StatCard } from "./StatCard";
import type { BehaviorStats, DiscoveryYear, ListeningStreaks, SkipStats } from "../../lib/queries/types";

interface BehaviorPanelProps {
  behavior: BehaviorStats | null;
  skipStats: SkipStats | null;
  streaks: ListeningStreaks | null;
  discoveryTrends: DiscoveryYear[];
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function ListenerProfileRadar({
  behavior,
  skipStats,
}: {
  behavior: BehaviorStats;
  skipStats: SkipStats | null;
}) {
  const data = [
    { subject: "Exploration", value: Math.round((1 - behavior.skipRate) * 100), fullMark: 100 },
    { subject: "Noctambule",  value: behavior.nightOwlPercent,                  fullMark: 100 },
    { subject: "Matinal",     value: behavior.morningPercent,                   fullMark: 100 },
    { subject: "Shuffle",     value: Math.round(behavior.shuffleRate * 100),    fullMark: 100 },
    { subject: "Offline",     value: Math.min(100, Math.round((behavior.offlineHours / 100) * 100)), fullMark: 100 },
    { subject: "Complétion",  value: skipStats?.avgListenPercent ?? 50,         fullMark: 100 },
  ];

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Profil d&apos;auditeur</p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#b3b3b3", fontSize: 12, fontWeight: 500 }}
          />
          <Radar
            name="Profil"
            dataKey="value"
            stroke="#1DB954"
            fill="#1DB954"
            fillOpacity={0.18}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DiscoveryChart({ data }: { data: DiscoveryYear[] }) {
  if (data.length === 0) return <p className="empty-state">Aucune donnée</p>;

  const chartData = data.map((d) => ({
    year: String(d.year),
    nouveaux: d.newArtistsCount,
    rate: Math.round(d.discoveryRate * 100),
  }));

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Nouveaux artistes découverts par année</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" tick={{ fill: "#6a6a6a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6a6a6a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => [`${value ?? 0} artistes`, "Nouveaux"]}
          />
          <Bar dataKey="nouveaux" radius={[5, 5, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={`hsl(${140 + entry.rate}, 65%, ${35 + entry.rate * 0.2}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="discovery-table">
        {data.map((d) => (
          <div key={d.year} className="discovery-table__row">
            <span className="discovery-table__year">{d.year}</span>
            <span className="discovery-table__new">+{d.newArtistsCount} nouveaux</span>
            <div className="discovery-bar-container">
              <div
                className="discovery-bar-fill"
                style={{ width: `${Math.round(d.discoveryRate * 100)}%` }}
              />
            </div>
            <span className="discovery-table__rate">
              {Math.round(d.discoveryRate * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BehaviorPanel({ behavior, skipStats, streaks, discoveryTrends }: BehaviorPanelProps) {
  return (
    <SectionReveal delay={0.2}>
      <section className="dashboard-section" aria-labelledby="behavior-title">
        <h2 id="behavior-title" className="section-title">Comportement &amp; Découverte</h2>

        <div className="behavior-grid">
          <StaggerList className="behavior-stats">
            {skipStats && (
              <>
                <StaggerItem>
                  <StatCard
                    title="Taux de complétion moyen"
                    value={`${skipStats.avgListenPercent}%`}
                    animatedValue={skipStats.avgListenPercent}
                    animatedSuffix="%"
                    subtitle="d'un titre écouté en moyenne"
                    icon="🎯"
                    accent="green"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    title="Titres abandonnés"
                    value={skipStats.skippedPlays.toLocaleString("fr-FR")}
                    animatedValue={skipStats.skippedPlays}
                    subtitle={`${formatPercent(skipStats.skipRate)} de vos écoutes`}
                    icon="⏭"
                    accent="red"
                  />
                </StaggerItem>
              </>
            )}
            {behavior && (
              <>
                <StaggerItem>
                  <StatCard
                    title="Écoute en shuffle"
                    value={formatPercent(behavior.shuffleRate)}
                    subtitle="des sessions en mode aléatoire"
                    icon="🔀"
                    accent="blue"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    title="Temps hors-ligne"
                    value={`${behavior.offlineHours}h`}
                    animatedValue={behavior.offlineHours}
                    animatedSuffix="h"
                    subtitle="sans connexion internet"
                    icon="✈️"
                    accent="yellow"
                  />
                </StaggerItem>
              </>
            )}
            {streaks && (
              <>
                <StaggerItem>
                  <StatCard
                    title="Plus longue série"
                    value={`${streaks.longestStreakDays} jours`}
                    animatedValue={streaks.longestStreakDays}
                    animatedSuffix=" jours"
                    subtitle={
                      streaks.longestStreakStart
                        ? `du ${formatDate(streaks.longestStreakStart)} au ${formatDate(streaks.longestStreakEnd)}`
                        : undefined
                    }
                    icon="🔥"
                    accent="yellow"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    title="Jours actifs"
                    value={streaks.totalActiveDays.toLocaleString("fr-FR")}
                    animatedValue={streaks.totalActiveDays}
                    subtitle="jours avec au moins 1 écoute"
                    icon="📅"
                    accent="purple"
                  />
                </StaggerItem>
              </>
            )}
          </StaggerList>

          {behavior && (
            <ListenerProfileRadar behavior={behavior} skipStats={skipStats} />
          )}
        </div>

        {discoveryTrends.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3 className="subsection-title">🔍 Taux de découverte musicale</h3>
            <DiscoveryChart data={discoveryTrends} />
          </div>
        )}
      </section>
    </SectionReveal>
  );
}
