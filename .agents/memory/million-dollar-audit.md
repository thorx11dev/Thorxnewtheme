---
name: Million-Dollar Audit 2026-07-17
description: 28-finding production audit; 4 critical tasks shipped same day. Full report at docs/THORX_AUDIT_REPORT_2026-07-17.md.
---

# Million-Dollar Audit — 2026-07-17

## Report location
`docs/THORX_AUDIT_REPORT_2026-07-17.md` — 28 findings, 3 categories, priority-ordered fix plan for Tasks 1–23.

## Critical tasks shipped (2026-07-17)

### Task 1 — completeWeeklyTask Atomic (finding 1-D)
**What:** The weekly task completion route called `prepareWeeklyTaskCompletion()` + `recordEarnEvent()` as two separate unguarded DB calls. Concurrent requests could both pass the duplicate check and double-award points. No rollback if second call failed.
**Fix:** New `completeWeeklyTaskAtomic()` in storage wraps duplicate-check + record insert + `recordEarnEvent` inside a single `db.transaction()` with a `FOR UPDATE` lock on the user row. Dead `completeWeeklyTask()` (which did a direct `txPointsBalance` update bypassing `recordEarnEvent`) removed. Route updated to call new method. `earnRateLimiter` added (finding 1-E).
**Why:** FOR UPDATE lock serialises concurrent requests — second request blocks until first commits, then sees the inserted record and throws "Task already completed."

### Task 2 — Remove Rs. from Dashboard Card (finding 1-A, 1-B)
**What:** "WITHDRAWAL VALUE" dashboard card showed real PKR Rs. amounts via `withdrawalPreview` query. Also had dead `balanceCashPkr` variable via `(user as any)` cast.
**Fix:** Removed `withdrawalPreview` useQuery from DashboardCards entirely. Card now shows static "—" / "Enter Payout to see value". Removed `balanceCashPkr` dead variable.
**Why:** PKR values must only appear inside the Conversion Room / payout flow — never on the homepage dashboard.

### Task 3 — React ErrorBoundary (finding 2-H)
**What:** Zero ErrorBoundary existed in the app — any runtime error white-screened the entire application.
**Fix:** Created `client/src/components/ErrorBoundary.tsx` (class component with getDerivedStateFromError + recovery UI). Wrapped `UserPortal` and `TeamPortal` in `App.tsx` with scope-labelled boundaries.

### Task 4 — Float drift fix in recordEarnEvent (finding 1-F)
**What:** `userPkrShareD.toNumber()` converted Decimal to float before writing to DB via `cardResult.realPkrValue`. IEEE 754 drift accumulates across thousands of earn events.
**Fix:** Replaced all `cardResult.realPkrValue.toFixed(N)` DB writes with `userPkrShareD.toFixed(N)` directly — stays Decimal all the way to the SQL boundary. Applies to: `user_transactions.real_pkr_value`, `users.totalEarnings`, `earnings.amount`.

## Remaining tasks (next sprints)
Tasks 5–23 documented in `docs/THORX_AUDIT_REPORT_2026-07-17.md` under MASTER FIX PLAN.
Priority HIGH next: Tasks 5 (withdrawal cache invalidation), 6 (referrals pagination), 7 (HilltopAdsPlayer empty state), 8 (pino wiring), 10 (duplicate admin config route), 11 (missing DB indexes).
