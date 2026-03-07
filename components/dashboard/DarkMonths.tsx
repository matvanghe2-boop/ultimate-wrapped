// ============================================================
// components/dashboard/DarkMonths.tsx
// Section : Mois Sombres — Redesign Sprint 3
// ============================================================

"use client";

import { motion } from "framer-motion";
import { SectionReveal } from "../motion/MotionComponents";
import type { MoodMonth } from "../../lib/queries/types";

interface DarkMonthsProps {
  data: MoodMonth[];
}

function DarknessBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "#f15e6c" :
    score >= 50 ? "#ff8c42" :
    score >= 30 ? "#f5c542" : "#1DB954";

  return (
    <div className="darkness-bar-container" aria-label={`Score de noirceur : ${score}/100`}>
      <motion.div
        className="darkness-bar-fill"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
      />
      <span className="darkness-bar-label">{score}/100</span>
    </div>
  );
}

export function DarkMonths({ data }: DarkMonthsProps) {
  if (data.length === 0) {
    return (
      <SectionReveal delay={0.3}>
        <section className="dashboard-section">
          <h2 className="section-title">🌑 Mois les plus sombres</h2>
          <p className="empty-state">
            Pas assez de données pour calculer les mois sombres (min. 10 écoutes par mois).
          </p>
        </section>
      </SectionReveal>
    );
  }

  return (
    <SectionReveal delay={0.3}>
      <section className="dashboard-section" aria-labelledby="dark-title">
        <h2 id="dark-title" className="section-title">🌑 Vos mois les plus sombres</h2>
        <p className="section-desc">
          Score composite basé sur le taux de skip, l&apos;écoute nocturne, le shuffle et les abandons compulsifs.
        </p>

        <div className="dark-months-grid">
          {data.map((month, i) => (
            <motion.div
              key={`${month.year}-${month.month}`}
              className={`dark-month-card dark-month-card--rank-${i + 1}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
                delay: i * 0.08,
              }}
            >
              <div className="dark-month-card__header">
                <span className="dark-month-card__rank">#{i + 1}</span>
                <span className="dark-month-card__label">{month.monthLabel}</span>
              </div>

              <DarknessBar score={month.darknessScore} />

              <div className="dark-month-card__stats">
                <div className="dark-stat">
                  <span className="dark-stat__icon">⏭</span>
                  <span className="dark-stat__value">{Math.round(month.skipRate * 100)}%</span>
                  <span className="dark-stat__label">skips</span>
                </div>
                <div className="dark-stat">
                  <span className="dark-stat__icon">🌙</span>
                  <span className="dark-stat__value">{Math.round(month.nightListeningRate * 100)}%</span>
                  <span className="dark-stat__label">nuit</span>
                </div>
                <div className="dark-stat">
                  <span className="dark-stat__icon">🔀</span>
                  <span className="dark-stat__value">{Math.round(month.shuffleRate * 100)}%</span>
                  <span className="dark-stat__label">shuffle</span>
                </div>
                <div className="dark-stat">
                  <span className="dark-stat__icon">💀</span>
                  <span className="dark-stat__value">{month.compulsiveSkips}</span>
                  <span className="dark-stat__label">abandons</span>
                </div>
              </div>

              <div className="dark-month-card__footer">
                <span className="dark-month-card__artist">🎵 {month.topArtist}</span>
                <span className="dark-month-card__plays">
                  {month.totalPlays.toLocaleString("fr-FR")} écoutes
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </SectionReveal>
  );
}
