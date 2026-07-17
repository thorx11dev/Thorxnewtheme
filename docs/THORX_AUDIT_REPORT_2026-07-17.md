# THORX — MILLION-DOLLAR PRODUCT AUDIT REPORT
**Date:** 2026-07-17
**Scope:** Full codebase — server/routes.ts (4681 lines), server/storage.ts (5244 lines), shared/schema.ts (1401 lines), all frontend components
**Standard:** World-class, financial-integrity-first, zero-bug production quality
**Auditor:** Automated deep scan (routes, storage, schema, frontend, infra)

---

## CATEGORY 1 — Mistakes, Bugs & Gaps

---

### 1.1 — Points-Only Illusion Violations (PKR Leakage)

**Finding 1-A — DashboardCards Shows Rs. Amounts on Main Dashboard** `CRITICAL`
- **File:** `client/src/components/DashboardCards.tsx` lines 131, 136
- **Code:**
  ```tsx
  withdrawalPreview ? `Rs. ${withdrawalPreview.exactPkr.toFixed(2)}` : "—"
  withdrawalPreview ? `After fee: Rs. ${withdrawalPreview.userNetPkr.toFixed(2)}` : "Earn points to see value"
  ```
- **Issue:** The "WITHDRAWAL VALUE" dashboard card — visible to every logged-in user the moment they open the portal — displays real Rs. PKR values fetched from `/api/withdrawals/preview`. A user who has never touched the withdrawal screen sees their exact PKR wallet value on the homepage. The spec mandates PKR appears only inside the Conversion Room / withdrawal flow.
- **Fix:** Replace card content with "Enter Payout to see value". Remove the `withdrawalPreview` query from DashboardCards entirely.

---

**Finding 1-B — `balanceCashPkr` Read via `any` Cast in DashboardCards** `HIGH`
- **File:** `client/src/components/DashboardCards.tsx` line 70
- **Code:** `const balanceCashPkr = parseFloat((user as any)?.balanceCashPkr ?? "0");`
- **Issue:** The TypeScript interface was hardened to remove `balanceCashPkr`, but this component bypasses it with an `(user as any)` cast. The dead variable persists in the file — if the server ever sends the field, TypeScript will not catch it. The variable declaration itself is confusing to future maintainers.
- **Fix:** Remove the dead variable and any downstream usage.

---

**Finding 1-C — `/api/user` Response Lacks `requireSessionAuth` Middleware** `HIGH`
- **File:** `server/routes.ts` line 525
- **Comment in code:** `// Get current user endpoint (no auth required)`
- **Issue:** This is the primary endpoint powering the entire frontend's auth state. It uses a manual `getThorxPrincipalId(req)` check inside the handler rather than the `requireSessionAuth` middleware. This means: (1) the route appears unprotected in any automated security scan, (2) there is no consistent middleware audit trail, (3) anonymous/iframe session handling is implemented ad-hoc with no shared contract. The response at lines 627–653 is an explicit object and correctly excludes `balanceCashPkr` — but the pattern is architecturally wrong.
- **Fix:** Refactor to use a `requireSessionAuthOrAnon` middleware that handles both authenticated and anonymous iframe sessions cleanly.

---

### 1.2 — Race Conditions

**Finding 1-D — `prepareWeeklyTaskCompletion()` Has No Transaction — Double-Point Race** `CRITICAL`
- **File:** `server/storage.ts` lines 5011–5023 (storage function) + `server/routes.ts` lines 1132–1143 (route calling it separately)
- **Issue:** The weekly task completion is split across two separate, non-atomic DB calls:
  1. `prepareWeeklyTaskCompletion()` — checks duplicate, inserts `weeklyTaskRecord`
  2. `recordEarnEvent()` — awards points, updates balance
  
  These two calls have no shared `db.transaction()` wrapper. Two concurrent HTTP requests (double-tap, network retry, two tabs) can both pass the "already completed?" check before either INSERT commits → two `weeklyTaskRecord` rows + two point awards. Additionally, if `recordEarnEvent` throws after `prepareWeeklyTaskCompletion` succeeds, the task is marked done but the user never receives points (orphaned state, no rollback).
- **Also:** The dead function `completeWeeklyTask()` at line 4361 still does a direct `txPointsBalance` update bypassing `recordEarnEvent` entirely — this is inconsistent with the transaction ledger.
- **Severity:** CRITICAL — direct financial double-spend + orphan state

---

**Finding 1-E — Weekly Task Complete Route Has No Rate Limiter** `HIGH`
- **File:** `server/routes.ts` line 1120
- **Issue:** Route has `requireSessionAuth` but no rate limiter. Every failed duplicate attempt still hits the DB (2 SELECTs + failed INSERT), enabling DB amplification from one authenticated user.

---

### 1.3 — Floating-Point Precision Drift

**Finding 1-F — `recordEarnEvent()` Converts `userPkrShareD` to Float Before Card Computation** `HIGH`
- **File:** `server/storage.ts` line 984
- **Code:** `const userPkrShare = userPkrShareD.toNumber();`
- **Issue:** `userPkrShareD` is correctly computed as Decimal, but immediately converted to native JS float. This float is passed to `drawThorxCard()` which computes `cardResult.realPkrValue`. That value is then written to `user_transactions.real_pkr_value` (the immutable ledger basis for all withdrawal math). For sub-paisa amounts (e.g. Rs. 0.000333...), IEEE 754 representation introduces drift compounding across thousands of earn events.
- **Fix:** Compute `realPkrValue` from `userPkrShareD` (Decimal) * `cardVariance` directly. Only call `.toFixed(4)` at the SQL boundary.

---

**Finding 1-G — `parseFloat` in Founder Reconciliation Analytics** `MEDIUM`
- **File:** `server/storage.ts` lines 3510–3513, 3644
- **Code:**
  ```typescript
  const totalIn  = parseFloat(totalProfitRow?.total ?? '0');
  const monthIn  = parseFloat(monthProfitRow?.total ?? '0');
  const totalOut = parseFloat(totalOutRow?.total ?? '0');
  const pendingTotal = pendingRows.reduce((s, w) => s + parseFloat(w.amount), 0);
  ```
- **Issue:** Native `parseFloat` for PKR aggregations. Display-only today (confirmed), but float drift at Rs. 10,000+ platform volume can cause visible rounding discrepancies in the founder panel.

---

**Finding 1-H — `parseFloat` on Performance Score Sort** `MEDIUM`
- **File:** `server/storage.ts` line 3091
- **Code:** `scoredUsers.sort((a, b) => parseFloat(b.performanceScore) - parseFloat(a.performanceScore));`
- **Issue:** Float subtraction for sorting. For scores like "99.999" vs "99.998", float precision below 1e-12 can produce 0 subtraction → unstable sort → incorrect leaderboard rankings.

---

### 1.4 — Missing Database Transactions

**Finding 1-I — `systemConfig` Update Outside Transaction** `MEDIUM`
- **File:** `server/storage.ts` line 638
- **Issue:** System config updates (e.g. changing CONVERSION_RATE + ENGINE_C_USER_CUT_PCT together) are single-row UPDATE calls outside any transaction. A crash between two config changes leaves the platform in an inconsistent configuration state.

---

### 1.5 — Missing Client-Side Validation

**Finding 1-J — Withdrawal Payment Details Have No Schema Validation** `MEDIUM`
- **File:** `client/src/pages/UserPortal.tsx` lines 2560–2590
- **Issue:** Payment details (`name`, `number`, `email`, `iban`) use only manual string existence checks before API call. No Zod, no format validation, no IBAN format check. Users get server-side errors after a full network round trip instead of immediate inline hints.

---

### 1.6 — Stale Query Invalidations

**Finding 1-K — Withdrawal `onSuccess` Misses 3 Critical Cache Invalidations** `HIGH`
- **File:** `client/src/pages/UserPortal.tsx` line 2598
- **Code:** `queryClient.invalidateQueries({ queryKey: ["earnings"] });`
- **Missing:**
  1. `["/api/user"]` — TX-Points balance in header stays unchanged after withdrawal
  2. `["/api/withdrawals"]` — history tab shows no new pending entry
  3. `["/api/withdrawals/preview"]` — preview card shows old available balance
- **Issue:** User sees their point balance unchanged after a withdrawal submission → thinks it failed → re-submits.

---

### 1.7 — Unbounded Queries

**Finding 1-L — `getUserReferrals()` Has No LIMIT Clause** `HIGH`
- **File:** `server/storage.ts` line 1177
- **Issue:** No `.limit()`. A power user with 5,000+ referrals loads a full JOIN across two tables entirely into Node.js heap memory on every portal load of the referrals tab.

---

## CATEGORY 2 — Million-Dollar Company Standards Gaps

---

### 2.1 — Security & Authentication

**Finding 2-A — Duplicate `PATCH /api/admin/config/:key` Route** `HIGH`
- **File:** `server/routes.ts` lines 418 AND 3424
- **Issue:** Two separate handlers for the same path. Line 418 uses `requirePermission("MANAGE_SYSTEM")`, line 3424 uses `requireTeamRole` with an `allowedKeys` whitelist. Express matches only the first one — the second with the safety allowlist is dead code. A developer reading route 3424 believes the allowlist is enforced when it is not.

---

**Finding 2-B — Global Exception Handlers Use `console.error`, Not Pino** `HIGH`
- **File:** `server/index.ts` lines 21–26
- **Issue:** `unhandledRejection` and `uncaughtException` write plain text to stderr with no structured fields, no redaction, no alerting. A payment processing crash at 3 AM produces a raw stack trace with no structured log. Neither handler triggers graceful restart — Node.js continues accepting requests in an undefined state after an `uncaughtException`.

---

**Finding 2-C — `POST /api/reset-password` Has No Rate Limiter** `LOW`
- **File:** `server/routes.ts` line 2910
- **Issue:** Returns 410 Gone but carries no `authRateLimiter`. Bots can probe indefinitely.

---

### 2.2 — Missing Database Indexes

**Finding 2-D — No Index on `users.referred_by`** `HIGH`
- **File:** `shared/schema.ts` line 31
- **Issue:** Column is used in every referral commission lookup, referral count query, and inactivity penalty scan. No index → full `users` table scan on every referral-related operation.

**Finding 2-E — No Composite Index on `withdrawals(user_id, status)`** `MEDIUM`
- **File:** `shared/schema.ts` lines 257–260
- **Issue:** Separate single-column indexes exist but no composite. The "pending withdrawal?" check inside `createWithdrawal()`'s FOR UPDATE transaction intersects two scans instead of one, holding the lock longer than necessary.

**Finding 2-F — No Composite Index on `earnings(user_id, type)`** `MEDIUM`
- **File:** `shared/schema.ts` lines 168–171
- **Issue:** Leaderboard analytics filtering by `userId + type` cannot use a single efficient composite scan.

---

### 2.3 — Scale Bottlenecks

**Finding 2-G — `getUserReferrals()` Memory Bomb** *(see Finding 1-L)*

---

### 2.4 — Missing Enterprise Layers

**Finding 2-H — No React ErrorBoundary — Full App White-Screen on Any Crash** `CRITICAL`
- **File:** `client/src/App.tsx` (confirmed: zero ErrorBoundary components exist)
- **Issue:** Any runtime error in any component (null dereference, malformed API response, third-party lib crash) white-screens the entire application. Users see a blank page with no recovery UI. This is confirmed across the entire `client/src/` directory.

**Finding 2-I — Pino Logger Not Wired Into Financial Routes** `HIGH`
- **File:** `server/lib/logger.ts` (exists), `server/routes.ts`, `server/storage.ts`
- **Issue:** `pino` is installed and configured with redaction, but every financial error in `routes.ts` and `storage.ts` still uses `console.error()`. The logger is effectively a dead file.

**Finding 2-J — No Sentry / Error Tracking** `HIGH`
- **Issue:** No `@sentry/node`. A payment processing failure is invisible until a user reports it.

**Finding 2-K — Push-Based DB — No Migration Rollback** `HIGH`
- **Issue:** `drizzle-kit push --force` only. No `drizzle/` migration folder. A bad schema change in production cannot be rolled back without manual SQL and potential data loss.

---

## CATEGORY 3 — Ecosystem Disconnection & UX Friction

---

### 3.1 — Ecosystem Disconnection

**Finding 3-A — Withdrawal History Doesn't Refresh After Submission** `HIGH`
- **Issue:** After withdrawal submit, history tab is not invalidated → user sees no record of their submission → double-submit risk. (Same root as Finding 1-K.)

**Finding 3-B — TX-Points Balance in Header Stale After Withdrawal** `HIGH`
- **Issue:** `["/api/user"]` not invalidated after withdrawal → header shows unchanged balance → user thinks submission failed. (Same root as Finding 1-K.)

---

### 3.2 — Mobile Responsiveness

**Finding 3-C — LeaderboardInsights Table Overflow on Mobile** `MEDIUM`
- **File:** `client/src/components/admin/LeaderboardInsights.tsx`
- **Issue:** Multi-column leaderboard table lacks `overflow-x-auto` wrapper — forces full-page horizontal scroll on mobile rather than table-internal scroll.

**Finding 3-D — TeamPortal AdminLayout Mobile Not Audited** `MEDIUM`
- **File:** `client/src/components/admin/AdminLayout.tsx`
- **Issue:** Sidebar navigation pattern not verified for mobile breakpoints — may overlap content or force horizontal scroll on screens < 768px.

---

### 3.3 — UX Polish & Empty States

**Finding 3-E — `HilltopAdsPlayer` Returns `null` on Empty Networks** `HIGH`
- **File:** `client/src/components/ads/HilltopAdsPlayer.tsx` line 38
- **Issue:** When no ad networks are active, the entire earning widget silently disappears. Users see a blank gap and think the feature is broken. No empty state UI exists.

**Finding 3-F — `RiskWatchlistPanel` Returns `null` on Empty Data** `MEDIUM`
- **File:** `client/src/components/admin/RiskWatchlistPanel.tsx` line 619
- **Code:** `if (!stats.length) return null;`
- **Issue:** A clean platform (no risk cases) silently removes the entire admin panel section. Admins cannot distinguish between "no cases" and "panel failed to load."

**Finding 3-G — TeamPortal Uses Text Spinner, Not Skeleton** `MEDIUM`
- **File:** `client/src/pages/TeamPortal.tsx` lines 49–52
- **Issue:** Loading state shows animated text "SYNCHRONIZING SECURE PROTOCOLS...". World-class admin products show skeleton layouts matching the content shape.

**Finding 3-H — Auth Button Shows "PROCESSING..." Text** `LOW`
- **File:** `client/src/pages/auth.tsx` line 1157
- **Issue:** `{isSubmitting ? "PROCESSING..." : "Enter"}` — should use a spinner icon (`<Loader2 className="animate-spin" />`).

---

## SUMMARY TABLE

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| 1-A | Dashboard card shows Rs. PKR on homepage | **CRITICAL** | PKR Leak |
| 1-B | `balanceCashPkr` read via `any` cast (dead code) | HIGH | PKR Leak |
| 1-C | `/api/user` lacks `requireSessionAuth` middleware | HIGH | Security |
| 1-D | `prepareWeeklyTaskCompletion` race — no tx, double-point | **CRITICAL** | Race Condition |
| 1-E | Weekly task route — no rate limiter | HIGH | Security |
| 1-F | `recordEarnEvent` — `userPkrShareD.toNumber()` float drift | HIGH | Float Precision |
| 1-G | Reconciliation analytics — `parseFloat` PKR aggregation | MEDIUM | Float Precision |
| 1-H | Leaderboard sort — float subtraction instability | MEDIUM | Float Precision |
| 1-I | `systemConfig` update outside transaction | MEDIUM | Missing TX |
| 1-J | Withdrawal form — no Zod on payment details | MEDIUM | Validation |
| 1-K | Withdrawal `onSuccess` — 3 missing query invalidations | HIGH | Stale Data |
| 1-L | `getUserReferrals()` — no LIMIT clause | HIGH | Scale |
| 2-A | Duplicate `PATCH /api/admin/config/:key` (dead allowlist) | HIGH | Security |
| 2-B | Global exception handlers — `console.error` not pino | HIGH | Logging |
| 2-C | `POST /api/reset-password` — no rate limiter | LOW | Security |
| 2-D | Missing index on `users.referred_by` | HIGH | Performance |
| 2-E | Missing composite index `withdrawals(user_id, status)` | MEDIUM | Performance |
| 2-F | Missing composite index `earnings(user_id, type)` | MEDIUM | Performance |
| 2-H | No React ErrorBoundary — app white-screens on any crash | **CRITICAL** | Enterprise |
| 2-I | Pino logger not wired into financial routes | HIGH | Logging |
| 2-J | No Sentry / error tracking | HIGH | Enterprise |
| 2-K | Push-based DB — no migration rollback strategy | HIGH | Enterprise |
| 3-A | Withdrawal history tab stale after submission | HIGH | Ecosystem |
| 3-B | TX-Points balance header stale after withdrawal | HIGH | Ecosystem |
| 3-C | LeaderboardInsights table overflow on mobile | MEDIUM | Mobile |
| 3-D | TeamPortal AdminLayout mobile not audited | MEDIUM | Mobile |
| 3-E | HilltopAdsPlayer returns null — blank hole in UI | HIGH | UX |
| 3-F | RiskWatchlistPanel returns null — blank admin section | MEDIUM | UX |
| 3-G | TeamPortal text spinner not skeleton | MEDIUM | UX |
| 3-H | Auth button "PROCESSING..." text | LOW | UX |

**CRITICAL: 3 | HIGH: 15 | MEDIUM: 9 | LOW: 2**

---

# MASTER FIX PLAN

---

## PRIORITY ORDER

```
CRITICAL — Must ship before any user touches money
  Task 1: completeWeeklyTask Atomic Transaction (Finding 1-D)
  Task 2: Remove Rs. from Dashboard Card (Finding 1-A)
  Task 3: Add React ErrorBoundary (Finding 2-H)

HIGH — Ship before scaling
  Task 4: recordEarnEvent Float Drift Fix (Finding 1-F)
  Task 5: Withdrawal onSuccess 3 Missing Invalidations (Finding 1-K, 3-A, 3-B)
  Task 6: getUserReferrals() Pagination (Finding 1-L)
  Task 7: HilltopAdsPlayer Empty State (Finding 3-E)
  Task 8: Wire Pino Logger into Financial Routes (Finding 2-I)
  Task 9: Weekly Task Rate Limiter (Finding 1-E)
  Task 10: Dead Duplicate Admin Config Route (Finding 2-A)
  Task 11: Add Missing DB Indexes (Findings 2-D, 2-E, 2-F)

MEDIUM — Polish sprint
  Task 12: Withdrawal Form Zod Validation (Finding 1-J)
  Task 13: Reconciliation parseFloat → Decimal (Finding 1-G)
  Task 14: Performance Score Sort → Decimal (Finding 1-H)
  Task 15: systemConfig Transaction Wrapper (Finding 1-I)
  Task 16: RiskWatchlistPanel Empty State (Finding 3-F)
  Task 17: TeamPortal Loading Skeleton (Finding 3-G)
  Task 18: Auth Button Spinner (Finding 3-H)
  Task 19: LeaderboardInsights Mobile Overflow (Finding 3-C)
  Task 20: /api/user Auth Middleware Refactor (Finding 1-C)

ENTERPRISE — Infra sprint
  Task 21: Sentry Integration (Finding 2-J)
  Task 22: Drizzle Migration Files (Finding 2-K)
  Task 23: Global Exception Handler Graceful Shutdown (Finding 2-B)
```

---

## TASK 1 — Fix `completeWeeklyTask` Race Condition (Atomic Transaction)
**Findings:** 1-D, 1-E | **Business Decision Q3:** All points through `recordEarnEvent`

Create `completeWeeklyTaskAtomic()` in storage that wraps the record insert + `recordEarnEvent` in a single `db.transaction()` with a `FOR UPDATE` lock on the user row. Remove the dead `completeWeeklyTask()` function. Update the route to call the new atomic method + add `earnRateLimiter`.

```typescript
async completeWeeklyTaskAtomic(userId, guildId, taskId) {
  return await db.transaction(async (tx) => {
    // Lock user row — prevents concurrent completions from racing
    const [lockedUser] = await tx.select({ id: users.id })
      .from(users).where(eq(users.id, userId)).for('update');
    if (!lockedUser) throw new Error("User not found");

    const [task] = await tx.select().from(weeklyTasks).where(eq(weeklyTasks.id, taskId));
    if (!task || !task.isActive) throw new Error("Task not found or inactive.");

    const now = new Date();
    if (now < task.weekStart || now > task.weekEnd) throw new Error("Task not available this week.");

    // Duplicate check INSIDE the lock — both concurrent requests can no longer pass this
    const [existing] = await tx.select({ id: weeklyTaskRecords.id })
      .from(weeklyTaskRecords)
      .where(and(eq(weeklyTaskRecords.userId, userId), eq(weeklyTaskRecords.taskId, taskId)))
      .limit(1);
    if (existing) throw new Error("Task already completed.");

    const [record] = await tx.insert(weeklyTaskRecords).values({ userId, guildId, taskId }).returning();

    // Route ALL points through recordEarnEvent — Q3 decision
    const grossPkr = task.taskCategory === 'indirect' ? 0
      : new Decimal(task.grossPkrPerCompletion ?? "0").toNumber();
    const engineType = grossPkr > 0 ? "Engine_C" : "Indirect";
    const earnResult = await this.recordEarnEvent({ userId, engineType, grossPkr,
      sourceId: record.id, sourceType: 'weekly_task', guildId, tx });

    return { record, task, earnResult };
  });
}
```

---

## TASK 2 — Remove Rs. from Main Dashboard Card
**Finding:** 1-A | **Business Decision Q1:** "Enter Payout to see value"

In `DashboardCards.tsx`:
- Remove `const balanceCashPkr = ...` dead variable
- Remove the `withdrawalPreview` useQuery (no longer needed on dashboard)
- Change the "WITHDRAWAL VALUE" card to show static "Enter Payout to see value" text
- Rename card label to "PAYOUT VALUE" or keep "WITHDRAWAL VALUE"

```tsx
<CardShell testId="card-withdrawal-value">
  <CardHead icon={Wallet} label="WITHDRAWAL VALUE" />
  <p className="text-2xl md:text-3xl font-black text-foreground mb-1">—</p>
  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
    Enter Payout to see value
  </p>
</CardShell>
```

---

## TASK 3 — Add React ErrorBoundary
**Finding:** 2-H | **Impact:** 100% of users protected from white-screen crashes

Create `client/src/components/ErrorBoundary.tsx` as a class component with `getDerivedStateFromError`, wrap `UserPortal` and `TeamPortal` (and their `ProtectedRoute` wrappers) in `App.tsx`.

---

## TASKS 4–23 — (Detailed in subsequent sprints)

See priority order above. Each task maps directly to a finding ID above.

---

## BUSINESS LOGIC DECISIONS (Recorded)

| Q | Decision |
|---|---------|
| Q1 | Remove Rs. from dashboard card entirely. Show "Enter Payout to see value". PKR visible only in payout flow. |
| Q2 | Implement `requireSessionAuth` middleware on `/api/user`. Handle iframe anonymous sessions via middleware, not ad-hoc handler code. |
| Q3 | `completeWeeklyTask` must NOT update points directly. All point increments through `recordEarnEvent` for clean transaction ledger. |
| Q4 | Reconciliation `parseFloat` is display-only (no automated triggers). Clean up to Decimal for correctness, medium priority. |
