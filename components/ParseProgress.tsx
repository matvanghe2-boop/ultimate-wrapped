// ============================================================
// COMPONENT : ParseProgress
// Affiche la progression en temps réel du parsing
// ============================================================

"use client";

import type { FileProgress, ImportStatus } from "./useFileImport";

interface ParseProgressProps {
  files: FileProgress[];
  status: ImportStatus;
}

const STATUS_LABELS: Record<ImportStatus, string> = {
  idle: "En attente",
  reading: "Lecture des fichiers...",
  parsing: "Analyse des écoutes...",
  saving: "Sauvegarde dans IndexedDB...",
  done: "Terminé",
  error: "Erreur",
};

const FILE_STATUS_ICONS: Record<FileProgress["status"], string> = {
  pending: "⏳",
  reading: "📖",
  parsing: "⚙️",
  done: "✅",
  error: "❌",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ParseProgress({ files, status }: ParseProgressProps) {
  const globalProgress =
    files.length > 0
      ? Math.round(files.reduce((sum, f) => sum + f.percent, 0) / files.length)
      : 0;

  return (
    <div className="parse-progress">
      {/* En-tête */}
      <div className="progress-header">
        <div className="progress-spinner" aria-hidden="true" />
        <div>
          <h3 className="progress-title">{STATUS_LABELS[status]}</h3>
          <p className="progress-subtitle">
            Tout se passe dans votre navigateur · Aucune donnée envoyée
          </p>
        </div>
      </div>

      {/* Barre globale */}
      <div className="global-progress-bar" role="progressbar" aria-valuenow={globalProgress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="global-progress-fill"
          style={{ width: `${globalProgress}%` }}
        />
        <span className="global-progress-label">{globalProgress}%</span>
      </div>

      {/* Progression par fichier */}
      <div className="files-list">
        {files.map((file) => (
          <div key={file.name} className={`file-item file-item--${file.status}`}>
            <div className="file-header">
              <span className="file-icon">{FILE_STATUS_ICONS[file.status]}</span>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatBytes(file.size)}</span>
            </div>

            {file.status === "error" ? (
              <p className="file-error">{file.error}</p>
            ) : (
              <>
                <div className="file-progress-bar">
                  <div
                    className="file-progress-fill"
                    style={{ width: `${file.percent}%` }}
                  />
                </div>
                <div className="file-stats">
                  <span>{file.percent}%</span>
                  {file.parsed > 0 && (
                    <span>{file.parsed.toLocaleString()} écoutes trouvées</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Message informatif selon l'étape */}
      {status === "saving" && (
        <p className="saving-note">
          💾 Enregistrement dans IndexedDB... Les grandes archives peuvent prendre
          quelques secondes.
        </p>
      )}
    </div>
  );
}
