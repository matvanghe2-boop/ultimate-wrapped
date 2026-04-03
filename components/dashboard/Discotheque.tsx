// ============================================================
// components/dashboard/Discotheque.tsx
// Albums Poncés — Algo enrichi Sprint 5
//
// Score composite sur 3 critères :
//
//  1. COHÉSION (anti-hit)      — 1 - (stdDev / mean) des playCounts
//     → Albums où TOUTES les pistes sont écoutées uniformément
//
//  2. RÉTENTION (durée)        — spread temporel de l'album
//     → 3 jours = coup de foudre passager / 6 mois = classique
//     → normalisé sur 365 jours, plafonné à 1.0
//
//  3. SKIP QUALITY             — ratio pistes jamais skippées
//     → msPlayed / msDuration > 0.8 = "écouté sans skip"
//     → si durée inconnue, fallback sur msPlayed > 30 000ms
//
// Pré-requis conservés :
//   • ≥ 80% des pistes écoutées ≥ 1 fois (complétion)
//   • ≥ 50% des pistes avec ≥ 5 écoutes  (engagement)
//   • ≥ 3 pistes connues                  (exclure singles)
//
// Tri final : scoreComposite DESC, puis totalHours DESC
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SectionReveal, StaggerList, StaggerItem } from "../motion/MotionComponents";
import type Dexie from "dexie";
import type { DateFilter } from "../../lib/queries/types";

// ============================================================
// SEUILS
// ============================================================

const MIN_COMPLETION      = 0.90;
const MIN_ENGAGEMENT      = 0.70;
const MIN_PLAYS_ENGAGED   = 5;
const MIN_KNOWN_TRACKS    = 3;
const RETENTION_MAX_DAYS  = 365;
const SKIP_THRESHOLD_RATE = 0.80;
const SKIP_FALLBACK_MS    = 30_000;

// ============================================================
// TYPES
// ============================================================

export interface PoncedAlbum {
  albumName:      string;
  artistName:     string;
  knownTracks:    number;
  listenedTracks: number;
  engagedTracks:  number;
  totalPlays:     number;
  totalHours:     number;
  completionRate: number;
  engagementRate: number;
  cohesionScore:  number;
  retentionScore: number;
  skipQuality:    number;
  scoreComposite: number;
  retentionDays:  number;
}

// ============================================================
// HELPERS
// ============================================================

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ============================================================
// ALGO PRINCIPAL
// ============================================================

async function computePoncedAlbums(
  db: Dexie,
  filter: DateFilter
): Promise<PoncedAlbum[]> {

  let entries: Array<{
    albumName?: string;
    artistName?: string;
    trackName?: string;
    msPlayed?: number;
    msDuration?: number;
    ts?: number;
    skipped?: boolean;
  }>;

  if (filter?.from || filter?.to) {
    const from = filter.from ?? 0;
    const to   = filter.to   ?? Date.now();
    entries = await db.table("plays")
      .where("ts")
      .between(from, to, true, true)
      .filter((p: { albumName?: string; trackName?: string }) =>
        !!p.albumName && !!p.trackName
      )
      .toArray();
  } else {
    entries = await db.table("plays")
      .filter((p: { albumName?: string; trackName?: string }) =>
        !!p.albumName && !!p.trackName
      )
      .toArray();
  }

  type AlbumKey = string;
  type TrackKey = string;

  const albumTracks  = new Map<AlbumKey, Map<TrackKey, number>>();
  const albumTrackTs = new Map<AlbumKey, number[]>();
  const albumMeta    = new Map<AlbumKey, { artistName: string; totalMs: number; totalPlays: number }>();
  const albumNoSkip  = new Map<AlbumKey, Map<TrackKey, number>>();

  for (const entry of entries) {
    const albumKey: AlbumKey = `${entry.albumName}|||${entry.artistName ?? ""}`;
    const trackKey: TrackKey = entry.trackName as string;

    if (!albumTracks.has(albumKey)) {
      albumTracks.set(albumKey, new Map());
      albumTrackTs.set(albumKey, []);
      albumNoSkip.set(albumKey, new Map());
      albumMeta.set(albumKey, { artistName: entry.artistName ?? "", totalMs: 0, totalPlays: 0 });
    }

    const tracks  = albumTracks.get(albumKey)!;
    const noSkips = albumNoSkip.get(albumKey)!;
    const meta    = albumMeta.get(albumKey)!;
    const tsArr   = albumTrackTs.get(albumKey)!;

    tracks.set(trackKey, (tracks.get(trackKey) ?? 0) + 1);

    if (entry.ts) tsArr.push(entry.ts);

    const ms         = entry.msPlayed   ?? 0;
    const dur        = entry.msDuration ?? 0;
    const notSkipped = entry.skipped !== true;
    const listened   = dur > 0 ? ms / dur >= SKIP_THRESHOLD_RATE : ms >= SKIP_FALLBACK_MS;

    if (notSkipped && listened) {
      noSkips.set(trackKey, (noSkips.get(trackKey) ?? 0) + 1);
    }

    meta.totalMs    += ms;
    meta.totalPlays += 1;
  }

  const ponced: PoncedAlbum[] = [];

  for (const [albumKey, tracks] of albumTracks.entries()) {
    const [albumName] = albumKey.split("|||");
    const meta        = albumMeta.get(albumKey)!;
    const noSkips     = albumNoSkip.get(albumKey)!;
    const tsArr       = albumTrackTs.get(albumKey)!;
    const knownTracks = tracks.size;

    if (knownTracks < MIN_KNOWN_TRACKS) continue;

    const playCounts     = [...tracks.values()];
    const listenedTracks = playCounts.filter((c) => c >= 1).length;
    const engagedTracks  = playCounts.filter((c) => c >= MIN_PLAYS_ENGAGED).length;
    const completionRate = listenedTracks / knownTracks;
    const engagementRate = engagedTracks  / knownTracks;

    if (completionRate < MIN_COMPLETION || engagementRate < MIN_ENGAGEMENT) continue;

    // ── 1. COHÉSION ──
    const mean = playCounts.reduce((a, b) => a + b, 0) / playCounts.length;
    const sd   = stdDev(playCounts);
    const cv   = mean > 0 ? sd / mean : 0;
    const cohesionScore = Math.max(0, 1 - cv);

    // ── 2. RÉTENTION ──
    let retentionDays  = 0;
    let retentionScore = 0;
    if (tsArr.length >= 2) {
      const minTs = Math.min(...tsArr);
      const maxTs = Math.max(...tsArr);
      retentionDays  = Math.round((maxTs - minTs) / 86_400_000);
      retentionScore = Math.min(1, retentionDays / RETENTION_MAX_DAYS);
    }

    // ── 3. SKIP QUALITY ──
    let skipQuality = 0;
    if (knownTracks > 0) {
      let totalNoSkipRatio = 0;
      for (const [tk, playCount] of tracks.entries()) {
        const completeCount = noSkips.get(tk) ?? 0;
        totalNoSkipRatio += playCount > 0 ? completeCount / playCount : 0;
      }
      skipQuality = totalNoSkipRatio / knownTracks;
    }

    // ── SCORE COMPOSITE ── Cohésion 35% · Rétention 40% · Skip 25%
    const scoreComposite =
      cohesionScore  * 0.35 +
      retentionScore * 0.40 +
      skipQuality    * 0.25;

    ponced.push({
      albumName,
      artistName:    meta.artistName,
      knownTracks,
      listenedTracks,
      engagedTracks,
      totalPlays:    meta.totalPlays,
      totalHours:    Math.round(meta.totalMs / 3_600_000 * 10) / 10,
      completionRate,
      engagementRate,
      cohesionScore,
      retentionScore,
      skipQuality,
      scoreComposite,
      retentionDays,
    });
  }

  // Tri : scoreComposite DESC → totalHours DESC
  ponced.sort((a, b) =>
    b.scoreComposite - a.scoreComposite ||
    b.totalHours     - a.totalHours
  );

  return ponced;
}

// ============================================================
// BARRE DE SCORE
// ============================================================

function ScoreBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 2,
        background: "var(--bg-highlight)", overflow: "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay }}
          style={{ height: "100%", background: color, borderRadius: 2 }}
        />
      </div>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color, minWidth: "2.5rem", textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}

// ============================================================
// CARTE ALBUM
// ============================================================

function AlbumCard({ album, rank }: { album: PoncedAlbum; rank: number }) {
  const compositePct = Math.round(album.scoreComposite * 100);

  const retentionLabel =
    album.retentionDays === 0 ? "< 1 jour" :
    album.retentionDays < 7   ? `${album.retentionDays}j` :
    album.retentionDays < 30  ? `${Math.round(album.retentionDays / 7)} sem.` :
    album.retentionDays < 365 ? `${Math.round(album.retentionDays / 30)} mois` :
    `${Math.round(album.retentionDays / 365)} an${album.retentionDays >= 730 ? "s" : ""}`;

  const scoreColor =
    compositePct >= 70 ? "var(--sp-green)" :
    compositePct >= 40 ? "#facc15" : "#f87171";

  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      padding: "1rem 1.25rem",
      display: "flex",
      gap: "1rem",
      alignItems: "flex-start",
    }}>
      {/* Rang + score badge */}
      <div style={{ textAlign: "center", minWidth: "2.75rem", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-muted)", display: "block" }}>
          #{rank}
        </span>
        <span style={{
          display: "block", marginTop: "0.25rem", fontSize: "0.72rem", fontWeight: 700,
          color: scoreColor, background: "var(--bg-highlight)", borderRadius: "500px", padding: "0.15rem 0.4rem",
        }}>
          {compositePct}
        </span>
      </div>

      {/* Corps */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {album.albumName}
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          {album.artistName} · {album.knownTracks} pistes · {album.totalHours}h
        </p>

        <div style={{ marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>🎯 Cohésion</span>
          <ScoreBar value={album.cohesionScore} color="#1DB954" delay={0.05} />
        </div>
        <div style={{ marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>📅 Rétention ({retentionLabel})</span>
          <ScoreBar value={album.retentionScore} color="#60a5fa" delay={0.1} />
        </div>
        <div>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>▶ Qualité d&apos;écoute</span>
          <ScoreBar value={album.skipQuality} color="#a78bfa" delay={0.15} />
        </div>
      </div>

      {/* Stats droite */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--sp-green)" }}>
          {album.totalPlays.toLocaleString("fr-FR")}
        </p>
        <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>écoutes</p>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, marginTop: "0.4rem" }}>{album.totalHours}h</p>
        <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
          {album.listenedTracks}/{album.knownTracks} pistes
        </p>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT PRINCIPAL
// ============================================================

export function Discotheque({ db, filter }: { db: Dexie | null; filter: DateFilter }) {
  const [albums, setAlbums]       = useState<PoncedAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    computePoncedAlbums(db, filter)
      .then(setAlbums)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [db, filter]);

  return (
    <SectionReveal delay={0.1}>
      <section className="dashboard-section" aria-labelledby="disco-title">
        <h2 id="disco-title" className="section-title">💿 Discothèque</h2>

        {/* Légende */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { icon: "🎯", label: "Cohésion",  desc: "Écoutes homogènes entre pistes",  color: "#1DB954", weight: "35%" },
            { icon: "📅", label: "Rétention", desc: "Durée de vie dans tes écoutes",   color: "#60a5fa", weight: "40%" },
            { icon: "▶",  label: "Qualité",   desc: "Écoutes complètes sans skip",     color: "#a78bfa", weight: "25%" },
          ].map((c) => (
            <div key={c.label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "0.75rem 1rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: c.color, marginBottom: "0.2rem" }}>
                {c.icon} {c.label} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({c.weight})</span>
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{c.desc}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="loading-state" style={{ padding: "2rem 0" }}>
            <div className="loading-spinner loading-spinner--sm" />
            <p>Analyse des albums...</p>
          </div>
        ) : albums.length === 0 ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💿</p>
            <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Aucun album poncé</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 340, margin: "0 auto" }}>
              Critères : ≥ 80% des pistes écoutées, ≥ 50% avec ≥ {MIN_PLAYS_ENGAGED} écoutes, minimum {MIN_KNOWN_TRACKS} pistes.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              {albums.length} album{albums.length > 1 ? "s" : ""} poncé{albums.length > 1 ? "s" : ""} · score composite puis heures d&apos;écoute
            </p>
            <div style={{
              height: 580, overflowY: "auto",
              scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
              display: "flex", flexDirection: "column", gap: "0.75rem",
            }}>
              <StaggerList>
                {albums.map((album, i) => (
                  <StaggerItem key={`${album.albumName}-${album.artistName}`}>
                    <AlbumCard album={album} rank={i + 1} />
                  </StaggerItem>
                ))}
              </StaggerList>
            </div>
          </>
        )}
      </section>
    </SectionReveal>
  );
}
