# THORX

THORX is a full-stack rewards platform (React + Vite SPA, Express API, PostgreSQL via Drizzle). **Authentication, session validation for uploads, and profile object storage** are integrated with **Insforge** (same project: Auth + Postgres + Storage).

## Stack (source of truth)

| Layer | Technology |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, shadcn/ui, Tailwind |
| API | Node.js, Express, `dist/index.js` from `npm run build` |
| Database | PostgreSQL — `DATABASE_URL` (Insforge-hosted or any Postgres) |
| Auth | Insforge (`@insforge/sdk` on client; Bearer validation against `INSFORGE_API_URL` on server) |
| Files | Insforge Storage bucket (default `thorx-assets`); private buckets use `THORX_PUBLIC_API_URL` + `/api/thorx/storage-proxy` |

## Local development

1. Copy `.env.example` → `.env` and fill all required variables (see `insforge.deploy.json` and `docs/insforge-cutover-checklist.md`).
2. `npm install`
3. `npm run db:push` when the schema changes
4. `npm run dev`

## Production

- Build: `npm run build`
- Run: `npm run start` (or `node dist/index.js` with `NODE_ENV=production` and env injected by your host)
- Pre-flight: `npm run preflight:insforge` (with `.env` loaded)

## Replit (optional)

If you run on Replit, the app still reads **the same** env vars; optional Replit-specific vars (`REPL_ID`, `REPLIT_DEV_DOMAIN`, etc.) only extend CORS origins in `server/config/runtime.ts`. There is **no** Supabase or alternate auth provider in this codebase.

## Documentation

- `docs/insforge-cutover-checklist.md` — deployment model and cutover steps  
- `insforge.deploy.json` — required env names for Insforge Cloud–style deploys  
- `.env.example` — placeholder template (never commit real secrets)
