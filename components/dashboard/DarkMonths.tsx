// ============================================================
// components/dashboard/DarkMonths.tsx
// Section : "Mois Sombres" — Tier 5
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import type { MoodMonth } from "../../lib/queries/types";

interface DarkMonthsProps {
  data: MoodMonth[];
}

function DarknessBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "#ef4444"
      : score >= 50
      ? "#f97316"
      : score >= 30
      ? "#eab308"
      : "#1DB954";

  return (
    <div className="darkness-bar-container" aria-label={`Score de noirceur : ${score}/100`}>
      <div
        className="darkness-bar-fill"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
      <span className="darkness-bar-label">{score}/100</span>
    </div>
  );
}

export function DarkMonths({ data }: DarkMonthsProps) {
  if (data.length === 0) {
    return (
      <section className="dashboard-section">
        <h2 className="section-title">🌑 Mois les plus sombres</h2>
        <p className="empty-state">
          Pas assez de données pour calculer les mois sombres (min. 10 écoutes par mois).
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-section" aria-labelledby="dark-title">
      <h2 id="dark-title" className="section-title">🌑 Vos mois les plus sombres</h2>
      <p className="section-desc">
        Score composite basé sur le taux de skip, l&apos;écoute nocturne, le shuffle et les abandons compulsifs.
      </p>

      <div className="dark-months-grid">
        {data.map((month, i) => (
          <div
            key={`${month.year}-${month.month}`}
            className={`dark-month-card dark-month-card--rank-${i + 1}`}
          >
            <div className="dark-month-card__header">
              <span className="dark-month-card__rank">#{i + 1}</span>
              <span className="dark-month-card__label">{month.monthLabel}</span>
            </div>

            <DarknessBar score={month.darknessScore} />

            <div className="dark-month-card__stats">
              <div className="dark-stat">
                <span className="dark-stat__icon">⏭</span>
                <span className="dark-stat__value">
                  {Math.round(month.skipRate * 100)}%
                </span>
                <span className="dark-stat__label">skips</span>
              </div>
              <div className="dark-stat">
                <span className="dark-stat__icon">🌙</span>
                <span className="dark-stat__value">
                  {Math.round(month.nightListeningRate * 100)}%
                </span>
                <span className="dark-stat__label">nuit</span>
              </div>
              <div className="dark-stat">
                <span className="dark-stat__icon">🔀</span>
                <span className="dark-stat__value">
                  {Math.round(month.shuffleRate * 100)}%
                </span>
                <span className="dark-stat__label">shuffle</span>
              </div>
              <div className="dark-stat">
                <span className="dark-stat__icon">💀</span>
                <span className="dark-stat__value">{month.compulsiveSkips}</span>
                <span className="dark-stat__label">abandons</span>
              </div>
            </div>

            <div className="dark-month-card__footer">
              <span className="dark-month-card__artist">
                🎵 {month.topArtist}
              </span>
              <span className="dark-month-card__plays">
                {month.totalPlays.toLocaleString("fr-FR")} écoutes
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
