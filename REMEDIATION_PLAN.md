# THORX REMEDIATION PLAN
**Date:** 2026-07-22  
**Source:** AUDIT_REPORT.md (2026-07-22 Forensic Audit)  
**Standard:** Zero-bug, million-dollar production platform  
**Total Findings:** 30 | CRITICAL: 4 | HIGH: 14 | MEDIUM: 9 | LOW: 3

> ⚠️ **Execution rule:** Each phase must be completed, tested, and verified before the next phase begins. No concurrent phase execution. Financial-integrity tasks (Phase 1) have deployment-blocking priority.

---

## PHASE 1 — FINANCIAL INTEGRITY (DEPLOYMENT BLOCKING)
*Fix all CRITICAL financial bugs first. Nothing ships until these pass.*

### Task 1.1 — Fix `parseInt` on Withdrawal Amount → Use `Decimal`
**Finding:** F-02  
**Files:** `server/storage.ts` lines 1992, 2110  
**Action:**
1. Replace both `parseInt(withdrawal.amount, 10)` calls with:
   ```typescript
   const pointsRequested = new Decimal(withdrawal.amount)
     .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
     .toNumber();
   ```
2. Add a preceding guard: if `new Decimal(withdrawal.amount).isNaN()` throw a `400 INVALID_AMOUNT` error.
3. Add a test case: `withdrawal.amount = "1500.9"` must produce `pointsRequested = 1500`, not a silent truncation.

---

### Task 1.2 — Fix Points Accumulation in Ledger Coverage Check → Use Decimal Chain
**Finding:** F-01  
**File:** `server/storage.ts` ~line 1943  
**Action:**
1. Replace:
   ```typescript
   let pointsAccumulated = 0;
   pointsAccumulated += row.pointsCredited;
   ```
   With:
   ```typescript
   let pointsAccumulatedD = new Decimal(0);
   pointsAccumulatedD = pointsAccumulatedD.plus(new Decimal(row.pointsCredited));
   ```
2. Final comparison: `if (pointsAccumulatedD.lt(new Decimal(pointsRequested)))`.
3. Verify `row.pointsCredited` is always an integer — add `Decimal.isInteger()` assertion and throw if not.

---

### Task 1.3 — Wrap `createUser` in a Transaction with Referrer Lock
**Finding:** F-03  
**File:** `server/storage.ts` line 683  
**Action:**
1. Wrap the entire `createUser` body in `db.transaction(async (tx) => { ... })`.
2. Replace the `getUserById(referredBy)` call with a `FOR UPDATE` locked select on `users` using the `tx` client:
   ```typescript
   const [referrer] = await tx.select().from(users)
     .where(eq(users.id, insertUser.referredBy))
     .for('update');
   ```
3. Pass `tx` to all sub-operations inside `createUser` (referral record creation, balance update).
4. Verify: concurrent registration with the same referral code cannot produce a circular referral.

---

### Task 1.4 — Eliminate Hardcoded Fallback Session Secret
**Finding:** S-01  
**File:** `server/routes.ts` ~line 350  
**Action:**
1. Remove the `|| "thorx-secret-key-dev-only"` fallback entirely.
2. The `validateRequiredEnv` check in `server/index.ts` already exits on missing `SESSION_SECRET` — confirm the session config initialization happens AFTER this check (it does, but verify the call order).
3. Verify the server fails to start (not silently falls back) if `SESSION_SECRET` is unset.

---

### Task 1.5 — Add DB-Level Partial Unique Index for Pending Withdrawal Guard
**Finding:** P-06  
**File:** `shared/schema.ts`, run via `executeSql` for the live DB  
**Action:**
1. Add to `withdrawals` table definition in `schema.ts`:
   ```typescript
   // Partial unique index — only one pending withdrawal per user at the DB level
   // Applied via raw SQL since Drizzle Kit does not support partial unique indexes natively
   ```
2. Apply directly to the database:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_one_pending_per_user
     ON withdrawals(user_id) WHERE status = 'pending';
   ```
3. Document this index in `replit.md` as a manual SQL step required on fresh imports.

---

## PHASE 2 — SECURITY HARDENING
*All auth, rate limiting, and validation gaps.*

### Task 2.1 — Add Rate Limiters to Trust-Status and Risk-Case Routes
**Finding:** S-02, S-03  
**File:** `server/routes.ts` ~lines 4227, 4444  
**Action:**
1. Apply `adminActionRateLimiter` to `PATCH /api/admin/users/:id/trust-status`.
2. Apply `adminActionRateLimiter` to `PATCH /api/admin/risk-cases/:id`.
3. Verify both routes still require `requireSessionAuth` + `requirePermission`.

---

### Task 2.2 — Add Zod Schemas to Unvalidated Admin Routes
**Finding:** S-04, S-05  
**Files:** `server/routes.ts` lines ~4749, ~3547  
**Action:**
1. For `/api/admin/simulate/thorx-card`, create a Zod schema:
   ```typescript
   const simulateThorxCardSchema = z.object({
     grossPkr: z.coerce.number().positive().max(10000),
     conversionRate: z.coerce.number().positive(),
     varianceMin: z.coerce.number().min(0.1).max(1),
     varianceMax: z.coerce.number().min(1).max(3),
     thorxCutPct: z.coerce.number().min(0).max(100),
     userCutPct: z.coerce.number().min(0).max(100),
   });
   ```
   Replace all manual `parseInt`/`new Decimal(String(...))` calls with the parsed schema output.
2. For `/api/hilltopads/config`, use or extend `insertHilltopAdsConfigSchema` from shared schema. Replace manual `req.body.apiKey` extraction with `schema.parse(req.body)`.

---

### Task 2.3 — Set `CREDENTIAL_ENCRYPTION_KEY` as a Required Environment Secret
**Finding:** S-06  
**Files:** `server/index.ts`, Replit Secrets  
**Action:**
1. Add `CREDENTIAL_ENCRYPTION_KEY` to `validateRequiredEnv` in `server/index.ts` with a condition: required in production, warn+fallback in development.
2. Generate a 32-byte hex key and set it as a Replit Secret (`CREDENTIAL_ENCRYPTION_KEY`).
3. Confirm startup log no longer shows the encryption key warning.

---

### Task 2.4 — Remove Plaintext Credentials from `scripts/seed-founder.ts`
**Finding:** S-08  
**File:** `scripts/seed-founder.ts`  
**Action:**
1. Replace all hardcoded email/password literals with `process.env.FOUNDER_EMAIL` and `process.env.FOUNDER_PASSWORD`.
2. Add guards: if either env var is missing, print a usage message and exit.
3. Add the file to `.gitignore` or add a comment block making clear it must never be committed with real credentials.

---

## PHASE 3 — RACE CONDITIONS & TRANSACTION GAPS
*Fix remaining atomicity gaps in financial mutations.*

### Task 3.1 — Make `updateUserEarnings` Always Require a Transaction Context
**Finding:** F-05  
**File:** `server/storage.ts` line 829  
**Action:**
1. Audit every call site of `updateUserEarnings` in `storage.ts` and `routes.ts`.
2. Any call site not passing a `tx` must be wrapped in `db.transaction()`.
3. Change the function signature to make `tx` a required parameter (not optional) — this will surface all un-wrapped callers as TypeScript compile errors immediately.

---

### Task 3.2 — Fix `prepareWeeklyTaskCompletion` TOCTOU Race
**Finding:** F-04  
**File:** `server/storage.ts` ~line 5173  
**Action:**
1. Wrap the existing read+insert pattern in `db.transaction()` with a `FOR UPDATE` lock on the `weeklyTaskRecords` lookup:
   ```typescript
   return db.transaction(async (tx) => {
     const [existing] = await tx.select()
       .from(weeklyTaskRecords)
       .where(and(eq(...), eq(...)))
       .for('update');
     if (existing) return existing; // idempotent
     return tx.insert(weeklyTaskRecords).values(...).returning();
   });
   ```
2. Alternatively, add a DB-level unique constraint on `(userId, weeklyTaskId, weekStart)` to let the DB enforce idempotency.

---

### Task 3.3 — Add TTL Eviction to Chatbot `conversationContexts` Map
**Finding:** F-06  
**File:** `server/chatbot/advanced-chatbot-service.ts` line 104  
**Action:**
1. Add a `lastAccessedAt: number` timestamp to each `ConversationContext` entry.
2. Update `lastAccessedAt = Date.now()` on every read/write to the context.
3. Add a `setInterval(() => { this.evictStaleContexts() }, 5 * 60 * 1000)` in the constructor.
4. `evictStaleContexts()` deletes any context where `Date.now() - lastAccessedAt > TTL_MS` (default 30 minutes, or the business value from Q2 clarification).

---

## PHASE 4 — DATABASE PERFORMANCE
*Fix N+1 patterns, missing indexes, and unbounded queries.*

### Task 4.1 — Rewrite Risk Engine to Batch DB Queries
**Finding:** P-01  
**File:** `server/modules/risk-engine.ts`  
**Action:**
1. Replace the per-user `scoreUser(u.id)` loop with a single aggregated SQL query that computes all 5–7 risk signals across all users in one pass using CTEs or aggregated sub-selects.
2. The result set should be a flat table of `(userId, signal1Value, signal2Value, ...)` which can be scored in-memory without additional DB round-trips.
3. Target: one query per risk scan run (plus one write batch for `risk_cases` upserts), down from ~35,000.

---

### Task 4.2 — Move Leaderboard Percentile Ranking to SQL Window Function
**Finding:** P-02  
**File:** `server/storage.ts` ~line 3070 (`refreshLeaderboardCache`)  
**Action:**
1. Replace the `map().sort()` in-memory percentile computation with:
   ```sql
   SELECT id, performance_score,
     PERCENT_RANK() OVER (ORDER BY performance_score DESC) AS percentile_rank
   FROM users
   WHERE is_active = true AND role = 'user'
   ORDER BY performance_score DESC
   LIMIT 10000;
   ```
2. Referral count: add a materialized view or a JOIN with a `GROUP BY` that runs once, rather than a separate full-table scan.
3. Remove the in-memory `topEntries` array processing loop.

---

### Task 4.3 — Add Composite Index for Leaderboard Hot Query
**Finding:** P-05  
**File:** `shared/schema.ts`  
**Action:**
1. Add to the `users` table definition:
   ```typescript
   index("users_active_role_score_idx").on(table.isActive, table.role, table.performanceScore),
   ```
2. Apply via `npx drizzle-kit push` to development DB, document for production migration.

---

### Task 4.4 — Add `LIMIT` Guard to `guild-reset.ts` Guild Load
**Finding:** P-03  
**File:** `server/jobs/guild-weekly-reset.ts` line 63  
**Action:**
1. Add `.limit(500)` to the active guild query and process in pages (cursor-based pagination).
2. If the total active guild count exceeds 500, process subsequent pages in separate async jobs queued after the current batch completes.

---

### Task 4.5 — Add Retention Cleanup Jobs for `score_history` and `audit_logs`
**Finding:** P-04  
**Files:** `server/jobs/` (new file: `retention-cleanup.ts`), `server/index.ts`  
**Action:**
1. Create `server/jobs/retention-cleanup.ts` with a daily job that:
   - Deletes `score_history` rows where `snapshot_at < NOW() - INTERVAL '90 days'`
   - Archives (or deletes, pending Q5 answer) `audit_logs` rows older than the retention period
2. Register the job in `server/index.ts` alongside the other background jobs.
3. Add `startRetentionCleanupJob` to the startup sequence.

---

### Task 4.6 — Add Overlap Guard to All Background Jobs
**Finding:** P-08  
**Files:** `server/jobs/leaderboard-refresh.ts`, `server/jobs/health-snapshot.ts`, `server/jobs/inactivity-penalty.ts`, `server/jobs/guild-weekly-reset.ts`  
**Action:**
1. In each job file, add an `isRunning` boolean at module scope.
2. At the start of each job execution: if `isRunning` is true, log a warning and return early.
3. Set `isRunning = true` before work begins; always set `isRunning = false` in the `finally` block.

---

### Task 4.7 — Tune DB Connection Pool
**Finding:** P-07  
**File:** `server/db.ts` line 15  
**Action:**
1. Add explicit pool configuration:
   ```typescript
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 5000,
   });
   ```
2. Add a pool error handler: `pool.on('error', (err) => logger.error({ err }, 'DB pool error'));`

---

## PHASE 5 — OBSERVABILITY & INFRASTRUCTURE
*Logging, testing, Sentry, and environment hardening.*

### Task 5.1 — Replace `console.*` with Pino Logger in All Server Files
**Finding:** O-02  
**Files:** `server/validation.ts` lines 129, 132 · `server/utils/debug-log.ts` · `server/vite.ts`  
**Action:**
1. In `server/validation.ts`: replace `console.warn`/`console.error` with `import { logger } from '../lib/logger'; logger.warn(...)`.
2. In `server/utils/debug-log.ts`: replace the `console.log` wrapper with a pino `logger.debug(...)` call.
3. In `server/vite.ts`: replace the `log()` function body with a pino call.

---

### Task 5.2 — Add Explicit Sentry Capture for Financial Transaction Failures
**Finding:** O-03  
**Files:** `server/storage.ts` (processWithdrawal, recordEarnEvent), `server/routes.ts`  
**Action:**
1. In `processWithdrawal` catch block, add:
   ```typescript
   Sentry.captureException(err, {
     tags: { domain: 'financial', operation: 'processWithdrawal' },
     extra: { withdrawalId, userId, amount },
   });
   ```
2. Apply the same pattern to `recordEarnEvent`, `createWithdrawal`, and any route that calls these functions.
3. Verify: trigger a test failure in dev and confirm the event appears in Sentry with financial context.

---

### Task 5.3 — Write Integration Tests for Critical Flows
**Finding:** O-01  
**File:** `server/__tests__/` (new test files)  
**Action:**
1. Create `server/__tests__/auth.test.ts`:
   - Register → login → session check → logout → 401 confirmed
   - Duplicate email rejection
   - Wrong password rejection
2. Create `server/__tests__/withdrawal.test.ts`:
   - Create withdrawal → approve → verify balance deducted and ledger marked
   - Concurrent withdrawal attempt — second must be rejected
   - Double-approval of same withdrawal — must be idempotent
3. Create `server/__tests__/earn-event.test.ts`:
   - Record earn event → verify ledger row + user balance update are both present or both absent (atomicity)
4. Use `vitest` with a test DB (or mock `db` with `vi.spyOn`).

---

## PHASE 6 — FRONTEND UX & ECOSYSTEM FIXES
*Query key registry, toast coverage, error states, accessibility.*

### Task 6.1 — Migrate All Hardcoded Query Keys to QUERY_KEYS Registry
**Finding:** U-01  
**Files:** `client/src/pages/UserPortal.tsx` lines 626, 989, 1064 · `client/src/components/guild/GuildMemberPanel.tsx`  
**Action:**
1. Open `client/src/lib/queryKeys.ts` and add any missing keys:
   ```typescript
   commissions: ['commissions'] as const,
   chatHistory: ['chat-history'] as const,
   withdrawalPreview: ['withdrawal-preview'] as const,
   guildChat: (guildId: string) => ['guild', guildId, 'chat'] as const,
   ```
2. Replace every hardcoded query key literal in the listed files with the registry constant.
3. Verify: after a mutation that should invalidate commissions, the commissions query actually refetches.

---

### Task 6.2 — Add `onError` Toast to All Silent Mutations
**Finding:** U-02, U-03, U-06  
**Files:** `client/src/components/admin/UserManager.tsx` lines 164, 190 · `client/src/components/admin/SystemSettingsManager.tsx` lines 67, 528 · `client/src/components/admin/TeamKeysManager.tsx`  
**Action:**
1. For each mutation listed, add the `onError` handler:
   ```typescript
   onError: (error: any) => {
     toast({
       title: "Action Failed",
       description: error?.message ?? "An unexpected error occurred. Please try again.",
       variant: "destructive",
     });
   }
   ```
2. Verify: simulate a network failure (disable the API route temporarily) and confirm the toast appears.

---

### Task 6.3 — Add `isError` UI States to Admin Queries
**Finding:** U-04, U-05  
**Files:** `client/src/pages/HilltopAdsAdmin.tsx` · `client/src/components/admin/AdminDashboard.tsx`  
**Action:**
1. For each query that lacks error handling, add a conditional render:
   ```tsx
   if (isError) return (
     <div className="flex items-center gap-2 text-destructive p-4">
       <AlertCircle className="h-4 w-4" />
       <span>Failed to load data. {error?.message}</span>
     </div>
   );
   ```
2. Apply consistently to: `config`, `zones`, `revenueData`, `balanceData` in HilltopAdsAdmin; `analytics`, `engineRevenue` in AdminDashboard.

---

### Task 6.4 — Fix Commission Display to Honor Points-Only Mandate
**Finding:** F-10  
**File:** `client/src/pages/UserPortal.tsx` commissions tab  
**Action:**
1. **Pending Q1 clarification.** If commissions must show TX-Points:
   - Fetch the current `CONVERSION_RATE` from `QUERY_KEYS.systemConfig`.
   - Display: `Math.round(commissionPkrValue * conversionRate / 10)` TX-Points equivalent.
   - Label clearly as "TX-Points Equivalent" with a tooltip explaining the conversion.
2. If commissions are intentionally PKR-denominated (cash earnings), add an explicit design distinction (different color/icon) to differentiate them from the main points balance.

---

### Task 6.5 — Add Skeleton Loaders for Loading States
**Finding:** U-08  
**Files:** Multiple components  
**Action:**
1. Replace plain-text loading states (`"PROCESSING..."`, `"JOINING..."`) with `Loader2 className="animate-spin"` icon inside the button (consistent with the rest of the app).
2. For panel-level loading (data fetching), use `Skeleton` components matching the content shape rather than empty panels.
3. Audit all `isLoading` conditionals across admin components and apply consistently.

---

### Task 6.6 — Fix Accessibility Issues
**Finding:** U-09, U-10  
**Files:** `client/src/components/admin/UserManager.tsx` ~843 · `client/src/components/admin/LeaderboardInsights.tsx` ~66  
**Action:**
1. Add `aria-label="Close"` (or descriptive label) to the icon-only close button in `UserManager.tsx`.
2. Add meaningful `alt` text to the `LeaderboardInsights` image, or `alt=""` + `role="presentation"` if purely decorative.
3. Audit all icon-only buttons across the app with `grep -rn "IconButton\|<button" client/src/components/admin` and verify each has accessible text.

---

### Task 6.7 — Implement WebSocket Push for Guild Events
**Finding:** U-07  
**Files:** `server/realtime.ts` · `client/src/pages/UserPortal.tsx` · `client/src/components/guild/GuildMemberPanel.tsx`  
**Action:**
1. Define new WebSocket message types: `GUILD_CAPTAIN_MESSAGE`, `GUILD_TARGET_UPDATE`, `GUILD_STRIKE_ISSUED`.
2. In the Team Portal routes that create/update these entities, call `broadcastGuildEvent(guildId, { type, payload })` after the DB write.
3. In `GuildMemberPanel.tsx` WebSocket handler, on receiving these events, call `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guildMessages(guildId) })` (or equivalent).
4. Remove the `refetchInterval` from queries that are now covered by WS push (or reduce to 5 minutes as a fallback only).

---

### Task 6.8 — Establish Z-Index Token Scale
**Finding:** U-12  
**Files:** `tailwind.config.ts` · `client/src/components/ui/`  
**Action:**
1. Add to `tailwind.config.ts` extend section:
   ```typescript
   zIndex: {
     'base': '0',
     'dropdown': '40',
     'sticky': '50',
     'modal': '60',
     'drawer': '65',
     'toast': '70',
     'tooltip': '80',
   }
   ```
2. Update all overlay components to use the appropriate semantic token instead of `z-50`.

---

## PHASE 7 — BUSINESS FEATURE GAPS

### Task 7.1 — Implement Automated Password Reset Flow
**Finding:** F-09, S-07 (pending Q3 clarification)  
**Files:** `server/routes.ts` lines 3087, 3103 · `shared/schema.ts` (new table)  
**Action (if email-based flow approved):**
1. Add `password_reset_tokens` table: `(id, userId, tokenHash, expiresAt, usedAt)`.
2. `POST /api/forgot-password`: generate a secure random token, hash it, store in DB with 1-hour expiry, send email with reset link.
3. `POST /api/reset-password`: validate token (not expired, not used), hash new password, update user, mark token as used, invalidate all existing sessions for the user.
4. Both endpoints remain protected by `authRateLimiter`.

---

## EXECUTION CHECKLIST

| Phase | Tasks | Priority | Estimated Effort |
|-------|-------|----------|-----------------|
| 1 — Financial Integrity | 1.1 → 1.5 | 🔴 CRITICAL | 1 day |
| 2 — Security Hardening | 2.1 → 2.4 | 🔴 HIGH | 0.5 day |
| 3 — Race Conditions | 3.1 → 3.3 | 🔴 HIGH | 1 day |
| 4 — DB Performance | 4.1 → 4.7 | 🟠 HIGH | 2 days |
| 5 — Observability | 5.1 → 5.3 | 🟠 HIGH | 1 day |
| 6 — Frontend UX | 6.1 → 6.8 | 🟡 MEDIUM | 1.5 days |
| 7 — Feature Gaps | 7.1 | 🟡 MEDIUM | 1 day |

**Total estimated remediation effort: 8 working days**

---

*Remediation plan generated from AUDIT_REPORT.md — 2026-07-22*  
*Do not begin execution until business logic clarifications (Q1–Q6) are answered.*
