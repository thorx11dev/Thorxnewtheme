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
- A founder account exists in this environment's database: `thorx11dev@gmail.com` (password set by the user, not stored here). Log in via the normal `/login` flow.

## Setup notes (this import)

- `DATABASE_URL` and `SESSION_SECRET` were already available as environment secrets in this environment.
- Ran `npm install`, then `npx drizzle-kit push --force` to create all tables from `shared/schema.ts`.
- If `db:push` fails with a TTY-prompt error on a fresh database, a leftover `session` table (auto-created by connect-pg-simple at server start) can confuse drizzle-kit's conflict resolver. Drop it (`DROP TABLE IF EXISTS session;`) and rerun `npx drizzle-kit push --force`.
- `npm run dev` verified working on port 5000 (landing page renders correctly).
- Re-verified again on a later re-import (2026-07-14): same steps (`npm install`, `npx drizzle-kit push --force`, restart workflow) got it running cleanly with no schema issues.
- 2026-07-14: verified end-to-end auth flow (register → login → profile → logout, session cookie cleared and subsequent requests correctly 401) against the live dev domain, and provisioned the founder account above. All `/api` POST routes require CSRF: `GET` any `/api/*` route first to receive the `thorx.csrf.v2` cookie, then echo its value back as the `x-csrf-token` header on the POST.

## User preferences

- Use Replit's built-in PostgreSQL (no external auth or storage providers)
- Insforge is fully removed. Auth is session-based (express-session + scrypt), profile pictures are stored as compressed base64 in Postgres. `.env.example` reflects only the variables the server actually reads.
