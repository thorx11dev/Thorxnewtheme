/**
 * Production API origin from VITE_API_URL (e.g. https://api.thorx.pro).
 * Empty in local dev → same-origin paths so Vite's /api proxy still works.
 */
export function getApiOrigin(): string {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

/** Absolute URL for an API path, or same-origin path when VITE_API_URL is unset (dev). */
export function apiAbsolutePath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const o = getApiOrigin();
  return o ? `${o}${p}` : p;
}
