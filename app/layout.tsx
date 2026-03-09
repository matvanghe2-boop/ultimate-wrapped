// ============================================================
// app/layout.tsx
// Root Layout — Ultimate Wrapped Sprint 3 — PWA Ready
// ============================================================

import type { Metadata, Viewport } from "next";
import "./dashboard.css";

// ============================================================
// VIEWPORT (thème mobile, couleur barre de statut)
// ============================================================

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// ============================================================
// METADATA
// ============================================================

export const metadata: Metadata = {
  title: "Ultimate Wrapped — Votre histoire musicale complète",
  description:
    "Analysez l'intégralité de votre historique Spotify. Pas juste une année — depuis le premier jour.",

  // PWA Manifest
  manifest: "/manifest.json",

  // Icônes
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
    other: [
      { rel: "icon", url: "/icons/icon-192.png", sizes: "192x192" },
      { rel: "icon", url: "/icons/icon-512.png", sizes: "512x512" },
    ],
  },

  // Open Graph (partage réseaux sociaux)
  openGraph: {
    title: "Ultimate Wrapped",
    description: "Votre histoire musicale complète sur Spotify",
    type: "website",
  },

  // iOS PWA — mode app natif
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ultimate Wrapped",
  },

  // Empêche la détection automatique de numéros de téléphone sur iOS
  formatDetection: {
    telephone: false,
  },
};

// ============================================================
// LAYOUT
// ============================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* iOS PWA — plein écran sur iPhone/iPad */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ultimate Wrapped" />

        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Couleur de la barre d'adresse sur Android Chrome */}
        <meta name="theme-color" content="#121212" />

        {/* Splash screen couleur de fond pendant le chargement */}
        <meta name="msapplication-TileColor" content="#121212" />
      </head>
      <body>{children}</body>
    </html>
  );
}
