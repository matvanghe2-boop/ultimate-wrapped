// app/page.tsx
'use client'; // Important car on utilise des hooks et du client-side

import { FileDropzone } from "../components/upload/FileDropzone";

export default function HomePage() {
  return (
    <main>
      <header>
        <h1>◉ Ultimate Wrapped</h1>
        <p>Votre histoire musicale complète. Pas juste une année.</p>
      </header>

      <section>
        <h2>Chaque écoute. Depuis le premier jour.</h2>
        <FileDropzone />
      </section>
    </main>
  );
}