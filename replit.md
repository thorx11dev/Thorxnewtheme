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
- This environment's database was freshly provisioned on this import (schema pushed via `drizzle-kit push`), so no founder account exists yet. Create one by POSTing `{ email, password, firstName, lastName }` to `/api/bootstrap-founder`, then log in normally.

## Setup notes (this import)

- Ran `npm install`, then `npm run db:push` to create all tables from `shared/schema.ts`.
- If `db:push` fails with a TTY-prompt error on a fresh database, a leftover `session` table (auto-created by connect-pg-simple at server start) can confuse drizzle-kit's conflict resolver. Drop it (`DROP TABLE IF EXISTS session;`) and rerun `npx drizzle-kit push --force`.

## User preferences

- Use Replit's built-in PostgreSQL (no external auth or storage providers)
- Insforge is fully removed. Auth is session-based (express-session + scrypt), profile pictures are stored as compressed base64 in Postgres. `.env.example` reflects only the variables the server actually reads.
