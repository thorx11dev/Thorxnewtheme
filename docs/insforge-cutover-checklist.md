# THORX Insforge Cutover Checklist

## Deployment model (read this first)
- **Database:** Drizzle + PostgreSQL. In production, `DATABASE_URL` is typically the Postgres connection string from your Insforge project (same project as Auth/Storage).
- **API process:** One **Node/Express** service (`dist/index.js` from `npm run build`). It is **not** deployed as Insforge **Cloud Functions**; the Functions tab in Insforge may stay empty. Use your platform’s process hosting (VM, container, Insforge “server” tab, etc.) with `npm run start`.
- **Object storage:** Profile images go to the Insforge bucket named in `INSFORGE_STORAGE_BUCKET` (default `thorx-assets`) via `INSFORGE_API_KEY`. If the bucket is private, set `THORX_PUBLIC_API_URL` to this API’s public origin so the app stores proxied URLs (`/api/thorx/storage-proxy?u=...`). Alternatively set `INSFORGE_STORAGE_PUBLIC_READ=true` if you make the bucket publicly readable.
- **Auth:** SPA uses `@insforge/sdk` with `VITE_INSFORGE_URL` + `VITE_INSFORGE_ANON_KEY`; the API validates Bearer tokens against `INSFORGE_API_URL`. Keep all three aligned to the **same** Insforge project.

## Pre-cutover
- Confirm `npm run check` is green on release branch.
- Run `npm run preflight:insforge` (with `.env` present) and resolve any `[FAIL]` / `[WARN]` lines.
- Set production env values (see root `.env.example` and `insforge.deploy.json`):
  - `VITE_API_URL=https://api.insforge.dev`
  - `FRONTEND_ORIGINS=https://app.insforge.dev,https://insforge.dev`
  - `SESSION_SECRET` strong random value
  - `SESSION_COOKIE_SECURE=true`
  - `SESSION_COOKIE_SAME_SITE=none`
- Dry-run core migration:
  - `node scripts/insforge/migrate-core-data.js`
  - `node scripts/insforge/parity-check.js`

## Canary
- Route a small percentage of traffic to `api.insforge.dev`.
- Verify:
  - register/login/logout
  - session persistence after refresh
  - payout request and admin approval path
  - profile media read/write
- Monitor:
  - 401/403 rates
  - payout failures
  - latency and 5xx

## Full cutover
- Switch all frontend production API traffic to `api.insforge.dev`.
- Keep rollback variables ready for at least 7 days.

## Rollback
- Revert `VITE_API_URL` to previous backend.
- Restore previous traffic target.
- Keep data migration logs for reconciliation.
