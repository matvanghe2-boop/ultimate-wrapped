// ============================================================
// PAGE : Landing + Upload - Ultimate Wrapped
// src/app/page.tsx
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
          <p className="logo-tagline">Votre histoire musicale complète. Pas juste une année.</p>
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
        </div>

        <div className="upload-section">
          <FileDropzone onImportComplete={() => router.push("/dashboard")} />
        </div>
      </section>
    </main>
  );
}