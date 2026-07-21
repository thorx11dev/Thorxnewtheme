# THORX — Master Remediation Plan
**Based on:** AUDIT_REPORT.md (2026-07-21)  
**Execution Rule:** Do NOT begin implementation until business-logic questions (Q1–Q5 in audit report) are answered. Fix sequence is ordered by risk: financial integrity first, security second, performance third, UX polish last.

---

## PHASE 0 — Clarify Before Touching a Single Line of Code

Answer the 5 open questions in `AUDIT_REPORT.md` (Q1–Q5). The answers determine:
- Whether the withdrawal modal PKR display is a bug or intentional (C1-01 scope)
- Whether referral commissions need the points-only treatment (Q3)
- The correct permission level for the user-action route (C2-03)
- Whether `balanceCashPkr` arithmetic must be fully Decimal (Q4)

**No code changes until these are answered.**

---

## PHASE 1 — Critical Financial Integrity (Do First)

### Task 1.1 · Fix `processWithdrawal` Native Arithmetic on Live Cash Balance
**Finding:** C1-04, Q4  
**Files:** `server/storage.ts` (~lines 2077–2118), `server/storage.ts` `calculateWithdrawalBreakdown` (~lines 1887–1948)

**Steps:**
1. In `calculateWithdrawalBreakdown`, change all `.toNumber()` return values to return `Decimal` instances instead of native numbers.
2. Update the return type of `calculateWithdrawalBreakdown` so `platformFee`, `referralCommission`, `userNetPkr`, `exactPkr` are all `Decimal`.
3. In `processWithdrawal`, replace:
   - `platformFee - referralCommission` → `platformFeeDecimal.minus(referralCommissionDecimal)`
   - `users.balanceCashPkr + referralCommission` → `sql\`${users.balanceCashPkr} + ${referralCommissionDecimal.toFixed(4)}\`` (keep arithmetic in DB)
4. Ensure the final DB write uses `.toFixed(4)` string representation, never a native float.

---

### Task 1.2 · Fix `recordEarnEvent` and `thorx-card.ts` Float Escapes
**Finding:** C1-04  
**Files:** `server/storage.ts` (~line 997), `server/modules/thorx-card.ts` (lines 56, 90)

**Steps:**
1. In `thorx-card.ts`: Replace `.toNumber()` conversions for `targetPoints` and `userPkrShare` with chained `Decimal` operations. Keep the entire variance calculation in Decimal until the final `.toFixed(0)` for display.
2. In `recordEarnEvent`: Locate the rank bonus application (~line 997) and replace native float arithmetic with `new Decimal(rankBonus).times(userPkrShareDecimal)`.
3. Confirm `CONVERSION_RATE` (retrieved from `system_config`) is wrapped in `new Decimal(value)` before any multiplication.

---

### Task 1.3 · Fix Bootstrap-Founder Race Condition + Add Validation
**Finding:** C1-03, C2-04  
**Files:** `server/routes.ts` (~lines 2677–2790)

**Steps:**
1. Add a Zod schema for the bootstrap payload: `{ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), password: z.string().min(8) }`. Parse with `.safeParse()` and return 400 on failure.
2. Replace the check-then-act guard with a database advisory lock:
   ```typescript
   await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('bootstrap_founder')::bigint)`);
   ```
   Execute inside a `db.transaction()` block that includes both the existence check and the `createUser` call.
3. Add `authRateLimiter` (or a dedicated 1-request/hour limiter) to the route.

---

### Task 1.4 · Wrap `awardMemberGPS` Callers in Transactions
**Finding:** C1-02  
**Files:** `server/modules/gps-engine.ts`, all callers of `awardMemberGPS`

**Steps:**
1. Audit every call site of `awardMemberGPS` in `routes.ts` and `storage.ts`.
2. For any caller that does not already pass a `tx` parameter, wrap the surrounding logic in `db.transaction(async (tx) => { ... })` and thread `tx` through.
3. Add a TypeScript lint guard: make the `tx` parameter required (non-optional) and update all callers. If a caller genuinely cannot provide a transaction, document why explicitly.

---

### Task 1.5 · Add LIMIT to Unbounded User Transaction Query
**Finding:** C1-05, C2-06  
**Files:** `server/storage.ts` (~line 1908)

**Steps:**
1. In the un-withdrawn transaction query used for withdrawal preview/processing, add chunked pagination: load transactions in batches of 500, summing until the requested withdrawal amount is covered (FIFO), then stop. Do not load all rows.
2. Add a DB-level `LIMIT 10000` as a safety ceiling even if full-FIFO is kept.
3. Apply similar LIMIT guards to `getTeamKeys` (cap 100), `getCredentials` (cap 50), `getCommissionLogsByBeneficiary` (cap 500 with offset pagination).

---

## PHASE 2 — Security Hardening

### Task 2.1 · Strip `passwordHash` and `verificationToken` from `/api/user` Response
**Finding:** C2-01  
**Files:** `server/routes.ts` (lines 602, 638), `server/utils/sanitize-user.ts`

**Steps:**
1. In the `/api/user` GET handler, wrap the returned user object with `sanitizeUser(user)` before `res.json()`.
2. Audit ALL other routes that return user objects (`/api/login`, `/api/register`, `/api/profile`, `/api/admin/users/:id`) and confirm each passes through `sanitizeUser`.
3. Add `passwordHash` and `verificationToken` to TypeScript's `Omit<>` on the public user type so the compiler catches future leaks.

---

### Task 2.2 · Add Missing Rate Limiters
**Finding:** C2-02  
**Files:** `server/routes.ts`, `server/middleware/auth-rate-limit.ts`

**Steps:**
1. Create a `bootstrapRateLimiter` (1 request per hour per IP) and apply it to `POST /api/bootstrap-founder`.
2. Create an `adminActionRateLimiter` (20 requests per minute per user) and apply it to:
   - `POST /api/admin/leaderboard/force-sync`
   - `POST /api/admin/users/:id/action`
3. Apply the existing `guildInteractionRateLimiter` to `POST /api/guilds/:id/join` and `POST /api/guilds/:id/leave` if not already applied.

---

### Task 2.3 · Fix Admin Permission — User Action Route
**Finding:** C2-03  
**Files:** `server/routes.ts` (~line 503)

**Steps:**
1. Pending Q5 answer from audit, change `requirePermission("VIEW_ANALYTICS")` to `requirePermission("MANAGE_USERS")` on `POST /api/admin/users/:id/action`.
2. Audit the full permission matrix in `server/routes.ts` — list every route with `requirePermission(X)` and verify X matches the action's write/read nature.

---

### Task 2.4 · Assert `CREDENTIAL_ENCRYPTION_KEY` at Startup
**Finding:** C2-09  
**Files:** `server/index.ts`, `server/utils/credential-crypto.ts`

**Steps:**
1. In `server/index.ts` startup block (alongside the `DATABASE_URL` check), add:
   ```typescript
   if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
     throw new Error("CREDENTIAL_ENCRYPTION_KEY is required for user credential storage");
   }
   if (Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY, 'hex').length < 32) {
     throw new Error("CREDENTIAL_ENCRYPTION_KEY must be at least 32 bytes (64 hex chars)");
   }
   ```
2. Add `CREDENTIAL_ENCRYPTION_KEY` to `scripts/setup-replit.sh` documentation with generation instructions (`openssl rand -hex 32`).

---

## PHASE 3 — Points-Only Mandate Enforcement (Pending Q1/Q2/Q3 Answers)

### Task 3.1 · Audit and Fix PKR Leaks in User-Facing UI
**Finding:** C1-01  
**Files:** `client/src/pages/UserPortal.tsx`, `client/src/components/ui/notification-modal.tsx`, `client/src/components/ui/referral-tree.tsx`, `client/src/components/sections/trust-builder.tsx`, `client/src/components/ui/enhanced-video-player.tsx`

**Steps (conditional on Q1–Q3 answers):**

**If Q1 answer: PKR only permissible on the final confirmation screen:**
1. `UserPortal.tsx:2897` — Replace `Rs. {withdrawalPreview.exactPkr.toFixed(2)}` in the *preview card* with the TX-Points equivalent (points requested). Remove the PKR breakdown from the preview step; show it only after the user clicks "Confirm Withdrawal."
2. `UserPortal.tsx:2659` — Remove `Rs.` prefix from the toast message; replace with "Withdrawal of {points} TX-Points submitted."

**If Q2 answer: trust-builder should show TX-Points, not PKR:**
3. `trust-builder.tsx:160` — Replace ₨ symbol and PKR counter with "TX-Points" label and the `txPointsBalance` aggregate.

**If Q3 answer: referral commissions follow points-only rule:**
4. `notification-modal.tsx:200` — Replace `$` currency prefix with "PKR" (if commissions are a separate exempt pathway) or with points.
5. `referral-tree.tsx:287` — Replace raw float with the points-converted value.

**Always:**
6. `enhanced-video-player.tsx:102, 330` — Remove `$` prefix from ad credit display. Show "TX-Points" or "Points Earned" label.
7. Create a shared `formatTxPoints(pkrValue: string, conversionRate: string): string` utility in `client/src/lib/` that centralizes the PKR→TX-Points conversion so no component does raw math inline.

---

### Task 3.2 · Fix Client-Side Float Arithmetic
**Finding:** C1-04 (client-side)  
**Files:** `client/src/pages/UserPortal.tsx` (lines 1320, 2346), `client/src/components/ui/referral-stats-card.tsx` (line 21)

**Steps:**
1. Install `decimal.js` on the client (`npm install decimal.js`).
2. In `UserPortal.tsx:1320`: Replace `totalEarnings - adViewsEarnings - referralEarnings` with:
   ```typescript
   new Decimal(totalEarnings).minus(adViewsEarnings).minus(referralEarnings).toFixed(2)
   ```
3. In `UserPortal.tsx:2346`: Replace fee percentage arithmetic with Decimal multiplication.
4. In `referral-stats-card.tsx:21`: Replace `Math.round(parseFloat(pkrStr) * 100)` with `new Decimal(pkrStr || "0").times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()`.

---

## PHASE 4 — Database Performance

### Task 4.1 · Add Missing Database Indexes
**Finding:** C2-05  
**Files:** `shared/schema.ts`

**Steps:**
Add the following indexes via Drizzle schema and run `drizzle-kit push`:

```typescript
// guild_members — most critical; used on every guild operation
index("guild_members_guild_status_idx").on(table.guildId, table.status),
index("guild_members_user_status_idx").on(table.userId, table.status),

// user_transactions — FIFO withdrawal consumption
index("user_transactions_user_withdrawn_created_idx").on(table.userId, table.withdrawn, table.createdAt),

// points_ledger — user point history
index("points_ledger_user_idx").on(table.userId),

// guild_weekly_cycles — idempotency check
index("guild_weekly_cycles_guild_week_idx").on(table.guildId, table.weekStart),

// founder_withdrawals — sorted listing
index("founder_withdrawals_created_at_idx").on(table.createdAt),
```

After pushing: run `EXPLAIN ANALYZE` on the withdrawal FIFO query and the guild membership check to confirm index utilization.

---

### Task 4.2 · Paginate Leaderboard Cache Refresh
**Finding:** C2-06  
**Files:** `server/storage.ts` (~line 2999)

**Steps:**
1. Add a `lastRefreshedAt` guard: if the cache was refreshed within the last 60 seconds, skip the refresh and return the cached data.
2. Move the referral count GROUP BY to a separate async query that runs after the main leaderboard insert (not blocking the primary sort).
3. Reduce `TOP_N` from 10,000 to 1,000 for the real-time cache; expose a separate "full export" endpoint for bulk data needs.

---

## PHASE 5 — UX Polish

### Task 5.1 · Replace Plain Text Loading States with Skeleton Loaders
**Finding:** C3-01  
**Files:** Multiple (see audit report C3-01 table)

**Steps:**
1. Confirm the project has a `<Skeleton>` component (shadcn/ui `skeleton`). If not, install it.
2. For each mutation button showing plain text (e.g., "Saving...", "Processing..."): replace the text with `<Loader2 className="animate-spin" />` icon + abbreviated label, consistent with the existing pattern in the codebase.
3. For initial data-loading states (empty card before first fetch): use `<Skeleton className="h-4 w-full" />` blocks matching the expected content layout.

---

### Task 5.2 · Add Toast Notifications to Silent Mutations
**Finding:** C3-02  
**Files:** `client/src/components/admin/UserManager.tsx`, `client/src/components/admin/TaskManager.tsx`, `client/src/components/guild/CaptainPortal.tsx`

**Steps:**
1. Import `useToast` (or the project's toast hook) into each file.
2. In each `onSuccess` callback listed in C3-02, add:
   ```typescript
   toast({ title: "Success", description: "<action> applied successfully." });
   ```
3. In each `onError` callback, add:
   ```typescript
   toast({ title: "Error", description: error.message, variant: "destructive" });
   ```
4. Ensure every mutation in `CaptainPortal.tsx` (lines 98–242) has both success and error toast coverage.

---

### Task 5.3 · Fix Mobile Responsive Breakpoints
**Finding:** C3-03  
**Files:** `client/src/components/admin/AdminDashboard.tsx`, `client/src/components/admin/RiskWatchlistPanel.tsx`, `client/src/pages/TermsAndConditions.tsx`, `client/src/components/admin/AdminSidebar.tsx`, `client/src/pages/TeamPortal.tsx`

**Steps:**
1. `AdminDashboard.tsx:158` — Change `grid-cols-3` to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
2. `RiskWatchlistPanel.tsx:841` — Wrap table in `<div className="overflow-x-auto w-full">`.
3. `TermsAndConditions.tsx:168` — Same `overflow-x-auto` wrapper.
4. `AdminSidebar.tsx:109` — Change `w-[300px]` to `w-[85vw] max-w-[300px]`.
5. `TeamPortal.tsx:85–102` — Change `py-20 px-8` to `py-12 px-4 sm:py-20 sm:px-8` and `text-3xl` to `text-xl sm:text-3xl`.

---

### Task 5.4 · Add Error States to Dashboard Data Cards
**Finding:** C3-04  
**Files:** `client/src/components/DashboardCards.tsx`, `client/src/components/admin/AdminDashboard.tsx`

**Steps:**
1. In `DashboardCards.tsx`, for each React Query hook, add:
   ```tsx
   if (isError) return <div className="text-sm text-destructive">Failed to load. <button onClick={() => refetch()}>Retry</button></div>;
   ```
2. In `AdminDashboard.tsx`, wrap each stat card's data section with an error state that shows the error message and a retry button when `isError` is true.

---

### Task 5.5 · Fix DOM Mutation Scroll-Lock Leak
**Finding:** C3-05  
**Files:** `client/src/pages/UserPortal.tsx` (lines 378–423), `client/src/components/ui/enhanced-video-player.tsx`

**Steps:**
1. Move `document.body.style.overflow` toggling into `useEffect` with a cleanup function:
   ```typescript
   useEffect(() => {
     document.body.style.overflow = 'hidden';
     return () => { document.body.style.overflow = ''; };
   }, [isModalOpen]);
   ```
2. Apply the same pattern in `enhanced-video-player.tsx` for fullscreen style mutations.
3. Never set `document.documentElement.style` outside a `useEffect` — move all such calls.

---

### Task 5.6 · Replace `window.location.href` Exports with Anchor Downloads
**Finding:** C3-07  
**Files:** `client/src/components/admin/UserManager.tsx` (line 215), `client/src/components/admin/AuditLogViewer.tsx` (line 105), `client/src/components/admin/PayoutControl.tsx` (line 212)

**Steps:**
1. Create a `downloadFromUrl(url: string, filename: string)` utility in `client/src/lib/`:
   ```typescript
   export function downloadFromUrl(url: string, filename: string) {
     const a = document.createElement('a');
     a.href = url; a.download = filename;
     document.body.appendChild(a); a.click();
     document.body.removeChild(a);
   }
   ```
2. Replace all three `window.location.href = exportUrl` calls with `downloadFromUrl(exportUrl, 'export.csv')`.

---

## PHASE 6 — Observability & Infrastructure

### Task 6.1 · Enable Sentry Error Tracking
**Finding:** C2-08  
**Files:** `server/index.ts`, `.env` / Replit Secrets

**Steps:**
1. Add `SENTRY_DSN` to Replit Secrets.
2. In `server/index.ts`, the Sentry initialization code is already present but gated on `SENTRY_DSN`. Setting the secret activates it.
3. Add `@sentry/node` to `package.json` if not already installed.
4. Configure Sentry performance tracing on the Express app and the background job scheduler.

---

### Task 6.2 · Add Startup Assertion for Session Table
**Finding:** C2-10  
**Files:** `server/routes.ts` (session middleware setup)

**Steps:**
1. After session middleware initialization, add a startup check:
   ```typescript
   db.execute(sql`SELECT 1 FROM "session" LIMIT 1`).catch(() => {
     logger.warn("Session table not found — connect-pg-simple will create it on first request");
   });
   ```
2. Add `CREATE TABLE IF NOT EXISTS "session" ...` (the standard connect-pg-simple DDL) to `scripts/setup-replit.sh` so it is idempotently created on fresh imports.

---

### Task 6.3 · Build Core Test Suite
**Finding:** C2-07  
**Files:** `server/__tests__/`, `vitest.config.ts`

**Priority test targets (in order):**
1. `recordEarnEvent` — test Engine A/B/C splits produce correct Decimal results with no float drift.
2. `processWithdrawal` — test that concurrent approval calls on the same withdrawal ID produce exactly one payout (race condition test using parallel Promises).
3. `createWithdrawal` — test insufficient balance rejection, fee calculation correctness.
4. `completeWeeklyTaskAtomic` — test idempotency: calling twice returns the same result, credits points only once.
5. `POST /api/register` — test duplicate email, duplicate phone, duplicate identity rejections.
6. `POST /api/login` — test wrong password returns 401, correct password returns session.
7. `bootstrap-founder` — test concurrent calls create only one founder.

---

## Execution Order Summary

| Phase | Priority | Unblocked? | Estimated Risk if Skipped |
|---|---|---|---|
| Phase 0 — Clarify Q1–Q5 | Prerequisite | Awaiting founder answers | Incorrect fixes |
| Phase 1 — Financial Integrity | CRITICAL | Yes | Silent money miscalculation |
| Phase 2 — Security Hardening | HIGH | Partially (Q5 for 2.3) | Data leak, account takeover |
| Phase 3 — Points-Only UI | HIGH | Blocked on Q1/Q2/Q3 | Compliance/UX mismatch |
| Phase 4 — DB Performance | MEDIUM | Yes | Latency at scale |
| Phase 5 — UX Polish | MEDIUM | Yes | Poor user experience |
| Phase 6 — Observability | LOW | Yes | Blind to production failures |

---

*End of Remediation Plan — 6 phases, 22 tasks, ordered by financial risk.*
