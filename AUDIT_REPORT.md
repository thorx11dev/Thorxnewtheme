# THORX — FORENSIC AUDIT REPORT
**Date:** 2026-07-22  
**Scope:** Full-stack codebase — server, client, shared schema, background jobs  
**Standard:** "Million-Dollar Product" — absolute financial integrity, flawless UX, ironclad security  

---

## CATEGORY 1 — MISTAKES, BUGS, AND GAPS

### 1-A · Float Math on Currency / Points (Financial Precision Drift)

Every instance below risks silent rounding error accumulating across millions of transactions.

| # | File | Line | Code | Risk |
|---|------|------|------|------|
| 1 | `server/routes.ts` | 1164 | `const userCutRate = userCutPct / 100;` | Native float division |
| 2 | `server/routes.ts` | 1168 | `const grossPkr = parseFloat(grossPkrPerCompletion \|\| "0");` | String→float on money field |
| 3 | `server/routes.ts` | 1170 | `Math.round(grossPkr * userCutRate * conversionRate)` | Three-operand float chain |
| 4 | `server/routes.ts` | 1171 | `Math.round(txPointsReward * 1.2)` | Float multiply on result |
| 5 | `server/routes.ts` | 3694 | `parseFloat(task.grossPkrPerCompletion!)` | Float parse in task complete |
| 6 | `server/routes.ts` | 3727 | `grossPkr: parseFloat(task.grossPkrPerCompletion!)` | Passed float into earn engine |
| 7 | `server/routes.ts` | 4645–4656 | Six consecutive `parseFloat(String(...))` calls on Thorx Card config | Float parse on all card params |
| 8 | `server/modules/gps-engine.ts` | 28 | `Math.round((memberPointsEarned * pct) / 100)` | GPS award via native float |
| 9 | `server/modules/thorx-card.ts` | 56 | `pkrDecimal.div(10).times(conversionRate).toNumber()` | Decimal→float conversion |
| 10 | `server/modules/thorx-card.ts` | 57 | `min + Math.random() * (max - min)` | Float variance multiplication |
| 11 | `server/modules/thorx-card.ts` | 58 | `Math.max(0, Math.round(targetPoints * cardVariance))` | Float round on point credit |
| 12 | `server/storage.ts` | 1070 | `new Decimal(params.grossPkr).times(100).toDecimalPlaces(0).toNumber()` | Decimal→float for SQL bind |
| 13 | `client/src/pages/UserPortal.tsx` | 1318 | `parseFloat(displayUser?.totalEarnings \|\| '0')` | Float parse on earnings display |
| 14 | `client/src/pages/UserPortal.tsx` | 1374 | `parseFloat(displayUser?.totalEarnings \|\| '0.00')` | Float parse on rank progress |

**Root cause:** The codebase correctly uses `Decimal` in many places but converts `.toNumber()` too early, then performs downstream arithmetic on the resulting float.

---

### 1-B · Database Mutations Not Wrapped in Atomic Transactions

| Function | File | Issue |
|----------|------|-------|
| `updateUserEarnings` | `server/storage.ts:829` | Directly writes `availableBalance`, `pendingBalance`, `totalEarnings` as a single UPDATE with no surrounding transaction — callers can leave balance in inconsistent state on crash between calls |
| `createWithdrawal` | `server/storage.ts:1985` | Balance check (`getUser`) and `INSERT` into withdrawals are separate statements; no transaction wrapper — a concurrent request can interleave between the check and the insert |
| `awardTaskPS` | `server/modules/ps-engine.ts:44` | Accepts optional `tx` but defaults to bare `db` — callers that do not pass `tx` run this outside any transaction |
| `processStreak` | `server/modules/ps-engine.ts:57` | SELECT then UPDATE pattern with no transaction; optional `tx` not threaded through by all callers |

---

### 1-C · Race Conditions — Read-then-Write Without `SELECT FOR UPDATE`

| Function | File | Gap |
|----------|------|-----|
| `createReferralCashWithdrawal` | `server/storage.ts:4861` | Wraps in `db.transaction()` but the balance SELECT inside lacks `FOR UPDATE` — concurrent referral withdrawals can both read the same balance and both succeed, overdrawing |
| `checkAndUpdateRankTier` | `server/modules/ps-engine.ts:142` | SELECT user → compute new rank → UPDATE — no row lock; two concurrent earn events can both promote the same user simultaneously |
| `checkAndUpdateGuildRankTier` | `server/modules/gps-engine.ts:85` | SELECT guild → compute new guild rank → UPDATE — same gap as above; two concurrent member earnings can produce a double rank-log entry |

---

### 1-D · Points-Only Mandate — PKR Value Leaks

The spec mandates TX-Points everywhere until the withdrawal screen. The following violate or weaken this:

1. **`GET /api/user` response** (`server/routes.ts:692–693`): Sends `totalEarnings` and `availableBalance` as raw decimal strings. These are PKR-denominated values in the database. The UI re-labels them "TX-Points" (`DashboardCards.tsx:132`) creating a semantic mislabelling — the user sees a raw PKR figure called TX-Points without a true conversion step.

2. **`client/src/components/ui/rank-badge.tsx:156–157`**: `RankProgressBar` receives `totalEarnings: number` and computes rank progress directly against PKR thresholds (25 000, 50 000, 75 000…). If `totalEarnings` is a PKR decimal (e.g. `0.50`), this will always show 0 % progress — the component expects TX-Points but may receive PKR.

3. **`client/src/components/ui/profile-modal.tsx:309`**: `TX-Points: {Number(user?.totalEarnings || 0).toFixed(2)}` — displays the raw DB value directly with no conversion guard.

4. **`GET /api/user/referral-balance`** (`server/routes.ts:4595`): Returns `balanceCashPkr` to the user portal. This field is a raw PKR cash balance and is intentionally shown in the referral withdrawal panel — **confirm this is within spec before marking acceptable**.

---

### 1-E · Missing Idempotency on Financial Endpoints

All three endpoints below can be submitted twice on network retry/double-click:

| Endpoint | File:Line | Risk |
|----------|-----------|------|
| `POST /api/withdrawals` | `routes.ts:950` | Duplicate withdrawal request creates two pending withdrawals |
| `POST /api/withdrawals/referral` | `routes.ts:4601` | Duplicate referral withdrawal on retry |
| `POST /api/admin/users/:userId/adjust-balance` | `routes.ts:2139` | Admin double-click credits balance twice |

---

### 1-F · Daily Task `parseFloat` in Earn Path

`server/routes.ts:3727`: `grossPkr: parseFloat(task.grossPkrPerCompletion!)` passes a native float into `storage.recordEarnEvent`. Even though `recordEarnEvent` internally uses `Decimal`, the loss of precision already occurred at the boundary.

---

## CATEGORY 2 — MILLION-DOLLAR COMPANY STANDARDS GAP

### 2-A · Security: Routes With Missing or Insufficient Auth

**Unprotected public endpoints (intentional — confirmed acceptable):**
`GET /api/health`, `GET /api/config/public`, `GET /api/stats`, `POST /api/register`, `POST /api/login`, `POST /api/logout`, `POST /api/contact`, `POST /api/forgot-password`, `POST /api/reset-password`, `POST /api/bootstrap-founder` (one-time, rate-limited).

**Security gaps requiring remediation:**

| Route | File:Line | Gap |
|-------|-----------|-----|
| `POST /api/admin/system-config` | `routes.ts:4272` | Uses `requireTeamRole` only — any team member can modify global system config. No granular `MANAGE_SYSTEM` permission check. |
| `GET /api/system-config/:key` | `routes.ts:4252` | Key whitelist allows `MIN_PAYOUT` unauthenticated. Other keys lack explicit deny-by-default; a new key added to `allowedKeys` bypasses auth silently. |
| `POST /api/team/members` | `routes.ts:3978` | No rate limiter — an attacker can enumerate and spam team-member creation. |
| `PATCH /api/team/members/:id` | `routes.ts:4032` | No rate limiter on privilege modification. |
| `POST /api/admin/users/:id/action` with payload type `adjust_balance` | `routes.ts:532` | The `payload` field for non-`adjust_balance` actions is an unvalidated `unknown` object — arbitrary data accepted and stored in `audit_logs`. |

---

### 2-B · Payload Validation: Missing or Incomplete Zod Schemas

| Route | File:Line | Issue |
|-------|-----------|-------|
| `POST /api/admin/system-config` | `routes.ts:4272` | Directly destructures `{ key, value }` from `req.body` — no Zod schema, no type/length enforcement |
| `PATCH /api/admin/users/:id/rank` | `routes.ts:4090` | Manual `typeof rank !== 'string'` check + allowlist; `locked` extracted via `!!req.body.locked` with no Zod |
| `PATCH /api/admin/users/:id/trust-status` | `routes.ts:4126` | Manual validation only |
| `POST /api/team/members` | `routes.ts:3978` | Direct `const { email, role } = req.body` with no Zod schema |
| `PATCH /api/team/members/:id` | `routes.ts:4032` | Direct `const { accessLevel, isActive } = req.body` with no Zod schema |
| `PATCH /api/guilds/:id/applications/:applicationId` | `routes.ts:4442` | Manual `action` string check, no Zod |

---

### 2-C · Rate Limiting Gaps

| Endpoint | File:Line | Gap |
|----------|-----------|-----|
| `POST /api/team/members` | `routes.ts:3978` | No rate limiter |
| `PATCH /api/team/members/:id` | `routes.ts:4032` | No rate limiter |
| `POST /api/admin/system-config` | `routes.ts:4272` | No rate limiter |
| `GET /api/daily-tasks` | `routes.ts:3715` | No rate limiter on task listing (enumeration risk) |

---

### 2-D · Database Performance: Missing Indexes

**Confirmed missing or weak indexes:**

| Table | Column(s) | Issue |
|-------|-----------|-------|
| `withdrawals` | `(status)` | Filtered on status in every admin payout query; no index in schema |
| `withdrawals` | `(user_id, status)` | Composite needed for user-specific pending withdrawal checks |
| `withdrawals` | `(created_at)` | Used in date-range admin queries; no index |
| `task_records` | `(user_id, status)` | Daily task completion checks filter on both; only `(user_id, task_id)` composite exists |
| `score_history` | `(user_id, recorded_at)` | Time-series lookups in leaderboard and PS engine; schema has `score_history_user_id_idx` but no composite |
| `guild_members` | `(guild_id, is_active)` | Captain portal and GPS engine filter on both; no composite index |
| `audit_logs` | `(target_user_id, created_at)` | Admin user audit view filters on target; only `action`/`actor` indexed |
| `risk_cases` | `(user_id, status)` | Risk watchlist queries filter both; no composite |

---

### 2-E · Memory & Scale Bottlenecks: Unbounded Dataset Loading

| Function | File:Line | Issue |
|----------|-----------|-------|
| `getAllUsers` | `storage.ts:1534` | Loads entire `users` table into memory; 200-row cap added but applied inconsistently — some callers bypass via direct query |
| `recomputeLeaderboardCache` | `storage.ts:2917+` | Loads all users for ranking computation; should be a single SQL `RANK()` window function |
| `getEarningsStats` | `storage.ts:3098+` | Multiple unbounded selects aggregated in JS rather than SQL `SUM`/`AVG` |
| `getRiskCases` | `storage.ts` | Returns all risk cases; no pagination — 200+ rows degrade `RiskWatchlistPanel` |
| `getPayoutQueue` | `storage.ts` | Returns all pending withdrawals; `PayoutControl.tsx` renders all with no virtualization |
| GPS engine `cfg()` calls | `gps-engine.ts:85+` | `checkAndUpdateGuildRankTier` issues **6 sequential `await cfg()`** DB reads for each rank threshold check; should be a single batch fetch |

---

### 2-F · Observability Gaps

| Gap | Status |
|-----|--------|
| **Sentry / error tracking** | `SENTRY_DSN` env var present but not set — `server/lib/sentry.ts` exists but inactive |
| **`CREDENTIAL_ENCRYPTION_KEY`** | Not set → falls back to insecure hardcoded key; warning emitted on every boot |
| **Automated test coverage** | Only `server/__tests__/financial.test.ts` exists — no client tests, no integration tests, no E2E suite |
| **Database migration rollback** | `drizzle-kit` has no built-in rollback; no `.down` migrations exist — a bad schema push is unrecoverable without manual SQL |
| **Structured logging gaps** | `server/utils/debug-log.ts` still used in some paths alongside pino — mixed logging strategies |
| **Health check depth** | `GET /api/health` checks DB connectivity but does not check background job liveness (ps-engine, gps-engine, leaderboard-refresh cron) |

---

## CATEGORY 3 — ECOSYSTEM DISCONNECTION & UX FRICTION

### 3-A · Cross-Portal Data Synchronisation Gaps

| Gap | Detail |
|-----|--------|
| **Guild Weekly Target** | Admin can override `weeklyTarget` via `GuildManager`. `CaptainPortal.tsx:294–297` computes its own difficulty-based preview that may diverge from the live DB value until next refetch. No `guild.target_updated` WebSocket event fired on admin override. |
| **Leaderboard staleness** | `useRealtimeSync` invalidates `QUERY_KEYS.referralsLeaderboard` only on `user:updated` for the *current* user. If a *different* user earns points and overtakes the current user's rank, the leaderboard stays stale until the 5-minute cache refresh. |
| **Captain Announcement Badge** | `guild.announcement_posted` WS event correctly invalidates `guildDetail`, but the dashboard announcement badge/preview does not re-render until navigation away and back. |
| **Guild Settings Broadcast** | `guild.settings_updated` event is generic — clients cannot determine *which* setting changed, so they must re-fetch the entire guild object on every settings mutation (wasteful and brittle). |

---

### 3-B · Responsive Design & Mobile Constraints

| Component | File | Issue |
|-----------|------|-------|
| `UserPortal.tsx` | `client/src/pages/UserPortal.tsx` | `max-w-[1600px]` containers without narrower `sm:` constraints cause horizontal overflow on 320 px devices |
| `SystemSettingsManager.tsx` | `client/src/components/admin/SystemSettingsManager.tsx` | Inner table cells use `min-w-max` and `w-28`; while wrapper has `overflow-x-auto`, nested cell widths still break layout on ≤ 768 px |
| `RiskWatchlistPanel.tsx` | `client/src/components/admin/RiskWatchlistPanel.tsx` | Table lists all risk cases without `overflow-x-auto` on the card wrapper; columns truncate silently on small screens |
| `PayoutControl.tsx` | `client/src/components/admin/PayoutControl.tsx` | Multi-column payout table has no mobile-collapsed card view; horizontal scrolling is not indicated to the user |
| `AdminHeader.tsx` | `client/src/components/admin/AdminHeader.tsx` | Fixed `h-20 md:h-24` with no collapsed mobile state; relies on sidebar Sheet which is adequate but nav breadcrumb overflows on < 400 px |
| `TermsAndConditions.tsx` | `client/src/pages/TermsAndConditions.tsx` | Internal table at line 167 lacks a scroll indicator; overflows silently on mobile |

---

### 3-C · Z-Index Stacking Conflicts

The following modal layers produce undefined stacking order when they co-occur:

| Component | z-index | Conflict |
|-----------|---------|---------|
| `thorx-loading-screen.tsx:26` | `z-[9999]` | Highest — correct |
| `ComicClickEffect.tsx:51` | `z-[9999]` | Ties with loading screen; click effects render above loading overlay |
| `cursor-indicator.tsx:43` | `z-[9999]` | Same tie — cursor overlaps loading screen content |
| `notification-modal.tsx:121` | `z-[2000]` | Correct above portals |
| `ad-web-panel.tsx:172` | `z-[70]` | Ad overlay and its backdrop (`z-[60]`) can be covered by `daily-goal-modal` |
| `daily-goal-modal.tsx:179` | `z-[100]` | Equals toast `z-[100]` — toast notifications rendered **behind** open goal modal |
| `profile-modal.tsx:200` | `z-[100]` | Same conflict: toasts hidden behind open profile modal |
| `toast.tsx:17` | `z-[100]` | Cannot surface above any full-screen modal at same level |

**Concrete failure:** User completes a withdrawal inside the goal modal → success toast fires at `z-[100]` → is invisible because the modal also runs at `z-[100]`.

---

### 3-D · Loading States Defaulting to Plain Text

| Component | File | Plain-text fallback |
|-----------|------|---------------------|
| `FounderProfitCard` | `admin/FounderProfitCard.tsx:124` | `{isLoading ? "Loading..." : ...}` instead of skeleton |
| `GuildManager` | `admin/GuildManager.tsx:281` | `{isLoading ? <div>Loading...</div> : ...}` |
| `LeaderboardInsights` | `admin/LeaderboardInsights.tsx:373,522` | Plain loading text in two separate sections |
| `RiskWatchlistPanel` | `admin/RiskWatchlistPanel.tsx` | Spinner replaces entire panel content — no row-level skeleton |
| `DashboardCards` | `DashboardCards.tsx` | Balance card shows "0" as default before data loads (no skeleton shimmer) |
| `daily-goal-modal.tsx` | `ui/daily-goal-modal.tsx` | Action buttons lack `isPending` disable during goal claim sequence |

---

### 3-E · Silent Mutations (No Toast Feedback)

While many mutations correctly use `useToast`, the following are silent on success or failure:

| Component | Mutation | Gap |
|-----------|----------|-----|
| `GuildDiscoveryPanel` | Guild join | No toast on join success/failure |
| `GuildMemberPanel` | Nudge member | No toast on nudge sent |
| `CaptainPortal` | Weekly target set | No toast confirming target saved |
| `UserPortal` withdrawal flow | Step 2→3 transition | No intermediate toast when preview fetch fails — user sees blank step silently |
| `AdminInbox` | Mark-read | No toast on bulk mark-read action |
| `RanksCustomizer` | Save thresholds | No confirmation toast |
| `ThorxCardSandbox` | Simulate card | No error toast if simulation fails |

---

### 3-F · WebSocket Coverage Gaps

| Missing Event | Impact |
|---------------|--------|
| `guild.target_updated` | Captain doesn't see admin-changed weekly target without page refresh |
| `guild.settings_updated` payload specificity | Clients re-fetch entire guild on any settings change |
| `leaderboard.rank_changed` (cross-user) | Other users' rank changes never propagate; your rank may show stale position |
| `withdrawal.status_changed` (admin-side push) | Admin payout panel doesn't auto-refresh when a peer admin processes a withdrawal |

---

### 3-G · Forms Missing Disabled State During Submission

| Component | File | Gap |
|-----------|------|-----|
| Withdrawal confirm (Step 3) | `UserPortal.tsx:3128` | `disabled={!canProceed() \|\| (currentStep === 3 && isProcessing)}` — `isProcessing` state is set manually, not tied to mutation `.isPending`; window where button is clickable |
| Daily goal claim | `daily-goal-modal.tsx` | Claim buttons not disabled during `isPending` |
| Guild join button | `GuildDiscoveryPanel.tsx` | No `isPending` check on join mutation |

---

## OPEN QUESTIONS FOR BUSINESS LOGIC CLARIFICATION

Before beginning remediation, the following require explicit answers:

**Q1 — TX-Points vs PKR Denomination:**  
`totalEarnings` and `availableBalance` in the database — are these stored as **raw PKR amounts** (e.g. `2.50` = Rs. 2.50) or as **TX-Points** (e.g. `2500` = 2 500 TX-Points)? The rank thresholds in `rank-badge.tsx` (25 000, 50 000…) only make sense if `totalEarnings` is TX-Points. But the earn path stores `grossPkr * userCutRate * conversionRate` as `txPointsReward` and separately stores `realPkrValue`. **Clarify which field maps to which unit before touching any display or calculation logic.**

**Q2 — Referral Balance PKR Leak Acceptability:**  
`GET /api/user/referral-balance` returns `balanceCashPkr` to the user portal. Is showing raw PKR in the referral withdrawal panel **intentionally out-of-scope** for the Points-Only Mandate, or should it be masked until confirmation?

**Q3 — Idempotency Strategy:**  
Should duplicate withdrawal protection be implemented via a client-supplied idempotency key (header), a server-side deduplication window (e.g. reject same `userId + amount + method` within 60 s), or both?

**Q4 — GPS Float Math Tolerance:**  
`Math.round((memberPointsEarned * pct) / 100)` in gps-engine — is integer rounding acceptable for GPS (a non-monetary score), or must it also use `Decimal` for strict audit-trail accuracy?

**Q5 — Leaderboard Real-time Update Frequency:**  
Should rank changes by *other* users push a WS event to all connected clients (costly broadcast), or is the 5-minute cache refresh acceptable for leaderboard staleness?

---

*End of Audit Report — 2026-07-22*
