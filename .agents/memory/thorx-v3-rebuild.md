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

## Frontend gaps phase — DONE (2026-07-15)
All spec Part F frontend gaps fixed and typecheck+workflow-verified:
- Invariant 3 (Vault/Locked text) fixed: dashboard card, earnings-breakdown chart label, and Engine C intro copy all renamed to "Guild Weekly Bonus Pool"/"Guild Bonus". Grepped clean afterward.
- F.2 three dashboard card variants built in new `client/src/components/DashboardCards.tsx` (simple/member/captain, driven by `user.guildRole`), replacing the old 4 hardcoded cards in `UserPortal.tsx`.
- F.9 profile modal (`profile-modal.tsx`) updated: now renders `PSProgressCard`, guild name + role line, MVP star badge, and a separate Referral Wallet (`balanceCashPkr`) row with a Withdraw link.
- F.10 Engine B locked-state UI added in `UserPortal.tsx` (below C-Rank shows the exact spec mockup: lock icon, PS-to-unlock text, progress bar, CTA); C-Rank+ still shows the pre-existing "coming soon" placeholder since Engine B's actual CPA-offer browsing UI was never in scope of Part F and is a separate, much larger build (backend CPA task/rank-gate logic already exists in `POST /api/tasks/:id/verify`, just no frontend for it).
- F.11 withdrawal preview: the flow was already inline in `UserPortal.tsx` (not a separate `WithdrawalModal.tsx` file) and already covered most of the spec's content (points requested, exact PKR, fee%, referrer share, S-Rank fast-track). Added the two genuinely missing pieces: a 2-second minimum display timer before the confirm button activates, and a masked payment method line (`JazzCash ●●●● 4567`). Did not extract into a separate file — functional parity mattered more than matching Appendix B's file manifest exactly.
- **Real bug found+fixed independently of the spec**: `CaptainPortal.tsx` and `GuildMemberPanel.tsx` both queried `GET /api/guilds/:id` (which returns `{guild, members}`) but treated the response as the flat guild object (`guild.name`, `guild.captainId`, etc. were all `undefined`). Fixed the queryFn to unwrap `.guild`, and fixed a same-cause `guild.memberCount` (never existed on the schema) fallback to use actual member-array length in both files.

## Remaining gaps (as of 2026-07-15 — after Phase 6 admin completion)
- `scripts/migrate-v3.ts` does not exist. Low risk since this DB was created directly with v3 schema.
- New WebSocket event names from spec H.1 (e.g. `user.ps_updated`, `guild.weekly_points`, `admin.feed_event`) are not yet emitted from server route handlers (realtime.ts infrastructure exists).
- `AdminDashboard.tsx` engine breakdown card is still hardcoded static text (requires new backend analytics endpoint for per-engine revenue data).

## Admin Phase 6 — COMPLETE (2026-07-15)
All admin panel gaps from spec G and H.5 were closed:
- `PayoutControl.tsx`: added SYSTEM LEDGER CALCULATION box + RED ALERT mismatch banner + one-click formatted copy (`accountNumber — accountName — method`). Fires `GET /api/admin/ledger/validate/:userId` when approve/view dialog opens.
- `UserManager.tsx`: added Guild Role (badge), Last Active (red if >48h), and Referral Cash (balanceCashPkr) columns; updated UserProfile interface accordingly. Skeleton cells added for new columns.
- `GuildManager.tsx`: added Replace Captain modal (member dropdown → confirm → `PATCH /api/admin/guilds/:id/captain`); added Bulk Target Assigner section (per-rank E/D/C/B/A/S inputs → `POST /api/admin/guilds/bulk-targets` per rank).
- `SystemSettingsManager.tsx`: added Engine Profit Sliders (ENGINE_A/B/C_THORX_CUT_PCT, ENGINE_C_POOL_PCT as range sliders); added Thorx Card Variance Controls (CARD_MIN/MAX_MULTIPLIER, CARD_ARANK/SRANK_BONUS_PCT + 3 presets).
- `leaderboard_cache` table: added `user_rank_tier` + `guild_role` columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; schema.ts updated; `refreshLeaderboardCache` now selects and inserts both fields from `users`.
- Typecheck: 0 errors after all changes.

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
