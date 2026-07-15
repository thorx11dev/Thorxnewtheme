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

## Confirmed real gaps
None open — the two gaps below were found, user-approved, and removed on 2026-07-15 (see "Legacy vault removal" below). No other known gaps remain against the spec; v3 rebuild is spec-complete pending the user's own manual QA pass (Part L protocol) if desired.

## Legacy vault removal (done 2026-07-15)
Removed entirely, not just deprecated: `server/jobs/guild-vault-resolution.ts` (30-min cron) + its start call in `server/index.ts`; storage.ts fns `getResolvableGuildWeeklyCycles`/`resolveGuildWeeklyCycle`/`runGuildWeeklyResolution`/`getGuildVaultStatus`; `guild_vault_ledger` table (schema + live DB `DROP TABLE`); the now-dead `guilds.vault_balance_pkr` column (superseded by `weeklyBonusPool`, nothing wrote to it); `VAULT_HOLD_PCT`/`VAULT_RELEASE_MULTIPLIER_BY_RANK`/`WEEKLY_GOAL_TARGETS_BY_RANK` system_config keys + their admin UI section in `SystemSettingsManager.tsx`; the dead `GET /api/guilds/:id/vault` route; the dead `POST /api/guilds/:id/rally` 410-stub route + `triggerCaptainRally` fn.
**Why it mattered:** the legacy job raced the new spec-compliant `server/modules/guild-reset.ts` Sunday sweep on the same `guild_weekly_cycles` table — if the new job ever threw mid-run, the legacy sweep would read the permanently-empty vault ledger, wrongly conclude "goal missed," and could freeze a healthy guild after 3 false strikes.
**How it was repointed:** the admin "Run Weekly Resolution Now" button (`GuildManager.tsx`) now calls the same route, but the route handler calls `runWeeklyGuildReset()` from `guild-reset.ts` instead; response shape changed from `{resolvedCycles, frozenGuilds}` to `{guildsProcessed, distributed, voided, skipped}` — client toast updated to match.

## Prior resolved items (keep as-is, don't "fix")
- `REFERRAL_FEE_SHARE_PCT = 50` (not spec's 30%) is the confirmed real business rule per explicit user decision; grep for it shows it's only read via `system_config` (default 50), consistently applied at both withdrawal-preview and processWithdrawal sites.
- `scripts/migrate-v3.ts` was never built — deemed acceptable since this DB was created directly with v3 schema, no legacy migration needed.
- Withdrawal amounts are TX-Points end-to-end, FIFO-walked against `user_transactions.pointsCredited`; PKR always looked up from stored `realPkrValue`, never derived client-side.
- `drizzle-kit push` fails in this non-TTY env — schema changes must go through the `executeSql` callback with raw SQL.
- `commission_logs` is write-frozen (storage method `createCommissionLog` still exists but nothing calls it) — new referral commission writes only go to `referral_commissions`.
