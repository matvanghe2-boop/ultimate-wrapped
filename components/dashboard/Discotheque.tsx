// ============================================================
// components/dashboard/Discotheque.tsx
// Section Albums Poncés — Sprint 4
//
// Algo "Album Poncé" — double critère :
//   1. Complétion  : ≥ 80% des pistes de l'album écoutées ≥ 1 fois
//   2. Engagement  : ≥ 50% des pistes totales avec playCount ≥ 5
//
// Les données viennent directement de Dexie (pas de getTopAlbums)
// pour avoir accès au détail piste par piste.
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SectionReveal, StaggerList, StaggerItem } from "../motion/MotionComponents";
import type Dexie from "dexie";
import type { DateFilter } from "../../lib/queries/types";

// ============================================================
// TYPES
// ============================================================

export interface PoncedAlbum {
  albumName: string;
  artistName: string;
  /** Nombre de pistes distinctes connues dans l'album (depuis nos données) */
  knownTracks: number;
  /** Pistes écoutées ≥ 1 fois */
  listenedTracks: number;
  /** Pistes avec playCount ≥ 5 */
  engagedTracks: number;
  /** Écoutes totales sur l'album */
  totalPlays: number;
  /** Heures totales */
  totalHours: number;
  /** % complétion (listenedTracks / knownTracks) */
  completionRate: number;
  /** % engagement (engagedTracks / knownTracks) */
  engagementRate: number;
}

// ============================================================
// SEUILS
// ============================================================

const MIN_COMPLETION  = 0.80; // ≥ 80% des pistes écoutées ≥ 1 fois
const MIN_ENGAGEMENT  = 0.50; // ≥ 50% des pistes avec ≥ 5 écoutes
const MIN_PLAYS_ENGAGED = 5;  // seuil "écoutes significatives"
const MIN_KNOWN_TRACKS = 3;   // ignorer les singles / EPs trop petits

// ============================================================
// ALGO — calculé depuis Dexie directement
// ============================================================

async function computePoncedAlbums(
  db: Dexie,
  filter: DateFilter
): Promise<PoncedAlbum[]> {
  // Récupérer toutes les entrées audio (hors podcast) de la période
  let query = db.table("plays").filter(
    (p: { albumName?: string; trackName?: string; msPlayed?: number }) =>
      !!p.albumName && !!p.trackName
  );

  // Appliquer le filtre de période
  if (filter?.from || filter?.to) {
    const from = filter.from ?? 0;
    const to   = filter.to   ?? Date.now();
    query = db.table("plays")
      .where("ts")
      .between(from, to, true, true)
      .filter(
        (p: { albumName?: string; trackName?: string }) =>
          !!p.albumName && !!p.trackName
      );
  }

  const entries = await query.toArray();

  // ── Grouper par (albumName, artistName) ──
  type AlbumKey = string;
  type TrackKey = string;

  const albumMap = new Map<AlbumKey, Map<TrackKey, number>>();
  const albumMeta = new Map<AlbumKey, { artistName: string; totalMs: number; totalPlays: number }>();

  for (const entry of entries) {
    const albumKey: AlbumKey = `${entry.albumName}|||${entry.artistName ?? ""}`;
    const trackKey: TrackKey = entry.trackName as string;

    if (!albumMap.has(albumKey)) {
      albumMap.set(albumKey, new Map());
      albumMeta.set(albumKey, {
        artistName: entry.artistName ?? "",
        totalMs: 0,
        totalPlays: 0,
      });
    }

    const tracks = albumMap.get(albumKey)!;
    tracks.set(trackKey, (tracks.get(trackKey) ?? 0) + 1);

    const meta = albumMeta.get(albumKey)!;
    meta.totalMs    += entry.msPlayed ?? 0;
    meta.totalPlays += 1;
  }

  // ── Calculer les critères pour chaque album ──
  const ponced: PoncedAlbum[] = [];

  for (const [albumKey, tracks] of albumMap.entries()) {
    const [albumName] = albumKey.split("|||");
    const meta = albumMeta.get(albumKey)!;
    const knownTracks = tracks.size;

    // Ignorer les albums avec trop peu de pistes connues
    if (knownTracks < MIN_KNOWN_TRACKS) continue;

    const listenedTracks = [...tracks.values()].filter((c) => c >= 1).length;
    const engagedTracks  = [...tracks.values()].filter((c) => c >= MIN_PLAYS_ENGAGED).length;

    const completionRate  = listenedTracks / knownTracks;
    const engagementRate  = engagedTracks  / knownTracks;

    // Double critère
    if (completionRate >= MIN_COMPLETION && engagementRate >= MIN_ENGAGEMENT) {
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
      });
    }
  }

  // Trier par engagementRate desc, puis completionRate desc
  ponced.sort((a, b) =>
    b.engagementRate - a.engagementRate ||
    b.completionRate - a.completionRate
  );

  return ponced;
}

// ============================================================
// COMPOSANT CARTE ALBUM
// ============================================================

function AlbumCard({ album, rank }: { album: PoncedAlbum; rank: number }) {
  const completionPct  = Math.round(album.completionRate  * 100);
  const engagementPct  = Math.round(album.engagementRate  * 100);

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "1rem 1.25rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      {/* Rang */}
      <span style={{
        fontFamily: "var(--font-display)",
        fontSize: "1.4rem",
        fontWeight: 800,
        color: "var(--text-muted)",
        minWidth: "2rem",
        lineHeight: 1,
        paddingTop: "0.1rem",
      }}>
        #{rank}
      </span>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {album.albumName}
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          {album.artistName}
        </p>

        {/* Barre complétion */}
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Complétion</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--sp-green)" }}>
              {completionPct}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--bg-highlight)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ height: "100%", background: "var(--sp-green)", borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Barre engagement */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Engagement (≥{MIN_PLAYS_ENGAGED} écoutes)</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#a78bfa" }}>
              {engagementPct}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--bg-highlight)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${engagementPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              style={{ height: "100%", background: "#a78bfa", borderRadius: 2 }}
            />
          </div>
        </div>
      </div>

      {/* Stats droite */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--sp-green)" }}>
          {album.totalPlays.toLocaleString("fr-FR")}
        </p>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>écoutes</p>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, marginTop: "0.4rem" }}>
          {album.totalHours}h
        </p>
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

interface DiscothequeProps {
  db: Dexie | null;
  filter: DateFilter;
}

export function Discotheque({ db, filter }: DiscothequeProps) {
  const [albums, setAlbums] = useState<PoncedAlbum[]>([]);
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

        {/* Légende algo */}
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: "0.875rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
              Critère Complétion
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--sp-green)" }}>
              ≥ 80% des pistes écoutées ≥ 1 fois
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
              Critère Engagement
            </p>
            <p style={{ fontSize: "0.78rem", color: "#a78bfa" }}>
              ≥ 50% des pistes avec ≥ {MIN_PLAYS_ENGAGED} écoutes
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state" style={{ padding: "2rem 0" }}>
            <div className="loading-spinner loading-spinner--sm" />
            <p>Analyse des albums...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="empty-state" style={{ padding: "3rem 0", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💿</p>
            <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Aucun album poncé</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 340, margin: "0 auto" }}>
              Un album est "poncé" quand vous avez écouté ≥ 80% de ses pistes
              et que ≥ 50% d'entre elles ont été jouées au moins {MIN_PLAYS_ENGAGED} fois.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              {albums.length} album{albums.length > 1 ? "s" : ""} poncé{albums.length > 1 ? "s" : ""}
            </p>
            {/* Scroll interne */}
            <div style={{
              height: 560,
              overflowY: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border) transparent",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
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
