---
name: Remediation Plan V3 Complete
description: All 16 remaining TODO items from the 2026-07-22 forensic audit remediation plan — implemented and tsc-clean.
---

# Remediation Plan V3 — All Items Complete (2026-07-22)

## Phase 1 — Critical fixes implemented
- **1.1d** `gps-engine.ts`: GPS award uses `Decimal.times().div().toDecimalPlaces(0, ROUND_FLOOR)` — no float drift.
- **1.2a** `createReferralCashWithdrawal`: `.for("update")` on user SELECT inside `db.transaction()` — prevents overdraw race.
- **1.2c** `checkAndUpdateRankTier`: `.for("update")` when `tx` provided — prevents double rank-promotion.
- **1.2d** `checkAndUpdateGuildRankTier`: `.for("update")` when `tx` provided — prevents double guild rank-log.
- **1.3a** `updateUserEarnings`: Optional `tx?: any` param; callers in transactions can thread through.

## Phase 2 — Performance / indexes
- **2.2** Four composite indexes added + pushed: `audit_logs_target_user_created_idx`, `risk_cases_user_id_status_idx`, `score_history_user_recorded_idx`, `guild_members_guild_id_status_idx`.
- **2.3f** 11 sequential `await cfg()` replaced with single `Promise.all` batch via `fetchGpsConfig()` in gps-engine.

## Phase 3 — UX
- **3.1** Z-index token system in `tailwind.config.ts` (8 layers). toast→z-toast(400), goal-modal→z-goal(600), profile-modal→z-profile(700), ad-panel→z-ad(500). Toasts now surface above full-screen modals.
- **3.2** `broadcastLeaderboardRefreshed()` + `broadcastGuildTargetUpdated()` added to `realtime.ts`. Leaderboard job emits after each write. Admin weekly-target endpoint emits on change. `useRealtimeSync.ts` handles both new event types.
- **3.3** `GuildManager.tsx`: Spinner replaced with 3-card skeleton placeholder.

## Phase 4 — Observability
- **4.3** `debug-log.ts` redirected to pino (`debugLog`→`logger.debug`, `errorLog`→`logger.error`) — unified logging without touching 20 call-sites.
- **4.4** `GET /api/health` includes `jobs.leaderboardRefresh` liveness block (lastRunMs, staleSinceMs, healthy). Returns 503 when job exceeds 2× interval.

## Key decisions
- **Why FOR UPDATE only when tx provided**: row locks require an open transaction; the guard ensures the lock is applied only when it matters.
- **Why Promise.all for cfg batch**: each `getSystemConfigValue()` is a DB round-trip; batching cuts 11 sequential waits to 1 concurrent wait.
- **Why debug-log shim not mass-replace**: 20 call-sites; shim achieves unified logging with minimal diff risk.
