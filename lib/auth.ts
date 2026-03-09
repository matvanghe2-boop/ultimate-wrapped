// ============================================================
// SPOTIFY AUTH : OAuth 2.0 PKCE Flow (100% client-side)
// Pas de secret exposé, pas de backend nécessaire
// ============================================================

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/callback`
    : "http://localhost:3000/callback";

const SCOPES = [
  "user-read-recently-played",
  "user-read-private",
  "user-read-email",
].join(" ");

// ============================================================
// PKCE HELPERS
// ============================================================

function generateCodeVerifier(length = 128): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ============================================================
// AUTH FLOW
// ============================================================

/**
 * Lance le flow OAuth PKCE - redirige vers Spotify
 */
export async function initiateLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier(32);

  // Stocker pour la callback
  sessionStorage.setItem("spotify_pkce_verifier", verifier);
  sessionStorage.setItem("spotify_oauth_state", state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: SCOPES,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

/**
 * Échange le code d'autorisation contre un access token
 */
export async function exchangeCode(
  code: string,
  state: string
): Promise<TokenResponse> {
  const expectedState = sessionStorage.getItem("spotify_oauth_state");
  if (state !== expectedState) {
    throw new Error("State mismatch - possible CSRF attack");
  }

  const verifier = sessionStorage.getItem("spotify_pkce_verifier");
  if (!verifier) throw new Error("No PKCE verifier found");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const tokens: TokenResponse = await response.json();

  // Stocker les tokens
  saveTokens(tokens);

  // Nettoyer
  sessionStorage.removeItem("spotify_pkce_verifier");
  sessionStorage.removeItem("spotify_oauth_state");

  return tokens;
}

/**
 * Rafraîchit le token si expiré
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) throw new Error("Token refresh failed");

  const tokens: TokenResponse = await response.json();
  saveTokens(tokens);
  return tokens;
}

// ============================================================
// TOKEN STORAGE (localStorage)
// ============================================================

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export function saveTokens(tokens: TokenResponse): void {
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem("spotify_access_token", tokens.access_token);
  localStorage.setItem("spotify_expires_at", String(expiresAt));
  if (tokens.refresh_token) {
    localStorage.setItem("spotify_refresh_token", tokens.refresh_token);
  }
  // Copier le token dans IndexedDB pour que le Service Worker puisse y accéder
  // (les SW n'ont pas accès au localStorage)
  saveTokenToIDB(tokens.access_token, expiresAt);
}

/** Copie le token en IDB config pour le Service Worker */
function saveTokenToIDB(accessToken: string, expiresAt: number): void {
  try {
    const req = indexedDB.open("UltimateWrappedDB", 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("config")) return;
      const tx = db.transaction("config", "readwrite");
      const store = tx.objectStore("config");
      const getReq = store.get("main");
      getReq.onsuccess = () => {
        const config = getReq.result ?? { id: "main" };
        config.spotifyAccessToken = accessToken;
        config.spotifyTokenExpiry = expiresAt;
        store.put(config);
      };
    };
  } catch {
    // Silencieux — non bloquant
  }
}

/** Efface le token IDB à la déconnexion */
export function clearTokenFromIDB(): void {
  try {
    const req = indexedDB.open("UltimateWrappedDB", 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("config")) return;
      const tx = db.transaction("config", "readwrite");
      const store = tx.objectStore("config");
      const getReq = store.get("main");
      getReq.onsuccess = () => {
        const config = getReq.result;
        if (config) {
          delete config.spotifyAccessToken;
          delete config.spotifyTokenExpiry;
          store.put(config);
        }
      };
    };
  } catch {
    // Silencieux
  }
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = Number(localStorage.getItem("spotify_expires_at") ?? 0);

  if (!token || Date.now() >= expiresAt - 60_000) return null;
  return token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("spotify_refresh_token");
}

export function clearTokens(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_expires_at");
  localStorage.removeItem("spotify_refresh_token");
}

/**
 * Retourne un token valide (auto-refresh si nécessaire)
 */
export async function getValidToken(): Promise<string | null> {
  const token = getStoredToken();
  if (token) return token;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const tokens = await refreshAccessToken(refreshToken);
    return tokens.access_token;
  } catch {
    clearTokens();
    return null;
  }
}
