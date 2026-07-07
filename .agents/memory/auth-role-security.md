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
- Email: `thorx11dev@gmail.com`
- Role: `founder`, Team Key: "Master Founder Key" with `permissions: ["all"]`
- Use this account to access Team Portal at `/team` or `/team-portal`.

**How to apply:** If DB is wiped, re-run: `FOUNDER_EMAIL="thorx11dev@gmail.com" FOUNDER_PASSWORD="Thorxdidi9426!" npx tsx scripts/seed-founder.ts`
(Do NOT commit credentials — stored here only because this is a dev environment.)

## Rank → Avatar Alignment
`checkAndUpdateRank` in `storage.ts` uses `RANK_DEFAULT_AVATARS` map that matches `rankAvatars.ts` exactly:
- Nawa Aya → `nawa-aya-1` (local file: `/avatars/nawa-aya/1-default.png`)
- Munna → `munna-1` (local file: `/avatars/munna/1-default.png`)
- Bawa Ji → `bawa-ji-1` (DiceBear URL)
- Haji Saab → `haji-saab-1` (DiceBear URL)
- Chacha Supreme → `chacha-1` (DiceBear URL)
Local avatar files for Nawa Aya (all 8) and Munna (1-2) exist in `client/public/avatars/`.
