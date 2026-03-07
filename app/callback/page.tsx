// ============================================================
// app/callback/page.tsx
// Wrapper Suspense requis par Next.js 14 pour useSearchParams()
// ============================================================

import { Suspense } from "react";
import { CallbackInner } from "./CallbackInner";

function LoadingFallback() {
  return (
    <main className="callback-layout">
      <div className="callback-card">
        <div
          className="loading-spinner"
          style={{ width: 40, height: 40, borderWidth: 3 }}
        />
        <h1 className="callback-card__title">Connexion en cours...</h1>
        <p className="callback-card__subtitle">
          Échange du token Spotify en cours.
          <br />
          Ne fermez pas cette page.
        </p>
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackInner />
    </Suspense>
  );
}
