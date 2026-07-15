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

## Confirmed real gaps (still open, not yet fixed)
1. **Legacy Guild Vault system still fully wired and running, racing the new guild-reset.ts on the same `guild_weekly_cycles` table.** `server/jobs/guild-vault-resolution.ts` runs every 30 min via `startGuildVaultResolutionJob()` in `server/index.ts`, calling `storage.resolveGuildWeeklyCycle`/`runGuildWeeklyResolution` — pre-v3 vault-release-with-strikes-and-freeze mechanics reading the now-permanently-empty `guild_vault_ledger` table (nothing inserts into it anymore). The new spec-compliant `server/modules/guild-reset.ts` (Sunday bonus-pool distribution) writes/updates the *same* `guild_weekly_cycles` rows and always sets `resolved:true` on completion, so today the two systems don't visibly collide. **Latent risk:** if the new Sunday reset job ever throws partway through and leaves a `resolved:false` row, the legacy 30-min sweep will pick it up, evaluate it against the always-empty vault ledger (→ always "goal missed"), issue a bogus guild strike, and can freeze a healthy guild after 3 such false strikes. Needs a decision: remove the legacy vault job/table/functions entirely (per spec Appendix B intent), or add a guard so the legacy sweep ignores cycles owned by the new system.
2. **`POST /api/guilds/:id/rally` route still exists** in `server/routes.ts` (spec K.3 step 14 says remove it). No frontend caller found — dead but present. Low risk, straightforward removal.

## Prior resolved items (keep as-is, don't "fix")
- `REFERRAL_FEE_SHARE_PCT = 50` (not spec's 30%) is the confirmed real business rule per explicit user decision; grep for it shows it's only read via `system_config` (default 50), consistently applied at both withdrawal-preview and processWithdrawal sites.
- `scripts/migrate-v3.ts` was never built — deemed acceptable since this DB was created directly with v3 schema, no legacy migration needed.
- Withdrawal amounts are TX-Points end-to-end, FIFO-walked against `user_transactions.pointsCredited`; PKR always looked up from stored `realPkrValue`, never derived client-side.
- `drizzle-kit push` fails in this non-TTY env — schema changes must go through the `executeSql` callback with raw SQL.
- `commission_logs` is write-frozen (storage method `createCommissionLog` still exists but nothing calls it) — new referral commission writes only go to `referral_commissions`.
