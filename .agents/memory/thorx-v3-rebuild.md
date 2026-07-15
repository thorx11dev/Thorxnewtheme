---
name: THORX v3 rebuild
description: Full rank/engine/guild rebuild — phase status, critical decisions, and known constraints.
---

## Phase Status (as of last session)

### Phase 1 (Schema + Modules) — COMPLETE
All new tables and columns exist in `shared/schema.ts`. All five server modules and rankGate middleware exist. Added `task_category` and `gross_pkr_per_completion` columns to `daily_tasks` via executeSql (ALTER TABLE, TTY-safe).

### Phase 2 (Storage: recordEarnEvent, processWithdrawal) — COMPLETE
Engine split math, ThorxCard draw, PS award, streak, GPS for Engine C, and feed event all wired in `server/storage.ts`. FIFO ledger walk for withdrawals. Double-spend bug fixed.

### Phase 3 (Backend Routes) — COMPLETE
All routes implemented. Key fixes applied in this session:
- `POST /api/ad-view` → now calls `recordEarnEvent(Engine_A)`, returns `thorxCard` payload.
- `POST /api/tasks/:id/verify` → C-Rank gate for CPA tasks (`taskCategory==='cpa_offer'`), Engine_B for CPA, Indirect for social. Returns `thorxCard` payload.
- `POST /api/guilds/:id/apply` → coverLetter minimum changed 20→50 chars (spec compliance).
- `GET /api/user` → now returns all v3 fields: `userRankTier, guildRole, guildId, performanceScore, streakDays, balanceCashPkr, txPointsBalance, lastActiveAt`.
- `GET /api/dashboard/stats` → now returns all v3 fields same as above.

### Phase 4/5 (Frontend) — COMPLETE

**New components created:**
- `client/src/components/RankBadge.tsx` — E-S rank badge, used across all leaderboards/profiles
- `client/src/components/ThorxCard.tsx` — Replaces ScratchCardModal; handles Engine_A/B/C payloads
- `client/src/components/PSProgressCard.tsx` — PS progress bar with streak bonus display
- `client/src/components/guild/GuildDiscoveryPanel.tsx` — GPS leaderboard + apply flow for simple users
- `client/src/components/guild/GuildMemberPanel.tsx` — 4-tab member view (progress/tasks/chat/DM)
- `client/src/components/guild/CaptainPortal.tsx` — 5-tab captain view (requests/roster/DM/stats/settings)
- `client/src/components/admin/LiveActivityFeed.tsx` — Real-time engine event feed
- `client/src/components/admin/ThorxCardSandbox.tsx` — Admin simulation tool
- `client/src/components/admin/LedgerValidator.tsx` — Financial ledger integrity checker
- `client/src/components/admin/ReferralAnalytics.tsx` — L1-only referral stats and leaderboard
- `client/src/components/admin/RanksCustomizer.tsx` — PS thresholds, engine splits, card variance, PS awards

**Shims (backward compatibility):**
- `GuildVaultPanel.tsx` → re-exports `GuildMemberPanel` as `GuildVaultPanel`
- `ScratchCardModal.tsx` → bridges old `ScratchCardBreakdown` shape → `ThorxCard` component

**Modified components:**
- `UserPortal.tsx` → 3-context routing: `guildRole === 'captain'` → CaptainPortal, `'member'` → GuildMemberPanel, `'simple'` → GuildDiscoveryPanel
- `TeamPortal.tsx` → added 5 new sections: live-feed, card-sandbox, ledger, ranks, referrals
- `AdminSidebar.tsx` → added 6 new nav entries + `Activity` icon import
- `AdminDashboard.tsx` → Engine Breakdown section (A/B/C cards)
- `GuildManager.tsx` → GPS adjust controls, weekly target override, inactive captain alert banner
- `LeaderboardInsights.tsx` → replaced Urdu rank display with `RankBadge(userRankTier)`, PS raw score column, L1-only referral column
- `UserManager.tsx` → PS adjust button + `TrendingUp` icon + full PS adjust dialog (PATCH `/api/admin/users/:userId/ps`)
- `useAuth.ts` → User interface extended with all v3 fields

**rankAvatars.ts:**
- Added `resolveAvatarUrlByTier(savedAvatar, userRankTier)` bridge function
- Added `getRankDefByTier(userRankTier)` bridge function
- E-S to Urdu key mapping: E→Nawa Aya, D→Chota Don, C→Bawa Ji, B→Haji Sab, A/S→Chacha Supreme

### Phase 6 (Cleanup) — COMPLETE (this session)
- Retired `POST /api/guilds/:id/join`, `/members/:userId/approve`, `/members/:userId/reject` (410 stubs; no client caller remained — `/apply` + `/applications/:id` are canonical).
- Rewrote stale "Guild Vault escrow / rank-multiplier release" and old Urdu rank name copy in `faq-section.tsx` and the embedded FAQ in `UserPortal.tsx` to describe the actual Weekly Bonus Pool + PS-driven E–S rank system; corrected the referral-commission FAQ (was wrongly described as flat 15% to referrer; actual is 50%-of-15%-fee, paid as PKR cash, not TX-Points).
- Fixed dashboard rank badge and profile modal to read `userRankTier` (not the frozen legacy `rank` field) with E–S tier names/PS-based next-rank progress instead of Urdu names + earnings/referral thresholds.
- Fixed `TaskManager.tsx`/`UserManager.tsx` admin UI to display/select E–S tier names.
- **Found and fixed a real bug** (not just cosmetic): `daily_tasks.targetRank` task-visibility gate was compared against the legacy `user.rank` field, which is frozen (its only writer, legacy `checkAndUpdateRank`, is dead code) — so task visibility could never track a user's actual progression. Repointed at `userRankTier`; default target value migrated `"Nawa Aya"` → `"E-Rank"` in schema + `/api/tasks` filter.
- Old `rallying`/rally UI references and `commission_logs` old writes were not found still present — no action needed.

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
