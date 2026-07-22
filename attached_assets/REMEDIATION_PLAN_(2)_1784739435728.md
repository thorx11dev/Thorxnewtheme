# THORX — REMEDIATION PLAN
**Date:** 2026-07-22  
**Authority:** "Million-Dollar Product" Audit findings  
**Priority system:** 🔴 CRITICAL (financial integrity / security) → 🟠 HIGH (data correctness / auth) → 🟡 MEDIUM (performance / UX) → 🟢 LOW (polish)

> ⚠️ **Do not begin remediation on findings tied to Open Questions Q1–Q5** in the Audit Report until business-logic answers are received. Those tasks are marked **BLOCKED** below.

---

## PHASE 1 — CRITICAL: Financial Integrity & Security (Do First)

### TASK 1.1 🔴 — Eliminate Float Math from All Financial Code Paths
**Audit refs:** 1-A (items 1–14), 1-F  
**Files:** `server/routes.ts`, `server/modules/gps-engine.ts`, `server/modules/thorx-card.ts`, `server/storage.ts`

**Steps:**
1. In `server/routes.ts` line 1164–1171: Replace `parseFloat` + native arithmetic with `Decimal` chain:
   ```ts
   const grossPkrD = new Decimal(grossPkrPerCompletion ?? "0");
   const userCutRateD = new Decimal(userCutPct).div(100);
   const txPointsReward = grossPkrD.times(userCutRateD).times(conversionRate).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber();
   ```
2. In `routes.ts:3694,3727` and `routes.ts:4645–4656`: Replace all `parseFloat(String(...))` with `new Decimal(value ?? fallback)` and pass `Decimal` objects into engine functions.
3. In `server/modules/thorx-card.ts:56–58`: Keep `Decimal` through the full variance chain — convert to integer via `toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber()` only at the final step.
4. In `server/modules/gps-engine.ts:28`: Replace with `new Decimal(memberPointsEarned).times(pct).div(100).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber()` — **BLOCKED on Q4 for whether Decimal is required here**.
5. In `server/storage.ts:1070`: Replace `.toNumber()` SQL bind with a string: `new Decimal(params.grossPkr).times(100).toDecimalPlaces(0).toString()`.

---

### TASK 1.2 🔴 — Add SELECT FOR UPDATE Row Locks on All Money-Moving Transactions
**Audit refs:** 1-C  
**Files:** `server/storage.ts`

**Steps:**
1. `createReferralCashWithdrawal` (line 4861): Inside the existing `db.transaction()`, change the user SELECT to:
   ```ts
   const [user] = await tx.execute(sql`SELECT * FROM users WHERE id = ${userId} FOR UPDATE`);
   ```
   Do the same for the pending-withdrawal existence check.
2. `createWithdrawal` (line 1985): Wrap the balance fetch + insert in a `db.transaction()` with a `FOR UPDATE` lock on the user row before reading `availableBalance`.
3. `checkAndUpdateRankTier` in `ps-engine.ts`: Add `FOR UPDATE` on the user SELECT inside any outer transaction, or accept an already-locked user object from the caller.
4. `checkAndUpdateGuildRankTier` in `gps-engine.ts:85`: Add `FOR UPDATE` on the guild SELECT inside the transaction.

---

### TASK 1.3 🔴 — Wrap Non-Transactional Balance Mutations
**Audit refs:** 1-B  
**Files:** `server/storage.ts`, `server/modules/ps-engine.ts`

**Steps:**
1. `updateUserEarnings` (line 829): Wrap in `db.transaction()` if called from contexts that perform a prior balance read.
2. `createWithdrawal` (line 1985): Move the balance-sufficiency check and the `INSERT` into a single `db.transaction()` block with `FOR UPDATE`.
3. `awardTaskPS` and `processStreak` in `ps-engine.ts`: Thread the outer transaction `tx` through; remove the fallback to bare `db` in contexts where atomicity is required.

---

### TASK 1.4 🔴 — Add Zod Validation to All Unvalidated Admin/Team Routes
**Audit refs:** 2-B  
**Files:** `server/routes.ts`, `server/validation.ts`

**Steps:**
1. `POST /api/admin/system-config` (line 4272): Add:
   ```ts
   const schema = z.object({ key: z.string().min(1).max(100), value: z.string().max(500) });
   const parsed = schema.safeParse(req.body);
   if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
   ```
2. `PATCH /api/admin/users/:id/rank` (line 4090): Define a Zod schema with `z.enum([...validRanks])` and `z.boolean().optional()` for `locked`.
3. `PATCH /api/admin/users/:id/trust-status` (line 4126): Zod schema with `z.boolean()` for `isTrusted`.
4. `POST /api/team/members` (line 3978): Schema: `z.object({ email: z.string().email(), role: z.enum(['admin','team']) })`.
5. `PATCH /api/team/members/:id` (line 4032): Schema: `z.object({ accessLevel: z.string(), isActive: z.boolean().optional() })`.
6. `PATCH /api/guilds/:id/applications/:applicationId` (line 4442): Schema: `z.object({ action: z.enum(['approve','reject']), rejectionReason: z.string().max(500).optional() })`.

---

### TASK 1.5 🔴 — Add Permission Check + Rate Limiter to System Config Mutation
**Audit refs:** 2-A (system-config gap), 2-C  
**Files:** `server/routes.ts`, `server/middleware/auth-rate-limit.ts`

**Steps:**
1. `POST /api/admin/system-config` (line 4272): Change middleware from `requireTeamRole` to `requirePermission("MANAGE_SYSTEM")`.
2. Add `adminActionRateLimiter` (already exists) to `POST /api/admin/system-config`, `POST /api/team/members`, and `PATCH /api/team/members/:id`.

---

### TASK 1.6 🔴 — Implement Double-Submission Protection on Financial Endpoints
**Audit refs:** 1-E  
**Files:** `server/routes.ts`, `server/storage.ts`

**Steps:**
1. Add a per-user in-memory or Redis-backed 30-second window check on `POST /api/withdrawals`:
   - On receipt, check for an existing `pending` withdrawal for this user within the last 30 s.
   - If found, return `409 Conflict` with `message: "A withdrawal is already being processed."`.
2. Apply the same check to `POST /api/withdrawals/referral`.
3. `POST /api/admin/users/:userId/adjust-balance`: Require a `reason` field (already Zod-validatable) and log each invocation to `audit_logs` with a UNIQUE constraint on `(actor_id, target_user_id, amount, created_at::date)` to prevent same-day duplicate adjustments.

---

## PHASE 2 — HIGH: Data Correctness & Auth Hardening

### TASK 2.1 🟠 — Fix TX-Points vs PKR Display Ambiguity
**Audit refs:** 1-D  
**BLOCKED on Q1 and Q2**

Once Q1 is answered:
1. If `totalEarnings` stores PKR: Rename or alias it to `totalEarningsPkr` in `sanitize-user.ts` and multiply by `CONVERSION_RATE` before sending to the frontend as `txPoints`.
2. Update `RankProgressBar` (`rank-badge.tsx:156`) to receive `txPoints` not `totalEarnings`.
3. Update `profile-modal.tsx:309` to use the explicit `txPoints` field.
4. Verify `DashboardCards.tsx` receives and renders only TX-Points, never raw PKR.

---

### TASK 2.2 🟠 — Add Missing Composite Database Indexes
**Audit refs:** 2-D  
**Files:** `shared/schema.ts` + `npx drizzle-kit push`

**Add the following indexes:**
```ts
// withdrawals table
index("withdrawals_user_id_status_idx").on(table.userId, table.status),
index("withdrawals_status_idx").on(table.status),
index("withdrawals_created_at_idx").on(table.createdAt),

// task_records
index("task_records_user_id_status_idx").on(table.userId, table.status),

// guild_members
index("guild_members_guild_id_active_idx").on(table.guildId, table.isActive),

// audit_logs
index("audit_logs_target_user_created_idx").on(table.targetUserId, table.createdAt),

// risk_cases
index("risk_cases_user_id_status_idx").on(table.userId, table.status),

// score_history
index("score_history_user_recorded_idx").on(table.userId, table.recordedAt),
```
After adding to schema, run `npx drizzle-kit push --force`.

---

### TASK 2.3 🟠 — Eliminate Unbounded Table Scans
**Audit refs:** 2-E  
**Files:** `server/storage.ts`

**Steps:**
1. `getAllUsers`: Enforce `.limit(200)` in ALL code paths — audit every caller and ensure none bypass via raw `db.select()`.
2. `recomputeLeaderboardCache`: Replace the JS-side sort with a SQL `RANK() OVER (ORDER BY performance_score DESC)` window query returning only the top N rows.
3. `getEarningsStats`: Replace multi-select + JS aggregation with a single SQL query using `SUM`, `AVG`, `COUNT`.
4. `getRiskCases`: Add `.limit(100)` and expose a `cursor`/`offset` parameter for pagination; update `RiskWatchlistPanel` to use paginated loading.
5. `getPayoutQueue`: Add `.limit(50)` with cursor pagination; update `PayoutControl.tsx`.
6. GPS engine `checkAndUpdateGuildRankTier`: Batch all `cfg()` calls into a single `storage.getSystemConfigValues([...keys])` call instead of 6 sequential awaits.

---

### TASK 2.4 🟠 — Fix Task Completion `parseFloat` in Earn Path
**Audit refs:** 1-F  
**Files:** `server/routes.ts:3694,3727`

Replace:
```ts
grossPkr: isCpaTask ? parseFloat(task.grossPkrPerCompletion!) : 0,
```
With:
```ts
grossPkr: isCpaTask ? new Decimal(task.grossPkrPerCompletion ?? "0").toNumber() : 0,
```
And validate `task.grossPkrPerCompletion` is a valid decimal string before the Decimal parse.

---

## PHASE 3 — MEDIUM: Performance, Observability & Real-time

### TASK 3.1 🟡 — Fix Z-Index Stacking Conflicts
**Audit refs:** 3-C  
**Files:** `client/src/components/ui/`

Establish a canonical z-index token system in `tailwind.config.ts`:

| Layer | Value |
|-------|-------|
| Loading screen | 9999 |
| Cursor / FX | 9000 |
| Notification modal | 800 |
| Profile modal | 700 |
| Daily goal modal | 600 |
| Ad panel | 500 |
| Toast | 400 |
| Dropdowns | 200 |

Update each component to use these values. **Key fix:** Move toast to `z-[400]` so it always surfaces above full-screen modals.

---

### TASK 3.2 🟡 — Add WebSocket Events for Guild Target and Leaderboard
**Audit refs:** 3-A  
**Files:** `server/realtime.ts`, `server/routes.ts`, `client/src/hooks/useRealtimeSync.ts`

**Steps:**
1. Emit `guild.target_updated` whenever admin updates `weeklyTarget` via `GuildManager` or `POST /api/admin/system-config` affecting weekly target keys.
2. Emit `leaderboard.refreshed` from the 5-minute `leaderboard-refresh` job after each cache write; have all connected clients invalidate `QUERY_KEYS.leaderboard` on receipt.
3. Emit `guild.settings_updated` with a `{ field, value }` payload so clients can do targeted invalidation instead of full guild re-fetch.
4. In `useRealtimeSync.ts`: Add handlers for `guild.target_updated` (invalidate `QUERY_KEYS.guildDetail`) and `leaderboard.refreshed` (invalidate `QUERY_KEYS.leaderboard`).

---

### TASK 3.3 🟡 — Replace Plain-Text Loading States with Skeleton Loaders
**Audit refs:** 3-D  
**Files:** `client/src/components/admin/`

For each component listed in finding 3-D:
1. Import `Skeleton` from `@/components/ui/skeleton`.
2. Replace `isLoading ? "Loading..." : content` with a skeleton that mirrors the shape of the loaded content (e.g., rows of `<Skeleton className="h-4 w-full" />` for table rows).
3. `DashboardCards.tsx`: Replace the `"0"` default with a `<Skeleton className="h-8 w-24" />` shimmer during the initial data fetch.

---

### TASK 3.4 🟡 — Add Toast Notifications to Silent Mutations
**Audit refs:** 3-E  
**Files:** `client/src/components/guild/`, `client/src/pages/UserPortal.tsx`, `client/src/components/admin/`

For each mutation listed in finding 3-E, add `useToast()` and wire `onSuccess` / `onError`:
- Guild join: "You've joined [Guild Name]!" / "Failed to join guild."
- Nudge member: "Nudge sent!" / "Failed to send nudge."
- Weekly target set: "Weekly target updated." / "Failed to update target."
- Withdrawal step 2→3 preview failure: "Could not fetch withdrawal preview. Please try again."
- Admin bulk mark-read: "N notifications marked as read."
- Rank threshold save: "Rank thresholds saved."

---

### TASK 3.5 🟡 — Fix Mobile Responsive Violations
**Audit refs:** 3-B  
**Files:** `client/src/pages/UserPortal.tsx`, `client/src/components/admin/`

1. `UserPortal.tsx`: Change `max-w-[1600px]` containers to `max-w-[1600px] w-full px-4 sm:px-6`.
2. `SystemSettingsManager.tsx`: Add `overflow-x-auto` wrapper around the settings table; replace `min-w-max` cell classes with `min-w-[8rem]`.
3. `RiskWatchlistPanel.tsx`: Wrap table in `<div className="overflow-x-auto">`.
4. `PayoutControl.tsx`: Add overflow wrapper; on `< sm` breakpoint, collapse table to card view using `hidden sm:table-cell` on non-essential columns.
5. `TermsAndConditions.tsx:167`: Wrap table in `<div className="overflow-x-auto -mx-4 px-4">`.

---

### TASK 3.6 🟡 — Fix Form Disabled States During Submission
**Audit refs:** 3-G  
**Files:** `client/src/pages/UserPortal.tsx`, `client/src/components/ui/daily-goal-modal.tsx`, `client/src/components/guild/GuildDiscoveryPanel.tsx`

1. `UserPortal.tsx:3128` withdrawal confirm: Replace manual `isProcessing` boolean with `disabled={withdrawMutation.isPending || !canProceed()}`.
2. `daily-goal-modal.tsx`: Add `disabled={claimMutation.isPending}` to all action buttons.
3. `GuildDiscoveryPanel.tsx` join button: Add `disabled={joinMutation.isPending}`.

---

## PHASE 4 — LOW: Observability Hardening & Code Quality

### TASK 4.1 🟢 — Activate Sentry Error Tracking
**Audit refs:** 2-F  
**Files:** `server/lib/sentry.ts`, `server/index.ts`

1. Set `SENTRY_DSN` as a Replit Secret (use the environment-secrets workflow).
2. Verify `server/lib/sentry.ts` initialises Sentry and attaches the Express error handler.
3. Add `Sentry.captureException(err)` to the global Express error handler in `server/index.ts`.

---

### TASK 4.2 🟢 — Set CREDENTIAL_ENCRYPTION_KEY Secret
**Audit refs:** 2-F  
Generate a 32-byte random hex key and store as Replit Secret `CREDENTIAL_ENCRYPTION_KEY`. Confirm the server boot log no longer emits the fallback warning.

---

### TASK 4.3 🟢 — Unify Logging: Remove `debug-log.ts` Usage
**Audit refs:** 2-F  
**Files:** `server/utils/debug-log.ts` and all callers

1. `grep -rn "debug-log\|debugLog" server/` to find all usages.
2. Replace each with the equivalent pino `logger.debug()` / `logger.info()` call.
3. Delete `server/utils/debug-log.ts`.

---

### TASK 4.4 🟢 — Extend Health Check to Cover Background Jobs
**Audit refs:** 2-F  
**Files:** `server/routes.ts:395`, `server/jobs/`

1. Track the last successful run timestamp for each cron job (leaderboard-refresh, health-snapshot, inactivity-penalty, guild-reset).
2. In `GET /api/health`, include `{ jobs: { leaderboardRefresh: lastRunMs, healthSnapshot: lastRunMs, ... } }`.
3. Return `503` if any job has not run within its expected interval × 2.

---

### TASK 4.5 🟢 — Add Migration Rollback Safety Net
**Audit refs:** 2-F  
**Files:** `migrations/`, `package.json`

1. Before every `drizzle-kit push`, automatically snapshot the schema: `pg_dump --schema-only > migrations/snapshots/$(date +%Y%m%d_%H%M%S).sql`.
2. Add a `db:rollback` npm script that restores from the latest snapshot.
3. Document the rollback procedure in `replit.md`.

---

## EXECUTION SEQUENCE SUMMARY

```
Phase 1 (Critical — complete before any feature work):
  1.2 → Row Locks (FOR UPDATE)
  1.3 → Wrap Non-Transactional Mutations
  1.4 → Zod on All Admin Routes
  1.5 → Permission + Rate Limiter on System Config
  1.6 → Double-Submission Protection
  1.1 → Float Math Elimination (after Q4 answered for GPS)

Phase 2 (High — complete within same sprint):
  2.2 → Composite DB Indexes  ← no blockers
  2.3 → Unbounded Query Caps  ← no blockers
  2.4 → parseFloat in Task Completion
  2.1 → TX-Points/PKR Display ← BLOCKED on Q1 & Q2

Phase 3 (Medium — UX sprint):
  3.1 → Z-index system
  3.2 → WebSocket events
  3.3 → Skeleton loaders
  3.4 → Toast on silent mutations
  3.5 → Mobile responsive fixes
  3.6 → Form disabled states

Phase 4 (Low — observability):
  4.1 → Sentry
  4.2 → CREDENTIAL_ENCRYPTION_KEY
  4.3 → Logging unification
  4.4 → Health check extension
  4.5 → Migration snapshots
```

---

## AWAITING BUSINESS LOGIC ANSWERS BEFORE PROCEEDING

| # | Question | Impacts |
|---|----------|---------|
| Q1 | Is `totalEarnings` stored as PKR or TX-Points in the DB? | Tasks 1-D, 2.1 |
| Q2 | Is referral cash PKR in user portal within spec? | Task 1-D bullet 4 |
| Q3 | Idempotency strategy for withdrawals? | Task 1.6 |
| Q4 | GPS float math tolerance? | Task 1.1 step 4 |
| Q5 | Real-time leaderboard broadcast vs poll? | Task 3.2 |

*Please answer these questions so remediation can begin on the blocked tasks without risk of misalignment.*

---

*End of Remediation Plan — 2026-07-22*
