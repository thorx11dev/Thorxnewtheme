---
name: THORX v3 verification
description: Full spec audit results from 2026-07-16 — what's built, what deviates from spec, and why.
---

## Verification Summary (2026-07-16)

All 6 phases of the THORX v3 rebuild confirmed complete.

## What Was Verified

### Schema / DB
- All 5 new tables present: `user_transactions`, `referral_commissions`, `captain_messages`, `guild_weekly_snapshots`, `activity_feed`
- All 9 new user columns: `performance_score`, `user_rank_tier`, `guild_role`, `guild_id`, `last_active_at`, `streak_days`, `balance_cash_pkr`, `last_streak_date`, `inactivity_penalty_at`
- All 8 new guild columns: `guild_performance_score`, `guild_rank_tier`, `member_capacity`, `weekly_bonus_pool`, `current_weekly_points`, `weekly_target`, `target_difficulty`, `assistant_captain_id`

### System Config
- All 57 keys seeded via `bootstrapConfig()` on startup.

### Backend modules (all confirmed)
- `server/modules/thorx-card.ts`, `ps-engine.ts`, `gps-engine.ts`, `live-feed.ts`
- `server/middleware/rankGate.ts`
- `server/jobs/guild-weekly-reset.ts`, `inactivity-penalty.ts` — both started on server boot (all envs)

### Routes (all confirmed)
- Engine A (`POST /api/ad-view`), Engine B (`POST /api/tasks/:id/verify` with C-Rank gate), Engine C (weekly task complete with guild role gate)
- Guild creation with B-Rank gate, Guild application flow, Captain portal endpoints
- Withdrawal preview, referral balance, admin live-feed, ledger validator, referral stats
- Old join/approve/reject routes retired with 410 responses

### Key code paths
- `lastActiveAt` per-request middleware: `routes.ts` lines 122-129
- Leaderboard recompute: `level2Count: 0`, `userRankTier`, `guildRole` all correctly included
- `commission_logs`: `createCommissionLog()` function exists as legacy code but is NOT called from any active code path — write-frozen in practice
- Invariant #1 (`real_pkr_value` write-once): no `UPDATE user_transactions SET real_pkr_value` anywhere
- TypeScript: zero errors

### Phase 6 cleanup (DONE)
- `GuildVaultPanel` → shim re-exporting `GuildMemberPanel`
- `ScratchCardModal` → shim re-exporting `ThorxCard`
- Rally routes → removed (410 responses)
- `TermsAndConditions.tsx` → updated: old Urdu rank table replaced with E-S rank table, L2 referral text replaced with L1-only language, daily-task withdrawal gate removed
- "Vault"/"Locked Points" purged from all user-facing components
- Old `ui/rank-badge.tsx` (Urdu names) not imported by any active component — dead code

## Intentional Spec Deviations (DO NOT "FIX")

### CONVERSION_RATE = 100
- Spec says 1000; code bootstraps 100 with comment "100 points == 1.00 PKR"
- **Why intentional:** The card formula is `(userPkrShare / 10.0) * conversionRate`. With rate=100, Rs.6 → 60 base points. With rate=1000, Rs.6 → 600 base points. Business decided on the lower multiplier.
- The spec example (648 pts for Rs.6) only works with 1000. Flag to user if points feel too low.

### REFERRAL_FEE_SHARE_PCT = 50
- Spec says 30%; business decision confirmed to use 50%.

### MIN_PAYOUT = 100
- Spec says "min 1000 TX-Points"; code checks `exactPkr < 100` (Rs.100 minimum PKR value, not points count).
- Different implementation but functionally similar intent.
