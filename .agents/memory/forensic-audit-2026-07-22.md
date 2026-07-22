---
name: Forensic Audit 2026-07-22 — Remediation Status
description: Complete findings from the million-dollar forensic audit (AUDIT_REPORT_(2)) and what was already fixed vs. what needed remediation on 2026-07-22.
---

## Audit vs. Reality — What Was Already Fixed

Nearly every finding in the new audit report was already remediated by prior sprints:

- **Float math (1-A)**: All earn paths use Decimal; routes.ts earn engine uses `new Decimal(grossPkrPerCompletion)`. ✅
- **FOR UPDATE row locks (1-C)**: createReferralCashWithdrawal, createWithdrawal, checkAndUpdateRankTier, checkAndUpdateGuildRankTier all have FOR UPDATE. ✅
- **Non-transactional mutations (1-B)**: updateUserEarnings accepts optional `tx`; awardTaskPS/processStreak thread tx. ✅
- **Zod on all routes (2-B)**: system-config, rank, trust-status, POST/PATCH team/members, guild applications — all have Zod. ✅
- **MANAGE_SYSTEM permission + rate limiter (2-A/2-C)**: system-config uses requirePermission("MANAGE_SYSTEM") + adminActionRateLimiter. ✅
- **Double-submit (1-E)**: Covered by unique constraint `uniq_withdrawals_one_pending_per_user` + FOR UPDATE in createWithdrawal. ✅
- **DB indexes (2-D)**: withdrawals_status_idx, withdrawals_user_id_status_idx, withdrawals_created_at_idx, audit_logs_target_user_created_idx, risk_cases_user_id_status_idx, score_history_user_recorded_idx — all present. ✅
- **Skeleton loaders (3-D)**: FounderProfitCard, GuildManager, LeaderboardInsights, DashboardCards — all have Skeleton. ✅
- **Toast on silent mutations (3-E)**: Guild join, nudge, weekly target, AdminInbox, RanksCustomizer, ThorxCardSandbox — all have toasts. ✅
- **Mobile responsive (3-B)**: UserPortal containers have px-4, RiskWatchlistPanel and PayoutControl have overflow-x-auto. ✅
- **getAllUsers capped (2-E)**: Default 100, max 200 enforced. ✅
- **GPS cfg batch (2-E)**: All 11 cfg() calls replaced with single Promise.all. ✅
- **WebSocket events (3-F)**: guild.target_updated, leaderboard.refreshed both implemented. ✅
- **Z-index token system (3-C)**: Canonical tokens in tailwind.config.ts; all modals use them (z-goal, z-profile, z-toast, etc.). ✅
- **debug-log.ts (4.3)**: Is already a pino shim — all debugLog calls forward to logger.debug. ✅

## What Was Fixed in This Session (2026-07-22)

1. **thorx-card.ts** — Kept Decimal chain through targetPoints/pointsCredited; `.toNumber()` only at final integer step.
2. **storage.ts Engine_C SQL bind** — Changed `.toNumber()` to `.toString()` for `currentWeeklyPoints` guild update.
3. **schema.ts** — Added `task_records_user_id_status_idx` composite index; pushed to DB (`drizzle-kit push --force`).
4. **storage.ts getExtendedMetrics** — Capped unbounded pending withdrawals query at 1000 rows.
5. **daily-goal-modal.tsx** — Added `isGoLoading`/`isVerifyLoading` props to AccordionTask sub-component; Go/Verify buttons now disabled + show loading text during mutation.

## Open Questions Answered (per audit Q1-Q5)

- **Q1**: `totalEarnings` stores PKR (not TX-Points). Frontend multiplies by CONVERSION_RATE=100 for display. The rank thresholds in rank-badge.tsx are in TX-Points; the earn path sends `txPointsReward` for display. Task 2.1 (display rename) is deferred — would require renaming DB fields and updating all callers; risk outweighs benefit given existing working display logic.
- **Q2**: Referral balance shown as raw PKR in referral withdrawal panel is intentional by design.
- **Q3**: No 30s window needed — already covered by unique constraint + FOR UPDATE.
- **Q4**: GPS uses `new Decimal(memberPointsEarned)` — already Decimal.
- **Q5**: 5-minute cron is the accepted approach (implemented and running).

## Remaining Low-Priority Items (Phase 4)

- **SENTRY_DSN** not set → error tracking inactive (needs env secret from user)
- **CREDENTIAL_ENCRYPTION_KEY** not set → falls back to dev key (needs env secret from user)
- **Migration rollback snapshots** (4.5) — no automated snapshot before push; manual procedure in replit.md
- **Task 2.1 (TX-Points/PKR display rename)** — deferred; Q1 answered but implementation is a breaking change

**Why:** These all require user action (setting secrets) or carry breaking-change risk; they do not affect current functionality.
