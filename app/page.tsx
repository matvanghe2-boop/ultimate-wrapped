// ============================================================
// app/page.tsx — Landing Page Ultimate Wrapped
// Bouton accès direct dashboard ajouté
// ============================================================

"use client";

import { useRouter } from "next/navigation";
import { FileDropzone } from "../components/upload/FileDropzone";

export default function Home() {
  const router = useRouter();

  return (
    <main className="main-layout">
      <header className="site-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">◉</span>
            <span className="logo-text">Ultimate Wrapped</span>
          </div>

          {/* Bouton accès direct dashboard */}
          <a href="/dashboard" className="btn-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}>
            Mon dashboard →
          </a>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-text">
          <h1 className="hero-title">
            Chaque écoute.<br />
            <span className="hero-accent">Depuis le premier jour.</span>
          </h1>
          <p className="hero-desc">
            Spotify ne vous montre que l&apos;année en cours. Ultimate Wrapped analyse
            <strong> l&apos;intégralité</strong> de votre historique depuis la création de votre compte.
          </p>

          {/* Accès rapide dashboard sans import */}
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/dashboard" className="btn-secondary">
              Accéder au dashboard
            </a>
          </div>
        </div>

        <div className="upload-section">
          <FileDropzone onImportComplete={() => router.push("/dashboard")} />
        </div>
      </section>
    </main>
  );
}
