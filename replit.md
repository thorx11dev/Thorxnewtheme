# THORX

THORX is a full-stack rewards platform (React + Vite SPA, Express API, PostgreSQL via Drizzle).

## Stack

| Layer | Technology |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query, shadcn/ui, Tailwind |
| API | Node.js, Express (`npm run dev` in development) |
| Database | PostgreSQL — Replit's built-in managed database (`DATABASE_URL` auto-injected) |
| Auth | Session-based (express-session + connect-pg-simple); users stored in `users` table |
| Files | Profile pictures compressed with sharp and stored as base64 data URLs in the DB |

## Local / Replit development

1. `npm install`
2. `npm run db:push` when the schema changes
3. `npm run dev` — serves on port 5000

## Production build

- Build: `npm run build`
- Run: `npm run start` (or `node dist/index.js` with `NODE_ENV=production`)

## Required environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Auto-injected by Replit's managed PostgreSQL |
| `SESSION_SECRET` | Random hex string for signing session cookies |

## Documentation

- `shared/schema.ts` — full Drizzle schema (all tables)
- `server/routes.ts` — all API routes
- `server/storage.ts` — database access layer

## Founder account

- Role: `founder` (full access to team portal)
- Created via `POST /api/bootstrap-founder` (one-time; blocked once any team member exists)
- A founder account exists in this environment's database: `thorx11dev@gmail.com` / name "Thorx X" (password set by the user, not stored here). Log in via the normal `/login` flow at `/team-portal` or `/team`.

## Setup notes (this import)

- `DATABASE_URL` and `SESSION_SECRET` were already available as environment secrets in this environment.
- Ran `npm install`, then `npx drizzle-kit push --force` to create all tables from `shared/schema.ts` (database was empty, no leftover `session` table this time).
- If `db:push` fails with a TTY-prompt error on a fresh database, a leftover `session` table (auto-created by connect-pg-simple at server start) can confuse drizzle-kit's conflict resolver. Drop it (`DROP TABLE IF EXISTS session;`) and rerun `npx drizzle-kit push --force`.
- `npm run dev` verified working on port 5000 (landing page renders correctly).
- Founder account provisioned via `POST /api/bootstrap-founder` (email `thorx11dev@gmail.com`, password set by the user, not stored here).
- Auth flow verified end-to-end over the https dev domain: register (201) → session check (200) → logout (200) → session check (401) → login with correct password (200) → login with wrong password (401, rejected) → duplicate email registration (400, rejected) → founder login/logout (200/200). The temporary test account used for this was deleted afterward; only the founder account remains in the database.
- Re-verified again on a later re-import (2026-07-14): same steps (`npm install`, `npx drizzle-kit push --force`, restart workflow) got it running cleanly with no schema issues.
- 2026-07-14: verified end-to-end auth flow (register → login → profile → logout, session cookie cleared and subsequent requests correctly 401) against the live dev domain, and provisioned the founder account above. All `/api` POST routes require CSRF: `GET` any `/api/*` route first to receive the `thorx.csrf.v2` cookie, then echo its value back as the `x-csrf-token` header on the POST.
- 2026-07-15 (this import): Fresh empty DB — no leftover `session` table. Ran `npm install` then `npx drizzle-kit push --force`; all tables created cleanly. App confirmed running on port 5000 (landing page renders correctly). Full auth regression verified against the live dev domain — all checks passed: new-user register with `identity` field → `/api/user` session check (correct user object returned) → logout → `/api/user` after logout (401 `NO_SESSION`) → wrong-password login rejected (401 `UNAUTHORIZED`) → correct-password login → session restored. Founder account (Thorx X / thorx11dev@gmail.com, role: `founder`) provisioned via `POST /api/bootstrap-founder`; founder login, `/api/user` profile, and `/api/admin/config` access all return 200. CSRF flow: `GET /api/health` to receive `thorx.csrf.v2` cookie, then echo its value as `x-csrf-token` header on every POST.
- 2026-07-15 (re-import): node_modules was present but tsx binary was missing (npm install not fully run after import). Ran `npm install` + `npx drizzle-kit push --force`; all tables applied with no conflicts. App running on port 5000.
- 2026-07-15 (auth + founder verification): Full auth regression passed — register → session check → logout → 401 confirmed → wrong-password login rejected (401 UNAUTHORIZED) → correct-password login → session restored. Founder account (Thorx X / thorx11dev@gmail.com, role: founder, permissions: ["all"]) provisioned via POST /api/bootstrap-founder; login, /api/user, /api/admin/config, and /api/team/members all return 200 with correct data.
- 2026-07-15 (re-import): `DATABASE_URL`/`SESSION_SECRET` already present. Ran `npm install` + `npx drizzle-kit push --force` (no conflicts), restarted workflow. Landing page confirmed rendering on port 5000.
- 2026-07-15 (re-import): Same steps — `npm install` + `npx drizzle-kit push --force` (no conflicts), restarted workflow. Landing page confirmed rendering on port 5000.
- 2026-07-15 (auth regression + founder re-provisioning): DB was empty (fresh re-import), so founder was re-created via `POST /api/bootstrap-founder` with the credentials the user supplied (password set by the user, not stored here). Verified end-to-end: founder login → `/api/user` → `/api/admin/config` (200) → `/api/team/members` (200, shows founder) → logout → 401. Separately, full new-user regression on a throwaway QA account: register (201) → session check (200) → logout → 401 → wrong password (401 UNAUTHORIZED) → correct password (200) → duplicate email registration correctly rejected (400). QA account deleted after the test. Both `/auth` and `/team-portal` render the same register/login form component.

## User preferences

- Use Replit's built-in PostgreSQL (no external auth or storage providers)
- Insforge is fully removed. Auth is session-based (express-session + scrypt), profile pictures are stored as compressed base64 in Postgres. `.env.example` reflects only the variables the server actually reads.
