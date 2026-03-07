// ============================================================
// components/dashboard/TopLists.tsx
// Section : Tops Artistes / Titres / Albums
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ArtistStat, TrackStat, AlbumStat } from "../../lib/queries/types";

// ============================================================
// TYPES
// ============================================================

type TopTab = "artists" | "tracks" | "albums" | "skipped";

interface TopListsProps {
  topArtists: ArtistStat[];
  topTracks: TrackStat[];
  topAlbums: AlbumStat[];
  mostSkipped: TrackStat[];
}

// ============================================================
// TOOLTIP PERSONNALISÉ
// ============================================================

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) {
  if (!active || !payload?.length) return null;
  const hours = payload[0].value;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__value">{hours.toLocaleString("fr-FR")}h</p>
    </div>
  );
}

// ============================================================
// BARRE COLORÉE selon le rang
// ============================================================

const BAR_COLORS = [
  "#1DB954", "#1AA34A", "#178F40", "#147A36", "#11662C",
  "#0E5222", "#0B3D18", "#08290E", "#052004", "#02160A",
];

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function ArtistChart({ data }: { data: ArtistStat[] }) {
  const chartData = data.slice(0, 10).map((a) => ({
    name: a.artistName.length > 15 ? a.artistName.slice(0, 15) + "…" : a.artistName,
    fullName: a.artistName,
    hours: a.totalHours,
    plays: a.playCount,
    tracks: a.uniqueTracksCount,
  }));

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number"
            dataKey="hours"
            tick={{ fill: "#aaa", fontSize: 11 }}
            tickFormatter={(v) => `${v}h`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: "#ddd", fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index] ?? BAR_COLORS[BAR_COLORS.length - 1]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Tableau complet */}
      <div className="top-list">
        {data.map((artist, i) => (
          <div key={artist.artistName} className="top-list__item">
            <span className="top-list__rank">#{i + 1}</span>
            <span className="top-list__name">{artist.artistName}</span>
            <span className="top-list__meta">{artist.playCount.toLocaleString("fr-FR")} écoutes</span>
            <span className="top-list__value">{artist.totalHours}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackList({ data, showSkip = false }: { data: TrackStat[]; showSkip?: boolean }) {
  return (
    <div className="top-list">
      {data.map((track, i) => (
        <div key={track.trackUri} className="top-list__item">
          <span className="top-list__rank">#{i + 1}</span>
          <div className="top-list__info">
            <span className="top-list__name">{track.trackName}</span>
            <span className="top-list__sub">{track.artistName}</span>
          </div>
          {showSkip ? (
            <span className={`top-list__value top-list__value--${track.skipRate > 0.5 ? "red" : "yellow"}`}>
              {Math.round(track.skipRate * 100)}% skip
            </span>
          ) : (
            <span className="top-list__meta">{track.playCount.toLocaleString("fr-FR")} écoutes · {track.totalHours}h</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AlbumList({ data }: { data: AlbumStat[] }) {
  return (
    <div className="top-list">
      {data.map((album, i) => (
        <div key={`${album.albumName}-${album.artistName}`} className="top-list__item">
          <span className="top-list__rank">#{i + 1}</span>
          <div className="top-list__info">
            <span className="top-list__name">{album.albumName}</span>
            <span className="top-list__sub">{album.artistName}</span>
          </div>
          <span className="top-list__meta">{album.playCount.toLocaleString("fr-FR")} écoutes · {album.totalHours}h</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function TopLists({ topArtists, topTracks, topAlbums, mostSkipped }: TopListsProps) {
  const [activeTab, setActiveTab] = useState<TopTab>("artists");

  const tabs: { key: TopTab; label: string; icon: string }[] = [
    { key: "artists", label: "Artistes",  icon: "🎤" },
    { key: "tracks",  label: "Titres",    icon: "🎵" },
    { key: "albums",  label: "Albums",    icon: "💿" },
    { key: "skipped", label: "Skippés",   icon: "⏭" },
  ];

  return (
    <section className="dashboard-section" aria-labelledby="tops-title">
      <h2 id="tops-title" className="section-title">Vos tops</h2>

      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tab-btn ${activeTab === tab.key ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content" role="tabpanel">
        {activeTab === "artists" && (
          topArtists.length > 0
            ? <ArtistChart data={topArtists} />
            : <p className="empty-state">Aucune donnée disponible</p>
        )}
        {activeTab === "tracks" && (
          topTracks.length > 0
            ? <TrackList data={topTracks} />
            : <p className="empty-state">Aucune donnée disponible</p>
        )}
        {activeTab === "albums" && (
          topAlbums.length > 0
            ? <AlbumList data={topAlbums} />
            : <p className="empty-state">Aucune donnée disponible</p>
        )}
        {activeTab === "skipped" && (
          mostSkipped.length > 0
            ? <TrackList data={mostSkipped} showSkip />
            : <p className="empty-state">Pas assez de données (min. 5 écoutes par titre)</p>
        )}
      </div>
    </section>
  );
}
