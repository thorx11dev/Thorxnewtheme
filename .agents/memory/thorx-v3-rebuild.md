---
name: THORX v3 rebuild
description: Status and durable gotchas for the THORX v3 rank/PS/GPS/guild-bonus-pool rebuild vs the 2701-line spec.
---

## Verified TRUE against spec (independently re-checked, 2026-07-15)
- Schema (Part D.1-D.11): all new columns/tables present in both `shared/schema.ts` and live DB with correct types/defaults. `guilds.last_rally_at` correctly dropped. No duplicate `minRankRequired`/`min_rank_required` column.
- `server/modules/thorx-card.ts`, `ps-engine.ts`, `gps-engine.ts`: math matches spec exactly (card draw formula, PS award amounts, streak bonuses, rank thresholds, GPS %); all tunables read from `system_config` with spec-matching defaults as fallback.
- `server/storage.ts` `recordEarnEvent`: full 7-step pipeline (engine split → card draw → immutable `user_transactions` insert → balance/earnings update → guild contribution/GPS → PS/streak/rank check → feed event) matches spec order and math for Engine A/B/C.
- `calculateWithdrawalBreakdown`/`processWithdrawal`: real FIFO walk over `user_transactions` ordered by `created_at ASC`, sums `real_pkr_value` (never point×rate math); marks consumed rows `withdrawn=true`; writes `referral_commissions` (not `commission_logs`); audit-logs the action.
- All 26 new routes from spec E.9 are present with matching path/method.
- All new frontend components (Part F user-facing + Part G admin) exist and implement real logic, not stubs; `GuildVaultPanel.tsx`/`ScratchCardModal.tsx` are correct re-export shims; no "Vault"/"Locked Points" strings remain in user-facing JSX.
- `checkAndUpdateRankTier` (standalone fn in `ps-engine.ts`, imported into storage.ts) and `checkAndUpdateRank` (older `DatabaseStorage` method, still used by legacy paths) are two distinct, both-valid functions with confusingly similar names — not a bug, don't try to unify them without checking every call site.

## Third-pass findings (2026-07-15) — fixed
Three real defects found and fixed on a third deep-verification pass:
1. **Engine B rank gate placed AFTER task completion (spec L.3 invariant violation)**: In `POST /api/tasks/:id/verify`, the C-Rank gate for CPA tasks fired AFTER `updateTaskRecord(status='completed')` — so a below-C-Rank user's task slot was permanently consumed with no earn event. Fixed by moving the entire `isCpaTask` detection + rank gate block BEFORE the `updateTaskRecord` call. New comment: "Gate check is BEFORE updateTaskRecord so a failed rank check does not consume the task slot."
2. **S-Rank auto-approve missing from `createWithdrawal`** (spec E.7): `storage.createWithdrawal` always inserted `status: 'pending'` regardless of user rank. Fixed by looking up `userRankTier` just before the INSERT and setting `initialStatus = 'S-Rank' ? 'approved' : 'pending'`.
3. **Admin tables showed old Urdu rank names** (spec G.3): `PayoutControl.tsx` used `withdrawal.user.rank ?? 'Nawa Aya'` for both the badge display and sort priority; `UserInspectorPanel.tsx` used `user.rank || "Nawa Aya"`. Both updated to use `userRankTier` (E-S system) with `E-Rank` as the fallback. `rankPriority` map in PayoutControl updated from old Urdu keys to `S-RANK/A-RANK/.../E-RANK`.

**Confirmed NOT gaps (investigated, all clear):**
- `lastActiveAt` middleware IS present — in `routes.ts` lines 121-128 (fire-and-forget UPDATE on every authenticated request), not in `index.ts` as spec suggests, but functionally equivalent.
- `commission_logs.createCommissionLog` — storage method exists but confirmed nothing calls it; all new writes go to `referral_commissions`. Write-frozen as required.
- `GuildVaultPanel.tsx` and `ScratchCardModal.tsx` — correct shims (re-export of GuildMemberPanel / ThorxCard respectively), Phase 6 complete.
- No "Vault" / "Locked Points" strings in user-facing client JSX (only appear in admin-internal comments).
- All 10 Appendix A invariants verified in code.

## Fourth-pass findings (2026-07-15) — fixed
Three gaps found and fixed on a fourth independent re-verification pass:
1. **TypeScript error in `routes.ts:2007`**: `auditLogs.metadata` referenced a non-existent column — `audit_logs` table has `details` (jsonb), not `metadata`. Fixed to `auditLogs.details`. This was the only `tsc --noEmit` error.
2. **`GuildDiscoveryPanel.tsx` missing `successfulWeeks` display**: The `GuildDiscovery` interface had `successfulWeeks?: number` but the card never rendered it. Also, `storage.getGuildDiscoveryList()` did a bare `.select()` from `guilds` (which has no `successfulWeeks` column) — it never computed the count from `guild_weekly_snapshots`. Fixed both: (a) updated `getGuildDiscoveryList` to run a parallel `COUNT(*)` aggregate over `guildWeeklySnapshots WHERE wasSuccessful=true GROUP BY guildId` and merge into results; (b) added amber star + "N successful weeks" badge in the guild card meta row.
3. **`LeaderboardInsights.tsx` still had L2 column**: CSV export headers included "Network Referrals (L2)" and the data row included `u.level2Count`. Top Recruiters table had a sortable "Network (L2)" column header and a data cell. All removed; comments cite Appendix A invariant #4 (1-tier referral only).

**Confirmed NOT gaps on this pass (investigated, all clear):**
- All 26+ spec E.9 routes present (verified by subagent line-by-line).
- Background jobs use `setInterval` (self-healing) not exact cron — deliberate architectural choice documented in file comments; functionally meets spec intent.
- PayoutControl RED ALERT: fully implemented (lines 604–622 render the alert conditional on `ledgerCheck.isMismatch`).
- All 10 Appendix A invariants still hold in code.

## Confirmed real gaps
None open as of fourth-pass verification (2026-07-15). Prior "spec-complete" claims should not be trusted at face value; always re-trace call sites, don't just grep for keywords.

## Second-pass findings (2026-07-15) — fixed
- **Invariant #3 (Vault language) missed by first pass**: `client/src/components/ui/commission-calculator.tsx`, rendered live in the authenticated user portal's referral sidebar (`UserPortal.tsx` "Advanced Commission Calculator" block), labeled a line "Guild Vault Bonus" with a hardcoded, non-system_config-driven estimate formula. First pass only checked `GuildVaultPanel.tsx`/`ScratchCardModal.tsx` shims and missed this file because it doesn't have "Vault" in its filename. **Lesson: grep case-insensitively across ALL of `client/src`, not just files with suggestive names, when checking a banned-word invariant.** Fixed by renaming to "Guild Weekly Bonus" / `guildWeeklyBonusEstimate`.
- **Invariant #10 (required admin reason) missed by first pass**: `POST /api/admin/users/:userId/adjust-balance` (the original, pre-v3 balance adjustment endpoint) never validated `reason` — it silently defaulted to `'Admin balance adjustment'` in `storage.ts`. The newer v3 PS/GPS admin-adjust endpoints (`PATCH /api/admin/users/:userId/ps`, `PATCH /api/admin/guilds/:id/gps`) correctly reject with 400 if `reason` is missing or under 5 chars — the older endpoint was never brought in line when the new pattern was established. Fixed by adding the same `!reason || reason.trim().length < 5` 400-guard to the route before calling `storage.adjustUserBalance`.

## False lead investigated and ruled out (2026-07-15)
Spec line 252 ("`checkAndUpdateRank()` OVERHAUL: rename to `checkAndUpdateRankTier()`; old function kept as alias") reads as if `checkAndUpdateRank` and `checkAndUpdateRankTier` should be unified. **They must NOT be unified.** Full trace confirmed: legacy `checkAndUpdateRank` (storage.ts) only ever writes `users.rank`/`users.avatar` (the totalEarnings+referral-driven Nawa Aya→Chacha Supreme cosmetic avatar-rank system) and NEVER touches `userRankTier`. `checkAndUpdateRankTier` (ps-engine.ts) only ever writes `userRankTier` (PS-driven E→S guild/card gating) and never touches `rank`/`avatar`. These are two independent, both-live, both-necessary systems that the spec's author conflated into one — the spec text is simply wrong about this codebase's actual shape. Do not "fix" this by merging them or by making one call the other; that would break the avatar rank-up feature. Confirms and strengthens the original 2026-07-15 memory note below.

## Legacy vault removal (done 2026-07-15)
Removed entirely, not just deprecated: `server/jobs/guild-vault-resolution.ts` (30-min cron) + its start call in `server/index.ts`; storage.ts fns `getResolvableGuildWeeklyCycles`/`resolveGuildWeeklyCycle`/`runGuildWeeklyResolution`/`getGuildVaultStatus`; `guild_vault_ledger` table (schema + live DB `DROP TABLE`); the now-dead `guilds.vault_balance_pkr` column (superseded by `weeklyBonusPool`, nothing wrote to it); `VAULT_HOLD_PCT`/`VAULT_RELEASE_MULTIPLIER_BY_RANK`/`WEEKLY_GOAL_TARGETS_BY_RANK` system_config keys + their admin UI section in `SystemSettingsManager.tsx`; the dead `GET /api/guilds/:id/vault` route; the dead `POST /api/guilds/:id/rally` 410-stub route + `triggerCaptainRally` fn.
**Why it mattered:** the legacy job raced the new spec-compliant `server/modules/guild-reset.ts` Sunday sweep on the same `guild_weekly_cycles` table — if the new job ever threw mid-run, the legacy sweep would read the permanently-empty vault ledger, wrongly conclude "goal missed," and could freeze a healthy guild after 3 false strikes.
**How it was repointed:** the admin "Run Weekly Resolution Now" button (`GuildManager.tsx`) now calls the same route, but the route handler calls `runWeeklyGuildReset()` from `guild-reset.ts` instead; response shape changed from `{resolvedCycles, frozenGuilds}` to `{guildsProcessed, distributed, voided, skipped}` — client toast updated to match.

## Production-readiness audit (2026-07-15) — full disposition (second pass 2026-07-15)

**Second-pass verification against audit file `Pasted-THORX-Deep-Investigation...txt`:**

Items the audit claimed were gaps but were already fully resolved (verified in code, not just memory):
- Double-payout race — `SELECT ... FOR UPDATE` at storage.ts line 1969 ✅
- `recordEarnEvent` no transaction — `db.transaction()` at storage.ts line 956 ✅
- PKR float math — `new Decimal()` throughout ✅
- `POST /api/withdrawals` skips `requireSessionAuth` — has both `requireSessionAuth` + `withdrawalRateLimiter` ✅
- No rate limiting on mark-verified — has `authRateLimiter` ✅
- Guild status/strikes skip Zod — `adminGuildStatusSchema` / `adminGuildStrikeSchema` present ✅
- Social share buttons no `aria-label` — all 7 buttons already have `aria-label` + `title` ✅
- Share/copy fail silently — toasts on failure already present ✅
- `/api/reset-password` needs rate limiting — it's a 410 stub ("not available"), N/A ✅

**New fixes applied on second pass:**
1. **`user_transactions` idempotency unique index** — the storage.ts comment claimed `uniq_user_transactions_source` existed, but it was NOT in `shared/schema.ts` or the live DB. Applied via: `CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_transactions_source ON user_transactions (source_id, source_type) WHERE source_id IS NOT NULL`. Added a schema comment documenting it must be re-applied after a full DB rebuild.
2. **Withdrawal keypad backspace aria-label** — the ⌫ button had no accessible label. Added `aria-label="Backspace"`.
3. **Leaderboard correlated subqueries** — `refreshLeaderboardCache` had two per-row correlated subqueries (O(2N) DB round-trips). Replaced with a single parallel `SELECT referred_by, COUNT(*)::int ... GROUP BY referred_by` aggregate + JS Map merge. `isNotNull` added to drizzle-orm imports. Note: `level2Count` was already hardcoded `0` per spec H.5, so no L2 aggregate was needed.

**Still deferred (deliberate):**
- `recomputeLeaderboardCache` loads top-10,000 users into Node.js memory — acceptable at current scale, concern at 100k+ users.
- N+1 in guild-reset per-member loop — acceptable at current scale.
- Zero automated tests, no error monitoring, unstructured logging, no migration history — require larger engineering investment.



**All 4 Critical items already fixed before this session** (each has an in-code comment crediting the audit):
- Critical #1 — double-payout race: `processWithdrawal` uses `SELECT ... FOR UPDATE` as first statement inside `db.transaction()`.
- Critical #2 — `recordEarnEvent` no transaction: steps 3-6 wrapped in `db.transaction()`; feed/WS side-effects intentionally outside.
- Critical #3 — PKR float math: `Decimal` library used for all engine splits in `recordEarnEvent`, `calculateWithdrawalBreakdown`, and `drawThorxCard`. Native float only used for display-only card variance randomisation.
- Critical #4 — idempotency: partial unique index on `withdrawals` (one pending per user) + `uniq_user_transactions_source` unique index rejects duplicate earn events.

**High items fixed this session:**
- `GET /api/withdrawals` and `POST /api/withdrawals` — added `requireSessionAuth` (was bypassing suspension enforcement) + `withdrawalRateLimiter`.
- `POST /api/withdrawals/referral` — added `withdrawalRateLimiter`.
- `POST /api/auth/mark-verified` — added `authRateLimiter`.
- `POST /api/admin/guilds/:id/status` — replaced manual string check with Zod `adminGuildStatusSchema`.
- `POST /api/admin/guilds/:id/strikes` — replaced manual string check with Zod `adminGuildStrikeSchema`.
- Added `withdrawalRateLimiter` export to `server/middleware/auth-rate-limit.ts`.
- `PATCH /api/team/members/:id` — investigated mass-assignment claim; confirmed NOT vulnerable (explicit destructure + whitelist, not spread).

**Medium items fixed this session:**
- DB indexes added via `CREATE INDEX CONCURRENTLY`: `users_performance_score_idx`, `users_personal_rank_idx`, `users_total_earnings_idx`, `task_records_user_task_idx` (composite userId+taskId). Also added to `shared/schema.ts` for future drizzle-kit pushes.

**Medium items NOT fixed (deliberate deferral):**
- `system_config` in-memory cache — **Invariant #9 forbids persistent in-memory caching** ("No in-memory caching beyond the request"). Per-request parallelised `Promise.all([...8 config reads...])` is the correct pattern. Skip.
- `recomputeLeaderboardCache` full-table load — medium-term concern; not touched.
- N+1 in guild-reset per-member loop — acceptable at current scale.
- Unbounded SELECT * on small tables (daily tasks, ad zones, system configs) — harmless at current scale.

**Not bugs (investigated):**
- Rate-limit headers absent in dev curl tests — intentional: both rate limiters have `skip: (req) => NODE_ENV !== 'production' && IP is loopback`. Activates in production.

## Prior resolved items (keep as-is, don't "fix")
- `REFERRAL_FEE_SHARE_PCT = 50` (not spec's 30%) is the confirmed real business rule per explicit user decision; grep for it shows it's only read via `system_config` (default 50), consistently applied at both withdrawal-preview and processWithdrawal sites.
- `scripts/migrate-v3.ts` was never built — deemed acceptable since this DB was created directly with v3 schema, no legacy migration needed.
- Withdrawal amounts are TX-Points end-to-end, FIFO-walked against `user_transactions.pointsCredited`; PKR always looked up from stored `realPkrValue`, never derived client-side.
- `drizzle-kit push` fails in this non-TTY env — schema changes must go through the `executeSql` callback with raw SQL.
- `commission_logs` is write-frozen (storage method `createCommissionLog` still exists but nothing calls it) — new referral commission writes only go to `referral_commissions`.
