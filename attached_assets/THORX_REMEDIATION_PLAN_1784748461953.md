# THORX PLATFORM — REMEDIATION MASTER PLAN
**Date:** 2026-07-22  
**Source:** THORX_FULL_AUDIT_REPORT.md (47 findings)  
**Execution Order:** CRITICAL → HIGH → MEDIUM → LOW  
**Rule:** No feature development until all CRITICAL and HIGH items are resolved.

---

## PRIORITY MATRIX

| Priority | Count | Must-fix before |
|---|---|---|
| 🔴 CRITICAL | 7 | Any production traffic |
| 🟠 HIGH | 14 | Any public launch |
| 🟡 MEDIUM | 15 | First paying cohort |
| 🟢 LOW | 11 | V2 milestone |

---

# PHASE 1 — CRITICAL (Fix First, No Exceptions)

---

### TASK C-01: Strip `passwordHash` from `/api/team/users` Response
**Severity:** 🔴 CRITICAL — Security  
**File:** `server/routes.ts:921`  
**Finding:** `GET /api/team/users` returns the full Drizzle row, which includes the `passwordHash` column. Team members with `VIEW_USERS` permission can read bcrypt hashes for every user.

**Fix:**
```typescript
// In the getUsersPaginated result mapping, explicitly omit passwordHash:
const sanitized = users.map(({ passwordHash, ...safe }) => safe);
res.json({ users: sanitized, total });
```
Apply the same strip to every admin/team endpoint that returns a `User` row: `/api/admin/users/export`, `/api/team/users/:id` (if it exists), and any bulk export that serializes raw user objects.

---

### TASK C-02: Wrap `reclassifyEarning` in an Atomic Transaction
**Severity:** 🔴 CRITICAL — Financial Integrity  
**File:** `server/storage.ts:3739–3740`  
**Finding:** `db.update(earnings)` and `db.insert(auditLogs)` are two sequential bare DB calls. A crash between them commits the reclassification with no audit trail.

**Fix:**
```typescript
async reclassifyEarning(earningId: string, newType: string, adminId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(earnings).set({ type: newType }).where(eq(earnings.id, earningId));
    await tx.insert(auditLogs).values({
      adminId,
      action: "RECLASSIFY_EARNING",
      targetType: "earning",
      targetId: earningId,
      details: { newType, reclassifiedBy: adminId },
    });
  });
}
```

---

### TASK C-03: Add `FOR UPDATE` Lock and Transaction to `createFounderWithdrawal`
**Severity:** 🔴 CRITICAL — Financial Integrity / Double-Spend  
**File:** `server/storage.ts:3598`  
**Finding:** Direct `db.insert(founderWithdrawals)` with no balance check, no lock, and no transaction. A founder can race two requests and create duplicate withdrawal records.

**Fix:** Wrap in `db.transaction`, add a `SELECT ... FOR UPDATE` on the founder's user row, verify sufficient balance, then insert. Mirror the pattern from `createWithdrawal` (storage.ts:2000).

---

### TASK C-04: Add `SIGTERM` and `SIGINT` Graceful Shutdown Handlers
**Severity:** 🔴 CRITICAL — Production Reliability  
**File:** `server/index.ts`  
**Finding:** No `SIGTERM`/`SIGINT` handlers. Kubernetes, Railway, and Docker send SIGTERM on container stop. Without a handler, in-flight withdrawal transactions are killed mid-execution leaving funds in an unknown state.

**Fix:**
```typescript
function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal — draining connections");
  if (__thorxServer) {
    __thorxServer.close(() => {
      logger.info("All connections drained — process exiting cleanly");
      process.exit(0);
    });
    // Force exit after 30s if connections don't drain
    setTimeout(() => {
      logger.error("Drain timeout — forcing exit");
      process.exit(1);
    }, 30_000).unref();
  } else {
    process.exit(0);
  }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
```

---

### TASK C-05: Authenticate and Rate-Limit `/api/config/:key` and `/api/system-config/:key`
**Severity:** 🔴 CRITICAL — Security  
**Files:** `server/routes.ts:3529`, `server/routes.ts:4296`  
**Finding:** Both endpoints accept any key name with no authentication. Sensitive business parameters (fee %, conversion rate, engine ratios) can be read by any unauthenticated caller.

**Fix (Option A — preferred if frontend needs these):** Add a strict `ALLOWED_PUBLIC_KEYS` set and reject any key not in it. Add a general rate limiter.
```typescript
const ALLOWED_PUBLIC_CONFIG_KEYS = new Set(['SOME_SAFE_KEY']);
app.get("/api/config/:key", generalRateLimiter, async (req, res) => {
  if (!ALLOWED_PUBLIC_CONFIG_KEYS.has(req.params.key)) {
    return res.status(403).json({ message: "Key not accessible", error: "FORBIDDEN" });
  }
  // ... existing logic
});
```
**Fix (Option B — if no frontend needs these publicly):** Add `requireSessionAuth` to both.

> **Awaiting clarification from Q3 before implementing** — see Audit Report §Clarifications.

---

### TASK C-06: Fix `unhandledRejection` to Call `Sentry.captureException`
**Severity:** 🔴 CRITICAL — Observability  
**File:** `server/index.ts:25`  
**Finding:** Unhandled promise rejections are logged via pino but never sent to Sentry.

**Fix:**
```typescript
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection");
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
});
```

---

### TASK C-07: Wrap Leaderboard Cache Rebuild in a Transaction
**Severity:** 🔴 CRITICAL — Data Availability  
**File:** `server/storage.ts:3088–3210`  
**Finding:** `db.delete(leaderboardCache)` followed by batch inserts is not atomic. A crash between delete and inserts leaves the leaderboard table empty for all users.

**Fix:** Wrap the entire rebuild (delete + all inserts) in a single `db.transaction`. This ensures the old data is only removed if all new data is successfully written.
```typescript
await db.transaction(async (tx) => {
  await tx.delete(leaderboardCache);
  for (const chunk of chunks) {
    await tx.insert(leaderboardCache).values(chunk);
  }
});
```

---

# PHASE 2 — HIGH PRIORITY

---

### TASK H-01: Add Client-Side Idempotency Key to Withdrawal Submission
**Severity:** 🟠 HIGH — Concurrency  
**Files:** Client withdrawal form + `server/routes.ts` POST /api/withdrawals  
**Finding:** No idempotency key prevents a double-click from submitting two withdrawal requests simultaneously. The `FOR UPDATE` lock and partial unique index mitigate overdraw, but two rows can still be created before the lock is obtained.

**Fix:** Generate a UUID on the client when the withdrawal modal opens. Send it as `X-Idempotency-Key` header. Server checks a short-TTL cache (or DB unique column) — if the key was seen within the last 60 seconds, return the original response.

---

### TASK H-02: Broadcast WS Events on `leaveGuild`, `removeGuildMember`, and `disbandGuild`
**Severity:** 🟠 HIGH — Cross-Portal Sync  
**File:** `server/routes.ts:1108, 1120, 1498`  
**Finding:** Three guild state changes have no WebSocket broadcast, leaving affected users on stale UI.

**Fix for each:**
```typescript
// After storage.leaveGuild(guildId, userId):
broadcastUserUpdated(userId, "guild_left");
broadcastGuildEvent(guildId, 'guild.member_left', { userId, guildId });

// After storage.removeGuildMember(guildId, userId, captainId):
broadcastUserUpdated(userId, "guild_removed");
broadcastGuildEvent(guildId, 'guild.member_removed', { userId, guildId });

// After setGuildStatus('disbanded'):
broadcastGuildEvent(guildId, 'guild.disbanded', { guildId });
// Also call closeUserSockets or broadcastUserUpdated for each member
```
Wire corresponding handlers in `client/src/hooks/useRealtimeSync.ts` to invalidate guild queries.

---

### TASK H-03: Remove Hardcoded Fallback from `/api/stats`
**Severity:** 🟠 HIGH — Data Integrity  
**File:** `server/routes.ts:1862–1868`  
**Finding:** DB query failure silently returns `{ totalPaid: "2.50", activeUsers: 45, securityScore: 99 }` — fabricated social proof data.

**Fix:** Replace the catch block with a proper error response or a genuine zero-state:
```typescript
} catch (error) {
  logger.error({ err: error }, "Get live stats error");
  res.json({ totalPaid: "0.00", activeUsers: 0, securityScore: 99 });
}
```

---

### TASK H-04: Replace All `.toNumber()` on Financial Decimals in API Responses
**Severity:** 🟠 HIGH — Financial Precision  
**Files:** `server/storage.ts:1973–1975, 2502, 3134, 3151, 3390–3392, 3631–3635`  
**Finding:** Decimal precision is discarded when `.toNumber()` converts to IEEE-754 floats for JSON serialization. At financial scale (many decimal places), this introduces silent rounding errors.

**Fix:** Return all financial values as strings (`.toFixed(2)` or `.toString()`) from every API endpoint. Update all API response types to `string` for monetary fields. Frontend must parse with `new Decimal(value)` for any arithmetic, and use `.toFixed(2)` only for display.

```typescript
// Before:
return { exactPkr: exactPkr.toNumber(), platformFee: platformFee.toNumber() };

// After:
return { exactPkr: exactPkr.toFixed(2), platformFee: platformFee.toFixed(2) };
```

---

### TASK H-05: Replace `Number()` + `+` Arithmetic in Profit Ledger Aggregation
**Severity:** 🟠 HIGH — Financial Precision  
**File:** `server/storage.ts:3465–3472`  
**Finding:** `engineCuts[key] += Number(r.cut)` accumulates floats. For a profit ledger, every penny must be exact.

**Fix:** Use `Decimal` throughout the accumulation:
```typescript
import Decimal from 'decimal.js';
const engineCuts: Record<string, Decimal> = {};
for (const r of rows) {
  engineCuts[r.key] = (engineCuts[r.key] ?? new Decimal(0)).plus(new Decimal(r.cut));
}
const totalEngineCuts = Object.values(engineCuts).reduce((a, b) => a.plus(b), new Decimal(0));
// Serialize as strings for JSON response
```

---

### TASK H-06: Add Rate Limiter to `/api/team/invitations/verify/:token`
**Severity:** 🟠 HIGH — Security  
**File:** `server/routes.ts:461`  
**Finding:** No rate limit on token verification — tokens can be brute-forced.

**Fix:** Apply `authRateLimiter` (or a dedicated `inviteVerifyRateLimiter` at 10 req/15min) to this route.

---

### TASK H-07: Ensure Raw SQL Partial Unique Indexes Are In Migration Files
**Severity:** 🟠 HIGH — Data Integrity  
**Files:** `migrations/`, `shared/schema.ts`  
**Finding:** `uniq_user_transactions_source` and `uniq_withdrawals_one_pending_per_user` are not tracked in the Drizzle schema or migration system. Every fresh DB deploy silently loses double-earn and double-withdrawal protection.

**Fix:** Add these to a migration file that runs automatically:
```sql
-- migrations/0001_critical_partial_indexes.sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_transactions_source
  ON user_transactions (source_id, source_type)
  WHERE source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_withdrawals_one_pending_per_user
  ON withdrawals (user_id)
  WHERE status = 'pending';
```
Also add a startup check that verifies these indexes exist and logs a CRITICAL warning if not.

---

### TASK H-08: Replace `parseFloat` with `Decimal` in `AdminDashboard.tsx` and `LeaderboardInsights.tsx`
**Severity:** 🟠 HIGH — Financial Display Accuracy  
**Files:** `client/src/components/admin/AdminDashboard.tsx:279`, `client/src/components/admin/LeaderboardInsights.tsx:93–94, 292, 429, 568`  
**Finding:** `parseFloat(metrics?.totalEarnings)` converts a precision-safe string to a float before any arithmetic or display formatting.

**Fix:** Use `new Decimal(value || "0").toFixed(2)` for any arithmetic, and pass the string directly to `toLocaleString` via a display utility:
```typescript
// Utility:
function fmtPkr(val: string | number | null | undefined): string {
  return new Decimal(val ?? "0").toFixed(2);
}
// Usage: value={`₨${fmtPkr(metrics?.totalEarnings)}`}
```

---

### TASK H-09: Add SIGTERM-Aware Connection Pool Draining
**Severity:** 🟠 HIGH (companion to C-04)  
**File:** `server/index.ts`  
**Finding:** The DB connection pool (Neon serverless) must also be shut down cleanly on SIGTERM to avoid hung connections.

**Fix:** In the graceful shutdown handler (C-04), add:
```typescript
const { pool } = await import("./db");
pool.end(); // drain connection pool after server.close()
```

---

### TASK H-10: Add Missing Composite Indexes
**Severity:** 🟠 HIGH — Database Performance  
**File:** `shared/schema.ts` (add), plus migration SQL  

| Table | Index to Add | Reason |
|---|---|---|
| `task_records` | `(user_id, task_id, DATE(completed_at))` | Daily task completion check |
| `points_ledger` | `(guild_id, week_start, user_id)` | GPS weekly aggregation |
| `leaderboard_cache` | `score DESC` | Ordered leaderboard page reads |
| `score_history` | `(user_id, snapshot_at DESC)` | Latest-snapshot fetches |

Add these as Drizzle `index()` declarations in `shared/schema.ts` and include them in the next migration.

---

### TASK H-11: Add `getUsersForRiskEngine` Hard Cap
**Severity:** 🟠 HIGH — Memory Safety  
**File:** `server/modules/risk-engine.ts` + `server/storage.ts`  
**Finding:** Risk engine scans all active users with no maximum. At 100k users this risks OOM.

**Fix:** Add `LIMIT 5000` (configurable via `system_config`) to the risk engine user fetch query. Process in batches of 500 if a full scan is required.

---

### TASK H-12: Clarify and Enforce PKR-vs-TX-Points in Admin Portal
**Severity:** 🟠 HIGH — Product Consistency  
**Files:** `UserManager.tsx`, `UserInspectorPanel.tsx`, `AdminDashboard.tsx`, `LeaderboardInsights.tsx`  
**Finding:** Every admin component renders PKR with `₨` and `PKR` prefixes. This may be intentional for business accounting, but it is undocumented and inconsistent with the Points-Only Mandate.

**Fix (pending Q1 clarification):**
- If admin should see PKR: Add an `// ADMIN_PKR_DISPLAY: intentional` comment block at the top of each affected file to document the exception.
- If admin should see TX-Points: Replace all `₨`/`PKR` displays with a `toTxPoints(pkrString)` conversion using `CONVERSION_RATE` from system config.

---

### TASK H-13: Replace `console.*` with `pino` Logger in Remaining Files
**Severity:** 🟠 HIGH — Observability  
**Files:** `hilltopads-service.ts:133,174`, `index.ts:43`, `live-feed.ts:40`, `validation.ts:63,127,130`, `vite.ts:15`

**Fix:** Import the `logger` instance from `server/lib/logger.ts` and replace each call:
```typescript
// Before: console.error("Failed to sync HilltopAds inventory:", error);
// After:  logger.error({ err: error }, "Failed to sync HilltopAds inventory");
```

---

### TASK H-14: Add `CREDENTIAL_ENCRYPTION_KEY` to Required Env Validation
**Severity:** 🟠 HIGH — Security  
**File:** `server/index.ts`  
**Finding:** The key is used in production credential storage but only warned on — a missing key silently falls back to a hardcoded value, encrypting all stored ad-network credentials with a known key.

**Fix:** Add to the `validateRequiredEnv` array:
```typescript
{ key: 'CREDENTIAL_ENCRYPTION_KEY', hint: 'Required for secure credential storage. Generate with: openssl rand -hex 32' }
```
Gate this check on `NODE_ENV === 'production'` to not block local development.

---

# PHASE 3 — MEDIUM PRIORITY

---

### TASK M-01: Add Overflow Wrappers to All Admin Data Tables
**Severity:** 🟡 MEDIUM — Responsive Design  
**Files:** `LeaderboardInsights.tsx`, `UserManager.tsx`, `AdminDashboard.tsx`

Wrap every `<table>` in:
```tsx
<div className="overflow-x-auto w-full">
  <table className="min-w-[900px]">
    {/* ... */}
  </table>
</div>
```

---

### TASK M-02: Add Responsive Grid Breakpoints to Dashboard Cards
**Severity:** 🟡 MEDIUM — Responsive Design  
**File:** `client/src/components/admin/AdminDashboard.tsx`

Replace static `grid-cols-4` / `grid-cols-3` with:
```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
```

---

### TASK M-03: Add Toast Notifications to All Silent Mutations
**Severity:** 🟡 MEDIUM — UX Polish  

For each mutation below, add `onSuccess` and `onError` toast handlers:

| Mutation | File | Toast Needed |
|---|---|---|
| Trust status toggle | `UserInspectorPanel.tsx` | ✅ Success + ❌ Error |
| Balance adjust (admin) | `UserManager.tsx` | ❌ Error path missing |
| Copy referral link (clipboard fail) | `UserPortal.tsx` | ❌ Error toast |
| Guild settings save | Guild settings component | ✅ Success + ❌ Error |
| Profile photo upload | `UserPortal.tsx` | ❌ Error toast on upload failure |

---

### TASK M-04: Add Empty State Components to Zero-Data Views
**Severity:** 🟡 MEDIUM — UX Polish  

| View | Empty State to Add |
|---|---|
| Leaderboard (no entries) | "Rankings will appear here once activity begins." |
| Guild member list (no members) | "No members yet — share your guild invite link." |
| Withdrawal history (no withdrawals) | "Your withdrawal history will appear here." |
| Admin dashboard (0 users) | Contextual onboarding empty state with CTA |
| Notification panel (0 notifications) | "You're all caught up!" |

---

### TASK M-05: Replace Leaderboard Cache Full-Delete with Upsert Strategy
**Severity:** 🟡 MEDIUM — Availability  
**File:** `server/storage.ts:3088–3210`  
(C-07 fixes the crash risk; this task improves the rebuild strategy)

**Fix:** Use `INSERT ... ON CONFLICT DO UPDATE` (upsert) instead of DELETE + INSERT. This keeps old data live during the rebuild and only overwrites rows that have new scores.

---

### TASK M-06: Add Allowlist Validation to Public Config Key Lookups
**Severity:** 🟡 MEDIUM — Security  
**Files:** `server/routes.ts:3529, 4296`  
(Companion to C-05 — implement the allowlist approach if public access is confirmed)

Define `ALLOWED_PUBLIC_CONFIG_KEYS` as a Set of the specific keys the frontend legitimately needs and reject all others with `403`.

---

### TASK M-07: Fix `parseFloat` in `UserInspectorPanel.tsx`
**Severity:** 🟡 MEDIUM — Financial Display  
**File:** `client/src/components/admin/UserInspectorPanel.tsx:139, 148`

Replace `parseFloat(user.totalEarnings || "0").toLocaleString()` with a proper `fmtPkr` utility (defined in H-08).

---

### TASK M-08: Add `getExtendedMetrics` LIMIT Guard
**Severity:** 🟡 MEDIUM — Performance  
**File:** `server/storage.ts` (getExtendedMetrics function)

Add `LIMIT 10000` or equivalent cap to any subquery that aggregates across the full user table without a time-range filter.

---

### TASK M-09: Document Raw SQL Indexes in a Post-Deploy Checklist
**Severity:** 🟡 MEDIUM — Ops  
**File:** New `DEPLOYMENT_CHECKLIST.md`

Until the Drizzle migration system tracks the partial unique indexes (H-07), add a deployment checklist that explicitly lists the raw SQL commands to run after `drizzle-kit push`.

---

### TASK M-10: Add Integration Tests for Auth and Financial Flows
**Severity:** 🟡 MEDIUM — Quality  
**File:** `server/__tests__/`

Add Vitest integration tests (using `supertest` against the Express app) covering:
- Registration → Login → `/api/user` session check → Logout → 401
- Withdrawal: submit → confirm pending → admin approve → balance deducted
- Duplicate withdrawal blocked by unique index
- Admin route: non-admin returns 403
- Task completion: idempotent (second call returns existing record, not double-credit)

---

### TASK M-11: Wire `Sentry.captureException` to All `catch` Blocks in Critical Routes
**Severity:** 🟡 MEDIUM — Observability  
**File:** `server/routes.ts` (all financial routes)

The Sentry Express error handler catches unhandled errors. But `try/catch` blocks that return `res.status(500)` without re-throwing bypass Sentry. Add explicit capture to withdrawal, earn, and task-completion catch blocks:
```typescript
} catch (error) {
  Sentry.captureException(error);
  logger.error({ err: error }, "processWithdrawal failed");
  res.status(500).json({ message: "Internal error", error: "INTERNAL_ERROR" });
}
```

---

### TASK M-12 through M-15: Modal Accessibility, Focus Trap, and ARIA Audit
**Severity:** 🟡 MEDIUM — Accessibility  

Audit all Radix UI `<Dialog>` and `<AlertDialog>` components for:
- `aria-labelledby` pointing to the dialog title
- `aria-describedby` on the dialog description
- Focus trap active on open (Radix handles this natively — verify no overrides break it)
- ESC key closes all modals without data loss

---

# PHASE 4 — LOW PRIORITY (Polish & V2)

---

### TASK L-01: Add `Content-Security-Policy` Header for Production
**File:** `server/index.ts:83`  
Configure explicit CSP for production that allows the ad network domains (HilltopAds CDN URLs) while blocking everything else.

### TASK L-02: Add Migration Rollback Scripts
**File:** `migrations/`  
For each forward migration, write a corresponding rollback SQL file. This enables `drizzle-kit migrate --rollback` workflows.

### TASK L-03: Set Up `BOOTSTRAP_SECRET` Env Validation
**File:** `server/routes.ts` (bootstrap endpoint)  
Add `BOOTSTRAP_SECRET` to the startup env validation list with a warning if absent in production.

### TASK L-04: Incremental Leaderboard Refresh (Delta-Only)
Instead of rebuilding the full cache every 5 minutes, track `updatedAt` on users and only recompute scores for users who changed in the last 5 minutes.

### TASK L-05: `vite.ts` Console → Pino
**File:** `server/vite.ts:15`  
The Vite dev server log helper uses `console.log`. Replace with the pino logger for consistent log formatting in development.

### TASK L-06: Add `SENTRY_DSN` to Startup Validation
**File:** `server/index.ts`  
Warn (not error) at startup if `SENTRY_DSN` is not set in production so the absence is never silent.

### TASK L-07: Add Withdrawal Submission Button Debounce on Frontend
**Files:** Withdrawal modal component  
Disable the Submit button for 2 seconds after first click (belt-and-suspenders companion to H-01 idempotency key).

### TASK L-08: Add `(user_id, DATE(completed_at))` Index to `task_records`
**File:** `shared/schema.ts`  
Companion to H-10 — specifically for the daily "one task per day" check query pattern.

### TASK L-09: Add API Response Type Definitions for Financial Fields
Define TypeScript interfaces that explicitly type all monetary API fields as `string` (not `number`), preventing future float contamination at compile time.

### TASK L-10: Add Load Testing Baseline
Use `autocannon` or `k6` to establish a performance baseline for `/api/leaderboard`, `/api/user`, and `POST /api/withdrawals` before the first public cohort.

### TASK L-11: CSP `crossOriginEmbedderPolicy` — Evaluate Re-enabling
**File:** `server/index.ts:84`  
Evaluate whether HilltopAds video embeds require COEP to be disabled. If not, re-enable it for security.

---

# EXECUTION SUMMARY

```
PHASE 1 — CRITICAL (7 tasks):   C-01 through C-07
PHASE 2 — HIGH    (14 tasks):   H-01 through H-14
PHASE 3 — MEDIUM  (15 tasks):   M-01 through M-12+
PHASE 4 — LOW     (11 tasks):   L-01 through L-11

Total: 47 tasks addressing 47 audit findings.
```

**Recommended execution order within CRITICAL:**
1. **C-01** (password hash leak) — immediate security fix, 5 minutes
2. **C-04 + C-09** (SIGTERM + pool drain) — protects in-flight transactions on next deploy
3. **C-02** (reclassifyEarning atomicity) — financial integrity
4. **C-03** (founderWithdrawal lock) — financial integrity
5. **C-05** (config key auth) — awaiting Q3 clarification
6. **C-06** (Sentry unhandledRejection) — observability
7. **C-07** (leaderboard rebuild transaction) — data availability

**Do not begin PHASE 2 until all PHASE 1 tasks are merged and verified in production.**

---

*Remediation plan version 1.0 — tied to THORX_FULL_AUDIT_REPORT.md (2026-07-22). Update task status in this file as fixes are merged.*
