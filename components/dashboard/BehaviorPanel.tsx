// ============================================================
// components/dashboard/BehaviorPanel.tsx
// Section : Stats comportementales + Découverte musicale
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type {
  BehaviorStats,
  DiscoveryYear,
  ListeningStreaks,
  SkipStats,
} from "../../lib/queries/types";
import { StatCard } from "./StatCard";

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

// ============================================================
// RADAR CHART — Profil d'écoute
// ============================================================

function ListenerProfileRadar({
  behavior,
  skipStats,
}: {
  behavior: BehaviorStats;
  skipStats: SkipStats | null;
}) {
  const data = [
    { subject: "Exploration",  value: Math.round((1 - behavior.skipRate) * 100), fullMark: 100 },
    { subject: "Noctambule",   value: behavior.nightOwlPercent,                  fullMark: 100 },
    { subject: "Matinal",      value: behavior.morningPercent,                   fullMark: 100 },
    { subject: "Shuffle",      value: Math.round(behavior.shuffleRate * 100),    fullMark: 100 },
    { subject: "Offline",      value: Math.min(100, Math.round((behavior.offlineHours / 100) * 100)), fullMark: 100 },
    { subject: "Complétion",   value: skipStats?.avgListenPercent ?? 50,         fullMark: 100 },
  ];

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Votre profil d&apos;auditeur</p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#ccc", fontSize: 12 }} />
          <Radar
            name="Profil"
            dataKey="value"
            stroke="#1DB954"
            fill="#1DB954"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// DISCOVERY CHART
// ============================================================

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
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fill: "#aaa", fontSize: 12 }} />
          <YAxis tick={{ fill: "#aaa", fontSize: 11 }} />
          <Tooltip
            // ✅ APRÈS
		formatter={(value) => [`${value ?? 0} artistes`, "Nouveaux"]}
          />
          <Bar dataKey="nouveaux" radius={[4, 4, 0, 0]}>
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

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function BehaviorPanel({
  behavior,
  skipStats,
  streaks,
  discoveryTrends,
}: BehaviorPanelProps) {
  return (
    <section className="dashboard-section" aria-labelledby="behavior-title">
      <h2 id="behavior-title" className="section-title">
        Comportement &amp; Découverte
      </h2>

      <div className="behavior-grid">
        <div className="behavior-stats">
          {skipStats && (
            <>
              <StatCard
                title="Taux de complétion moyen"
                value={`${skipStats.avgListenPercent}%`}
                subtitle="d'un titre écouté en moyenne"
                icon="🎯"
                accent="green"
              />
              <StatCard
                title="Titres abandonnés"
                value={skipStats.skippedPlays.toLocaleString("fr-FR")}
                subtitle={`${formatPercent(skipStats.skipRate)} de vos écoutes`}
                icon="⏭"
                accent="red"
              />
            </>
          )}
          {behavior && (
            <>
              <StatCard
                title="Écoute en shuffle"
                value={formatPercent(behavior.shuffleRate)}
                subtitle="des sessions en mode aléatoire"
                icon="🔀"
                accent="blue"
              />
              <StatCard
                title="Temps hors-ligne"
                value={`${behavior.offlineHours}h`}
                subtitle="sans connexion internet"
                icon="✈️"
                accent="yellow"
              />
            </>
          )}
          {streaks && (
            <>
              <StatCard
                title="Plus longue série"
                value={`${streaks.longestStreakDays} jours`}
                subtitle={
                  streaks.longestStreakStart
                    ? `du ${formatDate(streaks.longestStreakStart)} au ${formatDate(streaks.longestStreakEnd)}`
                    : undefined
                }
                icon="🔥"
                accent="yellow"
              />
              <StatCard
                title="Jours actifs au total"
                value={streaks.totalActiveDays.toLocaleString("fr-FR")}
                subtitle="jours avec au moins 1 écoute"
                icon="📅"
                accent="purple"
              />
            </>
          )}
        </div>

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
  );
}
