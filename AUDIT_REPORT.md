# THORX FORENSIC AUDIT REPORT
**Date:** 2026-07-22  
**Scope:** Full-system microscopic audit — financial integrity, security, database, frontend UX, infrastructure  
**Standard:** Zero-bug, million-dollar production platform  
**Status:** All findings unedited; no code patches applied

---

## TABLE OF CONTENTS

- [CATEGORY 1 — Mistakes, Bugs & Gaps](#category-1)
- [CATEGORY 2 — Million-Dollar Standards Gap](#category-2)
- [CATEGORY 3 — Ecosystem Disconnection & UX Friction](#category-3)
- [Business Logic Clarifications Required](#clarifications)

---

<a name="category-1"></a>
## CATEGORY 1: MISTAKES, BUGS & GAPS

### F-01 · CRITICAL · Native Integer Accumulation in Withdrawal Point Sum
**File:** `server/storage.ts` ~line 1943–1955  
**Finding:** The function that builds a withdrawal's ledger coverage accumulates points using a native JS `+=`:
```typescript
let pointsAccumulated = 0;
// ...
pointsAccumulated += row.pointsCredited;  // ← raw JS number addition
```
`pointsCredited` values come from the database as JS numbers (via Drizzle's type coercion). While they are stored as integers in practice, the accumulator is never validated to be an integer before comparison. If any ledger row carries a non-integer `pointsCredited` value (e.g., from a historical data anomaly or schema drift), floating-point drift would silently corrupt the coverage check, allowing a withdrawal to proceed with fewer points than claimed or be incorrectly rejected. This should be a `Decimal` accumulation chain with an explicit integer-floor assertion at the end.

---

### F-02 · CRITICAL · `parseInt` on Withdrawal Amount — Silently Truncates Decimals
**File:** `server/storage.ts` lines 1992, 2110  
**Finding:** Two separate call sites parse the withdrawal `amount` field (stored as a string) using `parseInt`:
```typescript
const pointsRequested = parseInt(insertWithdrawal.amount, 10);  // line 1992
const pointsRequested = parseInt(withdrawal.amount, 10);        // line 2110
```
`parseInt("1500.9", 10)` returns `1500`, silently discarding the fractional part. If a malformed request or data migration results in a non-integer string reaching this path, points are under-counted without any error or rejection. The correct tool is `new Decimal(withdrawal.amount).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber()` with a preceding integer validation.

---

### F-03 · HIGH · `createUser` Not Transactional — Referral + Insert Can Partially Fail
**File:** `server/storage.ts` line 683  
**Finding:** The `createUser` function executes a referrer lookup (`getUserById`) followed by a `db.insert(users)` as two independent database operations, with no surrounding `db.transaction()`:
```typescript
// line 690: reads referrer (no lock, no tx)
const referrer = await this.getUserById(insertUser.referredBy);
// ... validation ...
// line ~714: inserts user (separate connection)
const [newUser] = await db.insert(users).values(userData).returning();
```
**Risk A:** If the referrer lookup passes validation but the user insert fails (e.g., constraint violation), no rollback is needed — but the referrer-validity window is non-atomic.  
**Risk B:** Under concurrent load, two registrations with the same referral code can both pass the `referrer.referredBy === insertUser.id` circular-referral check (line 697) between reads, since neither holds a row lock.  
**Fix:** Wrap the entire `createUser` body in `db.transaction(tx => {...})` and pass `tx` to all sub-queries, using `FOR UPDATE` on the referrer row.

---

### F-04 · HIGH · `prepareWeeklyTaskCompletion` — TOCTOU Race on Task Records
**File:** `server/storage.ts` ~line 5173–5183  
**Finding:** This function reads `weeklyTaskRecords` to check for duplicates, then inserts a new record as two separate un-transacted operations. Under concurrent requests (e.g., rapid double-tap on the frontend or a retry), both reads can return "no record found" before either write completes, producing duplicate task completion records. The existing `completeWeeklyTaskAtomic` function correctly guards against this for the completion step, but `prepareWeeklyTaskCompletion` remains exposed.

---

### F-05 · HIGH · `updateUserEarnings` Unguarded — Called Without Transaction in Several Paths
**File:** `server/storage.ts` line 829  
**Finding:** `updateUserEarnings` accepts an optional `tx` parameter. Callers that omit `tx` execute a balance update on the `users` table outside any transaction. If the caller's surrounding logic fails after calling this function but before completing its own commit, the balance update is not rolled back — the user's balance is permanently modified with no corresponding ledger entry. All callers must be audited to ensure `tx` is always provided.

---

### F-06 · HIGH · Chatbot `conversationContexts` Map Has No TTL — Unbounded Memory Growth
**File:** `server/chatbot/advanced-chatbot-service.ts` line 104  
**Finding:** The advanced chatbot service holds an in-memory `Map<string, ConversationContext>` with no expiry or eviction policy:
```typescript
private conversationContexts: Map<string, ConversationContext> = new Map();
```
The `clearContext` method (line 491) is only called on explicit user action. In production, users who start conversations but never explicitly clear them leave permanent entries. With thousands of active users, each storing potentially large conversation history objects, this is a significant memory leak that will accumulate until the server process is restarted.

---

### F-07 · MEDIUM · `Number(row.points)` / `Number(row.pkr)` — Float Conversion on Financial Data
**File:** `server/storage.ts` line 3418 (`getLeaderboardStats` or similar aggregation)  
**Finding:**
```typescript
return { points: Number(row.points), pkr: Number(row.pkr) };
```
Decimal string values from the database are converted to JS floats before being returned from the storage layer. If the calling route performs any arithmetic on these values (e.g., ratio calculation, formatting), IEEE-754 drift is introduced. These should remain as `Decimal` objects or be returned as strings and converted only at the last display step.

---

### F-08 · MEDIUM · `thorx-card.ts` Admin Simulation Converts Back to Float
**File:** `server/modules/thorx-card.ts` line 96  
**Finding:**
```typescript
new Decimal(grossPkr).times(engineSplits.userCutPct).div(100).toNumber()
```
The simulation path correctly uses `Decimal` for computation but converts to a native float via `.toNumber()` before passing into downstream logic. While this is a simulation (not a live earn event), it means the simulation results shown to admins may not precisely represent what the real engine produces, undermining trust in the tool.

---

### F-09 · MEDIUM · Password Reset Is a Support Stub — No Automated Token Flow
**File:** `server/routes.ts` lines 3087, 3103  
**Finding:** Both `/api/forgot-password` and `/api/reset-password` return "Please contact support" responses. There is no token generation, email delivery, token expiry, or actual password update flow. Users who forget their password have no self-service recovery path. This is a gap that affects real users in production and forces manual intervention for every password reset request.

---

### F-10 · MEDIUM · PKR Balance Visible in Commission History Tab
**File:** `client/src/pages/UserPortal.tsx` commissions query (line 626)  
**Finding:** The commission history tab fetches and renders `commission_logs` data which contains raw PKR amounts. The "Points-Only Mandate" requires that all user-facing value displays use TX-Points until the withdrawal screen. The commission display shows PKR-denominated values without conversion, violating this rule. Every balance-adjacent display must translate through the conversion rate and show TX-Points equivalents.

---

### F-11 · LOW · `leaderboard-refresh` Percentile Uses `.toNumber()` Float Conversion
**File:** `server/storage.ts` line 3137, 3154  
**Finding:**
```typescript
.map(u => new Decimal(u.totalEarnings || "0").toNumber()) // float intentional — sort/percentile only
```
The comment acknowledges this is intentional for sorting, but percentile rank computations using float comparisons on large datasets can produce slightly inconsistent bucket edges at scale. This is low priority since results are not stored as financial values, but should be noted for future enterprise-grade rank precision.

---

<a name="category-2"></a>
## CATEGORY 2: MILLION-DOLLAR COMPANY STANDARDS GAP

### S-01 · CRITICAL · Hardcoded Fallback Session Secret in Production Code
**File:** `server/routes.ts` line ~350  
**Finding:**
```typescript
secret: process.env.SESSION_SECRET || "thorx-secret-key-dev-only"
```
A hardcoded fallback secret is present in the production-deployed codebase. If `SESSION_SECRET` is ever accidentally unset in the environment (e.g., during a deployment misconfiguration), the server silently falls back to a publicly visible string. Any attacker who reads this source code (which is on GitHub) can forge arbitrary session cookies. The server must `throw` / `process.exit(1)` if `SESSION_SECRET` is missing — no fallback allowed. (Note: `validateRequiredEnv` in `index.ts` checks `SESSION_SECRET` on startup, but the fallback in the session config means a race condition exists if the check order ever changes.)

---

### S-02 · HIGH · `/api/admin/users/:id/trust-status` Lacks Rate Limiter
**File:** `server/routes.ts` ~line 4227  
**Finding:** This admin endpoint, which modifies a user's trust status (a sensitive privilege action affecting withdrawal eligibility), has no rate limiter applied. It is protected by auth middleware, but a compromised admin account or a logic bug allowing bypassed auth could loop through all user IDs without any throttle. Should use `adminActionRateLimiter`.

---

### S-03 · HIGH · `/api/admin/risk-cases/:id` PATCH Lacks Rate Limiter
**File:** `server/routes.ts` ~line 4444  
**Finding:** Updating risk case status (Open → Investigating → Resolved) is an irreversible admin action with financial consequences (closed risk cases may unblock withdrawals). This route lacks a rate limiter. Add `adminActionRateLimiter`.

---

### S-04 · HIGH · `/api/admin/simulate/thorx-card` — Manual Parsing Instead of Zod Schema
**File:** `server/routes.ts` ~line 4749  
**Finding:** This route manually performs `parseInt`, `new Decimal(String(...))`, and bounds-checking inline instead of parsing the entire payload through a Zod schema first:
```typescript
grossPkr: new Decimal(String(grossPkr ?? "1.0")).toNumber(),
conversionRate: new Decimal(String(conversionRate ?? "1000")).toNumber(),
```
Without Zod, type coercion errors produce misleading simulation outputs rather than clean validation errors. A malformed payload can cause the Decimal constructor to throw unhandled exceptions.

---

### S-05 · HIGH · `/api/hilltopads/config` POST — Manual Body Extraction, No Zod
**File:** `server/routes.ts` ~line 3547  
**Finding:** This route manually extracts `apiKey`, `publisherId`, and `settings` from `req.body` without a Zod schema. No type enforcement, no length limits, no structural validation. Ad config is a sensitive system setting; a malformed payload could corrupt the HilltopAds integration configuration silently.

---

### S-06 · HIGH · `CREDENTIAL_ENCRYPTION_KEY` Not Set — Ad Network Credentials Stored with Fallback Key
**File:** `server/index.ts` line ~40, `server/utils/credential-crypto.ts`  
**Finding:** The server logs a warning on every startup:
> `CREDENTIAL_ENCRYPTION_KEY is not set — credential storage will use the fallback key`  
This key protects AES-256-GCM encryption of ad-network API keys stored in `user_credentials`. Using the fallback key (`SESSION_SECRET`) means that if `SESSION_SECRET` ever rotates, all stored credentials become permanently unreadable without re-entry. This is a production-blocking configuration gap.

---

### S-07 · MEDIUM · No Automated Password Reset Flow
**See F-09 above.** At the million-dollar standard: users must have a self-service, token-based, rate-limited, time-expiring password reset flow. Manual support-based resets do not scale and create a social engineering attack surface (anyone can impersonate a user via a "support" request).

---

### S-08 · MEDIUM · `scripts/seed-founder.ts` Contains Plaintext Credentials
**File:** `scripts/seed-founder.ts`  
**Finding:** This script contains references to the founder email and password in plaintext. While it is a script (not runtime server code), it is committed to the repository. Any person with read access to the repo (or who forks it) has the founder's credentials. Seed scripts must accept credentials via environment variables only, never hardcode them.

---

### P-01 · CRITICAL · Risk Engine N+1 Query Pattern — Up to 35,000 Queries Per Scan
**File:** `server/modules/risk-engine.ts` lines ~390–421  
**Finding:** `runFullRiskScan` loads up to 5,000 active users, then calls `scoreUser(u.id)` for each one inside a loop. Each `scoreUser` call executes ~7 separate DB queries (one per risk signal). At 5,000 users this is **~35,000 round-trips per scan**. The risk engine runs on a schedule and on-demand. Under moderate user load this will saturate the DB connection pool (default: 10 connections) and cascade into timeout failures across the entire application.
**Fix:** Rewrite risk scoring to use a single multi-column aggregate SQL query or batched CTEs that compute all signals in one pass.

---

### P-02 · HIGH · Leaderboard Refresh Loads 10,000 Users Into Memory
**File:** `server/storage.ts` ~line 3070 (`refreshLeaderboardCache`)  
**Finding:** The leaderboard cache refresh query fetches the top 10,000 active users into a Node.js array, then performs in-memory percentile ranking before writing results back to `leaderboard_cache`. Additionally, a separate `GROUP BY users.referredBy` query performs a full table scan of `users` to compute referral counts. This process runs every 5 minutes (via `leaderboard-refresh.ts`). At scale:
- 10,000 user objects × average ~2KB each ≈ 20MB allocated per refresh cycle
- Full `users` table scan every 5 minutes creates heavy read I/O  
**Fix:** Move percentile ranking into a SQL window function (`PERCENT_RANK() OVER (ORDER BY performance_score DESC)`). Referral counts should be maintained as a denormalized counter or computed via an indexed aggregate.

---

### P-03 · HIGH · `guild-reset.ts` Weekly Reset — Unbounded Guild Load + N+1 Members Loop
**File:** `server/jobs/guild-weekly-reset.ts` line 63  
**Finding:**
```typescript
db.select().from(guilds).where(eq(guilds.status, "active"))  // no LIMIT
```
All active guilds are loaded into memory at once. The function then iterates through each guild and executes multiple queries per guild (including a nested loop over members at line ~112). As the platform scales to hundreds or thousands of guilds, this job will time out and partially complete, leaving guilds in inconsistent weekly states.

---

### P-04 · HIGH · `score_history` and `audit_logs` Tables Have No Retention Policy
**File:** `shared/schema.ts`, `server/jobs/`  
**Finding:** The `score_history` table accumulates one row per user per hour (health snapshot job). The `audit_logs` table accumulates one row per admin action. Neither table has a cleanup/archive job. At 1,000 active users, `score_history` generates ~720,000 rows/month. Over 12 months this table will have ~8.6M rows and no index on `snapshotAt` for cleanup queries (composite index exists on userId+snapshotAt but no standalone `snapshotAt` index). `audit_logs` will grow similarly without bound.  
**Fix:** Add a nightly cleanup job that purges `score_history` rows older than 90 days and archives `audit_logs` older than 1 year.

---

### P-05 · HIGH · Missing Composite Index for Leaderboard Query
**File:** `shared/schema.ts`  
**Finding:** The leaderboard refresh query (`server/storage.ts:3115`) filters on `isActive = true AND role = 'user' ORDER BY performanceScore DESC`. While individual indexes exist on `isActive`, `role`, and `performanceScore`, there is no composite index on `(isActive, role, performanceScore DESC)`. PostgreSQL must intersect three separate index scans, which is significantly slower than a single composite index for this hot query path (runs every 5 minutes).

---

### P-06 · MEDIUM · No Partial Unique Index on `withdrawals` — DB-Level Double-Pending Guard Missing
**File:** `shared/schema.ts`, `server/storage.ts`  
**Finding:** The business rule "one pending withdrawal per user" is enforced only inside a `db.transaction()` with a programmatic check. There is no database-level partial unique index:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_one_pending_per_user
  ON withdrawals(user_id) WHERE status = 'pending';
```
If application logic is bypassed (e.g., direct DB access, a future code path that skips the check), two concurrent pending withdrawals can be created for the same user, leading to a double-spend. The DB constraint is the last line of defense and it is absent.

---

### P-07 · MEDIUM · DB Connection Pool Not Tuned — Default 10 Connections
**File:** `server/db.ts` line 15  
**Finding:** `new Pool()` is instantiated with no `max` option, defaulting to 10 connections. The application runs multiple concurrent background jobs (leaderboard refresh, health snapshot, inactivity penalty, risk scan), each of which can hold connections while executing. Under simultaneous load with a risk scan (potentially saturating all 10 connections), all other requests — including user API calls — queue and time out. Pool should be explicitly sized with `max: 25` and `idleTimeoutMillis: 30000`.

---

### P-08 · MEDIUM · Background Jobs Have No Overlap Guard
**File:** `server/jobs/leaderboard-refresh.ts`, `server/jobs/health-snapshot.ts`, `server/jobs/inactivity-penalty.ts`  
**Finding:** All jobs use `setInterval`. If a run takes longer than the interval (possible for the risk scan or guild reset under load), a new execution starts while the previous one is still running. Two simultaneous health snapshots would double-write to `health_snapshots`. Two simultaneous guild resets could double-process weekly cycles. A simple `isRunning` boolean guard must be added to each job.

---

### O-01 · HIGH · Zero Integration Test Coverage — Auth, Withdrawal, Earn Flows Untested
**File:** `server/__tests__/financial.test.ts` (only test file)  
**Finding:** The only test file is a unit test for pure math functions (split calculations, withdrawal breakdown). The following critical flows have **zero automated test coverage**:
- User registration flow (including referral code validation)
- Login / session lifecycle
- Earn event recording (ledger + balance atomicity)
- Withdrawal creation and approval (the most financially critical path)
- Admin permission enforcement
- WebSocket authentication
- Rate limiter behavior  
Any refactor of `storage.ts` or `routes.ts` can silently break financial integrity with no test catching it.

---

### O-02 · MEDIUM · `console.warn`/`console.error` Remaining in Server Code
**Files:** `server/validation.ts` lines 129, 132 · `server/utils/debug-log.ts` lines 10, 15 · `server/vite.ts` `log()` function  
**Finding:** Several server-side files emit logs via native `console.*` rather than the structured pino logger (`server/lib/logger.ts`). In production, these logs are unstructured plain text that bypass the JSON logging pipeline, cannot be filtered by log level, and are not forwarded to any observability stack. All server-side logging must go through pino.

---

### O-03 · MEDIUM · Financial Errors Not Explicitly Tagged in Sentry
**File:** `server/lib/sentry.ts`, `server/storage.ts`, `server/routes.ts`  
**Finding:** Sentry integration exists but only captures generic 5xx HTTP errors via `sentryErrorHandler`. Financial transaction failures (e.g., a `db.transaction()` rollback in `processWithdrawal`, a `recordEarnEvent` exception) are not explicitly captured with `Sentry.captureException()` and enriched with user context, transaction ID, and amount. In production, a financial failure would appear as a generic "Internal Server Error" in Sentry with no financial context for incident response.

---

<a name="category-3"></a>
## CATEGORY 3: ECOSYSTEM DISCONNECTION & UX FRICTION

### U-01 · HIGH · Hardcoded Query Keys Bypass QUERY_KEYS Registry
**Files:**  
- `client/src/pages/UserPortal.tsx` lines 626, 989, 1064  
- `client/src/components/guild/GuildMemberPanel.tsx` lines 59, 74, 87  
**Finding:** Multiple `useQuery` calls use hardcoded string/array literals as query keys instead of the canonical `QUERY_KEYS` constants defined in `client/src/lib/queryKeys.ts`. This breaks cache invalidation: when a mutation calls `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.commissions })`, the query registered with `['/api/user/commissions']` is a different key and is NOT invalidated. The user sees stale data after mutations.

---

### U-02 · HIGH · `adjustBalanceMutation` and `setTrustStatusMutation` — Silent Failure
**File:** `client/src/components/admin/UserManager.tsx` lines 164, 190  
**Finding:** Both mutations lack `onError` toast handlers. If an admin adjusts a user's balance or trust status and the API call fails (network error, validation error, server error), the UI silently returns to its previous state with no indication that the action failed. The admin has no way to know the change was not applied. This is especially dangerous for balance adjustments.

---

### U-03 · HIGH · `SystemSettingsManager` Mutations — Silent Failure
**File:** `client/src/components/admin/SystemSettingsManager.tsx` lines 67, 528  
**Finding:** The `saveMutation` (saves system config values) and `addMutation` (adds new config key) both lack `onError` handlers. A failed config save will appear to succeed from the admin's perspective, potentially causing the admin to leave the page believing a critical system setting was saved when it was not.

---

### U-04 · HIGH · `HilltopAdsAdmin` — Zero Error State Handling on 4 Queries
**File:** `client/src/pages/HilltopAdsAdmin.tsx`  
**Finding:** Four data-fetching queries (`config`, `zones`, `revenueData`, `balanceData`) have no `isError` handler in the UI. If the HilltopAds API is misconfigured or the backend returns an error, all four panels render their loading/empty state silently with no explanation. Admins cannot diagnose whether data is loading, unavailable, or erroring.

---

### U-05 · MEDIUM · `AdminDashboard` — Analytics and Engine Revenue Queries Lack Error States
**File:** `client/src/components/admin/AdminDashboard.tsx`  
**Finding:** The `analytics` and `engineRevenue` queries lack `isError` UI handling. The dashboard renders empty charts with no indication of failure.

---

### U-06 · MEDIUM · `TeamKeysManager` Mutations — Missing `onError` Toasts
**File:** `client/src/components/admin/TeamKeysManager.tsx`  
**Finding:** `updateStatusMutation`, `addMemberMutation`, and related mutations lack explicit `onError` toast handlers. Team key operations (granting/revoking access) failing silently creates a security-relevant UX gap — admins may believe access was revoked when it was not.

---

### U-07 · MEDIUM · Cross-Portal Sync Relies Entirely on Polling (30–60s Lag)
**Files:** `client/src/pages/UserPortal.tsx` lines 678, 704, 729 · `client/src/components/guild/GuildMemberPanel.tsx`  
**Finding:** Guild state changes (captain messages, weekly targets, milestone updates) made in the Team Portal take up to 60 seconds to appear in the User Portal. The WebSocket infrastructure exists and is authenticated, but the client uses `refetchInterval`-based polling as the primary synchronization mechanism. Real-time guild events (new captain message, target update, strike issued) should be broadcast via WebSocket and trigger immediate query invalidation on the receiving client.

---

### U-08 · MEDIUM · Loading States Use Plain Text Instead of Skeleton Loaders
**Files:**  
- `client/src/pages/UserPortal.tsx` ~line 3140 (`"PROCESSING..."`)  
- `client/src/components/sections/call-to-action.tsx` ~line 159 (`"JOINING..."`)  
- Multiple admin components  
**Finding:** Several loading states default to uppercase plain text strings inside buttons or panels. At a production-polish standard, all loading states should use either a `Loader2 animate-spin` icon or a skeleton component that matches the shape of the loaded content, preventing layout shift and communicating progress clearly.

---

### U-09 · MEDIUM · Icon-Only Buttons Missing `aria-label` — Accessibility Failure
**File:** `client/src/components/admin/UserManager.tsx` line ~843  
**Finding:** The close button on the user detail panel is an icon-only button with no `aria-label`. Screen readers announce it as an unlabeled interactive element. Any icon-only button (`X`, `⋮`, copy, share) must have `aria-label` or `aria-labelledby`.

---

### U-10 · MEDIUM · `LeaderboardInsights` Image Has Empty `alt` Attribute
**File:** `client/src/components/admin/LeaderboardInsights.tsx` line ~66  
**Finding:** An `<img>` element has `alt=""`. If this image is meaningful content (not purely decorative), this violates WCAG 2.1 AA. If it is purely decorative, the element should use `role="presentation"` explicitly.

---

### U-11 · LOW · `window.location.reload()` Used Instead of Query Invalidation
**Files:** `client/src/components/admin/AdminDashboard.tsx` line ~353 · `client/src/components/ErrorBoundary.tsx` line ~85  
**Finding:** Hard page reloads destroy the React Query cache, WebSocket connection, and all in-memory UI state. The `AdminDashboard` usage appears to be a data refresh trigger — this should be replaced with `queryClient.invalidateQueries()`. The `ErrorBoundary` reload is acceptable for catastrophic failures but should be labeled "Reload Page" to set user expectations.

---

### U-12 · LOW · Z-Index Stacking Conflict Risk Between Overlapping Modals
**File:** `client/src/components/ui/` (Dialog, Sheet, Popover)  
**Finding:** All overlay components use `z-50`. If a Sheet (e.g., withdrawal drawer) is open while a Dialog (e.g., confirmation modal) is triggered, both compete at `z-50`. The behavior is implementation-order-dependent and browser-specific. A token-based z-index scale (`z-modal=50`, `z-drawer=60`, `z-toast=70`) should be established.

---

<a name="clarifications"></a>
## BUSINESS LOGIC CLARIFICATIONS REQUIRED

The following questions require your explicit confirmation before remediation begins. I will not assume or proceed with unverified logic.

**Q1 — Commission Display in TX-Points**  
The commission history tab currently shows PKR values from `commission_logs`. Should these be displayed as their TX-Points equivalent (using the current conversion rate), or should commissions remain PKR-denominated since they represent referral cash earnings rather than platform points?

**Q2 — Chatbot Context Retention Policy**  
What is the intended maximum duration a chatbot conversation context should persist in memory for an inactive user? Options: 30 minutes TTL, 2 hours, or session-lifetime only.

**Q3 — Password Reset Flow**  
Should the password reset flow send a token via email (requires an email-sending integration like SendGrid/Resend), or should it be handled via a support ticket system (manual admin password reset via the team portal)?

**Q4 — Risk Engine Scan Frequency vs. Scope**  
The current risk engine scans up to 5,000 users per run. As the platform scales, should the scan: (a) remain full-scan but run less frequently (e.g., every 6 hours instead of hourly), (b) switch to incremental scans of only recently active users, or (c) both?

**Q5 — `audit_logs` Retention Period**  
Financial audit logs are legally sensitive. What is your required retention period before archival? (Recommendation: 2 years online, then archive to cold storage / export.)

**Q6 — Leaderboard Refresh Interval**  
The leaderboard refreshes every 5 minutes. Is this frequency a business requirement, or can it be extended to 15 minutes (reducing DB load by 66%) with a manual "force refresh" available to admins?

---

*End of THORX Forensic Audit Report — 2026-07-22*  
*Total findings: 30 (4 CRITICAL · 14 HIGH · 9 MEDIUM · 3 LOW)*
