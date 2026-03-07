// ============================================================
// COMPONENT : FileDropzone
// Zone de drag & drop pour les fichiers JSON Spotify
// ============================================================

"use client";

import { useCallback, useState } from "react";
import { useFileImport } from "./useFileImport";
import { ParseProgress } from "./ParseProgress";

interface FileDropzoneProps {
  onImportComplete?: () => void;
}

export function FileDropzone({ onImportComplete }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { status, files, result, error, processFiles, reset, isProcessing } =
    useFileImport();

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      processFiles(Array.from(fileList));
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // ============================================================
  // RENDU : États
  // ============================================================

  if (status === "done" && result) {
    return (
      <div className="import-success">
        <div className="success-icon">✓</div>
        <h3>Import réussi !</h3>
        <div className="success-stats">
          <div className="stat">
            <span className="stat-value">{result.totalParsed.toLocaleString()}</span>
            <span className="stat-label">écoutes parsées</span>
          </div>
          <div className="stat">
            <span className="stat-value">{result.inserted.toLocaleString()}</span>
            <span className="stat-label">nouvelles entrées</span>
          </div>
          <div className="stat">
            <span className="stat-value">{result.duplicates.toLocaleString()}</span>
            <span className="stat-label">doublons ignorés</span>
          </div>
        </div>
        <p className="duration">
          Traitement en {(result.duration / 1000).toFixed(1)}s
        </p>
        <div className="success-actions">
          <button onClick={onImportComplete} className="btn-primary">
            Voir mon dashboard →
          </button>
          <button onClick={reset} className="btn-secondary">
            Importer d'autres fichiers
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return <ParseProgress files={files} status={status} />;
  }

  return (
    <div className="dropzone-wrapper">
      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button onClick={reset}>✕</button>
        </div>
      )}

      <div
        className={`dropzone ${isDragOver ? "dropzone--active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById("file-input")?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && document.getElementById("file-input")?.click()}
        aria-label="Zone de dépôt de fichiers JSON Spotify"
      >
        <input
          id="file-input"
          type="file"
          accept=".json"
          multiple
          onChange={handleInputChange}
          style={{ display: "none" }}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon">
            {isDragOver ? "📂" : "🎵"}
          </div>
          <h3 className="dropzone-title">
            {isDragOver
              ? "Déposez vos fichiers ici"
              : "Importez votre archive Spotify"}
          </h3>
          <p className="dropzone-subtitle">
            Glissez-déposez vos fichiers{" "}
            <code>endsong_X.json</code> ou{" "}
            <code>StreamingHistory_X.json</code>
          </p>
          <p className="dropzone-hint">
            Plusieurs fichiers acceptés simultanément · Tout reste local sur votre appareil
          </p>
          <button className="dropzone-cta" type="button">
            Choisir les fichiers
          </button>
        </div>
      </div>

      <div className="dropzone-help">
        <details>
          <summary>📦 Comment obtenir mon archive Spotify ?</summary>
          <ol>
            <li>
              Ouvrez <strong>Spotify</strong> → <strong>Compte</strong> →{" "}
              <strong>Confidentialité</strong>
            </li>
            <li>
              Cliquez sur <strong>"Demander vos données"</strong> (section
              "Télécharger vos données")
            </li>
            <li>
              Choisissez <strong>"Données d'historique étendu"</strong> pour
              l'historique complet
            </li>
            <li>
              Spotify vous enverra un email sous <strong>3 à 30 jours</strong>
            </li>
            <li>
              Extrayez l'archive ZIP et importez les fichiers{" "}
              <code>endsong_X.json</code>
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}
