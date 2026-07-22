---
name: Remediation Audit V3 Complete
description: All Sprint 1 + Sprint 2 + selected Sprint 3 items from the 2026-07-22 forensic audit (27 findings) — what was already done vs what was fixed this session.
---

# Remediation Audit V3 — Implementation Status

## Already Fixed Before This Session
- R-01: referralCommissions table (not commissionLogs) in getDashboardStats
- R-08: dailyGoal reads from systemConfig MAX_ADS_PER_DAY
- R-11: broadcastUserUpdated moved outside db.transaction (phantom notifications fixed)
- R-13: Legacy adjust-balance has Zod dualSchema
- R-16: PKT_OFFSET_MS timezone in getDashboardStats
- R-18: bootstrapConfig batch upsert (onConflictDoNothing — already done)
- R-21: parseInt assertion in processWithdrawal

## Fixed This Session (2026-07-22)

### Sprint 1
- R-02: forgot-password returns honest stub with contactEmail: "support@thorx.com"
- R-03: parseFloat(adConfig.reward) → string passthrough into recordEarnEvent; grossPkr type widened to `string | number` in storage.ts
- R-04: GET /api/rank/history now uses requireSessionAuth (not manual getThorxPrincipalId)
- R-05: Ad-view success message changed from "Authentication Successful: X PKR" to "Ad viewed — N TX-Points credited"
- R-06: withdrawalUpdateSchema Zod added to PATCH /api/admin/withdrawals/:id
- R-07: POST /api/admin/weekly-tasks → weeklyTaskCreateSchema + requirePermission("MANAGE_TASKS")
- R-22: Manual if(!firstName||!email…) pre-check removed from /api/register (Zod is sole validator)
- R-27: POST /api/reset-password returns 200 with support guidance instead of 410

### Sprint 2
- R-09: PayoutControl.tsx breakdown uses safe integer arithmetic (round-trip fix, no more float drift)
- R-10: GET /api/stats uses Decimal for totalPaid; comment documents intentional public access
- R-12: UserManager.tsx financial fields use Number().toLocaleString with 2dp instead of parseFloat
- R-14: profit-ledger + profit-summary + founder-withdrawals → requirePermission("VIEW_PROFIT_LEDGER")
- R-15: All 4 engine-a/players routes → requirePermission("MANAGE_ENGINE_CONFIG")
- R-23: /api/contact now uses contactRateLimiter + contactEmailRateLimiter (per-IP + per-email)
- R-24: Audit log action USER_DELETED → USER_DEACTIVATED

### Sprint 3
- R-26: Guild isPublic toggle added to CaptainPortal settings tab (schema + storage + UI)

## Remaining Backlog (Not Yet Implemented)
- R-17: AD_INVENTORY to systemConfig (requires new admin UI routes, ~3h)
- R-19: Harden device fingerprint with server-side IP+UA hash (~3-4h)
- R-20: Stream bulk exports (cursor-based, ~2h)
- R-25: Deprecate getAllUsers(500) in favor of getUsersPaginated everywhere

## Key Patterns
- requirePermission("VIEW_PROFIT_LEDGER"): founder+admin auto-pass; team needs explicit grant
- requirePermission("MANAGE_ENGINE_CONFIG"): same — effectively founder/admin only
- requirePermission("MANAGE_TASKS"): team members with "tasks" section access can use
- contactEmailRateLimiter is already defined in server/middleware/auth-rate-limit.ts; was just not imported in routes.ts
- grossPkr in recordEarnEvent is now `string | number` — Decimal(params.grossPkr) handles both

**Why:** The `commission_logs` table is write-frozen (no callers write to it). All actual referral commissions flow to `referral_commissions`. Reading from commission_logs always returned 0.
