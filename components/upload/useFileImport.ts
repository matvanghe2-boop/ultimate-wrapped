// ============================================================
// HOOK : useFileImport
// Orchestre le pipeline complet : Upload → Worker → IndexedDB
// ============================================================

"use client";

import { useState, useCallback, useRef } from "react";
import { insertPlays, saveImportMeta } from "../../lib/indexedDB";
import type { PlayEntry } from "../../lib/schema";
import type { WorkerOutput } from "../../workers/jsonParser.worker";
// ============================================================
// TYPES
// ============================================================

export type ImportStatus =
  | "idle"
  | "reading"
  | "parsing"
  | "saving"
  | "done"
  | "error";

export interface FileProgress {
  name: string;
  size: number;
  percent: number;
  parsed: number;
  status: "pending" | "reading" | "parsing" | "done" | "error";
  error?: string;
}

export interface ImportResult {
  totalParsed: number;
  inserted: number;
  duplicates: number;
  errors: number;
  files: string[];
  duration: number; // ms
}

// ============================================================
// HOOK
// ============================================================

export function useFileImport() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setFiles([]);
    setResult(null);
    setError(null);
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const processFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;

    // Valider les fichiers (JSON uniquement)
    const validFiles = fileList.filter(
      (f) => f.name.endsWith(".json") && f.size > 0
    );

    if (validFiles.length === 0) {
      setError("Aucun fichier JSON valide sélectionné.");
      return;
    }

    const startTime = Date.now();
    setStatus("reading");
    setError(null);

    // Initialiser l'état de progression
    setFiles(
      validFiles.map((f) => ({
        name: f.name,
        size: f.size,
        percent: 0,
        parsed: 0,
        status: "pending",
      }))
    );

    // Créer le Web Worker
    const worker = new Worker(
      new URL("../../workers/jsonParser.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    const allEntries: PlayEntry[] = [];
    let totalErrors = 0;
    let filesDone = 0;

    // Créer une promesse pour chaque fichier
    const processFile = (file: File): Promise<void> => {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const content = e.target?.result as string;

          // Mettre à jour le statut du fichier
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name ? { ...f, status: "parsing" } : f
            )
          );

          setStatus("parsing");
          worker.postMessage({ type: "PARSE_FILE", fileName: file.name, content });
        };

        reader.readAsText(file, "utf-8");
      });
    };

    // Écouter les messages du worker
    worker.onmessage = async (event: MessageEvent<WorkerOutput>) => {
      const msg = event.data;

      if (msg.type === "PROGRESS") {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === msg.fileName
              ? { ...f, percent: msg.percent, parsed: msg.parsed, status: "parsing" }
              : f
          )
        );
      }

      if (msg.type === "FILE_DONE") {
        allEntries.push(...msg.entries);
        totalErrors += msg.errors;
        filesDone++;

        setFiles((prev) =>
          prev.map((f) =>
            f.name === msg.fileName
              ? { ...f, percent: 100, parsed: msg.entries.length, status: "done" }
              : f
          )
        );

        // Tous les fichiers sont traités → sauvegarder en IndexedDB
        if (filesDone === validFiles.length) {
          setStatus("saving");

          try {
            const { inserted, duplicates } = await insertPlays(allEntries);

            // Sauvegarder le rapport d'import
            const oldest = allEntries.reduce(
              (min, e) => (e.ts < min ? e.ts : min),
              Infinity
            );
            const newest = allEntries.reduce(
              (max, e) => (e.ts > max ? e.ts : max),
              -Infinity
            );

            await saveImportMeta({
              id: `import_${Date.now()}`,
              importedAt: Date.now(),
              source: "archive",
              fileNames: validFiles.map((f) => f.name),
              totalEntries: allEntries.length,
              newEntries: inserted,
              duplicatesSkipped: duplicates,
              oldestEntryTs: isFinite(oldest) ? oldest : undefined,
              newestEntryTs: isFinite(newest) ? newest : undefined,
            });

            const duration = Date.now() - startTime;
            setResult({
              totalParsed: allEntries.length,
              inserted,
              duplicates,
              errors: totalErrors,
              files: validFiles.map((f) => f.name),
              duration,
            });

            setStatus("done");
          } catch (err) {
            setError(
              `Erreur lors de la sauvegarde: ${err instanceof Error ? err.message : "Inconnue"}`
            );
            setStatus("error");
          } finally {
            worker.terminate();
            workerRef.current = null;
          }
        }
      }

      if (msg.type === "ERROR") {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === msg.fileName
              ? { ...f, status: "error", error: msg.message }
              : f
          )
        );
        totalErrors++;
        filesDone++;

        if (filesDone === validFiles.length) {
          setStatus("error");
          setError("Certains fichiers n'ont pas pu être traités.");
          worker.terminate();
        }
      }
    };

    worker.onerror = (err) => {
      setError(`Erreur worker: ${err.message}`);
      setStatus("error");
      worker.terminate();
    };

    // Lancer la lecture de tous les fichiers séquentiellement
    for (const file of validFiles) {
      await processFile(file);
    }
  }, []);

  return {
    status,
    files,
    result,
    error,
    processFiles,
    reset,
    isProcessing: ["reading", "parsing", "saving"].includes(status),
  };
}
