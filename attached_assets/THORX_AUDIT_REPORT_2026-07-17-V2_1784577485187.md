# THORX — ULTIMATE MILLION-DOLLAR PRODUCT AUDIT REPORT V2
**Date:** 2026-07-17  
**Standard:** World-class, financial-integrity-first, zero-bug production quality  
**Scope:** Full codebase — server (routes.ts, storage.ts, realtime.ts, jobs/, modules/), frontend (client/src/), infrastructure (Dockerfile, schema.ts)  
**Auditor:** Deep automated scan — all findings manually verified with file:line references  
**Prior audit fixes confirmed present:** Tasks 1–23 from V1 audit (2026-07-16) — all verified in code before this scan began

---

## CATEGORY 1 — Mistakes, Bugs & Gaps

---

### 1.1 — Real-Time / WebSocket Vulnerabilities

---

**Finding 1-A — `broadcastGuildMessage()` Sends to ALL Connected Clients** `CRITICAL`
- **File:** `server/realtime.ts` lines 120–130
- **Code:**
  ```typescript
  export function broadcastGuildMessage(guildId: string, payload: unknown) {
    if (!wss) return;
    const message = JSON.stringify({ ...(payload as object), guildId });
    sockets.forEach((_meta, ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);  // ← ALL clients
    });
  }
  ```
- **Issue:** Every guild chat message is broadcast to every connected WebSocket client on the platform. A user in Guild A can receive Guild B's messages. The only thing stopping them from reading them is client-side filtering — not server-side access control. Any user can intercept any guild's chat by inspecting their WS stream.
- **Fix:** Filter by guild: `sockets.forEach((meta, ws) => { if (meta.guildId === guildId && ...) send(ws, msg); })`. Store `guildId` in socket metadata when `join_guild` is received.

---

**Finding 1-B — `join_guild` WS Handler Has No Membership Verification** `HIGH`
- **File:** `server/realtime.ts` line 74
- **Code:**
  ```typescript
  if (msg.type === "join_guild" && typeof msg.guildId === "string") {
    setSocketGuild(ws, msg.guildId);  // ← no membership check
  }
  ```
- **Issue:** Any authenticated user can send `{ type: "join_guild", guildId: "any-uuid" }` over their WebSocket connection and get routed guild events for a guild they don't belong to. The server never checks `storage.getUserGuild(userId)` or verifies membership before registering the socket in that guild's channel.
- **Fix:** Before calling `setSocketGuild`, query DB to verify `user.guildId === msg.guildId`.

---

**Finding 1-C — No Rate Limiting on WebSocket Messages** `HIGH`
- **File:** `server/realtime.ts` lines 73–82
- **Issue:** An authenticated user can send unlimited WS messages per second. Each `join_guild` message triggers `setSocketGuild()`. There is no per-connection or per-user message throttle. A malicious user with a valid session can flood the server's WS message handler.
- **Fix:** Track message timestamps per socket; reject more than N messages per second with `ws.close(1008, "Rate limit exceeded")`.

---

**Finding 1-D — No WS Reconnection Feedback in Frontend** `MEDIUM`
- **Issue:** When the WebSocket connection drops (network change, server restart), real-time features (guild chat, live activity feed, notifications) silently stop updating. No UI indicator warns the user. `useRealtimeSync.ts` has reconnect logic but no toast/banner/status indicator.
- **Fix:** Expose a `wsStatus` signal; show a subtle banner "Live updates paused — reconnecting..." when WS is disconnected.

---

### 1.2 — Scale & Performance Bombs

---

**Finding 1-E — `refreshLeaderboardCache()` Full-Table Memory Bomb** `CRITICAL`
- **File:** `server/storage.ts` line 2992–3045
- **Code:** `const [allQualifiedUsers, l1Rows] = await Promise.all([...])` — loads every active user into Node.js heap.
- **Issue:** `refreshLeaderboardCache()` fetches ALL active users from the DB and performs O(n log n) in-memory sorts for percentile calculations. At 10,000 users, this allocates ~30–50MB per cache refresh call. At 100,000 users, this OOM-crashes the server. The function is called after every earn event via line 2852.
- **Fix:** Compute rankings entirely in SQL with `RANK() OVER (ORDER BY performance_score DESC)` window function; emit only the top-N rows to the cache. Never load all users into application memory.

---

**Finding 1-F — N+1 Insert Pattern in Leaderboard Score History** `HIGH`
- **File:** `server/storage.ts` lines 3117–3145 (updateLeaderboardCache)
- **Issue:** For each user in the leaderboard, a separate `db.insert(scoreHistory)` call is made inside a loop. At 1,000 users, this is 1,000 sequential INSERT statements per cache refresh. Should be a single `db.insert(scoreHistory).values([...batch])` call.
- **Fix:** Collect all score history rows in an array, then call `db.insert(scoreHistory).values(batchArray)` once.

---

**Finding 1-G — `getDailyTasks()` Has No LIMIT** `HIGH`
- **File:** `server/storage.ts` line 1665
- **Code:** `return await db.select().from(dailyTasks).orderBy(desc(dailyTasks.createdAt));`
- **Issue:** Returns every daily task ever created. No pagination or limit. As the task library grows, this becomes a full-table scan loading unbounded data into memory on every portal load.
- **Fix:** Add `.limit(500)` (or paginate). Archive/soft-delete old tasks.

---

**Finding 1-H — `getHilltopAdsZones()` Has No LIMIT** `HIGH`
- **File:** `server/storage.ts` line 1762
- **Code:** `return await db.select().from(hilltopAdsZones).orderBy(desc(hilltopAdsZones.createdAt));`
- **Issue:** Same pattern as 1-G. Returns all ad zones ever created. Ad zone table will grow unbounded.
- **Fix:** Add `.limit(100)` — only active zones are needed at runtime.

---

**Finding 1-I — `getGuilds()` Has No LIMIT** `MEDIUM`
- **File:** `server/storage.ts` line 949 area
- **Issue:** Returns all guilds without a limit. At scale, even guild browser screens will trigger full-table scans.
- **Fix:** Add `.limit(200)` default + pagination support for the guild browser endpoint.

---

### 1.3 — Floating-Point Precision Remaining

---

**Finding 1-J — `parseFloat(user.balanceCashPkr)` in Withdrawal Logic** `HIGH`
- **File:** `server/storage.ts` lines 4732, 4746
- **Code:**
  ```typescript
  balanceCashPkr: parseFloat(user?.balanceCashPkr ?? "0"),   // line 4732
  const balance = parseFloat(user.balanceCashPkr);           // line 4746 — used for withdrawal comparison
  ```
- **Issue:** Line 4746 is inside `createReferralCashWithdrawal()` — the float comparison `if (balance < amount)` can fail for sub-paisa amounts due to IEEE 754 drift. A user with Rs. 50.0000000000001 could be incorrectly blocked.
- **Fix:** Use `new Decimal(user.balanceCashPkr).lt(new Decimal(amount))` for the comparison.

---

**Finding 1-K — `parseFloat` in `pendingTotal` Reconciliation** `HIGH`
- **File:** `server/storage.ts` line 3664
- **Code:** `const pendingTotal = pendingRows.reduce((s, w) => s + parseFloat(w.amount), 0);`
- **Issue:** Aggregating withdrawal amounts with float arithmetic. At high volumes (Rs. 10,000+), cumulative IEEE 754 drift produces wrong reconciliation totals in the founder panel.
- **Fix:** `pendingRows.reduce((s, w) => s.plus(new Decimal(w.amount)), new Decimal(0)).toFixed(2)`.

---

**Finding 1-L — `parseFloat` in `totalCommissionsPaid`** `MEDIUM`
- **File:** `server/storage.ts` line 4951
- **Code:** `totalCommissionsPaid: parseFloat(row?.total ?? "0")`
- **Issue:** Commission totals aggregated as native float. Display-only today but sets a precedent.
- **Fix:** `new Decimal(row?.total ?? "0").toFixed(2)`.

---

### 1.4 — Missing Query Invalidations

---

**Finding 1-M — `chatMutation` onSuccess Lacks Query Invalidation** `MEDIUM`
- **File:** `client/src/pages/UserPortal.tsx` line ~1004
- **Issue:** After sending a guild chat message, the message list query is not invalidated. User sends a message and must manually refresh to see their own sent message appear in the list.
- **Fix:** Add `queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "messages"] })` in `onSuccess`.

---

**Finding 1-N — `recordAdViewMutation` Lacks `onSuccess` Invalidation** `MEDIUM`
- **File:** `client/src/pages/UserPortal.tsx` line ~798
- **Issue:** After recording an ad view, the earnings list and ad-view count are not invalidated. The "today's earnings" widget stays stale until next manual refresh.
- **Fix:** Invalidate `["earnings"]`, `["ad-views"]`, `["session-auth"]` in `onSuccess`.

---

### 1.5 — Frontend Debug Code

---

**Finding 1-O — 17 `console.log/error/warn` Calls in Frontend** `HIGH`
- **Files & Lines:**
  | File | Lines | Type |
  |------|-------|------|
  | `client/src/pages/auth.tsx` | 486, 515 | `console.error` |
  | `client/src/pages/UserPortal.tsx` | 235, 247, 1037, 1100, 2673 | `console.error` |
  | `client/src/components/ads/HilltopAdsPlayer.tsx` | 43, 54, 62, 71, 102, 127 | `console.error/log/warn` |
  | `client/src/components/ErrorBoundary.tsx` | 40 | `console.error` |
  | `client/src/components/ui/enhanced-video-player.tsx` | 412, 452 | `console.error` |
  | `client/src/lib/fingerprint.ts` | 48 | `console.error` |
- **Issue:** Error details, user share/copy failures, chat errors, withdrawal errors, and ad waterfall state are all logged to the browser console. On any modern browser with DevTools open, a user can see internal operation details, error messages, and system structure.
- **Fix:** Remove all `console.*` from production frontend. Show user-facing toasts for recoverable errors. `ErrorBoundary` may keep `console.error` in development only (gate on `import.meta.env.DEV`).

---

### 1.6 — TypeScript Safety

---

**Finding 1-P — 48 `as any` Casts Hiding Runtime Errors** `MEDIUM`
- **Files:** `client/src/hooks/useRealtimeSync.ts` (lines 104, 130, 156), `client/src/pages/UserPortal.tsx` (lines 1208, 1209, 3340), `client/src/components/DashboardCards.tsx` (lines 64–69)
- **Issue:** `as any` removes TypeScript's ability to catch property access on `undefined`. The WS message handler casts all incoming messages to `any`, meaning a malformed server message silently propagates `undefined` values through the UI state tree.
- **Fix:** Define typed discriminated unions for all WS message types. Define strict interfaces for all API response shapes. Remove all `as any` casts.

---

**Finding 1-Q — React Query Key Inconsistency** `MEDIUM`
- **File:** `client/src/pages/UserPortal.tsx` lines 605–652
- **Issue:** Mix of string array keys `["earnings"]` and path string keys `["/api/tasks/completed/today/internal"]`. When a mutation tries to invalidate a query, it must match the exact key format — inconsistency causes silent cache miss and stale UI after mutations.
- **Fix:** Standardize all query keys to the path format: `["/api/earnings"]`, `["/api/tasks/completed/today"]`, etc. Create a `queryKeys` constant object.

---

---

## CATEGORY 2 — Million-Dollar Company Standards Gaps

---

### 2.1 — Missing Input Validation (Mass-Assignment Risk)

---

**Finding 2-A — `PATCH /api/admin/config/:key` Uses `req.body` Directly** `HIGH`
- **File:** `server/routes.ts` line ~440
- **Code:** `const config = await storage.updateSystemConfig(req.params.key, value, ...)`  where `value` comes from `req.body` with only a manual existence check.
- **Issue:** No Zod schema validates the shape or type of `value`. An admin sending `{ value: { __proto__: ... } }` or an extremely large object could corrupt system config or cause a crash.
- **Fix:** Add `const { value } = z.object({ value: z.union([z.string(), z.number(), z.boolean()]) }).parse(req.body)`.

---

**Finding 2-B — `POST /api/admin/users/:id/action` Destructures `req.body` Without Zod** `HIGH`
- **File:** `server/routes.ts` line ~498
- **Code:** `adjustType = req.body.type === 'deduct' ? 'subtract' : 'add'` — direct destructuring.
- **Issue:** `req.body.type` is trusted without schema validation. An unexpected value silently defaults to `'add'` due to the ternary — a typo in an admin API call grants points instead of deducting them.
- **Fix:** `const { type, amount, reason } = z.object({ type: z.enum(["add", "deduct"]), amount: z.number().positive(), reason: z.string().min(1) }).parse(req.body)`.

---

**Finding 2-C — `PATCH /api/profile` Destructures `req.body` Without Zod** `HIGH`
- **File:** `server/routes.ts` line ~686
- **Issue:** Profile update directly destructures from `req.body`. Fields like `role`, `permissions`, and `isActive` could potentially be passed and processed if the destructuring pattern is too broad.
- **Fix:** Explicit allowlist Zod schema: only `firstName`, `lastName`, `identity`, `phone`, `avatar`, `profilePicture` are accepted.

---

**Finding 2-D — `PATCH /api/guilds/weekly-tasks/:taskId` Passes `req.body` Directly to Storage** `MEDIUM`
- **File:** `server/routes.ts` line ~1278
- **Issue:** `storage.updateWeeklyTask(taskId, req.body)` — the entire request body is spread into the DB update. This is a direct mass-assignment vulnerability: any field in the `weeklyTasks` schema can be overwritten by an authenticated admin who sends extra body fields.
- **Fix:** Define a `weeklyTaskUpdateSchema = z.object({ title, description, pointsReward, isActive })` and parse before passing to storage.

---

### 2.2 — Missing Rate Limiters

---

**Finding 2-E — `POST /api/team/invitations` Has No Rate Limiter** `HIGH`
- **File:** `server/routes.ts` line 372
- **Issue:** No rate limiter on invitation creation. A compromised team account can send thousands of invitations (and associated emails) per second, weaponizing the platform as an email spammer.
- **Fix:** Apply `contactRateLimiter` (or a new `inviteRateLimiter` at 5/min) to this route.

---

**Finding 2-F — `PATCH /api/admin/config/:key` Has No Rate Limiter** `HIGH`
- **File:** `server/routes.ts` line 438
- **Issue:** No rate limiter on system config updates. An attacker with a compromised admin session can rapidly flip config values (CONVERSION_RATE, user cut percentages) without any throttling.
- **Fix:** Apply `profileRateLimiter` (10/min) to this route.

---

**Finding 2-G — `POST /api/guilds` (Create Guild) Has No Rate Limiter** `MEDIUM`
- **File:** `server/routes.ts` line ~973
- **Issue:** A user can create guilds in a tight loop. No rate limiter prevents guild-creation spam.
- **Fix:** Apply `guildInteractionRateLimiter` to guild creation.

---

**Finding 2-H — `POST /api/guilds/:id/join` Has No Rate Limiter** `MEDIUM`
- **File:** `server/routes.ts` line ~1021
- **Issue:** No rate limiter on join attempts. A user can hammer the join endpoint to probe guild membership rules or trigger repeated validation logic.
- **Fix:** Apply `guildInteractionRateLimiter` to this route.

---

### 2.3 — Missing Database Indexes

---

**Finding 2-I — Missing Composite Index on `referrals(referrer_id, status)`** `HIGH`
- **File:** `shared/schema.ts`
- **Issue:** Every referral commission lookup and referral stats query filters on `referrer_id` AND `status`. Without a composite index, each query does a full index scan on `referrer_id` then filters status in memory — O(n) per referral lookup.
- **Fix:** Add `index("referrals_referrer_status_idx").on(referrals.referrerId, referrals.status)` to schema.

---

**Finding 2-J — Missing Index on `users(performance_score DESC)`** `HIGH`
- **File:** `shared/schema.ts`
- **Issue:** Leaderboard queries sort by `performance_score DESC`. Without an index, every leaderboard render does a full `users` table sort. At 50,000 users, this is catastrophic.
- **Fix:** Add `index("users_performance_score_idx").on(users.performanceScore)` to schema.

---

**Finding 2-K — Missing Index on `users(total_earnings DESC)`** `HIGH`
- **File:** `shared/schema.ts`
- **Issue:** Referral leaderboard and top-earner queries sort by `total_earnings`. Same full-table-sort problem as 2-J.
- **Fix:** Add `index("users_total_earnings_idx").on(users.totalEarnings)` to schema.

---

**Finding 2-L — Missing Composite Index on `task_records(user_id, task_id)`** `HIGH`
- **File:** `shared/schema.ts`
- **Issue:** The weekly task duplicate check (`SELECT * WHERE user_id = ? AND task_id = ?`) runs on every task completion attempt. No composite index means a full scan of the `task_records` table per attempt.
- **Fix:** Add `uniqueIndex("task_records_user_task_idx").on(taskRecords.userId, taskRecords.taskId)` — this also enforces the uniqueness constraint at DB level (belt-and-suspenders alongside app-level check).

---

### 2.4 — Modules Without Error Handling

---

**Finding 2-M — `risk-engine.ts` Doesn't Handle DB Failures** `HIGH`
- **File:** `server/modules/risk-engine.ts` lines 280, 310, 378
- **Issue:** DB calls inside `scoreUser()` and `upsertRiskCase()` are not wrapped in try/catch. A DB timeout during risk scoring silently propagates an unhandled rejection, which (post-Task-23 fix) triggers `process.exit(1)` — bringing down the entire server because a background risk score failed.
- **Fix:** Wrap all DB operations in risk-engine in try/catch; log failures with pino and return a neutral "unable to score" result rather than crashing.

---

**Finding 2-N — `ps-engine.ts` Doesn't Handle DB Failures** `HIGH`
- **File:** `server/modules/ps-engine.ts` lines 43, 56, 88
- **Issue:** Same problem as 2-M — DB failures in the performance score engine propagate as unhandled rejections.
- **Fix:** Same fix — defensive try/catch with pino error logging.

---

### 2.5 — Infrastructure Security

---

**Finding 2-O — Dockerfile Production Stage Runs as Root** `HIGH`
- **File:** `Dockerfile` — production stage (no `USER` directive)
- **Issue:** The production container runs Node.js as root. If the app is compromised via a dependency vulnerability or RCE, the attacker has root privileges inside the container, making container escape easier and blast radius larger.
- **Fix:**
  ```dockerfile
  RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 thorx
  USER thorx
  ```
  Add before the `CMD` line in the production stage.

---

**Finding 2-P — No Startup Environment Variable Validation** `HIGH`
- **File:** `server/index.ts` (startup sequence)
- **Issue:** The app starts successfully even if `DATABASE_URL` or `SESSION_SECRET` are missing — it only fails at runtime when the first DB query is attempted. A missing `SESSION_SECRET` defaults to `"thorx-secret-key-dev-only"` in production (line ~265 of routes.ts), which is a critical security flaw that is completely silent at deploy time.
- **Fix:** Add a startup validation function that checks all required env vars before calling `registerRoutes()`, and calls `process.exit(1)` with a clear error message if any are missing.

---

**Finding 2-Q — `users.cascade_delete` on Financial Tables** `MEDIUM`
- **File:** `shared/schema.ts` — `earnings`, `withdrawals`, `user_transactions`, `commission_logs` tables
- **Issue:** `onDelete: "cascade"` on `userId` FK means deleting a user from the admin panel cascades and permanently destroys their entire financial history. This violates standard financial record-keeping requirements — audit logs and transaction history must be retained even after user deletion. A soft-delete (set `isActive = false`) should be used instead.
- **Fix:** Change user deletion to a soft-delete pattern (`isActive = false`, `email = anonymized_uuid`). Remove `onDelete: "cascade"` from financial tables. Keep the cascade only on non-financial user data (profile pictures, notifications, sessions).

---

**Finding 2-R — Graceful Shutdown Drops In-Flight Requests** `MEDIUM`
- **File:** `server/index.ts` line 30
- **Issue:** `uncaughtException` handler calls `process.exit(1)` immediately — no drain of active HTTP connections or in-progress DB transactions. A withdrawal being processed at the moment of crash has no rollback guarantee from the server side (though the DB transaction will roll back, the client gets a TCP reset and may retry).
- **Fix:** Before `process.exit(1)`, call `server.close()` and await it with a 5-second timeout:
  ```typescript
  server.close(() => { logger.fatal('Server closed — exiting'); process.exit(1); });
  setTimeout(() => process.exit(1), 5000).unref();
  ```

---

---

## CATEGORY 3 — Ecosystem Disconnection & UX Friction

---

### 3.1 — Frontend Debug Code

*(See Finding 1-O — 17 console.* calls to remove from frontend)*

---

### 3.2 — PKR Leak in Marketing / Public Pages

---

**Finding 3-A — `value-proposition.tsx` Shows Rs. PKR to Unauthenticated Users** `HIGH`
- **File:** `client/src/components/sections/value-proposition.tsx` line 100
- **Issue:** The marketing landing page value-proposition section displays Rs. PKR amounts to unauthenticated visitors. This breaks the points-only illusion entirely for new users who haven't even signed up yet.
- **Fix:** Replace with TX-Points equivalents or use non-specific language ("earn real value", "platform rewards").

---

### 3.3 — ProtectedRoute Silent Null Returns

---

**Finding 3-B — `ProtectedRoute` Returns `null` With No Loading UI** `MEDIUM`
- **File:** `client/src/components/auth/ProtectedRoute.tsx` lines 34, 66, 116
- **Issue:** On initial load while session is being fetched, `ProtectedRoute` returns `null` — the screen goes completely blank for ~200ms. Users on slow connections see a flash of empty content before the login redirect. This looks like a broken app.
- **Fix:** Return a skeleton screen (matching the route's general layout) during loading, not `null`.

---

### 3.4 — Hardcoded Placeholder Values

---

**Finding 3-C — `call-to-action.tsx` Hardcodes `"THORX-XXXX"` Referral Code** `HIGH`
- **File:** `client/src/components/sections/call-to-action.tsx` line 33
- **Code:** `const [referralCode, setReferralCode] = useState<string>("THORX-XXXX");`
- **Issue:** A signed-in user viewing the landing page's call-to-action section sees a fake placeholder referral code instead of their real one. If they copy and share it, their friends get a broken referral link. This is a direct referral revenue loss.
- **Fix:** Use `useQuery(["/api/user"])` to get the authenticated user's `referralCode` and display it. Show a skeleton while loading; show nothing if unauthenticated.

---

### 3.5 — Admin Panel UX Gaps

---

**Finding 3-D — `UserInspectorPanel` Returns `null` With No Empty State** `MEDIUM`
- **File:** `client/src/components/admin/UserInspectorPanel.tsx` line 43
- **Issue:** When no user is selected, the inspector panel returns `null` — leaving a blank hole in the admin layout. Admins have no contextual hint that they should click a user to inspect them.
- **Fix:** Return an empty state: "Select a user from the list to inspect their profile and activity."

---

**Finding 3-E — WebSocket Disconnect Has No UI Feedback** `MEDIUM`
- **Issue:** When the WS connection drops (after server restart, network change, or deploy), guild chat, live feed, and real-time notifications silently freeze. Users send messages that appear sent client-side but are not delivered. No banner or indicator communicates the disconnect.
- **Fix:** In `useRealtimeSync.ts`, expose a `wsConnected` boolean. Show a persistent banner: "Live connection lost — some features may be delayed" when `wsConnected === false`.

---

### 3.6 — React Query Ecosystem Gaps

---

*(See Findings 1-M, 1-N, 1-Q for full details — chatMutation, recordAdViewMutation, key inconsistency)*

---

---

## SUMMARY TABLE

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| 1-A | `broadcastGuildMessage` — sends to ALL clients (no guild filter) | **CRITICAL** | WS Security |
| 1-B | `join_guild` — no membership verification | HIGH | WS Security |
| 1-C | WS — no rate limiting on messages | HIGH | WS Security |
| 1-D | WS disconnect — no UI feedback | MEDIUM | UX |
| 1-E | `refreshLeaderboardCache()` — full-table memory bomb | **CRITICAL** | Scale |
| 1-F | N+1 insert loop in leaderboard score history | HIGH | Scale |
| 1-G | `getDailyTasks()` — no .limit() | HIGH | Scale |
| 1-H | `getHilltopAdsZones()` — no .limit() | HIGH | Scale |
| 1-I | `getGuilds()` — no .limit() | MEDIUM | Scale |
| 1-J | `parseFloat(balanceCashPkr)` in withdrawal comparison | HIGH | Float Precision |
| 1-K | `parseFloat` in `pendingTotal` reconciliation | HIGH | Float Precision |
| 1-L | `parseFloat` in `totalCommissionsPaid` | MEDIUM | Float Precision |
| 1-M | `chatMutation` missing query invalidation | MEDIUM | Stale Data |
| 1-N | `recordAdViewMutation` missing invalidation | MEDIUM | Stale Data |
| 1-O | 17 `console.*` calls in frontend | HIGH | Debug Leak |
| 1-P | 48 `as any` casts hiding runtime errors | MEDIUM | TypeScript |
| 1-Q | React Query key inconsistency (string vs array format) | MEDIUM | Data Sync |
| 2-A | `PATCH /api/admin/config/:key` — no Zod validation | HIGH | Input Validation |
| 2-B | `POST /api/admin/users/:id/action` — no Zod validation | HIGH | Input Validation |
| 2-C | `PATCH /api/profile` — no Zod validation | HIGH | Input Validation |
| 2-D | `PATCH /api/guilds/weekly-tasks/:taskId` — req.body spread | MEDIUM | Input Validation |
| 2-E | `POST /api/team/invitations` — no rate limiter | HIGH | Security |
| 2-F | `PATCH /api/admin/config/:key` — no rate limiter | HIGH | Security |
| 2-G | `POST /api/guilds` — no rate limiter | MEDIUM | Security |
| 2-H | `POST /api/guilds/:id/join` — no rate limiter | MEDIUM | Security |
| 2-I | Missing composite index `referrals(referrer_id, status)` | HIGH | Performance |
| 2-J | Missing index `users(performance_score DESC)` | HIGH | Performance |
| 2-K | Missing index `users(total_earnings DESC)` | HIGH | Performance |
| 2-L | Missing unique index `task_records(user_id, task_id)` | HIGH | Performance |
| 2-M | `risk-engine.ts` — DB failures unhandled | HIGH | Reliability |
| 2-N | `ps-engine.ts` — DB failures unhandled | HIGH | Reliability |
| 2-O | Dockerfile — production runs as root | HIGH | Security |
| 2-P | No startup env var validation | HIGH | Security |
| 2-Q | `cascade_delete` on financial tables — destroys audit trail | MEDIUM | Data Integrity |
| 2-R | Graceful shutdown drops in-flight requests | MEDIUM | Reliability |
| 3-A | `value-proposition.tsx` — PKR leak in marketing page | HIGH | PKR Illusion |
| 3-B | `ProtectedRoute` — silent null returns on loading | MEDIUM | UX |
| 3-C | `call-to-action.tsx` — hardcoded `"THORX-XXXX"` referral code | HIGH | Correctness |
| 3-D | `UserInspectorPanel` — null return, no empty state | MEDIUM | UX |
| 3-E | WS disconnect — no UI feedback | MEDIUM | UX |

**CRITICAL: 2 | HIGH: 22 | MEDIUM: 13 | LOW: 0**

---

## BUSINESS LOGIC CLARIFICATIONS NEEDED

Before fixing the following items, confirmation of intent is needed:

| Q | Question |
|---|---------|
| Q1 | **Admin PKR visibility**: Admin-only components (`LedgerValidator`, `LiveActivityFeed`, `LeaderboardInsights`) show real PKR values. Is this intentional? (Founders/admins should see real PKR — this appears correct.) Confirm so we don't accidentally hide it. |
| Q2 | **User soft-delete**: For Finding 2-Q — should deleted users' financial records be retained indefinitely, or is there a retention period (e.g. 7 years per tax law)? |
| Q3 | **Guild chat history**: With Finding 1-A fix (guild-scoped WS), should guild messages be stored in DB and loaded on reconnect, or ephemeral (current)? |
| Q4 | **Leaderboard cache refresh trigger**: For Finding 1-E fix — should leaderboard refresh be triggered per-earn-event (current, expensive) or on a cron (e.g. every 5 minutes)? |
