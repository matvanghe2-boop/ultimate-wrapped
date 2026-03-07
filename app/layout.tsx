// ============================================================
// app/layout.tsx
// Root Layout — Ultimate Wrapped Sprint 3
// ============================================================

import type { Metadata } from "next";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Ultimate Wrapped — Votre histoire musicale complète",
  description:
    "Analysez l'intégralité de votre historique Spotify. Pas juste une année — depuis le premier jour.",
  openGraph: {
    title: "Ultimate Wrapped",
    description: "Votre histoire musicale complète sur Spotify",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
