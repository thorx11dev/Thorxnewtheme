---
name: Million-Dollar Audit 2026-07-17
description: 28-finding production audit; all Tasks 1–19 + 23 shipped. Tasks 20–22 are enterprise-sprint items deferred intentionally.
---

# Million-Dollar Audit — 2026-07-17

## Report location
`docs/THORX_AUDIT_REPORT_2026-07-17.md` — 28 findings, 3 categories, priority-ordered fix plan for Tasks 1–23.

## SHIPPED — Tasks 1–19 + 23 (all priority levels through MEDIUM)

### Task 1 — completeWeeklyTask Atomic (finding 1-D + 1-E)
New `completeWeeklyTaskAtomic()` wraps duplicate-check + insert + `recordEarnEvent` inside `db.transaction()` with FOR UPDATE lock. Dead `completeWeeklyTask()` removed. `earnRateLimiter` added.

### Task 2 — Remove Rs. from Dashboard Card (findings 1-A, 1-B)
`withdrawalPreview` useQuery removed from DashboardCards. Dead `balanceCashPkr` variable removed. Card shows "Enter Payout to see value".

### Task 3 — React ErrorBoundary (finding 2-H)
`client/src/components/ErrorBoundary.tsx` created. Wraps UserPortal and TeamPortal in App.tsx.

### Task 4 — Float drift in recordEarnEvent (finding 1-F)
All `cardResult.realPkrValue.toFixed(N)` DB writes replaced with `userPkrShareD.toFixed(N)` — Decimal all the way to SQL boundary.

### Task 5 — Withdrawal onSuccess 3 missing invalidations (findings 1-K, 3-A, 3-B)
`queryClient.invalidateQueries` now fires for `["/api/user"]`, `["/api/withdrawals"]`, `["/api/withdrawals/preview"]` on success.

### Task 6 — getUserReferrals() pagination (finding 1-L)
`.limit(100)` added to `getUserReferrals()` query. Comment documents audit finding.

### Task 7 — HilltopAdsPlayer empty state (finding 3-E)
Component no longer returns null on empty networks — loading stops and UI remains in flow.

### Task 8 — Pino logger fully wired (finding 2-I)
All remaining `console.error` in routes.ts (transaction history, export withdrawals) → `logger.error`. Global exception handlers in index.ts also migrated (see Task 23).

### Task 9 — Weekly task rate limiter
`earnRateLimiter` applied to the weekly task complete route (done alongside Task 1).

### Task 10 — Duplicate admin config route removed (finding 2-A)
Second `PATCH /api/admin/config/:key` handler (dead allowlist at line ~3424) removed. Only the first handler with `requirePermission("MANAGE_SYSTEM")` remains.

### Task 11 — Missing DB indexes added (findings 2-D, 2-E, 2-F)
`users_referred_by_idx`, `withdrawals_user_id_status_idx`, `earnings_user_id_type_idx` all confirmed present in schema.ts.

### Task 12 — Withdrawal form Zod validation (finding 1-J)
`paymentDetailsSchema` (z.object) added inline in `handleSubmit` in UserPortal.tsx. Validates name (min 2), number (regex digits/+/-), email (z.string().email()). Toast fires with first error message before any network call.

### Task 13 — Reconciliation parseFloat → Decimal (finding 1-G)
SQL CAST to DECIMAL for PKR aggregations in reconciliation analytics.

### Task 14 — Performance score sort → Decimal (finding 1-H)
Decimal comparison replaces float subtraction in leaderboard sort.

### Task 15 — systemConfig transaction wrapper (finding 1-I)
`db.transaction()` wraps config update calls.

### Task 16 — RiskWatchlistPanel empty state (finding 3-F)
Panel renders a "Signal Accuracy" message instead of returning null when no risk cases exist.

### Task 17 — TeamPortal loading skeleton (finding 3-G)
Skeleton pulse divs replace the animated "SYNCHRONIZING SECURE PROTOCOLS..." text spinner.

### Task 18 — Auth button Loader2 spinner (finding 3-H)
Both Register ("PROCESSING...") and Login ("LOGGING IN...") submit buttons now show `<Loader2 className="animate-spin" />` icon during submission. `Loader2` added to lucide-react import.

### Task 19 — LeaderboardInsights mobile overflow (finding 3-C)
`overflow-x-auto` wrapper confirmed on table in LeaderboardInsights.tsx.

### Task 23 — Global exception handler graceful shutdown (finding 2-B)
`unhandledRejection` → `logger.error`. `uncaughtException` → `logger.fatal` + `process.exit(1)`. Import added to index.ts. `authRateLimiter` also added to the dead `/api/reset-password` route (finding 2-C).

---

## DEFERRED — Enterprise Sprint (Tasks 20–22)

These were always labeled "enterprise sprint" in the original audit — not bugs, but infrastructure investments:

| Task | Finding | What |
|------|---------|------|
| 20 | 1-C | `/api/user` — refactor to `requireSessionAuthOrAnon` middleware (currently works via ad-hoc handler check) |
| 21 | 2-J | Sentry / error tracking integration |
| 22 | 2-K | Drizzle migration files (currently push-only) |
