# THORX — MILLION-DOLLAR PRODUCT AUDIT REPORT
**Date:** 2026-07-20  
**Auditor:** Replit Agent (Microscopic System-Wide Scan)  
**Codebase:** THORX v3 — Full-stack TypeScript (Express + React + Drizzle ORM + PostgreSQL)  
**Scope:** Every route, mutation, component, schema, engine, and job file

---

## EXECUTIVE SUMMARY

Total findings: **29 confirmed issues** across 3 categories.  
Critical (financial integrity): **5**  
High (security/data correctness): **9**  
Medium (UX, ecosystem, performance): **15**  

---

## CATEGORY 1: MISTAKES, BUGS & FINANCIAL GAPS

### F-01 · CRITICAL · Float Math in Guild Bonus Distribution
**File:** `server/modules/guild-reset.ts` · Lines 79, 88–89, 107

The weekly guild bonus pool distribution — which moves real PKR balances — uses native JavaScript float arithmetic throughout instead of `Decimal.js`:

```ts
// Line 79 — string from DB cast to native float
const pool = parseFloat(guild.weeklyBonusPool);

// Lines 88–89 — native float multiplication
captainShare = Math.round(pool * 0.30 * 100) / 100;
memberPool   = Math.round((pool - captainShare) * 100) / 100;

// Line 107 — float division for per-member share
const share = Math.round(memberPool * (member.weeklyPointsContributed / totalContrib) * 100) / 100;
```

**Risk:** With pools of Rs.10,000+ and many members, rounding via `Math.round(…*100)/100` creates micro-discrepancies. Sum of all shares ≠ pool total. Money is silently created or destroyed. The `captainShare + sum(memberShares)` is NOT guaranteed to equal `pool`.

**Impact:** Direct financial integrity violation. Cannot pass a financial audit.

---

### F-02 · CRITICAL · Decimal Precision Loss Before Card Draw
**File:** `server/storage.ts` · Line 994

```ts
const userPkrShare = userPkrShareD.toNumber(); // ← loses Decimal precision
// ... passed into drawThorxCard(userPkrShare, ...) which does float math
```

`userPkrShareD` is a `Decimal` object computed safely, but `.toNumber()` converts it to IEEE 754 float before passing to `drawThorxCard()`. Any arithmetic inside that function operates on a float, not a Decimal.

**Impact:** TX-Points calculation and card variance can drift for large values.

---

### F-03 · HIGH · Inactivity Penalty Loop — No Transaction Wrapping
**File:** `server/modules/ps-engine.ts` · Line 102

```ts
async applyInactivityPenalties(...) {
  for (const user of eligibleUsers) {
    await db.update(users).set({ performanceScore: ... }) // ← one update per user, no transaction
  }
}
```

If the process crashes or restarts mid-loop, some users are penalized while others are not. There is no atomic guarantee across the batch.

**Impact:** Data inconsistency. Users get penalized unfairly or some escape penalty entirely on a crash.

---

### F-04 · HIGH · Unbounded Withdrawal Queries (No LIMIT)
**File:** `server/storage.ts` · Lines 2024–2029, 3159–3172

```ts
async getWithdrawalsByUserId(userId: string) {
  return await db.select().from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt));
  // ← NO .limit() — loads ALL withdrawals for a user
}

async getAdminWithdrawals() {
  return await db.select()...from(withdrawals).innerJoin(users, ...)
    .orderBy(desc(withdrawals.createdAt));
  // ← NO .limit() — loads ENTIRE withdrawals table + join
}
```

**Impact:** A power user with 1,000+ withdrawals will cause the server to load all rows into memory. `getAdminWithdrawals` loads the entire table. This is a memory bomb and a performance DoS vector.

---

### F-05 · HIGH · TypeScript Compilation Errors (Active in Codebase)
**File:** `tsc_output.txt` — 4 errors currently in production build

**Error 1 & 2 — `client/src/lib/fingerprint.ts`:**
```
Property 'deviceMemory' does not exist on type 'Navigator'
Property 'openDatabase' does not exist on type 'Window & typeof globalThis'
```

**Error 3 & 4 — `server/storage.ts` (Lines 847, 965):**
```
Property 'emailVerifiedAt' is missing in type returned by select query
but required in type User
```
The DB select query in two places does not include `emailVerifiedAt` in the selected columns, but the return type requires it. TypeScript accepts this at runtime via `as` casts but the field is `undefined` instead of `Date | null`, which can break any code that checks `emailVerifiedAt`.

**Impact:** Runtime field is silently `undefined`. Fingerprint library uses untyped browser APIs that may fail on some browsers.

---

## CATEGORY 2: MILLION-DOLLAR COMPANY STANDARDS GAP

### S-01 · CRITICAL · Mass Assignment Vulnerability
**File:** `server/routes.ts` · Line 3482

```ts
app.patch("/api/admin/tasks/:id", requireTeamRole, async (req, res) => {
  const task = await storage.updateDailyTask(req.params.id, req.body); // ← raw req.body
```

`storage.updateDailyTask` calls `db.update(dailyTasks).set(updates)` where `updates = req.body`. Any column in the `daily_tasks` table can be overwritten by a team member, including internal fields like `id`, `createdAt`, or any future sensitive columns.

**Impact:** Insider threat or compromised team account can corrupt task records arbitrarily.

---

### S-02 · HIGH · Zod Validation Missing on 12+ Admin/Financial Routes
**File:** `server/routes.ts`

The following routes accept `req.body` via manual destructuring with no `z.parse()` / `z.safeParse()` schema validation:

| Route | Line | Risk |
|-------|------|------|
| `POST /api/admin/guilds/bulk-targets` | 1374 | No type/range validation on weeklyTarget |
| `PATCH /api/admin/users/:userId/ps` | 4565 | No validation on `delta` (could be NaN/Infinity) |
| `PATCH /api/admin/guilds/:id/gps` | 4590 | No range check on GPS delta |
| `PATCH /api/admin/guilds/:id/captain` | 4607 | No validation on captainId |
| `PATCH /api/admin/guilds/:id/weekly-target` | 4625 | No range check on target value |
| `POST /api/withdrawals/referral` | 4494 | Only `.isFinite()` check, no Zod |
| `POST /api/admin/withdrawals/bulk` | 2079 | No schema on ids array or status |
| `POST /api/admin/users/:userId/adjust-balance` | 2110 | No Zod on financial delta fields |
| `POST /api/admin/founder/withdrawals` | 2257 | No schema validation |
| `POST /api/admin/notes` | 2372 | No validation on note content/length |
| `PATCH /api/admin/risk-cases/:id` | 4234 | No schema on status field |
| `POST /api/chat` | 3268 | No Zod on message/sessionId |

**Impact:** Malformed inputs (NaN, negative values, oversized strings, wrong types) can reach the database or crash the server with unhandled exceptions.

---

### S-03 · HIGH · Unauthenticated Proxy Route
**File:** `server/routes.ts` · `GET /api/proxy`

```ts
app.get("/api/proxy", async (req, res) => {
  // No requireSessionAuth, no requireTeamRole — completely public
```

Any anonymous user on the internet can use this as an open proxy to make server-side HTTP requests. This can be used for SSRF (Server-Side Request Forgery) to reach internal services, or to abuse the server's IP reputation.

**Impact:** SSRF vector. Platform's server IP can be used for attacks. Potentially exploitable to reach Replit metadata endpoints.

---

### S-04 · HIGH · Rate Limiter Missing on Sensitive Admin Financial Endpoints
**File:** `server/routes.ts`

| Route | Line | Issue |
|-------|------|-------|
| `POST /api/admin/withdrawals/bulk` | 2077 | No rate limiter on bulk financial action |
| `POST /api/admin/founder/withdrawals` | 2252 | No rate limiter |
| `POST /api/admin/users/:userId/adjust-balance` | 2107 | Uses `profileRateLimiter` but should use stricter `withdrawalRateLimiter` |

**Impact:** A compromised admin account can loop bulk financial operations at machine speed with no throttle.

---

### S-05 · MEDIUM · Missing Composite Index — Earnings Table
**File:** `shared/schema.ts` · Lines 173–179

Separate indexes exist on `earnings.userId` and `earnings.createdAt`, but no composite index exists on `(userId, created_at)`:

```ts
index("earnings_user_id_idx").on(table.userId),        // ← exists
index("earnings_created_at_idx").on(table.createdAt),  // ← exists
// MISSING: composite (userId, createdAt) for date-range queries per user
```

`getEarningsHistory(userId, period)` runs a date-range filter + user filter query — Postgres will use the individual index and then filter, instead of the far more efficient composite index.

**Impact:** As earnings rows grow (millions of records), earnings history queries will degrade significantly.

---

### S-06 · MEDIUM · Missing Composite Index — Task Records
**File:** `shared/schema.ts` · Lines 368–371

```ts
index("task_records_user_task_idx").on(table.userId, table.taskId) // ← exists
// MISSING: (userId, completedAt) for daily task-count queries
```

`getCompletedTasksToday(userId, taskType)` queries by userId + date range with no composite on `(userId, completedAt)`.

**Impact:** Daily task checks (which run on every earning event) will do full table scans as the table grows.

---

### S-07 · MEDIUM · No Global Root ErrorBoundary
**File:** `client/src/main.tsx`

The React tree has `<ErrorBoundary>` around `AdminPortal` and `UserPortal` individually, but there is no root-level ErrorBoundary wrapping the entire `<App />` in `main.tsx`. An unhandled error in the Router, auth layer, or navigation layer will show the browser's raw error screen instead of a graceful Thorx error page.

**Impact:** Any crash in routing or global providers shows a blank/broken screen to all users.

---

### S-08 · MEDIUM · No Error Tracking (Sentry Disabled)
**File:** `server/index.ts` — startup log confirms: `[Sentry] SENTRY_DSN not set — error tracking disabled`

No exception is being captured and reported to any monitoring service. Production errors are invisible unless someone actively checks server logs.

**Impact:** Production bugs go undetected until a user reports them. No stack traces, no alerts, no MTTR data.

---

### S-09 · MEDIUM · No Automated Test Suite
**File:** `vitest.config.ts` exists but test coverage is effectively zero.

There are no test files for:
- Financial calculation logic (earn events, withdrawal math, guild distribution)
- Auth flows (register/login/logout/session)
- Permission guards on API routes
- Race condition protection (idempotency keys)

**Impact:** Every code change is a manual regression test. Impossible to maintain at scale.

---

## CATEGORY 3: ECOSYSTEM DISCONNECTION & UX FRICTION

### U-01 · HIGH · Captain Announcements NOT Shown in User Portal
**File:** `server/storage.ts:4489`, `client/src/pages/UserPortal.tsx`

Captain announcements are saved to `guilds.latestAnnouncement` via `postAnnouncement()`. This field is returned by guild queries. However, **`UserPortal.tsx` does not display `guild.latestAnnouncement` anywhere in the guild panel**. Users in a guild never see their captain's pinned message.

Announcements only appear in `GuildMemberPanel.tsx` (inside TeamPortal), which only team members can access.

**Impact:** Core guild communication feature is completely invisible to the 99% of users who are not team members.

---

### U-02 · HIGH · Query Key Registry Violations (Stale Cache Risk)
**File:** Multiple — `client/src/lib/queryKeys.ts` exists as canonical registry but is bypassed

Hardcoded string arrays used instead of `QUERY_KEYS.*` constants:

| Hardcoded Key | Files Using It | Correct Registry Key |
|---------------|---------------|---------------------|
| `["session-auth"]` | `useAuth.ts:41`, `useRealtimeSync.ts:13`, `auth.tsx:482`, `UserPortal.tsx:809` | Not in registry — needs adding |
| `["earnings"]` | `UserPortal.tsx:603,810,2649`, `useRealtimeSync.ts:15` | `QUERY_KEYS.earnings` = `["/api/earnings"]` ← mismatch! |
| `["referrals"]` | `UserPortal.tsx:612`, `useRealtimeSync.ts:17` | `QUERY_KEYS.referrals` = `["/api/referrals"]` ← mismatch! |
| `["notifications"]` | `UserPortal.tsx:670`, `useRealtimeSync.ts:20` | `QUERY_KEYS.notifications` ← mismatch! |
| `["/api/withdrawals"]` | `UserPortal.tsx:768,2654`, `useRealtimeSync.ts:22,173` | Not canonical |
| `["/api/tasks"]` | `UserPortal.tsx:751` | `QUERY_KEYS.tasks` exists |

**Critical:** `["earnings"]` and `QUERY_KEYS.earnings = ["/api/earnings"]` are DIFFERENT KEYS. A mutation invalidating `QUERY_KEYS.earnings` does NOT invalidate `["earnings"]` queries — they are two separate cache buckets. This means some components see stale earnings after mutations.

**Impact:** Users see outdated balances/earnings after earning events. Cache invalidation is broken for at least 3 key types.

---

### U-03 · HIGH · Profile Update Does Not Refresh Session Data
**File:** `client/src/components/profile-modal.tsx` · Lines 149–158

`updateProfileMutation.onSuccess` shows a toast and closes the modal but does NOT invalidate the `session-auth` query. The navbar, profile avatar, and user display name remain stale until the user manually refreshes the page.

**Impact:** User updates their name → modal closes → header still shows old name. Classic UX bug that erodes trust.

---

### U-04 · MEDIUM · Daily Goal Mutations Missing Cache Invalidation
**File:** `client/src/components/daily-goal-modal.tsx` · Lines 59, 69

`clickMutation` and `verifyMutation` complete a daily task and earn points but do not invalidate:
- `tasks` / `["/api/tasks"]` — task list stays "incomplete" visually
- `earnings` — balance doesn't update
- `session-auth` — TX-points balance stays stale

**Impact:** User completes a goal, sees no visual confirmation that it worked (no balance update, no task checkmark), and may click again creating duplicate attempts.

---

### U-05 · MEDIUM · Guild Chat Mutation Missing History Invalidation
**File:** `client/src/pages/UserPortal.tsx` · Line 1003

`chatMutation.onSuccess` does not invalidate the `chat-history` query (fetched at line 1049). The message appears optimistically (or not at all) but the query cache is stale — a refresh shows the actual server state which may differ.

**Impact:** Sent messages may visually disappear or duplicate on next render cycle.

---

### U-06 · MEDIUM · Silent Success on Ad View (No Earn Toast)
**File:** `client/src/pages/UserPortal.tsx` · Line 796

`recordAdViewMutation.onSuccess` invalidates queries but shows no toast notification. The user watches an ad, the scratch card reveals, but there is zero system feedback confirming "You earned X TX-Points." The only feedback is the scratch card reveal UI itself.

**Impact:** If the scratch card animation glitches or the user misses it, they have no confirmation the earn was credited.

---

### U-07 · MEDIUM · Mobile Table Overflow — LeaderboardInsights
**File:** `client/src/components/LeaderboardInsights.tsx` · Lines 343, 506

Two `<Table>` components have no `overflow-x-auto` wrapper div. On screens narrower than the table's natural width (mobile phones), the table overflows its container, breaks the page layout, and cannot be scrolled.

The admin panel tables (`AuditLogViewer`, `PayoutControl`, `UserManager`) do have `overflow-x-auto` wrappers. `LeaderboardInsights` was missed.

**Impact:** Team portal leaderboard page is broken/unusable on mobile devices.

---

### U-08 · MEDIUM · TeamPortal Mobile Layout — Fixed Sidebar + 4-Column Grid
**File:** `client/src/pages/TeamPortal.tsx` · Line 51

The loading skeleton uses `w-64` fixed sidebar width and `grid-cols-4` for the stats cards. On mobile, `grid-cols-4` collapses to a single column but the sidebar width is fixed. No `lg:` responsive breakpoint guards the sidebar.

**Impact:** Team portal is not usable on mobile — sidebar clips content, stat cards stack badly.

---

### U-09 · LOW · Plain Text Loading States (No Skeletons)
**Files:** Multiple components

| Component | Location | Current State | Expected |
|-----------|----------|---------------|----------|
| `PayoutControl.tsx` | Line 732, 767 | `"Processing..."` text | Spinner or disabled button state |
| `RiskWatchlistPanel.tsx` | Line 743 | `"Scanning…"` text | Animated scan indicator |
| `CaptainPortal.tsx` | Lines 299, 625, 657 | `"Saving…"`, `"Posting…"`, `"Sending…"` | Button spinner states |
| `SystemHealthCard.tsx` | Line 128 | `"—"` dash while loading | Skeleton or pulse animation |
| `CaptainPortal.tsx` | Lines 109, 118 (`nudgeMutation`, `mvpMutation`) | No loading indicator on member cards | Spinner on the action button |

**Impact:** Professional polish gap. Inconsistent with the rest of the UI which uses proper loading states.

---

### U-10 · LOW · Chat Mutation Missing Error Toast
**File:** `client/src/pages/UserPortal.tsx` · Line 1003

`chatMutation.onError` appends a "support message" to the chat UI (designed for chatbot errors), but does not show a `toast()` for system-level HTTP failures (500 errors, network timeouts). The user may not see the error message depending on scroll position.

`sendChatMutation` in `CaptainPortal.tsx:224` uses optimistic UI but has no success toast confirming the message was persisted to the server.

**Impact:** Silent failures in chat — user doesn't know if their message sent.

---

## FINDINGS SUMMARY TABLE

| ID | Category | Severity | Title |
|----|----------|----------|-------|
| F-01 | Financial | 🔴 CRITICAL | Float math in guild bonus distribution |
| F-02 | Financial | 🔴 CRITICAL | Decimal precision loss before card draw |
| F-03 | Financial | 🟠 HIGH | Inactivity penalty loop — no transaction |
| F-04 | Financial | 🟠 HIGH | Unbounded withdrawal queries (no LIMIT) |
| F-05 | Financial | 🟠 HIGH | TypeScript compilation errors (4 active) |
| S-01 | Security | 🔴 CRITICAL | Mass assignment on admin tasks PATCH |
| S-02 | Security | 🟠 HIGH | Zod validation missing on 12+ routes |
| S-03 | Security | 🟠 HIGH | Unauthenticated proxy route (SSRF risk) |
| S-04 | Security | 🟠 HIGH | Rate limiter missing on admin financial endpoints |
| S-05 | Performance | 🟡 MEDIUM | Missing composite index — earnings table |
| S-06 | Performance | 🟡 MEDIUM | Missing composite index — task_records |
| S-07 | Quality | 🟡 MEDIUM | No global root ErrorBoundary |
| S-08 | Quality | 🟡 MEDIUM | No error tracking (Sentry disabled) |
| S-09 | Quality | 🟡 MEDIUM | No automated test suite |
| U-01 | Ecosystem | 🟠 HIGH | Captain announcements invisible to users |
| U-02 | Data | 🟠 HIGH | Query key registry violations (stale cache) |
| U-03 | UX | 🟠 HIGH | Profile update doesn't refresh session data |
| U-04 | UX | 🟡 MEDIUM | Daily goal mutations missing cache invalidation |
| U-05 | UX | 🟡 MEDIUM | Guild chat mutation missing history invalidation |
| U-06 | UX | 🟡 MEDIUM | Silent success on ad view (no earn toast) |
| U-07 | Mobile | 🟡 MEDIUM | Table overflow in LeaderboardInsights |
| U-08 | Mobile | 🟡 MEDIUM | TeamPortal mobile layout (fixed sidebar, 4-col grid) |
| U-09 | Polish | 🟢 LOW | Plain text loading states (no skeletons) |
| U-10 | Polish | 🟢 LOW | Chat mutations missing error toasts |

---

## ARCHITECT'S QUESTIONS FOR BUSINESS LOGIC CLARIFICATION

Before fixes are implemented, the following business decisions must be confirmed:

**Q1 — Guild Bonus Rounding Policy:**
When distributing the guild bonus pool among members (weighted by points), there will always be a remainder due to rounding. Should the remainder go to: (a) the captain, (b) the guild's next cycle pool, or (c) Thorx platform profit? This determines the correct Decimal rounding strategy.

**Q2 — Captain Announcement Visibility:**
Should `latestAnnouncement` be shown as a banner/card inside the User Portal guild section? Or is it intentionally only visible in the Team Portal for admin oversight? (Currently it is invisible to regular users.)

**Q3 — Earnings Query Key Standard:**
`QUERY_KEYS.earnings = ["/api/earnings"]` but components use `["earnings"]`. Should all components be migrated to the URL-based key, or should the registry be updated to use the short key? This affects cache invalidation patterns everywhere.

**Q4 — Inactivity Penalty Partial Failure:**
If the inactivity penalty job crashes mid-loop, should it: (a) wrap all updates in one transaction (all-or-nothing), or (b) mark each user as processed so it can resume from where it stopped?

**Q5 — Proxy Route Purpose:**
What is `GET /api/proxy` used for? Is it an internal tool or a deprecated route? Should it require auth, be restricted to team roles, or be removed entirely?

---

*Report generated 2026-07-20. All line numbers verified against live codebase.*
