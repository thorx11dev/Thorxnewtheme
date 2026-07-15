---
name: THORX re-import setup
description: Steps and gotchas for getting THORX running after a fresh GitHub import into Replit.
---

On a fresh re-import, `DATABASE_URL`/`SESSION_SECRET` are already present as env secrets. Steps that reliably work:

1. `npm install`
2. If a leftover `session` table exists (auto-created by connect-pg-simple at a prior server start) it confuses drizzle-kit's conflict resolver and makes `drizzle-kit push` hang on a TTY prompt even in a non-interactive shell. Check with `psql "$DATABASE_URL" -c "\dt"`; if `session` is the only table, `DROP TABLE IF EXISTS session;` first.
3. `npx drizzle-kit push --force` (piping `printf '\n'` into it does not help — the real fix is removing the conflicting leftover table, not answering the prompt).
4. Restart the `Start application` workflow.

**Why:** drizzle-kit's `tablesResolver` triggers an interactive rename-conflict prompt whenever there's ambiguity between existing and target tables, and this prompt cannot be satisfied non-interactively — the environment has no TTY.

## Founder provisioning on re-import

`POST /api/bootstrap-founder` (dev-only, disabled in production) creates the founder if no team members exist yet — pass `email`/`password`/`firstName`/`lastName` in the body; it hashes the password via the normal `storage.createUser` bcrypt path and logs the session in directly. Safe to use for provisioning the founder account requested by the user on a fresh DB.

## Auth/CSRF testing via curl

All `/api` POST routes are protected by a double-submit CSRF cookie (`thorx.csrf.v2`). To test with curl: first `GET` any `/api/*` route (not `/`, which is served by the SPA/static path and does not go through the `/api` CSRF middleware) to receive the cookie, then echo its value back as the `x-csrf-token` header on the POST. Verified end-to-end: register → login → profile → logout → 401 all work correctly over the https `$REPLIT_DEV_DOMAIN` (not localhost — see session-cookie-testing memory).
