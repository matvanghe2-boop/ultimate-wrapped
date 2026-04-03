// ============================================================
// components/dashboard/TopLists.tsx
// Palmarès — Top 50 avec scroll interne — Sprint 4
// Onglets : Artistes / Titres / Albums (skippés supprimé)
// ============================================================

"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { SectionReveal, AnimatedTabContent, StaggerList, StaggerItem, AnimatedBar } from "../motion/MotionComponents";
import type { ArtistStat, TrackStat, AlbumStat } from "../../lib/queries/types";

type TopTab = "artists" | "tracks" | "albums";

interface TopListsProps {
  topArtists: ArtistStat[];
  topTracks: TrackStat[];
  topAlbums: AlbumStat[];
}

// ============================================================
// CONSTANTES
// ============================================================

const LIST_HEIGHT = 480; // hauteur fixe du conteneur scrollable

const BAR_COLORS = [
  "#1DB954", "#1AAE4F", "#179249", "#147743", "#115C3D",
  "#0E4137", "#0B2E31", "#08232B", "#051825", "#020E1F",
];

// ============================================================
// TOOLTIP
// ============================================================

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__value">{payload[0].value.toLocaleString("fr-FR")}h</p>
    </div>
  );
}

// ============================================================
// ARTISTES — graphique top 10 + liste scrollable top 50
// ============================================================

function ArtistChart({ data }: { data: ArtistStat[] }) {
  const maxHours = Math.max(...data.map((a) => a.totalHours), 1);
  const chartData = data.slice(0, 10).map((a) => ({
    name: a.artistName.length > 16 ? a.artistName.slice(0, 16) + "…" : a.artistName,
    fullName: a.artistName,
    hours: a.totalHours,
    plays: a.playCount,
  }));

  return (
    <div className="chart-wrapper">
      {/* Graphique top 10 */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis
            type="number"
            dataKey="hours"
            tick={{ fill: "#6a6a6a", fontSize: 11 }}
            tickFormatter={(v) => `${v}h`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={115}
            tick={{ fill: "#b3b3b3", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="hours" radius={[0, 6, 6, 0]} maxBarSize={24}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index] ?? BAR_COLORS[BAR_COLORS.length - 1]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Liste top 50 — scroll interne */}
      <p className="chart-caption" style={{ marginTop: "1.25rem" }}>
        Top {data.length} artistes
      </p>
      <div
        style={{
          height: LIST_HEIGHT,
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        <StaggerList className="top-list">
          {data.map((artist, i) => (
            <StaggerItem key={artist.artistName}>
              <div className="top-list__item">
                <span className="top-list__rank">#{i + 1}</span>
                <div className="top-list__info">
                  <span className="top-list__name">{artist.artistName}</span>
                  <AnimatedBar
                    percent={(artist.totalHours / maxHours) * 100}
                    delay={i * 0.02}
                    height={2}
                  />
                </div>
                <span className="top-list__meta">
                  {artist.playCount.toLocaleString("fr-FR")} écoutes
                </span>
                <span className="top-list__value" style={{ color: "#1DB954" }}>
                  {artist.totalHours}h
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </div>
  );
}

// ============================================================
// TITRES — liste scrollable top 50
// ============================================================

function TrackList({ data }: { data: TrackStat[] }) {
  const maxPlays = Math.max(...data.map((t) => t.playCount), 1);
  return (
    <div
      style={{
        height: LIST_HEIGHT,
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent",
      }}
    >
      <StaggerList className="top-list">
        {data.map((track, i) => (
          <StaggerItem key={track.trackUri ?? `${track.trackName}-${i}`}>
            <div className="top-list__item">
              <span className="top-list__rank">#{i + 1}</span>
              <div className="top-list__info">
                <span className="top-list__name">{track.trackName}</span>
                <span className="top-list__sub">{track.artistName}</span>
                <AnimatedBar
                  percent={(track.playCount / maxPlays) * 100}
                  delay={i * 0.02}
                  height={2}
                />
              </div>
              <span className="top-list__meta">
                {track.playCount.toLocaleString("fr-FR")} · {track.totalHours}h
              </span>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}

// ============================================================
// ALBUMS — liste scrollable top 50
// ============================================================

function AlbumList({ data }: { data: AlbumStat[] }) {
  const maxPlays = Math.max(...data.map((a) => a.playCount), 1);
  return (
    <div
      style={{
        height: LIST_HEIGHT,
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent",
      }}
    >
      <StaggerList className="top-list">
        {data.map((album, i) => (
          <StaggerItem key={`${album.albumName}-${album.artistName}`}>
            <div className="top-list__item">
              <span className="top-list__rank">#{i + 1}</span>
              <div className="top-list__info">
                <span className="top-list__name">{album.albumName}</span>
                <span className="top-list__sub">{album.artistName}</span>
                <AnimatedBar
                  percent={(album.playCount / maxPlays) * 100}
                  delay={i * 0.02}
                  height={2}
                />
              </div>
              <span className="top-list__meta">
                {album.playCount.toLocaleString("fr-FR")} · {album.totalHours}h
              </span>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export function TopLists({ topArtists, topTracks, topAlbums }: TopListsProps) {
  const [activeTab, setActiveTab] = useState<TopTab>("artists");

  const tabs: { key: TopTab; label: string; icon: string }[] = [
    { key: "artists", label: "Artistes", icon: "🎤" },
    { key: "tracks",  label: "Titres",   icon: "🎵" },
    { key: "albums",  label: "Albums",   icon: "💿" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "artists":
        return topArtists.length > 0
          ? <ArtistChart data={topArtists} />
          : <p className="empty-state">Aucune donnée disponible</p>;
      case "tracks":
        return topTracks.length > 0
          ? <TrackList data={topTracks} />
          : <p className="empty-state">Aucune donnée disponible</p>;
      case "albums":
        return topAlbums.length > 0
          ? <AlbumList data={topAlbums} />
          : <p className="empty-state">Aucune donnée disponible</p>;
    }
  };

  return (
    <SectionReveal delay={0.1}>
      <section className="dashboard-section" aria-labelledby="tops-title">
        <h2 id="tops-title" className="section-title">Palmarès</h2>

        <div className="tabs" role="tablist">
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`tab-btn ${activeTab === tab.key ? "tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              whileTap={{ scale: 0.95 }}
            >
              <span>{tab.icon}</span> {tab.label}
            </motion.button>
          ))}
        </div>

        <AnimatedTabContent tabKey={activeTab} className="tab-content">
          {renderContent()}
        </AnimatedTabContent>
      </section>
    </SectionReveal>
  );
}
