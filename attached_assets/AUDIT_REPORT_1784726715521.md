# THORX — Full-System Forensic Audit Report
**Date:** 2026-07-21  
**Scope:** Complete codebase — server, client, schema, modules, middleware  
**Standard:** Zero-defect, million-dollar production platform

---

## CATEGORY 1 — Mistakes, Bugs, and Gaps (Expectation vs. Reality)

---

### C1-01 · CRITICAL · Points-Only Mandate Violations — Raw PKR Leaking to User-Facing UI

The platform's core UX rule is that users must never see raw PKR/cash values — only TX-Points — until the final withdrawal confirmation screen. The following violations expose raw monetary data outside that boundary:

**Withdrawal Modal (`client/src/pages/UserPortal.tsx`)**
- Line 2659: Toast message renders `Rs. ${withdrawalPreview.userNetPkr.toFixed(2)}` — raw PKR in a toast visible immediately on request submission, not just the final screen.
- Line 2897: `Rs. {withdrawalPreview.exactPkr.toFixed(2)}` and `Rs. {withdrawalPreview.userNetPkr.toFixed(2)}` — the withdrawal preview card exposes both gross and net PKR before the user reaches the final confirmation step.
- Line 3036: `Rs. ${withdrawalPreview.exactPkr.toFixed(2)}` — raw PKR in the final modal body.
- Line 3046: `-Rs. ${withdrawalPreview.platformFee.toFixed(2)}` — platform fee in PKR explicitly shown.
- Line 3055: `Rs. {withdrawalPreview.referralCommission.toFixed(2)}` — referral commission in PKR shown to user.
- Line 3082: `Rs. ${withdrawalPreview.userNetPkr.toFixed(2)}` — net PKR repeated in the final confirmation.

**Notification Modal (`client/src/components/ui/notification-modal.tsx`)**
- Line 200: `${parseFloat(commission.amount).toFixed(2)}` — commission amount rendered with a `$` currency prefix, a raw monetary value visible in user notifications.

**Referral Tree (`client/src/components/ui/referral-tree.tsx`)**
- Line 287: `+{parseFloat(user.earningsFromUser).toFixed(2)} pts` — while labeled "pts," the value is the raw `earningsFromUser` float from the database, not a TX-Points-converted figure. The source field is a direct monetary value.

**Landing Page (`client/src/components/sections/trust-builder.tsx`)**
- Line 160: `₨<span ref={totalPaidRef}>` — the landing page social-proof counter renders the ₨ (rupee) symbol, exposing the platform's internal PKR denomination as a marketing figure. This is not inside the withdrawal screen.

**Ad Player (`client/src/components/ui/enhanced-video-player.tsx`)**
- Lines 102, 330: `return \`$\${parseFloat(amount).toFixed(2)}\`` — ad credit amounts are formatted with a `$` currency prefix and shown to users inside the video player UI.

---

### C1-02 · HIGH · Database Mutations Not Fully Wrapped in Rollback-Capable Transactions

**`updateUserEarnings` (`server/storage.ts` ~line 810)**
Uses raw SQL increment fragments (`sql\`${users.availableBalance} + ${amount}\``) executed outside any transaction wrapper. This method is called from `recordEarnEvent` which IS transactional, but `updateUserEarnings` itself is exported and callable independently without transaction protection. Any direct caller bypassing `recordEarnEvent` leaves balance increments non-atomic and non-rollbackable.

**`awardMemberGPS` (`server/modules/gps-engine.ts`)**
Accepts an optional `tx` parameter for atomicity, but callers that omit `tx` execute guild score increments (`guildPerformanceScore`, `weeklyBonusPool`) outside a transaction. If a caller's surrounding logic fails after `awardMemberGPS` succeeds, the GPS award is permanently committed with no rollback path.

**`hilltopads-service.ts` (~line 162)**
Revenue aggregation uses `parseFloat()` and native `+` on `zone.totalRevenue` and `stat.revenue`. While not a transaction gap, the lack of transactional write on stat updates means a partial failure (e.g., server crash mid-write) leaves HilltopAds stats in an inconsistent state.

---

### C1-03 · CRITICAL · Concurrency Race Condition — Duplicate Founder Bootstrap

**`/api/bootstrap-founder` (`server/routes.ts` lines 2710–2715)**
The guard logic is a classic check-then-act TOCTOU pattern:
```
const existingTeamMembers = await storage.getTeamMembers();
if (existingTeamMembers && existingTeamMembers.length > 0) {
  return res.status(403).json({ message: "Founder already exists." });
}
// ... create founder ...
```
Two concurrent POST requests can both execute the check simultaneously, both see 0 members, and both proceed to `storage.createUser` — creating two founder accounts. There is no database-level unique constraint on `role='founder'`, no advisory lock (`pg_advisory_xact_lock`), and no rate limiter on this endpoint. This is a single-shot critical path with no idempotency guard.

---

### C1-04 · HIGH · Floating-Point Precision Drift — Native JS Arithmetic on Financial Values

The platform uses `Decimal.js` in core paths but has numerous native-JS escape hatches that introduce silent precision errors, especially on accumulated values.

**Server-Side Violations:**
- `server/modules/thorx-card.ts:56, 90`: `Decimal` values converted to native `number` via `.toNumber()` for `targetPoints` and `userPkrShare` before arithmetic. All downstream calculations on these values accumulate IEEE 754 drift.
- `server/storage.ts` — `processWithdrawal` (~lines 2077, 2118): The `calculateWithdrawalBreakdown` function correctly uses `Decimal` internally but returns `.toNumber()` results. `processWithdrawal` then performs native arithmetic on those results: `platformFee - referralCommission` and `users.balanceCashPkr + referralCommission`. Any rounding from `.toNumber()` is permanently written to the DB.
- `server/storage.ts` — `recordEarnEvent` (~line 997): Rank bonus applied using native float arithmetic despite surrounding Decimal usage.
- `server/storage.ts` (~lines 933): `CONVERSION_RATE` used as a native number for point conversion math.
- `server/routes.ts` (lines 1139, 1551, 1811, 3596, 3629, 4547–4558): Widespread `parseFloat()` on `grossPkr`, `reward`, `totalPaid`, `conversionRate` for logic comparisons and calculations.
- `server/hilltopads-service.ts:162`: Native `+` on `zone.totalRevenue` and `stat.revenue` after `parseFloat()`.
- `server/modules/health-engine.ts:176`: `parseFloat()` on DB balance aggregate for health score computation.

**Client-Side Violations (non-display):**
- `client/src/pages/UserPortal.tsx:1320`: `totalEarnings - adViewsEarnings - referralEarnings` — subtraction on three `parseFloat()` results. This is used to derive "task earnings" displayed as a chart breakdown.
- `client/src/pages/UserPortal.tsx:2346`: `(WITHDRAWAL_FEE_PERCENT * REFERRAL_FEE_SHARE_PERCENT) / 100` — all `parseFloat()` results, used for fee preview calculation.
- `client/src/components/ui/referral-stats-card.tsx:21`: `Math.round(parseFloat(pkrStr || "0") * 100)` — the `* 100` on a float before rounding is a classic precision loss pattern.

---

### C1-05 · MEDIUM · Unbounded User Transaction Load for Withdrawal Preview

**`server/storage.ts` (~line 1908)**
The `previewWithdrawal` and `createWithdrawal` methods load ALL un-withdrawn `user_transactions` rows for a user without a `LIMIT`:
```sql
WHERE user_transactions.userId = :id AND withdrawn = false
ORDER BY createdAt ASC  -- FIFO
```
A high-activity user with thousands of transaction rows will cause this query to load the entire set into Node.js memory on every withdrawal attempt. At scale, this is both a memory and latency bomb.

---

## CATEGORY 2 — The "Million-Dollar Company" Standards Gap

---

### C2-01 · CRITICAL · `passwordHash` and `verificationToken` Leaked via `/api/user` GET

**`server/routes.ts` lines 602, 638**
The `/api/user` endpoint returns the raw user object from `storage.getUserById()` via `res.json(user)` without redacting sensitive fields. The `users` table contains `passwordHash` and `verificationToken` columns. Any authenticated user can inspect their own `passwordHash` (bcrypt hash) from the browser's network tab.

While `server/utils/sanitize-user.ts` exports a `sanitizeUser` function that strips these fields, it is NOT called on this endpoint's response path.

**Impact:** Although bcrypt hashes are not directly reversible, their exposure facilitates offline dictionary attacks, leaks the existence of password reset tokens, and violates the principle of minimal data exposure. This is a GDPR/compliance violation.

---

### C2-02 · HIGH · Missing Rate Limiters on Critical Endpoints

The following endpoints have no rate-limiting middleware, exposing them to DoS, brute-force, or abuse:

| Endpoint | Method | Risk |
|---|---|---|
| `/api/bootstrap-founder` | POST | Repeated concurrent calls; no throttle on a critical one-shot endpoint |
| `/api/admin/leaderboard/force-sync` | POST | Triggers full 10,000-row leaderboard recomputation; unbounded trigger rate |
| `/api/admin/users/:id/action` | POST | Admin user suspension/activation; no rate limit allows automation abuse |
| `/api/guilds/:id/join` | POST | No guild interaction rate limiter applied |
| `/api/guilds/:id/leave` | POST | No guild interaction rate limiter applied |

---

### C2-03 · HIGH · Admin Permission Misconfiguration — Wrong Permission on User Action Route

**`server/routes.ts` ~line 503**
`app.post("/api/admin/users/:id/action")` is protected by `requirePermission("VIEW_ANALYTICS")`. This route performs state-mutating actions (user suspension, activation, etc.). `VIEW_ANALYTICS` is a read-level permission; write-level user actions require `MANAGE_USERS`. A team member with analytics-only access can execute user lifecycle operations.

---

### C2-04 · HIGH · `bootstrap-founder` Lacks Zod Validation — Potential Mass Assignment

**`server/routes.ts` lines 2701–2734**
The founder bootstrap endpoint manually constructs the `founderData` object from `req.body` without a Zod schema. Fields like `firstName`, `lastName`, `email`, `password` are picked individually, but there is no schema enforcement ensuring types (e.g., that `email` is a valid email string, that `password` meets complexity requirements). A malformed bootstrap payload could create a founder account with an empty email or a non-string password that bcrypt receives unexpectedly.

---

### C2-05 · HIGH · Missing Database Indexes on High-Frequency Query Columns

The following columns are queried frequently but have no index:

| Table | Missing Index | Query Context |
|---|---|---|
| `guild_members` | `(guildId, status)`, `(userId, status)` | Every guild membership check, approval flow, weekly reset |
| `points_ledger` | `userId` | Point history lookups, conversion checks |
| `user_transactions` | `(userId, withdrawn, createdAt)` | FIFO withdrawal consumption — the most critical financial query |
| `founder_withdrawals` | `createdAt` | Founder ledger listing and profit summary |
| `users` | `rank` | Separate from `userRankTier`; queries filtering by raw rank string are unindexed |
| `guild_weekly_cycles` | `(guildId, weekStart)` | Idempotency check on every Sunday reset |

---

### C2-06 · HIGH · Unbounded Memory Loads — Scale Bottlenecks

| Method | Location | Issue |
|---|---|---|
| `getTeamKeys` | storage.ts ~1350 | No LIMIT — loads all team API keys |
| `getCredentials` | storage.ts ~1431 | No LIMIT — loads all user credentials |
| `getCommissionLogsByBeneficiary` | storage.ts ~1861 | No LIMIT — loads full commission history |
| `refreshLeaderboardCache` | storage.ts ~2999 | Full-table user scan up to 10,000 rows every 5 minutes, with GROUP BY referral count — one query that touches every active user |
| `user_transactions` withdrawal load | storage.ts ~1908 | No LIMIT on un-withdrawn tx rows per user |

---

### C2-07 · MEDIUM · No Automated Test Suite

There is a `vitest.config.ts` and a `server/__tests__/` directory, but no evidence of meaningful test coverage across:
- Financial logic paths (`recordEarnEvent`, `processWithdrawal`, `createWithdrawal`)
- Auth flows (registration, login, session regeneration)
- Concurrency guards (withdrawal double-spend, task double-completion)
- API contract tests for every endpoint

A production financial platform with no automated regression suite means every deploy is a manual gamble.

---

### C2-08 · MEDIUM · Sentry / Distributed Error Tracking Disabled

**`server/index.ts`** logs: `[Sentry] SENTRY_DSN not set — error tracking disabled`

All `5xx` errors are written to the `error_events` table and the pino logger, but there is no real-time alerting, no stack-trace aggregation, no release tracking, and no performance monitoring. Silent failures in background jobs (`guild-reset`, `ps-engine`, `health-engine`) are invisible unless someone actively queries logs.

---

### C2-09 · MEDIUM · `CREDENTIAL_ENCRYPTION_KEY` Not Enforced at Startup

**`server/utils/credential-crypto.ts`**
The AES-256-GCM encryption for `user_credentials` uses a `CREDENTIAL_ENCRYPTION_KEY` environment variable. If this variable is absent, the encryption key derivation silently fails or uses an empty/undefined key. There is no startup-time assertion confirming the key is present and of sufficient length, unlike `DATABASE_URL` and `SESSION_SECRET` which throw on absence.

---

### C2-10 · LOW · Session Store Dependency — `connect-pg-simple` Session Table

**`server/routes.ts`** uses `connect-pg-simple` for DB-backed session persistence. However, the `session` table must exist before the server starts. `drizzle-kit push` does not manage this table (it is created by `connect-pg-simple` itself). On a fresh import, if the server starts before `connect-pg-simple` creates its table, session middleware fails silently. There is no startup check or migration step that ensures the session table exists.

---

## CATEGORY 3 — Ecosystem Disconnection & UX Friction

---

### C3-01 · HIGH · Plain Text Loading States — Missing Skeleton Loaders

The following locations use raw text strings for loading states instead of animated skeleton components:

| File | Line | Current State |
|---|---|---|
| `client/src/components/ui/profile-modal.tsx` | 391 | "SAVING..." plain text |
| `client/src/components/admin/UserManager.tsx` | 816, 997, 1068, 1116 | "Processing...", "Applying...", "Executing..." plain text |
| `client/src/components/admin/FounderProfitCard.tsx` | 269 | "Saving..." plain text |
| `client/src/components/admin/TaskManager.tsx` | 442, 551 | "Synchronizing...", "Saving..." plain text |
| `client/src/components/admin/GuildManager.tsx` | 653, 735 | "...", "Saving..." plain text |
| `client/src/components/admin/LeaderboardInsights.tsx` | 248, 283 | "Refreshing...", "Updating..." plain text |
| `client/src/components/guild/GuildDiscoveryPanel.tsx` | 299 | "Sending..." plain text |
| `client/src/pages/UserPortal.tsx` | 3680 | "Loading..." plain text in chat |

---

### C3-02 · HIGH · Mutations Succeeding or Failing Silently — Missing Toast Notifications

**`client/src/components/admin/UserManager.tsx`**
- Lines 163, 176, 200: `onSuccess` handlers for balance adjustment, status update, and password reset only call `queryClient.invalidateQueries()` — no success toast is triggered. Admins receive no confirmation that their action was applied.

**`client/src/components/admin/TaskManager.tsx`**
- Lines 91, 117, 144: `onSuccess` for task toggle, rule deletion, and payout rule creation — no success toast.

**`client/src/components/guild/CaptainPortal.tsx`**
- Lines 98, 123, 135, 166, 176, 192, 205, 242: MVP assignment, member nudge, role changes — all mutations complete silently. A captain performing these critical guild operations receives no feedback.

---

### C3-03 · HIGH · Mobile Responsive Breakpoints Missing on Core Layouts

**`client/src/components/admin/AdminDashboard.tsx` line 158**
`grid-cols-3` with no mobile fallback (`sm:grid-cols-1` or `grid-cols-1 md:grid-cols-3`). The admin dashboard 3-column stat card layout overflows on any viewport under ~900px.

**`client/src/components/admin/RiskWatchlistPanel.tsx` line 841**
Table rendered without an `overflow-x-auto` wrapper. On mobile, the risk case table columns overflow the viewport with no horizontal scroll.

**`client/src/pages/TermsAndConditions.tsx` line 168**
Table lacks `overflow-x-auto` wrapper — same overflow pattern on mobile.

**`client/src/components/admin/AdminSidebar.tsx` line 109**
Sheet component uses `w-[300px]` — on an iPhone SE (375px wide), this consumes 80% of the screen width with no responsive adjustment.

**`client/src/pages/TeamPortal.tsx` lines 85–102**
The "Secure Matrix Blocked" access-denial screen uses `py-20 px-8` and `text-3xl` heading. On small handsets, the large padding and font size clip the content below the fold without scroll affordance.

---

### C3-04 · MEDIUM · Cross-Portal Data Sync — Missing Error States

**`client/src/components/DashboardCards.tsx` lines 73, 82, 93**
Three React Query hooks (Referral stats, Guild info, Member count) have no `isError` check or error UI. If any of these API calls fail, the component renders blank — no message, no retry button, no skeleton. Users see an empty dashboard with no explanation.

**`client/src/components/admin/AdminDashboard.tsx` lines 260–340**
Multiple data-fetching hooks for financial metrics have no error states. If the `/api/admin/stats` or `/api/admin/health` calls fail, the admin dashboard shows infinite loading or blank cards.

---

### C3-05 · MEDIUM · Direct DOM Manipulation Bypassing React State

**`client/src/pages/UserPortal.tsx` lines 378, 379, 422, 423**
`document.body.style.overflow` and `document.documentElement.style` are manipulated directly to control scroll locking for modals. React's cleanup model doesn't guarantee these are reset on unmount if an exception occurs, potentially leaving the page permanently scroll-locked.

**`client/src/components/ui/enhanced-video-player.tsx`**
Multiple direct `document.documentElement.style` mutations for fullscreen handling. The same risk applies — an unhandled error during fullscreen exit leaves the DOM in a corrupted style state.

---

### C3-06 · MEDIUM · Hardcoded External URL

**`client/src/components/ui/industrial-tabs.tsx`**
`https://www.daraz.pk` is hardcoded directly in component JSX. Any partner change, regional redirect, or affiliate link swap requires a code deployment rather than a config/admin-panel update.

---

### C3-07 · LOW · `window.location.href` Used for File Exports Instead of Anchor Downloads

**`client/src/components/admin/UserManager.tsx` line 215**
**`client/src/components/admin/AuditLogViewer.tsx` line 105**
**`client/src/components/admin/PayoutControl.tsx` line 212**

Navigating via `window.location.href` for CSV/export downloads triggers a page navigation event, which disrupts React Query cache, active form states, and scroll position. These should use a hidden `<a download>` element or `URL.createObjectURL` with a Blob.

---

## OPEN AMBIGUITIES — Business Logic Questions

Before remediation begins, the following require explicit clarification:

**Q1 — Withdrawal Preview PKR Display**
The withdrawal modal deliberately shows Rs. values in lines 2897–3082. Is the intent that PKR figures are permissible *only* on the final withdrawal confirmation step (the last modal screen), or should they be hidden entirely until the user confirms and payment is processed? The current implementation shows PKR on the *preview* card (before the user initiates the final confirmation), which may or may not be the intended experience.

**Q2 — Trust Builder "Total Paid" Counter**
The landing page renders a ₨ rupee symbol as a social-proof metric (`trust-builder.tsx:160`). Is this intentional marketing (showing total real-money paid out to users) or a violation of the points-only mandate? If intentional, should it be converted to a "TX-Points distributed" figure instead?

**Q3 — Referral Commission Currency**
Referral commissions are paid in `balanceCashPkr` (real PKR) not TX-Points, and the notification modal shows them with a `$` symbol. Is the referral commission pathway exempt from the points-only mandate, or should commissions also be displayed as points until withdrawal?

**Q4 — `processWithdrawal` Native Arithmetic**
In `storage.ts` ~line 2077–2118, `platformFee - referralCommission` and `balanceCashPkr + referralCommission` use native JS numbers derived from `Decimal.toNumber()`. These touch the live user cash balance. Should ALL arithmetic on `balanceCashPkr` use Decimal throughout, or is the referral commission pathway treated as a lower-precision "cash" ledger separate from the points system?

**Q5 — Admin Action Permission Level**
The `/api/admin/users/:id/action` route (suspension, activation) currently uses `VIEW_ANALYTICS`. Was this intentional (all team members can action users) or a bug (only `MANAGE_USERS`-permissioned members should be able to action users)?

---

*End of Audit Report — 15 findings across 3 categories, 5 clarifying questions.*
