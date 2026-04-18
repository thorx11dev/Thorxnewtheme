#!/usr/bin/env node
/**
 * THORX Insforge pre-flight checks (no secrets printed).
 *
 * Run from repo root with env loaded, e.g.:
 *   node --env-file=.env scripts/insforge/preflight-verify.mjs
 *
 * Exit 1 if required production variables are missing; exit 0 with warnings otherwise.
 */

function pick(name) {
  const v = process.env[name];
  return v && String(v).trim() !== "" ? String(v).trim() : "";
}

function hostOf(url, label) {
  try {
    return new URL(url).hostname;
  } catch {
    console.error(`[FAIL] ${label} is not a valid URL: ${url ? "(set)" : "(empty)"}`);
    return null;
  }
}

let failed = false;

function need(name, hint = "") {
  const v = pick(name);
  if (!v) {
    console.error(`[FAIL] Missing ${name}${hint ? ` — ${hint}` : ""}`);
    failed = true;
  }
  return v;
}

function warn(cond, msg) {
  if (!cond) console.warn(`[WARN] ${msg}`);
}

console.log("THORX Insforge preflight (values hidden)\n");

need("DATABASE_URL", "Postgres connection (Insforge project DB in prod)");
need("SESSION_SECRET", "Express session signing");
need("FRONTEND_ORIGINS", "CORS / cookie alignment for the SPA origin(s)");
need("INSFORGE_API_URL", "Same Insforge project as the SPA");
need("INSFORGE_API_KEY", "Server storage + storage-proxy upstream fetch");
need("INSFORGE_ANON_KEY", "Same anon key as VITE_INSFORGE_ANON_KEY; served via GET /api/config/insforge if used");
warn(pick("INSFORGE_STORAGE_PUBLIC_READ") === "true" || !!pick("THORX_PUBLIC_API_URL"),
  "Private bucket: set THORX_PUBLIC_API_URL to your public API origin so profile URLs use /api/thorx/storage-proxy.");

const api = pick("INSFORGE_API_URL");
const viteInsforge = pick("VITE_INSFORGE_URL");
if (api && viteInsforge) {
  const ha = hostOf(api, "INSFORGE_API_URL");
  const hv = hostOf(viteInsforge, "VITE_INSFORGE_URL");
  if (ha && hv && ha !== hv) {
    console.error(
      `[FAIL] Host mismatch: INSFORGE_API_URL host (${ha}) !== VITE_INSFORGE_URL host (${hv}). Use one Insforge project.`,
    );
    failed = true;
  }
}

const pub = pick("THORX_PUBLIC_API_URL");
if (pub && !/^https?:\/\//i.test(pub)) {
  console.error("[FAIL] THORX_PUBLIC_API_URL must be absolute (https://...), not a path.");
  failed = true;
}

const publicApi = pick("VITE_API_URL");
if (pub && publicApi) {
  try {
    const hPub = new URL(pub).hostname;
    const hApi = new URL(publicApi).hostname;
    warn(
      hPub === hApi,
      `THORX_PUBLIC_API_URL host (${hPub}) differs from VITE_API_URL host (${hApi}). Images must be loaded from the API host you set in THORX_PUBLIC_API_URL.`,
    );
  } catch {
    /* ignore */
  }
}

// --- Auth / email verification (logic check; no private Insforge API required) ---
console.log("\n[AUTH] Email verification");
console.log(
  "  Insforge projects often require email verification before issuing tokens. THORX handles this in the SPA:",
);
console.log("  - client/src/pages/auth.tsx — signUp: if requireEmailVerification && !accessToken, user stays on flow and must verify, then Sign in.");
console.log("  - server POST /api/register requires a valid Insforge Bearer (no THORX row until Insforge session exists).");
console.log("  Action: manually confirm in Insforge dashboard that verification is enabled as you expect.\n");

// --- Optional live probes (server env only) ---
const key = pick("INSFORGE_API_KEY");
if (api && key) {
  const base = api.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/storage/buckets`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (res.ok) {
      console.log(`[OK] Storage API reachable (${res.status})`);
    } else {
      console.warn(`[WARN] Storage buckets list returned ${res.status} (check INSFORGE_API_KEY scope).`);
    }
  } catch (e) {
    console.warn(`[WARN] Storage probe failed: ${e instanceof Error ? e.message : e}`);
  }

  try {
    const res = await fetch(`${base}/api/auth/sessions/current`, {
      headers: { Authorization: "Bearer invalid-token-for-probe", Accept: "application/json" },
    });
    warn(
      res.status === 401 || res.status === 403,
      `Unexpected /api/auth/sessions/current status ${res.status} (expected 401 without valid token).`,
    );
    if (res.status === 401 || res.status === 403) {
      console.log("[OK] Insforge auth session endpoint reachable (401/403 without token as expected)");
    }
  } catch (e) {
    console.warn(`[WARN] Auth session probe failed: ${e instanceof Error ? e.message : e}`);
  }
} else {
  console.warn("[WARN] Skipping live Insforge probes (INSFORGE_API_URL or INSFORGE_API_KEY missing).");
}

console.log("\n[STORAGE] Rate limit");
console.log(
  `  STORAGE_PROXY_RATE_LIMIT_MAX=${pick("STORAGE_PROXY_RATE_LIMIT_MAX") || "120"} (requests per IP per minute for /api/thorx/storage-proxy)`,
);

if (failed) {
  console.error("\nPreflight FAILED — fix items above before production.");
  process.exit(1);
}
console.log("\nPreflight complete (no blocking failures). Address any [WARN] lines before ship.");
process.exit(0);
