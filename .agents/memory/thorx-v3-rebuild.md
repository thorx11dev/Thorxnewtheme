---
name: THORX v3 rebuild
description: Full rank/engine/guild rebuild — phase status, critical decisions, and known constraints.
---

## ⚠️ Prior "COMPLETE" phase status was not reliable — always re-verify independently

A later independent verification pass (parallel explore subagents cross-checking the actual code against the spec, plus direct grep confirmation) found this file's earlier "Phase 4/5/6 — COMPLETE" claims did not hold up. Do not trust a phase-complete note in this file (or any session summary) without spot-checking the actual files yourself — summaries drift from reality as sessions get long.

## Verified-true from Phase 1-3 (schema/backend core)
- Schema (Part D): all new columns/tables (`user_transactions`, `referral_commissions`, `captain_messages`, `guild_weekly_snapshots`, `activity_feed`, plus new columns on users/guilds/guild_members/guild_weekly_cycles/weekly_tasks/score_history) exist matching spec types/defaults. `balance_cash_pkr >= 0` has a DB CHECK constraint.
- `server/modules/thorx-card.ts`, `ps-engine.ts`, `gps-engine.ts` match spec math (variance/draw, PS award/streak/inactivity floor, GPS awards).
- Invariant 1 (real_pkr_value write-once), 2 (withdrawal reads ledger not CONVERSION_RATE), 6 (PS-only rank input + rankLocked bypass), 7 (E-Rank floor on inactivity) — all verified true in code.
- Routes in spec E.9 (guild discovery/apply/applications, captain DM, member actions, withdrawal preview, referral cash, all new admin endpoints) all exist at the right path/method and enforce required `reason` fields on PS/GPS admin adjustments (invariant 10 holds).

## Confirmed gaps as of last verification (2026-07-15) — NOT done despite earlier claims
- **Invariant 3 VIOLATED right now**: literal "Vault"/"Locked" strings are directly grep-confirmed still user-facing in `client/src/pages/UserPortal.tsx` (chart label "Guild Vault", card text "ENGINE C VAULT" / "Locked in Guild Vault", copy "...vault bonuses every week"). The earlier session only fixed FAQ copy, not the dashboard card itself.
- `client/src/components/WithdrawalModal.tsx` does not exist — no dedicated withdrawal preview screen per spec F.11; withdrawal fee logic is inlined ad hoc in `UserPortal.tsx`.
- `scripts/migrate-v3.ts` does not exist at all.
- New WebSocket event names from spec H.1 (e.g. `user.ps_updated`, `guild.weekly_points`, `admin.feed_event`) are not emitted anywhere in server code.
- Dashboard summary card spec (F.2, three variants) not implemented — `UserPortal.tsx` still has legacy hardcoded cards instead.
- Admin side: `SystemSettingsManager.tsx` was never renamed/rebuilt into `FinancialControlCenter` (engine profit sliders / card variance controls from G.6 missing there specifically, even though `RanksCustomizer.tsx` covers some overlapping ground). `PayoutControl.tsx` missing the double-entry audit / RED ALERT ledger-mismatch banner from G.3. `UserManager.tsx` table missing Guild Role and Referral Cash columns. `GuildManager.tsx` missing "Replace Captain" flow. `AdminDashboard.tsx` engine breakdown card is a static/hardcoded stub, not wired to real data.
- `server/jobs/leaderboard-cleanup.ts` (or equivalent) not extended with `userRankTier`/`guildRole` per H.5.

## Critical Constraints

**Why:** `drizzle-kit push` fails in non-TTY env (Replit). All future schema changes must use raw SQL via `executeSql` callback.

**Why:** `commission_logs` is write-frozen; all new referral commission writes go to `referral_commissions` only. Reading from `commission_logs` for display is OK.

**Why:** BOOTSTRAP_SECRET is unset in this environment; the founder bootstrap endpoint accepts calls without a secret header.

**How to apply:** When adding DB columns, use `executeSql({ sqlQuery: "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..." })` not drizzle push.

## Daily Tasks Engine Split Note
`daily_tasks.taskCategory` defaults to `'indirect'` → treated as PS-only social tasks.
To make a daily task earn PKR (Engine B), admin sets `taskCategory='cpa_offer'` AND `grossPkrPerCompletion > 0`.
The C-Rank gate in `/api/tasks/:id/verify` only fires for CPA tasks.

## Rank Avatar Bridge
Old avatar system uses Urdu rank keys. New system uses E-S tier strings.
Use `resolveAvatarUrlByTier(savedAvatar, user.userRankTier)` for any v3 component.
Old `resolveAvatarUrl(savedAvatar, user.rank)` still works for backward-compat.

## REFERRAL_FEE_SHARE_PCT = 50 is intentional, not a spec deviation
The spec appendix says 30, but the confirmed real business rule (user-verified) is: withdrawal fee is a flat 15%; of that 15% fee, 50% (default, admin-configurable via system_config) goes to the referrer as a PKR cash bonus, 50% stays as Thorx profit. `calculateWithdrawalBreakdown` in `server/storage.ts` already implements exactly this — do not "fix" this to 30 in a future session.

## Withdrawal amount is denominated in TX-Points end-to-end, not PKR
`POST /api/withdrawals` and `GET /api/withdrawals/preview` both treat `amount`/`points` as a raw count of TX-Points, walked FIFO against `user_transactions.pointsCredited` (never derived via `CONVERSION_RATE`). The real PKR value (`exactPkr`) is summed from the ledger's `realPkrValue` for exactly the rows consumed to cover the requested points — this is the single source of truth per user-confirmed design (TX-Points are a UI illusion; PKR is real). Any withdrawal UI must capture a **points** amount and call `/api/withdrawals/preview` to show the user the real PKR result before they confirm — never let the UI compute PKR client-side from a flat rate.
