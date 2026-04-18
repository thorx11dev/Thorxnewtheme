const REFRESH_KEY = "thorx_insforge_refresh";

/** In-memory Insforge access token (used as Bearer for the THORX API). */
let accessTokenMem: string | null = null;
const listeners = new Set<() => void>();

function notifyTokenListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeInsforgeAccessToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setInsforgeAccessToken(token: string | null): void {
  accessTokenMem = token;
  notifyTokenListeners();
}

export function getInsforgeAccessToken(): string | null {
  return accessTokenMem;
}

export function persistInsforgeRefreshToken(token: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  if (token) sessionStorage.setItem(REFRESH_KEY, token);
  else sessionStorage.removeItem(REFRESH_KEY);
}

export function getInsforgeRefreshToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(REFRESH_KEY);
}

export function clearInsforgeTokenStorage(): void {
  accessTokenMem = null;
  persistInsforgeRefreshToken(null);
}
