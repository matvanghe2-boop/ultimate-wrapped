// ============================================================
// app/callback/page.tsx
// Route OAuth callback Spotify — Sprint 3
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCode } from "../../lib/auth";

type CallbackState = "loading" | "success" | "error";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const code  = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Spotify a retourné une erreur explicite
    if (error) {
      setState("error");
      setErrorMessage(
        error === "access_denied"
          ? "Vous avez refusé l'accès à votre compte Spotify."
          : `Erreur Spotify : ${error}`
      );
      return;
    }

    if (!code || !state) {
      setState("error");
      setErrorMessage("Paramètres OAuth manquants. Veuillez réessayer.");
      return;
    }

    async function handleCallback() {
      try {
        const tokens = await exchangeCode(code!, state!);

        // Récupérer le profil utilisateur pour afficher son nom
        const profileRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (profileRes.ok) {
          const profile = await profileRes.json();
          const name = profile.display_name || profile.id || "Utilisateur";
          setDisplayName(name);
          // Stocker pour SpotifySync
          localStorage.setItem("spotify_display_name", name);
        }

        setState("success");

        // Redirection vers le dashboard après 1.5s
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch (err) {
        setState("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'échange du token."
        );
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <main className="callback-layout">
      {state === "loading" && (
        <div className={`callback-card`}>
          <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <h1 className="callback-card__title">Connexion en cours...</h1>
          <p className="callback-card__subtitle">
            Échange du token Spotify en cours.<br />Ne fermez pas cette page.
          </p>
        </div>
      )}

      {state === "success" && (
        <div className="callback-card callback-card--success">
          <div className="callback-card__icon">✓</div>
          <h1 className="callback-card__title">
            {displayName ? `Bonjour, ${displayName} !` : "Connecté !"}
          </h1>
          <p className="callback-card__subtitle">
            Votre compte Spotify est lié.<br />
            Redirection vers le dashboard...
          </p>
          <div className="loading-spinner loading-spinner--sm" />
        </div>
      )}

      {state === "error" && (
        <div className="callback-card callback-card--error">
          <div className="callback-card__icon">⚠</div>
          <h1 className="callback-card__title">Connexion échouée</h1>
          <p className="callback-card__subtitle">{errorMessage}</p>
          <button
            className="btn-primary"
            onClick={() => router.push("/dashboard")}
            style={{ marginTop: "0.5rem" }}
          >
            Retour au dashboard
          </button>
        </div>
      )}
    </main>
  );
}
