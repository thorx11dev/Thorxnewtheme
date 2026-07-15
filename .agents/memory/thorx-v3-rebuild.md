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

### Phase 6 (Cleanup) — NOT STARTED
- Old `rallying`/rally references may still exist in some UI strings
- `commission_logs` L2 writes: write-frozen but old writes may exist
- Urdu rank strings in misc. hardcoded places (banner texts, descriptions)

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
