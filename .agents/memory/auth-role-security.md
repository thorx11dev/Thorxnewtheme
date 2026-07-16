---
name: Auth & Role Security
description: Route guard wiring, registration role hardening, privilege escalation fixes, and founder account setup for THORX.
---

## Route Guards (App.tsx)
All portal routes are now wrapped with the correct guards:
- `/user-portal`, `/portal`, `/dashboard`, `/work` → `ProtectedRoute` (any authenticated user)
- `/team-portal`, `/team` → `TeamProtectedRoute` (team/admin/founder only)
- `/hilltopads` → `TeamProtectedRoute` (was already correct)
- `/auth` → `PublicOnlyRoute` (redirects to `/` if already logged in)

**Why:** Before this fix, unauthenticated users could access `/user-portal` directly and any user could access `/team-portal` without the role check.

## Registration Security (server/routes.ts)
`POST /api/register` always creates role `'user'`. The `registerSchema` now only accepts `role: "user"`. The `createUser` call hardcodes `role: 'user'` regardless of request body.

**Why:** The old schema allowed `role: "founder" | "admin"` in the request — anyone could register as founder via direct API call.

## Privilege Escalation Fixed
- `PATCH /api/team/members/:id` — now requires `actorRole === 'admin' || 'founder'`; additionally only founders can set `accessLevel` to `admin` or `founder`.
- `DELETE /api/team/members/:id` — now requires `actorRole === 'admin' || 'founder'`.
- `POST /api/team/members` — already had `isAdminOrFounder` check (was correct).
- `PATCH /api/team/members/:id/permissions` — already founder-only (was correct).

**Why:** A `team` role member could call PATCH to escalate themselves or others to admin/founder.

## Bootstrap Endpoint Security (POST /api/bootstrap-founder)
- Hard-disabled in production (`runtimeConfig.isProd` check).
- In dev, if `BOOTSTRAP_SECRET` env var is set, caller must provide matching value in `x-bootstrap-secret` header or `req.body.bootstrapSecret`.
- The endpoint also still checks "no team members exist" as a second gate.

**Why:** Without gates, anyone can create a founder account after a data reset.

## Founder Account
Created via `scripts/seed-founder.ts`:
- Email: `thorx11dev@gmail.com`, First: `Thorx`, Last: `X`
- Role: `founder`, Team Key: "Master Founder Key" with `permissions: ["all"]`
- Use this account to access Team Portal at `/team` or `/team-portal`.

**How to apply:** If DB is wiped, re-run:
`FOUNDER_EMAIL="thorx11dev@gmail.com" FOUNDER_PASSWORD="Aonimran777!" npx tsx scripts/seed-founder.ts`
Then patch last name: `UPDATE users SET last_name = 'X' WHERE email = 'thorx11dev@gmail.com';`
(seed-founder.ts hardcodes lastName="Founder" — always fix it after seeding)
(Do NOT commit credentials — stored here only because this is a dev environment.)

## Rank → Avatar Alignment
`checkAndUpdateRank` in `storage.ts` uses `RANK_DEFAULT_AVATARS` map that matches `rankAvatars.ts` exactly:
- Nawa Aya → `nawa-aya-1` (local file: `/avatars/nawa-aya/1-default.png`)
- Munna → `munna-1` (local file: `/avatars/munna/1-default.png`)
- Bawa Ji → `bawa-ji-1` (DiceBear URL)
- Haji Saab → `haji-saab-1` (DiceBear URL)
- Chacha Supreme → `chacha-1` (DiceBear URL)
Local avatar files for Nawa Aya (all 8) and Munna (1-2) exist in `client/public/avatars/`.

## drizzle-kit push drops raw `sql` CONSTRAINT clauses
Table definitions with a raw `sql\`CONSTRAINT ... UNIQUE (...)\`` line inside the third `pgTable` array arg (e.g. `device_fingerprints`'s `uq_device_fp_user_hash`) are NOT applied by `drizzle-kit push`, even though they're in `shared/schema.ts`. The table gets created without that constraint, so any `onConflictDoUpdate({ target: [...] })` referencing it fails at runtime with "no unique or exclusion constraint matching the ON CONFLICT specification".

**Why:** drizzle-kit's push diffing doesn't reliably introspect raw `sql` template constraint declarations the same way it does `unique()`/`.unique()` column modifiers.

**How to apply:** After `db:push`, verify constraints actually landed with `SELECT conname FROM pg_constraint WHERE conrelid = '<table>'::regclass` before relying on `onConflictDoUpdate`/`onConflictDoNothing` against them. If missing, either add the constraint with a direct `ALTER TABLE ... ADD CONSTRAINT` (dev only) or convert the schema to use drizzle's `unique()` table helper instead of a raw `sql` constraint line, then re-push.

## Testing session auth locally needs X-Forwarded-Proto
This project sets session/CSRF cookies with `Secure; SameSite=None` whenever `isReplit` is true (see `server/config/runtime.ts`), which is correct in the real Replit proxy (always HTTPS) but means a plain `curl http://127.0.0.1:5000/...` never receives a `Set-Cookie` for the session — express-session silently skips it because `req.secure` is false with `trust proxy` set and no forwarded-proto header. Add `-H "X-Forwarded-Proto: https"` to curl calls when manually exercising login/register/logout against the dev server, or the session will appear to "not persist" when it actually would work fine through the browser/proxy.
