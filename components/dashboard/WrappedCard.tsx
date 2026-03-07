// ============================================================
// components/dashboard/WrappedCard.tsx
// Export PNG du résumé Wrapped — Sprint 3
// ============================================================
// Installation requise : npm install html2canvas
// ============================================================

"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { AnimatedOverlay } from "../motion/MotionComponents";
import type { GlobalStats, ArtistStat } from "../../lib/queries/types";

interface WrappedCardProps {
  global: GlobalStats | null;
  topArtists: ArtistStat[];
  periodLabel: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WrappedCard({ global, topArtists, periodLabel, isOpen, onClose }: WrappedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Import dynamique pour éviter le SSR
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,           // 2x pour la qualité
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `ultimate-wrapped-${periodLabel.toLowerCase().replace(/\s/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error("[WrappedCard] Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const top3 = topArtists.slice(0, 3);

  return (
    <AnimatedOverlay isOpen={isOpen} onClose={onClose}>
      <div className="wrapped-card-modal">
        <div className="wrapped-card-modal__title">📸 Exporter mon Wrapped</div>

        {/* La carte exportable */}
        <div ref={cardRef} className="wrapped-export-card">
          {/* Effets décoratifs */}
          <div className="wrapped-export-card__noise" />
          <div className="wrapped-export-card__glow" />

          {/* Header */}
          <div className="wrapped-export-card__header">
            <div className="wrapped-export-card__logo">
              <span style={{ color: "#1DB954" }}>◉</span>
              Ultimate Wrapped
            </div>
            <div className="wrapped-export-card__period">{periodLabel}</div>
          </div>

          {/* Stat principale : heures */}
          {global && (
            <div className="wrapped-export-card__hero">
              <div className="wrapped-export-card__hours">
                {global.totalHours.toLocaleString("fr-FR")}
                <span>h</span>
              </div>
              <div className="wrapped-export-card__label">d&apos;écoute au total</div>
            </div>
          )}

          {/* Top 3 artistes */}
          {top3.length > 0 && (
            <div className="wrapped-export-card__artists">
              <div className="wrapped-export-card__artists-title">Mes artistes préférés</div>
              {top3.map((artist, i) => (
                <div key={artist.artistName} className="wrapped-export-card__artist-row">
                  <span className="wrapped-export-card__artist-rank">#{i + 1}</span>
                  <span className="wrapped-export-card__artist-name">{artist.artistName}</span>
                  <span className="wrapped-export-card__artist-hours">{artist.totalHours}h</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats footer */}
          {global && (
            <div className="wrapped-export-card__footer">
              <div className="wrapped-export-card__stat">
                <span className="wrapped-export-card__stat-value">
                  {global.totalPlays.toLocaleString("fr-FR")}
                </span>
                <span className="wrapped-export-card__stat-label">écoutes</span>
              </div>
              <div className="wrapped-export-card__stat">
                <span className="wrapped-export-card__stat-value">
                  {global.uniqueArtists.toLocaleString("fr-FR")}
                </span>
                <span className="wrapped-export-card__stat-label">artistes</span>
              </div>
              <div className="wrapped-export-card__stat">
                <span className="wrapped-export-card__stat-value">
                  {global.uniqueTracks.toLocaleString("fr-FR")}
                </span>
                <span className="wrapped-export-card__stat-label">titres</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="wrapped-card-modal__actions">
          <button className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <motion.button
            className="btn-primary"
            onClick={handleExport}
            disabled={isExporting}
            whileTap={{ scale: 0.96 }}
          >
            {isExporting ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 0.75s linear infinite" }}>↻</span>
                Export...
              </>
            ) : exportDone ? (
              <> ✓ Téléchargé !</>
            ) : (
              <> ↓ Télécharger PNG</>
            )}
          </motion.button>
        </div>
      </div>
    </AnimatedOverlay>
  );
}
