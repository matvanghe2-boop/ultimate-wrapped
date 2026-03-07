// ============================================================
// WEB WORKER : Parsing JSON non-bloquant
// ultimate-wrapped/src/workers/jsonParser.worker.ts
// ============================================================
// Ce worker tourne dans un thread séparé pour ne jamais
// bloquer l'interface utilisateur pendant le parsing.
// ============================================================

import type {
  RawEndSong,
  RawStreamingHistory,
} from "../lib/db/schema";
import {
  normalizeEndSong,
  normalizeStreamingHistory,
  type PlayEntry,
} from "../lib/db/schema";

// ============================================================
// TYPES DE MESSAGES
// ============================================================

export type WorkerInput =
  | { type: "PARSE_FILE"; fileName: string; content: string }
  | { type: "PING" };

export type WorkerOutput =
  | { type: "PROGRESS"; fileName: string; percent: number; parsed: number }
  | { type: "FILE_DONE"; fileName: string; entries: PlayEntry[]; errors: number }
  | { type: "ERROR"; fileName: string; message: string }
  | { type: "PONG" };

// ============================================================
// DÉTECTION DU FORMAT
// ============================================================

type FileFormat = "endsong" | "streaming_history" | "unknown";

function detectFormat(data: unknown[]): FileFormat {
  if (!Array.isArray(data) || data.length === 0) return "unknown";

  const sample = data[0] as Record<string, unknown>;

  if ("spotify_track_uri" in sample || "ms_played" in sample) {
    return "endsong";
  }
  if ("endTime" in sample && "msPlayed" in sample) {
    return "streaming_history";
  }
  return "unknown";
}

// ============================================================
// PARSING PAR CHUNKS (pour les très gros fichiers)
// ============================================================

const CHUNK_SIZE = 500; // Traiter 500 entrées à la fois

function* chunked<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

// ============================================================
// HANDLER PRINCIPAL DU WORKER
// ============================================================

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  const msg = event.data;

  if (msg.type === "PING") {
    self.postMessage({ type: "PONG" } satisfies WorkerOutput);
    return;
  }

  if (msg.type === "PARSE_FILE") {
    const { fileName, content } = msg;

    try {
      // 1. Parse JSON brut
      let rawData: unknown[];
      try {
        rawData = JSON.parse(content);
      } catch {
        self.postMessage({
          type: "ERROR",
          fileName,
          message: `Fichier JSON invalide : ${fileName}`,
        } satisfies WorkerOutput);
        return;
      }

      if (!Array.isArray(rawData)) {
        self.postMessage({
          type: "ERROR",
          fileName,
          message: `Le fichier ${fileName} ne contient pas un tableau JSON valide.`,
        } satisfies WorkerOutput);
        return;
      }

      // 2. Détection du format
      const format = detectFormat(rawData);

      if (format === "unknown") {
        self.postMessage({
          type: "ERROR",
          fileName,
          message: `Format non reconnu pour ${fileName}. Attendu: endsong.json ou StreamingHistory.json`,
        } satisfies WorkerOutput);
        return;
      }

      // 3. Traitement par chunks avec feedback de progression
      const allEntries: PlayEntry[] = [];
      let errors = 0;
      let processed = 0;
      const total = rawData.length;

      for (const chunk of chunked(rawData, CHUNK_SIZE)) {
        for (const raw of chunk) {
          try {
            let entry: PlayEntry | null = null;

            if (format === "endsong") {
              entry = normalizeEndSong(raw as RawEndSong);
            } else if (format === "streaming_history") {
              entry = normalizeStreamingHistory(raw as RawStreamingHistory);
            }

            if (entry) allEntries.push(entry);
          } catch {
            errors++;
          }
          processed++;
        }

        // Envoyer la progression après chaque chunk
        const percent = Math.round((processed / total) * 100);
        self.postMessage({
          type: "PROGRESS",
          fileName,
          percent,
          parsed: allEntries.length,
        } satisfies WorkerOutput);

        // Yield pour ne pas saturer le thread (micro-pause)
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // 4. Résultat final
      self.postMessage({
        type: "FILE_DONE",
        fileName,
        entries: allEntries,
        errors,
      } satisfies WorkerOutput);

    } catch (err) {
      self.postMessage({
        type: "ERROR",
        fileName,
        message: `Erreur inattendue: ${err instanceof Error ? err.message : "Inconnue"}`,
      } satisfies WorkerOutput);
    }
  }
};
