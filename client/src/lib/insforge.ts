import { createClient, type InsForgeClient } from "@insforge/sdk";
import {
  getInsforgeRefreshToken,
  persistInsforgeRefreshToken,
  setInsforgeAccessToken,
} from "@/lib/insforge-session";

const baseUrl = (import.meta.env.VITE_INSFORGE_URL || "").replace(/\/$/, "");
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || "";

/**
 * Insforge client (mobile token flow) so refresh tokens are returned in JSON
 * for cross-origin THORX API + Insforge Auth.
 */
export const insforge: InsForgeClient = createClient({
  baseUrl: baseUrl || "http://localhost:7130",
  anonKey: anonKey || undefined,
  isServerMode: true,
});

export function isInsforgeConfigured(): boolean {
  return Boolean(baseUrl && anonKey);
}

/** Restore Insforge access token from a stored refresh token (page load). */
export async function hydrateInsforgeFromRefreshToken(): Promise<boolean> {
  if (!isInsforgeConfigured()) return false;
  const rt = getInsforgeRefreshToken();
  if (!rt) return false;
  const { data, error } = await insforge.auth.refreshSession({ refreshToken: rt });
  if (error || !data?.accessToken) {
    persistInsforgeRefreshToken(null);
    setInsforgeAccessToken(null);
    return false;
  }
  setInsforgeAccessToken(data.accessToken);
  if (data.refreshToken) persistInsforgeRefreshToken(data.refreshToken);
  return true;
}
