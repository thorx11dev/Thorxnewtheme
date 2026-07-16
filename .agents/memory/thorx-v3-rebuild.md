---
name: THORX v3 rebuild progress
description: Phase completion status, resolved bugs, deferred items, and hard-won lessons from the v3 build and all subsequent audit passes.
---

## Phase completion (original 5 phases)
All 5 original build phases are COMPLETE. Phases 1-5 covered: schema + DB setup, all backend routes, risk engine + dashboard, guild/captain/member UI, admin panel.

## Fifth-pass: Production-Readiness Audit fixes (2026-07-15)
**Critical items fixed:**
- Two raw-SQL-only partial unique indexes that MUST be re-applied after any full DB rebuild:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_transactions_source ON user_transactions (source_id, source_type) WHERE source_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_withdrawals_one_pending_per_user ON withdrawals (user_id) WHERE status = 'pending';
  ```
  These can't be expressed in Drizzle's DSL — `drizzle-kit push --force` silently drops them. Always re-apply manually after a full rebuild (see `reimport-setup.md`).
- `POST /api/admin/guilds/:id/status` — added Zod `adminGuildStatusSchema` validation.
- `POST /api/admin/guilds/:id/strikes` — added Zod `adminGuildStrikeSchema` validation.
- Added `withdrawalRateLimiter` export to `server/middleware/auth-rate-limit.ts`.
- `PATCH /api/team/members/:id` — investigated mass-assignment claim; confirmed NOT vulnerable (explicit destructure + whitelist, not spread).

**Medium items fixed:**
- DB indexes added via raw SQL: `users_performance_score_idx`, `users_personal_rank_idx`, `users_total_earnings_idx`, `task_records_user_task_idx` (composite userId+taskId). Also added to `shared/schema.ts`.

**Medium items NOT fixed (deliberate deferral):**
- `system_config` in-memory cache — **Invariant #9 forbids persistent in-memory caching**. Per-request parallelised `Promise.all` is the correct pattern.
- `recomputeLeaderboardCache` full-table load — medium-term concern; not touched.
- N+1 in guild-reset per-member loop — acceptable at current scale.

**Not bugs (investigated):**
- Rate-limit headers absent in dev curl tests — intentional: both rate limiters skip loopback IPs in dev. Activates in production.

## Sixth-pass: regression + live browser bug (2026-07-15)
- Both raw-SQL-only idempotency indexes were **missing from the live DB** after re-import. Re-applied and verified via `pg_indexes` + rollback-wrapped duplicate-insert tests (both correctly threw `23505`).
- `ThorxCardSandbox.tsx`: `POST /api/admin/simulate/thorx-card` wrapped response as `{ simulations, count }` but client expected bare array — TypeError on every draw. Fixed server to return bare array; fixed client to use local `engineType` state instead of nonexistent `lastResult.engineType`.
- **Lesson: live click-through of admin UI surfaces response-shape mismatches that code/spec reading misses.** Always click through any admin "run" button before declaring a phase complete.

## Seventh-pass: Million-Dollar Audit (2026-07-16)
Full sweep across 3 categories — financial integrity, enterprise readiness, ecosystem/UX. All fixes below applied and verified with `npx tsc --noEmit` (zero errors) + workflow restart.

### Category 1 — Financial Integrity
- **`createWithdrawal` (storage.ts)**: the pending-check SELECT and INSERT are now wrapped in a single `db.transaction()`. Previously the two statements had a TOCTOU window. The partial unique index is still the final backstop, but the check+insert are now atomic.
- **`routes.ts` balance adjustment (`adjust_balance` action)**: replaced native float addition `(currentBalance + amount).toString()` with `new Decimal(currentBalance).plus(new Decimal(amount)).toFixed(4)`. Required adding `import Decimal from "decimal.js"` to routes.ts (already in storage.ts).
- `adminAdjustUserPS` was **already** in a transaction — subagent's claim it wasn't was a false positive.
- Float-drift in `guild-reset.ts` and `thorx-card.ts` was confirmed spec-sanctioned (rounding accepted for bonus distribution) — not changed.

### Category 2 — Security & Enterprise
- `POST /api/team/emails`: added `requireTeamRole` middleware (was completely unauthenticated, crashed safe with TypeError but still broken).
- `GET /api/admin/notes/:targetType/:targetId`: added `requirePermission("VIEW_ANALYTICS")` and removed the always-failing manual `if (!req.userProfile)` check (route was permanently broken, always returning 401).
- Added `profileRateLimiter` (30 req/15min/IP) to `server/middleware/auth-rate-limit.ts` and applied to 5 unthrottled routes: `PATCH /api/users/:id`, `POST /api/rank/refresh`, `POST /api/admin/users/:userId/adjust-balance`, `PATCH /api/admin/users/:id/rank`, `PATCH /api/admin/users/:userId/ps`.
- `PATCH /api/team/members/:id/permissions`: replaced manual `Array.isArray` check with `z.object({ permissions: z.array(z.string()) }).parse(req.body)`.
- Admin guild status/strikes routes already had proper Zod schemas — no change needed.
- Mass-assignment on withdrawal route (spread + `insertWithdrawalSchema.parse`) is NOT a real gap — Zod strips unknown keys by default.

### Category 3 — Ecosystem & UX
- **Points-only illusion cleanup**: stripped `PKR`/`Rs.` from `DashboardCards.tsx` (balance + referral cash card), `profile-modal.tsx` (lifetime earnings + cash balance), `referral-tree.tsx` (per-referral earnings), `notification-modal.tsx` (commission notification labels), `ThorxCard.tsx` (saved value on card reveal), `UserPortal.tsx` (withdrawal history row suffixes). Withdrawal UI and admin screens untouched.
- **Captain announcements (new feature)**: added `latest_announcement text` and `announcement_posted_at timestamp` to `guilds` table (raw SQL + schema.ts). Storage: `postGuildAnnouncement()` + `clearGuildAnnouncement()`. Routes: `POST /api/guilds/:id/announcement` and `DELETE /api/guilds/:id/announcement`. CaptainPortal: new Announcements section in Settings tab + active-announcement preview banner. GuildMemberPanel: amber announcement banner above guild header when `guild.latestAnnouncement` is set.
- **Difficulty → weeklyTarget wiring**: `updateGuildSettings()` now maps `targetDifficulty` (low/medium/high) to a `weeklyTarget` using `DatabaseStorage.DIFFICULTY_TARGETS` keyed by `guildRankTier`. Difficulty selector moved from the (read-only) Stats tab into the Settings tab with a live preview of the computed target. Admin's `adminSetGuildWeeklyTarget` still overrides unconditionally.
- **Performance index**: `task_records_user_completed_at_idx` on `(user_id, completed_at)` applied via raw SQL (was missing; now verified in `pg_indexes`).
- **AdminDashboard engine revenue grid**: `grid grid-cols-3` → `grid grid-cols-1 sm:grid-cols-3` for mobile responsiveness.
- Table overflow-x-auto: GuildManager, PayoutControl, UserManager already had wrappers — no change needed.
- Clipboard error toasts in UserPortal: already had proper try/catch with toast — no change needed.

### False positives from subagent audit (corrected)
- `adminAdjustUserPS` was already in a transaction.
- `/api/team/invitations/verify/:token` is intentionally public (email link, no session yet).
- Mass assignment on withdrawal + team emails — both Zod-validated, Zod strips unknown keys.
- Admin guild status/strikes routes already had Zod validation.

## Prior resolved items (keep as-is)
- `REFERRAL_FEE_SHARE_PCT = 50` (not spec's 30%) is the confirmed real business rule per explicit user decision.
- `scripts/migrate-v3.ts` was never built — acceptable (DB created directly with v3 schema).
- Withdrawal amounts are TX-Points end-to-end; PKR always looked up from stored `realPkrValue`, never derived client-side.
- `drizzle-kit push` fails in non-TTY env — schema changes must go through `executeSql` or `psql "$DATABASE_URL"` with raw SQL.
- `commission_logs` is write-frozen — new referral commission writes only go to `referral_commissions`.
