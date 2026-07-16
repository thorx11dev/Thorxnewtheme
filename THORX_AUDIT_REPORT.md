# THORX — MILLION-DOLLAR PRODUCT AUDIT REPORT
**Date:** 2026-07-16  
**Auditor:** Independent Deep-Scan (3-Agent Parallel Analysis)  
**Codebase:** React + Vite + Express + PostgreSQL + Drizzle ORM  
**Scope:** Every route, storage method, schema definition, and frontend component

---

## CATEGORY 1: Mistakes, Bugs, and Gaps

---

### 1.1 — PKR Leaks (Points-Only Illusion Violations)

**[C1-01] `GuildDiscoveryPanel.tsx` — `weeklyBonusPool` shown in guild card preview**
The discovery card renders the guild's `weeklyBonusPool` raw PKR value. Per spec invariant #8, the pool amount must never be shown to any user until it is distributed on Sunday. Users browsing guilds to join can see how much PKR is sitting in a pool they haven't even joined yet — a direct violation of the points-only illusion.

**[C1-02] `DashboardCards.tsx` line ~180 — `totalEarnings` label is ambiguous**
The Captain-context dashboard card displays `totalEarnings` under a label that doesn't clearly distinguish it as a PKR figure. Non-captain users who see a similar card may interpret it as TX-Points.

**[C1-03] Withdrawal preview in `UserPortal.tsx` lines 2786–2944**
Correctly shows PKR only on the withdrawal screen. This is intentional and correct per spec. No issue here.

**[C1-04] `ReferralAnalytics.tsx` lines 57–60, 107 — PKR commission amounts**
Admin-only panel. Showing Rs. amounts here is correct. Not a user-facing leak.

**[C1-05] `LiveActivityFeed.tsx` line 66 — PKR amounts in feed**
Admin/team panel only. Correct to show real PKR values. Not a user-facing leak.

**Verdict:** The only real user-facing PKR leak is `weeklyBonusPool` appearing in guild discovery cards (C1-01). All other flagged items are in admin-only views and are correct.

---

### 1.2 — Database Transaction Safety

**[C1-06] `storage.nudgeGuildMember()` — NOT wrapped in a transaction**
Performs three sequential operations outside any transaction:
1. `SELECT` to verify membership and cooldown state
2. `UPDATE guildMembers SET lastNudgedAt = now()`
3. `INSERT notifications`

Between step 1 and step 2, a concurrent identical request could pass the cooldown check. Two nudges can fire within the same 24-hour window under concurrent load.

**[C1-07] `storage.sendCaptainMessage()` — NOT wrapped in a transaction**
Performs two sequential operations outside any transaction:
1. `INSERT captainMessages` (new message written)
2. `UPDATE captainMessages SET isRead=true` (mark prior unread messages as read)

If step 2 fails (constraint error, timeout), the message is delivered but the read-status is permanently stale. No recovery path exists.

**All other multi-write paths are correctly transacted:** `recordEarnEvent`, `processWithdrawal`, `createGuild`, `applyToGuildWithCoverLetter`, `decideGuildApplication`, and `setGuildMemberMvp` all correctly use `db.transaction()`.

---

### 1.3 — Race Conditions & Double-Spend

**[C1-08] `POST /api/ad-view` — Timing check has a classic race condition**
The route checks the user's last ad-view timestamp *before* creating the new record. Two concurrent requests sent within milliseconds can both pass the time check before either write completes. This allows a user to earn double points on a single ad slot. The fix requires a DB-level advisory lock or a unique partial index on `(userId, date_trunc('minute', created_at))`.

**[C1-09] `POST /api/tasks/:id/verify` — Two writes not in a single transaction**
The route calls `updateTaskRecord` (marks task completed) and then `recordEarnEvent` (awards points) as two separate, sequential DB operations outside a transaction. If the server crashes or the connection drops between these two calls, the task is marked completed but points are never awarded — with no recovery path. `recordEarnEvent` does have a unique constraint on `(sourceId, sourceType)` preventing duplicate inserts, but the gap between the two calls is still a consistency risk.

**[C1-10] Captain DM — CRITICAL: Zero access control on private threads**
`GET /api/guilds/:id/dm/:memberId` and `POST /api/guilds/:id/dm/:memberId` pass the caller's `userId` and `req.params.memberId` to `storage.getCaptainMessageThread(guildId, userId, memberId)`. The storage function queries messages between any two user IDs without verifying that the caller is either the guild captain or the specific member named in the URL. **Any authenticated user who knows a guildId and any memberId UUID can read and write into that private DM thread.** This is a critical privacy and security vulnerability requiring immediate fix.

---

### 1.4 — Floating-Point Drift

**[C1-11] `recordEarnEvent` — Decimal.js abandoned before DB write**
The split math (40/60 for Engine A/B, 20/35/45 for Engine C) correctly uses `Decimal.js` via `.times()` and `.div()`. However, all three resulting Decimal values call `.toNumber()` before further processing and string conversion. The intermediate native float operations between `.toNumber()` and `.toFixed(4)` can introduce sub-paisa rounding drift.

**[C1-12] `totalEarnings` accumulation loses precision**
`user_transactions.real_pkr_value` is stored to 4 decimal places (`.toFixed(4)`). When accumulated into `users.total_earnings`, the SQL expression uses `.toFixed(2)` (2 decimal places). Repeated truncation across thousands of transactions means the user's displayed `totalEarnings` will drift from the true ledger sum. The withdrawal preview uses the ledger correctly, but the dashboard stats surface uses `totalEarnings` which will drift.

**[C1-13] Leaderboard score calculation uses native float arithmetic**
`refreshLeaderboardCache()` computes weighted scores using `parseFloat(u.totalEarnings)` and native JavaScript multiplication. For a financial leaderboard this should use scaled integer math or Decimal.js throughout.

---

### 1.5 — Half-Baked or Broken Features

**[C1-14] MVP — Can be changed mid-week an unlimited number of times**
`setGuildMemberMvp` (storage line 4460) correctly prevents the same member from being set twice (`if (membership.isMvp) throw Error`). However, it does NOT prevent the captain from clearing the current MVP and assigning a new one to a different member within the same week. The spec states "only one MVP per guild per week" with the previous MVP cleared only on Sunday reset. Currently the captain can cycle through multiple different MVPs in one week.

**[C1-15] Captain replacement — No WS broadcast to new or old captain**
`PATCH /api/admin/guilds/:id/captain` updates the DB but emits no WebSocket event. The demoted captain continues to see the Captain Portal UI. The promoted member continues to see the Member Panel. Both must manually refresh to discover their role has changed.

**[C1-16] Withdrawal approved/rejected — No WS notification to the user**
When an admin approves or rejects a withdrawal at `PATCH /api/admin/withdrawals/:id` (line 2418), the code calls `broadcastTeamRefresh("withdrawals_bulk_updated")` — this only refreshes the admin panel. No `broadcastToUser(withdrawal.userId, 'withdrawal_status_changed')` call exists anywhere. The user must manually refresh to see their withdrawal status change from `pending` to `approved` or `rejected`.

**[C1-17] `POST /api/ad-view` — Hard-coded static AD_INVENTORY table**
The route contains a hard-coded dictionary with fixed PKR reward values:
```
"ad_001": { reward: "0.25", duration: 30 }
"ad_002": { reward: "0.15", duration: 15 }
"ad_003": { reward: "0.50", duration: 45 }
```
These values are completely disconnected from HilltopAds real network revenue, from the `system_config` table, and from any admin control. Admin-configured `ENGINE_A_THORX_CUT_PCT` is read correctly in `recordEarnEvent`, but the gross PKR value going in is pulled from this static dictionary — not from any real ad-network revenue signal.

---

## CATEGORY 2: The "Million-Dollar Company" Standards Gap

---

### 2.1 — Authentication Guard Coverage

The following routes use a manual `getThorxPrincipalId()` + early-return pattern instead of the `requireSessionAuth` middleware. They work correctly today, but they bypass the middleware chain — meaning any future middleware added to `requireSessionAuth` (logging, audit trails, enhanced rate-limiting) will not automatically apply to them:

| Route | Line | Severity |
|---|---|---|
| `GET /api/notifications` | 756 | Medium |
| `GET /api/earnings` | 774 | Medium (comment incorrectly says "no auth required") |
| `GET /api/referrals` | 809 | Medium |
| `POST /api/ad-view` | 1387 | **CRITICAL** — earns real money, no middleware |
| `GET /api/dashboard/stats` | 1505 | Medium |
| `GET /api/earnings/history` | 1543 | Medium |
| `GET /api/referrals/leaderboard` | 1570 | Low |
| `GET /api/referrals/stats/detailed` | 1596 | Low |
| `GET /api/transactions/history` | 1631 | Medium |
| `GET /api/chat/stats` | 3278 | Low |
| `GET /api/chat/history` | 3292 | Low |
| `GET /api/tasks` | 3480 | Medium |
| `POST /api/tasks/:id/click` | ~3510 | Medium |
| `POST /api/tasks/:id/verify` | 3534 | **CRITICAL** — earns real money, no middleware |
| `GET /api/tasks/completed/today/:type` | 4117 | Low |

---

### 2.2 — Rate Limiting Gaps

| Endpoint | Current Limiter | Risk |
|---|---|---|
| `POST /api/ad-view` | ❌ None (in-handler time check only — has race condition) | Bot farming / point inflation |
| `POST /api/tasks/:id/click` | ❌ None | Task slot abuse |
| `POST /api/tasks/:id/verify` | ❌ None | CPA verification spam |
| `POST /api/guilds/:id/apply` | ❌ None | Spam applications |
| `POST /api/guilds/:id/chat` | ❌ None | Guild chat flood |
| `POST /api/guilds/:id/dm/:memberId` | ❌ None | DM spam |
| `POST /api/support/chat` | ❌ None | Bot abuse of chatbot API |
| `POST /api/login` | ✅ `authRateLimiter` | OK |
| `POST /api/register` | ✅ `authRateLimiter` | OK |
| `POST /api/withdrawals` | ✅ `withdrawalRateLimiter` | OK |
| `POST /api/withdrawals/referral` | ✅ `withdrawalRateLimiter` | OK |

---

### 2.3 — Input Validation & Mass Assignment

**[C2-01] `PATCH /api/guilds/:id/settings` (line 1133)** — destructures `req.body` with no Zod schema:
```javascript
const { name, description, minRankRequired, targetDifficulty, isOpen, memberCapacity } = req.body;
```
No type checking, no `maxLength` enforcement on `name`/`description`, no enum allowlist for `targetDifficulty`. A captain could send an excessively long string or an unexpected value for difficulty.

**[C2-02] `POST /api/guilds/:id/chat` (line 1061)** — message content is passed directly to storage with no route-level length cap. Only the DB schema enforces limits, not the application layer.

**[C2-03] `PATCH /api/admin/users/:userId/ps` (line 4500)** — `delta` is parsed with `Number(delta)` and applied directly. No minimum/maximum cap is enforced. An admin could set `delta: 999999` or `delta: -999999` with no validation guardrail.

**[C2-04] `POST /api/admin/guilds/bulk-targets`** — bulk operation rewrites weekly targets for every guild in a rank tier with a single request. No dry-run mode, no confirmation token, no preview step. A single mistyped payload updates all matching guilds irreversibly.

**[C2-05] Free-text `reason` fields lack `maxLength` enforcement** — rejection reasons (`PATCH /api/guilds/:id/applications/:applicationId`), PS adjust reasons (`PATCH /api/admin/users/:userId/ps`), and GPS adjust reasons all go into audit logs and notification bodies with no length cap. Oversized strings could cause notification rendering issues or DB text-field overflow on some environments.

---

### 2.4 — Missing Database Indexes

| Table | Missing Index | Why It Matters |
|---|---|---|
| `activity_feed` | `user_id` column | Feed is frequently filtered by a specific user in admin views |
| `guild_weekly_snapshots` | `guild_id`, `created_at` | Weekly history query in Captain Portal does ORDER BY on these |
| `guild_members` | Composite `(guild_id, user_id, status)` | "Active members of a guild" is the most common member query |
| `score_history` | Composite `(user_id, snapshot_at)` | Exists as two individual indexes; a composite would be faster for range scans |

**Already correctly indexed:** `user_transactions` (composite userId+createdAt, userId+withdrawn), `captain_messages` (composite thread index), `referral_commissions`, `task_records` (composite userId+taskId), and all `users` sort columns (performanceScore, totalEarnings, userRankTier).

---

### 2.5 — Scale Bottlenecks

**[C2-06] `refreshLeaderboardCache()` — loads ALL active users into Node.js heap**
`db.select().from(users).where(and(eq(users.isActive, true), eq(users.role, 'user')))` has no `LIMIT`. On a platform with 10,000+ users this loads the entire users table into Node.js memory, sorts it multiple times in-memory, then batch-inserts. This will cause heap pressure and latency spikes on every leaderboard refresh.

**[C2-07] `getGuildDiscoveryList()` — no pagination or LIMIT**
Returns all discoverable guilds in a single query to every user request. As guild count grows this becomes a full table scan with a full network payload.

**[C2-08] `getActivityFeed()` — has LIMIT but no cursor**
The admin live-feed returns the most recent N records but provides no cursor-based pagination. Loading older history requires restarting from the top each time.

**[C2-09] `processWithdrawal()` — FIFO ledger walk grows with user history**
The withdrawal process walks all un-withdrawn `user_transactions` records in `createdAt` order. As a user's transaction count grows into the thousands (from daily ad-views), this query grows proportionally in both data scanned and time.

---

### 2.6 — Missing Enterprise Layers

**[C2-10] No structured logging**
Every log statement uses `console.log` / `console.error`. No Winston/Pino JSON logger means logs are not parseable by log aggregators (Datadog, CloudWatch, Logtail). Stack traces are unstructured strings. Background job failures (guild reset, inactivity penalty) are silently swallowed after `console.error`.

**[C2-11] No error tracking**
No Sentry, Bugsnag, or equivalent integration. Unhandled promise rejections and runtime exceptions are invisible in production.

**[C2-12] Zero automated test coverage**
No `.test.ts` files, no `tests/` directory, no Vitest/Jest config anywhere in the project. The financial engine (`recordEarnEvent`, `processWithdrawal`, `drawThorxCard`) has no unit tests. The invariants can only be verified by manual curl commands.

**[C2-13] No request correlation IDs**
Requests cannot be traced end-to-end. When a background job or route fails, there is no way to correlate a frontend error with the backend log line that caused it.

**[C2-14] No DB migration rollback strategy**
`scripts/migrate-v3.ts` applies forward migrations only. `drizzle-kit push --force` is used for schema sync, which is destructive and non-reversible in production. No `down()` migrations exist.

**[C2-15] Global body size limit is too permissive for chat endpoints**
`express.json({ limit: '10mb' })` is set globally. Individual chat and DM message routes don't apply a tighter per-route limit. A single malformed upload to a chat endpoint can consume 10 MB of the request buffer before being rejected.

---

## CATEGORY 3: Ecosystem Disconnection & UX Friction

---

### 3.1 — Ecosystem Sync Gaps

**[C3-01] Weekly target change — no realtime broadcast to members**
When a captain changes `targetDifficulty` via `PATCH /api/guilds/:id/settings`, no WS event is emitted. `GuildMemberPanel.tsx` polls guild data on a 30-second interval (line 64). Members will see the updated target with up to a 30-second delay with no visual indication it changed.

**[C3-02] Captain replacement — no WS broadcast to either party**
When an admin runs `PATCH /api/admin/guilds/:id/captain`, no WS event fires. The demoted captain continues to see the Captain Portal. The promoted member continues to see the Member Panel. Both must manually refresh to discover their role changed.

**[C3-03] Withdrawal status change — user receives no realtime notification**
`PATCH /api/admin/withdrawals/:id` (line 2418) calls `broadcastTeamRefresh("withdrawals_bulk_updated")` — this refreshes the admin view only. No `broadcastToUser` call exists for the withdrawal's owner. The user must refresh manually to see their status change from `pending` to `approved` or `rejected`.

**[C3-04] Admin PS manual adjust — rank-up toast never fires**
`PATCH /api/admin/users/:userId/ps` (line 4500) broadcasts event name `ps_updated`. The client's `useRealtimeSync` hook listens for `rank_updated` to trigger the rank-up toast. Since the event name is `ps_updated` (not `rank_updated`), the user's rank badge silently updates but no congratulatory toast is shown — even when a rank change occurred.

**[C3-05] `guild.pool_credited` WS event — no frontend subscriber**
The Sunday reset job broadcasts `guild.pool_credited` after distributing the weekly bonus pool. The frontend `useRealtimeSync` hook has no handler for this event. Members see no in-app notification or UI update when their Sunday bonus is credited — they find out only when their next 30-second poll fires.

**[C3-06] `guild.member_earned` WS event — no frontend subscriber**
Engine C completions emit no real-time roster update. The Captain Portal roster tab requires a manual refresh to show updated weekly point contributions for each member.

**[C3-07] Captain DMs use 5-second polling — not realtime**
Both `CaptainPortal.tsx` (line 79) and `GuildMemberPanel.tsx` (line 95) refetch the DM thread on a 5-second interval. This creates a 5-second message delay and generates 12 API requests per minute per open DM thread. At scale with many active guilds, this is significant server load for a feature that should use WS push.

---

### 3.2 — Mobile Responsiveness & CSS

**[C3-08] `AdminDashboard.tsx` line 158 — `grid-cols-3` with no mobile fallback**
The engine breakdown stat block uses `grid-cols-3` with no `sm:grid-cols-1` or `sm:grid-cols-2` override. On screens below 640px the three cards are squeezed into 33% width each — unreadable.

**[C3-09] `AdminDashboard.tsx` line 352 — `grid-cols-2 lg:grid-cols-4` skips `md:` breakpoint**
Jumps from 2 columns (mobile) to 4 columns (large screens) with no `md:grid-cols-3` intermediate. On iPad-sized screens the 4-column layout appears too early.

**[C3-10] `UserManager.tsx` and `GuildManager.tsx` — admin data tables missing `overflow-x-auto`**
These admin panels contain wide tables with many columns. Several table containers are missing `overflow-x-auto` wrappers, causing horizontal overflow that blows out the page layout on mobile.

**[C3-11] `LeaderboardInsights.tsx` — fixed `w-[xxx]` widths without responsive overrides**
Fixed-width rank badge and column elements lack `md:` responsive overrides, causing layout blowout when the sidebar is open on tablet-sized screens.

**[C3-12] `CaptainPortal.tsx` applications tab — no scroll container**
The pending applications list grows unbounded with no `max-h-[xxx] overflow-y-auto` wrapper. On mobile a large application queue pushes all other tab content off-screen.

**[C3-13] `TeamPortal.tsx` admin sidebar — potential scroll freeze on iOS Safari**
Fixed/sticky sidebar elements inside scrollable parents can cause scroll jank or complete scroll freeze on iOS Safari when the virtual keyboard is open.

---

### 3.3 — UX Polish & Loading States

**[C3-14] `GuildDiscoveryPanel.tsx` line 139 — raw text "Loading guilds…" instead of skeleton**
Shows a plain centered string. Should be a 3-column skeleton card grid matching the loaded layout to prevent jarring layout shift.

**[C3-15] `CaptainPortal.tsx` line 217 — raw text "Loading guild data…" instead of skeleton**
Same issue. Should be a skeleton screen matching the portal card structure.

**[C3-16] Multiple mutations in `UserPortal.tsx` — missing `onError` toast handlers**
Only 2 `onError` handlers found across the entire `UserPortal.tsx` (lines 817, 978). The following mutations have no error feedback at all:
- Ad-view record mutation
- Task click mutation
- Guild chat message mutation
- Referral link copy mutation (fails silently when clipboard API is blocked by browser)
- Guild application submit mutation
- Withdrawal confirm mutation

When these fail, the user sees nothing — the button stops its loading spinner with no explanation.

**[C3-17] `CaptainPortal.tsx` roster tab — empty state is blank space**
When the guild has no active members, the roster tab renders nothing. No illustration, no guidance text ("Your roster is empty — share your guild link to attract members").

**[C3-18] `GuildMemberPanel.tsx` tasks tab — empty state is blank space**
When no weekly tasks exist for the current cycle, the tasks tab renders an empty area with no guidance text.

**[C3-19] `GuildDiscoveryPanel.tsx` — no empty state when no guilds exist**
On a fresh deployment with zero guilds, the discovery panel renders a blank area with no call to action. Should display: "No guilds available yet — reach B-Rank to create one."

**[C3-20] Withdrawal confirm button — no loading state or disabled state**
The withdrawal confirmation mutation fires but the confirm button has no `disabled={isPending}` or spinner while the request is in-flight. A user can double-click and submit two withdrawal requests before the rate limiter or DB lock can intervene.

**[C3-21] Admin PS/GPS adjust modals — no confirmation step before applying**
Both PS and GPS manual adjust modals submit immediately on form submission with no "Are you sure?" confirmation step. A mis-typed delta of `10000` instead of `1000` applies instantly with no undo.

---

## MASTER FIX PLAN

---

### PHASE 1 — CRITICAL SECURITY & FINANCIAL INTEGRITY *(Fix immediately, no exceptions)*

**P1.1 — Fix Captain DM access control** *(C1-10)*
In `storage.getCaptainMessageThread()` and `storage.sendCaptainMessage()`, verify the caller's `userId` is either the guild's captain or the exact `memberId` param before executing. In the route, add a membership/captain check before calling storage.

**P1.2 — Add `earnRateLimiter` to ad-view and task-verify routes** *(2.2)*
Create a new `earnRateLimiter` (10 requests per minute per userId) and apply it to `POST /api/ad-view` and `POST /api/tasks/:id/verify`. These are the highest-value endpoints and must be rate-limited.

**P1.3 — Fix `POST /api/ad-view` race condition** *(C1-08)*
Wrap the time check and the `ad_views` insert in a DB transaction. Add a unique partial index on `ad_views (user_id, date_trunc('minute', created_at))` to guarantee at-most-one earn per minute at the DB level.

**P1.4 — Wrap task verify in a single transaction** *(C1-09)*
In `POST /api/tasks/:id/verify`, wrap `updateTaskRecord` and `recordEarnEvent` in a single `db.transaction()` so they succeed or fail atomically.

**P1.5 — Fix rank-up event name mismatch for admin PS adjust** *(C3-04)*
In `PATCH /api/admin/users/:userId/ps`, when a rank change is detected, broadcast `rank_updated` (not `ps_updated`). OR update `useRealtimeSync` to treat both `ps_updated` and `rank_updated` as rank-change triggers.

---

### PHASE 2 — TRANSACTION SAFETY & DOUBLE-SPEND PREVENTION

**P2.1 — Wrap `nudgeGuildMember` in a DB transaction** *(C1-06)*
Move the cooldown check, the `lastNudgedAt` update, and the notification insert into `db.transaction()`.

**P2.2 — Wrap `sendCaptainMessage` in a DB transaction** *(C1-07)*
Move the INSERT and the read-status UPDATE into `db.transaction()`.

**P2.3 — Add `disabled={isPending}` and spinner to withdrawal confirm button** *(C3-20)*
Prevent double-submit by disabling the button and showing a loading indicator while the mutation is in-flight.

**P2.4 — Fix MVP week-lock** *(C1-14)*
Add logic to check if the guild already has an MVP set this week (`mvpSetAt >= currentWeekStart`). If yes, reject reassignment until Sunday reset. Record `mvpSetWeek` as an ISO week string to make the check explicit.

---

### PHASE 3 — AUTH MIDDLEWARE STANDARDIZATION

**P3.1 — Replace manual auth checks with `requireSessionAuth` middleware**
For every route listed in section 2.1, replace the manual `if (!getThorxPrincipalId) return 401` early-return with `requireSessionAuth` as a proper route middleware argument. Behavior is identical but future middleware enhancements automatically apply.

---

### PHASE 4 — REALTIME SYNC COMPLETENESS

**P4.1 — Captain replacement WS broadcast** *(C1-15, C3-02)*
After the DB update in `PATCH /api/admin/guilds/:id/captain`, broadcast:
- `broadcastToUser(oldCaptainId, 'guild.captain_changed', { demoted: true, guildId })`
- `broadcastToUser(newCaptainUserId, 'guild.captain_changed', { promoted: true, guildId })`

In `useRealtimeSync`, handle `guild.captain_changed` by invalidating `guildMine` and `session-auth`.

**P4.2 — Withdrawal status WS broadcast to user** *(C1-16, C3-03)*
In `PATCH /api/admin/withdrawals/:id`, after status update, add:
- `broadcastToUser(withdrawal.userId, 'withdrawal_status_changed', { status, withdrawalId })`

In `useRealtimeSync`, handle `withdrawal_status_changed` by invalidating `withdrawals` and showing a toast.

**P4.3 — Subscribe frontend to `guild.pool_credited`** *(C3-05)*
In `useRealtimeSync`, add a handler for `guild.pool_credited` that invalidates the guild query and shows a toast: "🎉 Your Sunday Bonus has been credited!"

**P4.4 — Weekly target change WS broadcast** *(C3-01)*
In `PATCH /api/guilds/:id/settings`, after saving, call `broadcastGuildEvent(guildId, 'guild.settings_updated', { weeklyTarget })`. In `useRealtimeSync`, handle `guild.settings_updated` by invalidating the guild data query.

**P4.5 — Replace 5-second DM polling with WS push** *(C3-07)*
After `sendCaptainMessage`, broadcast `broadcastToUser(toUserId, 'guild.dm_received', { guildId, fromUserId })`. On the frontend, replace the `refetchInterval: 5000` with a WS-triggered `queryClient.invalidateQueries(['guild', guildId, 'dm', memberId])`.

---

### PHASE 5 — INPUT VALIDATION & SCHEMA HARDENING

**P5.1 — Add Zod schema to `PATCH /api/guilds/:id/settings`** *(C2-01)*
Validate: `name` (string, 3–60 chars), `description` (string, 0–500 chars), `targetDifficulty` (z.enum(['easy', 'medium', 'hard'])), `isOpen` (z.boolean()), `memberCapacity` (z.number().int().min(10).max(50)).

**P5.2 — Cap admin PS/GPS delta with validation** *(C2-03)*
In `PATCH /api/admin/users/:userId/ps`, validate `delta` is between -500 and +500 per single operation. Document that larger adjustments require multiple operations.

**P5.3 — Add maxLength to all reason/message free-text fields**
Enforce `maxLength: 1000` on all rejection reasons, audit log reasons, and notification body strings before they reach the DB.

**P5.4 — Remove `weeklyBonusPool` from guild discovery response** *(C1-01)*
In `getGuildDiscoveryList()`, omit `weeklyBonusPool` from the SELECT clause or set it to `null` before returning. Replace it with a non-monetary indicator ("Active Pool") if needed by the UI.

---

### PHASE 6 — INDEXES & SCALE

**P6.1 — Add missing DB indexes** *(2.4)*
Add to `shared/schema.ts`:
```typescript
index("idx_activity_feed_user_id").on(table.userId, table.createdAt)
index("idx_guild_weekly_snapshots_guild").on(table.guildId, table.createdAt)
index("idx_guild_members_composite").on(table.guildId, table.userId, table.status)
```
Then run `drizzle-kit push`.

**P6.2 — Paginate `getGuildDiscoveryList()`** *(C2-07)*
Add `LIMIT 50` with cursor-based pagination (`?cursor=lastGuildId`). Add the cursor param to the route.

**P6.3 — Paginate `refreshLeaderboardCache()` in batches** *(C2-06)*
Process users in chunks of 500 using cursor pagination on `users.id`. Accumulate scores across batches before the final batch-insert into `leaderboard_cache`. This prevents loading the entire user table into heap at once.

---

### PHASE 7 — UX POLISH

**P7.1 — Replace raw text loading states with skeleton screens** *(C3-14, C3-15)*
- `GuildDiscoveryPanel.tsx`: Replace "Loading guilds…" with a 3-column skeleton card grid.
- `CaptainPortal.tsx`: Replace "Loading guild data…" with a skeleton matching the portal card layout.

**P7.2 — Add `onError` toast handlers to every mutation** *(C3-16)*
For every `useMutation` in `UserPortal.tsx`, `CaptainPortal.tsx`, and `GuildMemberPanel.tsx`:
```typescript
onError: (err) => toast({ title: "Action failed", description: err.message, variant: "destructive" })
```

**P7.3 — Add empty states to all three guild panels** *(C3-17, C3-18, C3-19)*
Each empty list needs an icon + descriptive message:
- Captain roster tab: "No active members yet — approve applications to build your team."
- Member tasks tab: "No weekly tasks this cycle yet — check back when the captain publishes them."
- Guild discovery: "No guilds available yet — reach B-Rank to create one."

**P7.4 — Fix mobile grid breakpoints in AdminDashboard** *(C3-08, C3-09)*
- `grid-cols-3` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- `grid-cols-2 lg:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

**P7.5 — Add `overflow-x-auto` wrappers to admin tables** *(C3-10)*
Wrap all `<table>` elements in `UserManager.tsx` and `GuildManager.tsx` in a `<div className="overflow-x-auto">` container.

**P7.6 — Add two-step confirmation to PS/GPS adjust modals** *(C3-21)*
Step 1: Fill in delta + reason. Step 2: Confirmation screen showing "Apply +500 PS to [Username]?" with Cancel/Confirm buttons.

---

### PHASE 8 — ENTERPRISE FOUNDATION *(Long-term — not blocking launch)*

**P8.1** — Replace all `console.log/error` with structured Pino JSON logger. Add `LOG_LEVEL` env var.

**P8.2** — Add Sentry SDK to both server and Vite client with DSN stored in env secrets.

**P8.3** — Add request correlation ID middleware (`x-request-id` header propagation + attach to every log line).

**P8.4** — Write unit tests for `recordEarnEvent`, `processWithdrawal`, and `drawThorxCard` using Vitest + `pg-mem` for in-memory Postgres.

**P8.5** — Write Drizzle `down()` migration functions for every schema change to enable rollback.

**P8.6** — Add a per-route body size limit to chat/message endpoints (e.g., `express.json({ limit: '10kb' })`) instead of relying on the global 10mb limit.

---

## CLARIFYING QUESTIONS

Before implementing any fixes, answers are needed on the following business logic decisions:

**Q1 — CONVERSION_RATE intentionality:**
The spec example shows 648 TX-Points for Rs.6.00 user share (requiring CONVERSION_RATE=1000). The DB is bootstrapped at 100 with the comment "100 points == 1.00 PKR." Are users intentionally earning 10× fewer points than the spec example demonstrates, or is this a bug that should be corrected to 1000?

**Q2 — MVP week-lock strictness:**
Should a captain be completely prevented from changing the MVP once set within a week? Or is freely reassigning acceptable, with "previous MVP cleared" only referring to the Sunday reset? (The current code allows unlimited reassignment — locking it down is recommended either way.)

**Q3 — Ad inventory & gross PKR values:**
The `POST /api/ad-view` hard-coded `AD_INVENTORY` dictionary uses static PKR reward values disconnected from HilltopAds network revenue. Should gross PKR per ad-view be: (a) configurable via `system_config`, (b) pulled from a real HilltopAds revenue callback, or (c) remain static?

**Q4 — Guild pool visibility on discovery cards:**
Should the discovery card show the current `weeklyBonusPool` amount (which violates spec invariant #8), or replace it with a non-monetary indicator like "Active Pool" / "Confidential" to preserve the illusion?

**Q5 — DM access scope:**
The intended access model for the DM feature needs clarification. Should read/write be restricted to exactly: (a) the guild captain + the specific member named in the URL, or (b) any active guild member can DM any other active member? (Access control must be fixed regardless — this clarifies how strict the fix should be.)

---

## SUMMARY COUNT

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Category 1 — Bugs & Gaps | 2 (C1-10, C1-08) | 5 | 5 | 5 |
| Category 2 — Standards Gap | 2 (ad-view, verify no auth) | 4 | 6 | 3 |
| Category 3 — Ecosystem & UX | 0 | 5 | 10 | 6 |
| **Total** | **4** | **14** | **21** | **14** |

**4 critical issues require fixes before any user traffic:**
1. `C1-10` — Captain DM has zero access control (any user can read/write any DM thread)
2. `C1-08` — `POST /api/ad-view` race condition allows double-earn
3. `POST /api/ad-view` and `POST /api/tasks/:id/verify` have no rate limiter middleware
4. `C3-04` — Rank-up event name mismatch means rank-up toasts never fire for admin PS adjustments
