# THORX — ULTIMATE MILLION-DOLLAR PRODUCT AUDIT REPORT
**Date:** 2026-07-16  
**Scope:** Full system — server/routes.ts (4671 lines), server/storage.ts (5244 lines), shared/schema.ts, all frontend components  
**Standard:** World-class, production-grade, financial-integrity-first

---

## CATEGORY 1: Mistakes, Bugs, and Gaps

---

### 1.1 PKR Leakage — Points-Only Illusion Violations

**Finding A — `balanceCashPkr` Sent to Frontend via Session**
- **File:** `server/routes.ts` — `/api/auth/session` response, `client/src/hooks/useAuth.ts` line 31
- **Issue:** The `User` interface includes `balanceCashPkr`. The session endpoint serializes the full user object including this field. Any browser DevTools / network inspector shows the real PKR wallet balance to the user. This field must be stripped from the session response.
- **Severity:** CRITICAL — breaks the illusion entirely at the API level

**Finding B — GuildMemberPanel Exposes PKR in Task Logic**
- **File:** `client/src/components/guild/GuildMemberPanel.tsx` line 367
- **Code:** `parseFloat(task.grossPkrPerCompletion) * 0.45 * 100`
- **Issue:** `grossPkrPerCompletion` is a raw PKR value. This calculation is used to display TX-Points for a task. Even if the result shows as "TX-Points," the source PKR field name is visible in the network response and the logic is PKR-aware on the frontend. The server should pre-compute the TX-Point display value and never send `grossPkrPerCompletion` to non-admin users.
- **Severity:** HIGH

**Finding C — Withdrawal Success Toast Shows PKR**
- **File:** `client/src/pages/UserPortal.tsx` line 2595
- **Code:** Toast includes `userNetPkr.toFixed(2)` in "Rs." format
- **Status:** This is intentional (spec allows PKR reveal on withdrawal confirmation screen). Acceptable as-is. ✅

---

### 1.2 Race Conditions

**Finding D — `createWithdrawal()` TOCTOU Window**
- **File:** `server/storage.ts` lines 1952–1965
- **Issue:** `calculateWithdrawalBreakdown()` (which reads the user's spendable balance) and the S-Rank status check both execute **outside** the transaction. The actual INSERT is wrapped in a transaction, but by then the balance read is stale. A user who fires two simultaneous withdrawal requests could pass both pre-flight checks before either INSERT commits. The partial unique index `uniq_withdrawals_one_pending_per_user` catches non-pending duplicates but **not** two simultaneous submissions of a status other than 'pending'.
- **Exact gap:** Lines 1952 and 1960–1964 run before `db.transaction()` at line 1974.
- **Severity:** HIGH — financial double-spend vector

**Finding E — `adjustUserBalance()` Unlocked SELECT Inside Transaction**
- **File:** `server/storage.ts` lines 3382–3385
- **Code:** `const [user] = await tx.select().from(users).where(eq(users.id, userId));`
- **Issue:** The user row is read without `.for('update')`. Two concurrent admin adjustments could read the same old balance, then both write increments on top of a stale value. SQL-level increment (`sql\`\${users.availableBalance} + ${x}\``) is used, which makes this safe in practice for additive operations, but the subsequent `adminId` validation reads the admin row the same way (line 3385). If the business logic ever adds conditional branching on the fetched user balance, this becomes a hard bug.
- **Severity:** MEDIUM (safe today due to SQL-increment pattern, but architecturally wrong)

---

### 1.3 Floating-Point Precision Drift

**Finding F — `recordEarnEvent()` Converts Decimal to Native Float**
- **File:** `server/storage.ts` lines 981–983
- **Code:**
  ```typescript
  const userPkrShare = userPkrShareD.toNumber();      // line 981
  const thorxProfitPkr = thorxProfitPkrD.toNumber();  // line 982
  const guildPoolPkr = guildPoolPkrD.toNumber();       // line 983
  ```
- **Issue:** `Decimal` (from `decimal.js`) is converted to native JS float BEFORE being used in string interpolation for SQL writes (lines 1025–1031, 1051, 1061). For tiny PKR amounts (e.g. Rs. 0.0003), IEEE 754 float representation introduces drift. This drift compounds across thousands of earn events. The correct fix is to keep all values as `Decimal` through to `.toFixed(N)` only at the SQL boundary.
- **Severity:** HIGH — financial integrity at scale

**Finding G — `parseFloat()` on `earnedAmount` Before Earn Engine**
- **File:** `server/storage.ts` line 1122
- **Code:** `grossPkr: parseFloat(insertAdView.earnedAmount)`
- **Issue:** `insertAdView.earnedAmount` is a string from `insertWithdrawalSchema` / ad config. `parseFloat` converts it to a float before passing to `recordEarnEvent`. This should be `new Decimal(insertAdView.earnedAmount)` passed through as Decimal, not float.
- **Severity:** MEDIUM

**Finding H — `parseFloat()` on totalEarnings in Leaderboard Computation**
- **File:** `server/storage.ts` lines 3036, 3053
- **Code:** `.map(u => parseFloat(u.totalEarnings || "0"))` and `const earned = parseFloat(u.totalEarnings || "0")`
- **Issue:** Used in leaderboard percentile and metrics calculations. Float drift on large PKR values (Rs. 10,000+) will produce incorrect rankings.
- **Severity:** MEDIUM

**Finding I — `adjustUserBalance()` Float Math in Ledger**
- **File:** `server/storage.ts` lines 3424–3425
- **Code:** `realPkrValue: Math.abs(parseFloat(amount)).toFixed(4)`
- **Issue:** The `amount` parameter arrives as a string, gets parsed to float, then formatted back to a string for the DB. Intermediate float representation can corrupt the value.
- **Severity:** MEDIUM

---

### 1.4 Missing Database Transactions

**Finding J — `createAdView()` Manual Rollback Instead of Transaction**
- **File:** `server/storage.ts` lines 1111–1145 (approx)
- **Issue:** The method inserts into `adViews` table, then calls `recordEarnEvent()`. If `recordEarnEvent()` throws, the code performs a manual `db.delete()` to roll back the ad view insertion. This is a fragile "manual transaction" — if the process crashes between insert and delete, the adView row stays orphaned with no corresponding earn event, corrupting the user's earnings history.
- **Fix:** Wrap the entire `createAdView()` body in `db.transaction()`.
- **Severity:** HIGH — data integrity

---

### 1.5 Missing onError Handlers

**Finding K — `logoutMutation` Silent Failure**
- **File:** `client/src/hooks/useAuth.ts` around line 63
- **Issue:** `logoutMutation` catches errors inside `mutationFn` but has no `onError` callback. If the server returns a non-2xx (e.g. network error), the user sees nothing — the UI may not clear the session, leaving a ghost login state.
- **Severity:** LOW

---

## CATEGORY 2: Million-Dollar Company Standards Gaps

---

### 2.1 Security & Authentication

**Finding L — `POST /api/legacy-register` Has No Rate Limiter**
- **File:** `server/routes.ts` line 1706
- **Code:** `app.post("/api/legacy-register", async (req, res) => {`
- **Issue:** This endpoint creates user accounts with no rate limiting and no `authRateLimiter`. An attacker can register thousands of fake legacy accounts per second. This endpoint is also architecturally dangerous — it sets a hardcoded password hash (`legacy_${Date.now()}`) which is trivially guessable.
- **Severity:** CRITICAL — account flooding attack vector

**Finding M — `POST /api/contact` No Rate Limiter, No Input Bounds**
- **File:** `server/routes.ts` lines 2604–2640
- **Code:** `app.post("/api/contact", async (req, res) => { const { name, email, description } = req.body;`
- **Issues:**
  1. No rate limiter — a bot can spam the contact endpoint and fill the `team_emails` table with millions of rows
  2. `description` has no max length validation — a 100MB payload is accepted and written to DB
  3. Raw `req.body` destructure without Zod schema
- **Severity:** HIGH

**Finding N — `POST /api/chat` No Rate Limiter**
- **File:** `server/routes.ts` line 3232
- **Code:** `app.post("/api/chat", async (req, res) => {`
- **Issue:** The chatbot endpoint performs a DB read (getUserById) per request with no rate limiter. It also accepts anonymous requests. A bot can hammer this endpoint to cause DB read amplification.
- **Severity:** HIGH

**Finding O — `...req.body` Spread in Withdrawal Creation**
- **File:** `server/routes.ts` line 893
- **Code:** `const withdrawalData = insertWithdrawalSchema.parse({ ...req.body, userId });`
- **Issue:** The Zod schema parse provides effective protection here, but the spread pattern is the wrong idiom. If a field is ever added to `insertWithdrawalSchema` without careful thought (e.g. `status`), a malicious user could set `status: "approved"` and if Zod passes it through, bypass the approval workflow.
- **Severity:** MEDIUM (mitigated by Zod, but pattern is dangerous)

---

### 2.2 Input Validation Gaps

**Finding P — `/api/contact` Raw Destructure, No Zod**
- **File:** `server/routes.ts` lines 2606–2612
- **Issue:** Uses manual if-check (`if (!name || !email || !description)`) with no Zod schema, no email format validation, no max length on any field.

**Finding Q — `/api/chat` No Max Length on Message**
- **File:** `server/routes.ts` line 3234–3236
- **Issue:** Only checks `!message.trim()`. A 1MB message payload is accepted, passed to `advancedChatbotService.processMessage()`, and potentially processed / logged.

---

### 2.3 Database Performance & Scale Bottlenecks

**Finding R — `getAllUsers()` Unbounded Full Table Scan**
- **File:** `server/storage.ts` lines 1455–1510
- **Issue:** Selects ALL columns from the `users` table with no `LIMIT`. On a platform with 10,000+ users, this loads the entire users table (including sensitive fields like `passwordHash`, `verificationToken`) into Node.js heap memory. This is a memory bomb on scale.
- **Called From:** Any code path that calls `getAllUsers()` (verify in leaderboard sync, risk scan, etc.)
- **Fix:** Add pagination + field projection. Use `.limit(1000)` minimum, implement cursor pagination.
- **Severity:** HIGH

**Finding S — Leaderboard Force-Sync Admin Endpoint Potential Bottleneck**
- **File:** `server/routes.ts` line 454
- **Code:** `app.post("/api/admin/leaderboard/force-sync", requirePermission("VIEW_ANALYTICS"), ...)`
- **Issue:** If this calls `getAllUsers()` internally, any admin can trigger a full-table dump at will. Need to verify internal implementation and add a cooldown/lock.
- **Severity:** MEDIUM (needs verification)

---

### 2.4 Missing Enterprise Layers

**Finding T — Zero Automated Test Coverage**
- No test files found anywhere in the codebase (no `*.test.ts`, no `*.spec.ts`, no `__tests__/` directory)
- Money-moving functions (`recordEarnEvent`, `processWithdrawal`, `createWithdrawal`) have zero test coverage
- Any future refactor can silently break financial calculations
- **Severity:** CRITICAL for production scale

**Finding U — No Structured JSON Logging**
- All logging uses `console.log()` / `console.error()` throughout `server/routes.ts` and `server/storage.ts`
- No log levels, no request IDs, no correlation IDs, no structured fields
- Impossible to grep production logs meaningfully; impossible to set up log-based alerts
- **Severity:** HIGH

**Finding V — No Error Tracking / Alerting**
- No Sentry, no Datadog, no error reporting service integrated
- Uncaught exceptions and unhandled promise rejections go silently into the void in production
- A payment processing failure could go unnoticed for hours
- **Severity:** HIGH

**Finding W — No DB Migration Rollback Strategy**
- Schema changes are applied via `drizzle-kit push --force` (destructive)
- No up/down migration files
- A bad schema push in production cannot be rolled back without data loss
- **Severity:** HIGH for production deployment

---

## CATEGORY 3: Ecosystem Disconnection & UX Friction

---

### 3.1 Missing WebSocket Event Handlers — Features That Require Page Refresh

**Finding X — `guild.announcement_posted` Not Even Broadcast**
- **File:** `server/routes.ts` lines 1152–1163 (`POST /api/guilds/:id/announcement`)
- **Issue:** Captain posts an announcement → server saves it → does NOT call `broadcastGuildEvent()`. Every guild member must manually refresh the page to see the announcement. This is a broken real-time feature.
- **Severity:** HIGH

**Finding Y — `guild.gps_updated` Broadcast Has No Frontend Handler**
- **File:** Server broadcasts `guild.gps_updated` at routes.ts line 4607. `client/src/hooks/useRealtimeSync.ts` has no handler for this event.
- **Issue:** After an admin adjusts guild GPS, no member or captain sees the updated score until they refresh.
- **Severity:** MEDIUM

**Finding Z — Guild Chat (`engine_c:message`) Uses Polling Instead of WS**
- **File:** `client/src/components/guild/GuildMemberPanel.tsx` line 87, `CaptainPortal.tsx` line 82
- **Issue:** Server broadcasts `engine_c:message` when a chat message is sent, but `useRealtimeSync.ts` has no handler for it. Both components fall back to aggressive 5-second polling. This means:
  1. 12 HTTP requests/minute per active user just for chat — unnecessary server load
  2. Chat feels slow (up to 5s delay before a message appears)
- **Severity:** MEDIUM

---

### 3.2 Stale Query Invalidations After Mutations

**Finding AA — Captain Accept/Kick Doesn't Update Guild Header Count**
- **File:** `client/src/components/guild/CaptainPortal.tsx` lines 102, 136
- **Mutations:** `appActionMutation`, `kickMutation`
- **Issue:** Both mutations invalidate only `["/api/guilds", guildId, "members"]`. They do NOT invalidate `["/api/guilds", guildId]`. The guild header showing "8/20 members" never updates after an accept or kick until full page refresh.
- **Severity:** MEDIUM — obvious stale data bug visible to captains

**Finding BB — Task Completion Doesn't Update Weekly Progress Bar**
- **File:** `client/src/components/guild/GuildMemberPanel.tsx` line 167
- **Mutation:** `completeTaskMutation`
- **Issue:** Invalidates only task-related queries. Missing `["/api/guilds", guildId]` and `["/api/guilds/mine"]`. The "Weekly Progress" tab showing current contribution points does not update after a task is completed — user must switch tabs or refresh.
- **Severity:** HIGH — core user feedback loop is broken

---

### 3.3 Mobile Responsiveness Issues

**Finding CC — Guild Chat Fixed Pixel Heights Clip on Mobile**
- **File:** `client/src/components/guild/CaptainPortal.tsx` lines 444, 498 (`style={{ height: 460 }}`, `style={{ height: 420 }}`)
- **File:** `client/src/components/guild/GuildMemberPanel.tsx` lines 386, 415 (`style={{ height: 400 }}`)
- **Issue:** Fixed `px` heights on chat containers cause content to clip or overflow on devices shorter than ~700px (e.g. iPhone SE, older Androids). The containers should use `max-h-[460px] min-h-[240px] flex-1` with proper flex container hierarchy.
- **Severity:** HIGH — core feature broken on common mobile devices

**Finding DD — GuildMemberPanel Tabs Can Overflow on Narrow Screens**
- **File:** `client/src/components/guild/GuildMemberPanel.tsx` line 253
- **Issue:** Tab bar uses `flex-1` on each tab button. On screens < 350px wide, tab labels clip or overflow. Missing `overflow-x-auto` on the tab container (CaptainPortal has this; GuildMemberPanel does not).
- **Severity:** MEDIUM

**Finding EE — Admin GuildManager Fixed Widths on Inputs**
- **File:** `client/src/components/admin/GuildManager.tsx` line 369
- **Issue:** GPS adjust inputs use `w-28` fixed width. On tablet/mobile admin view this causes cramped or clipped form fields.
- **Severity:** LOW

---

### 3.4 Client-Side Form Validation Gaps

**Finding FF — Captain Guild Settings: No Client-Side Validation**
- **File:** `client/src/components/guild/CaptainPortal.tsx` lines 563–569
- **Issue:** Guild name and description inputs submit directly without checking min 3 chars or max 60/500 chars client-side. User gets a server error after network round-trip, causing confusing UX.
- **Severity:** MEDIUM

**Finding GG — Announcement Text: No Client-Side Max Length**
- **File:** `client/src/components/guild/CaptainPortal.tsx` around line 183
- **Issue:** The announcement textarea has no `maxLength` attribute and no JS validation before calling `mutate()`. Server allows max 500 chars, but user can type 10,000 chars and only learns of the error after submit.
- **Severity:** MEDIUM

**Finding HH — Guild Chat/DM: Only Trim Check, No Max Length**
- **File:** `GuildMemberPanel.tsx` and `CaptainPortal.tsx` chat/DM send handlers
- **Issue:** Messages are sent with only `.trim()` check. No `maxLength` enforced client-side or server-side (chat endpoint). A 1MB message payload is accepted.
- **Severity:** MEDIUM

---

## SUMMARY TABLE

| # | Finding | Category | Severity | File |
|---|---------|----------|----------|------|
| A | `balanceCashPkr` in session response | PKR Leak | CRITICAL | useAuth.ts:31, routes.ts |
| B | `grossPkrPerCompletion` sent to frontend | PKR Leak | HIGH | GuildMemberPanel:367 |
| D | `createWithdrawal()` TOCTOU race | Race Condition | HIGH | storage.ts:1952–1965 |
| E | `adjustUserBalance()` unlocked SELECT | Race Condition | MEDIUM | storage.ts:3382 |
| F | `.toNumber()` float conversion in earn event | Float Drift | HIGH | storage.ts:981–983 |
| G | `parseFloat(earnedAmount)` before earn engine | Float Drift | MEDIUM | storage.ts:1122 |
| H | `parseFloat(totalEarnings)` in leaderboard | Float Drift | MEDIUM | storage.ts:3036,3053 |
| I | `parseFloat(amount)` in balance ledger | Float Drift | MEDIUM | storage.ts:3424 |
| J | `createAdView()` manual rollback not transaction | Missing TX | HIGH | storage.ts:1111 |
| K | `logoutMutation` no onError | UX | LOW | useAuth.ts:63 |
| L | `/api/legacy-register` no rate limiter | Security | CRITICAL | routes.ts:1706 |
| M | `/api/contact` no rate limiter, no Zod | Security | HIGH | routes.ts:2604 |
| N | `/api/chat` no rate limiter | Security | HIGH | routes.ts:3232 |
| O | `...req.body` spread in withdrawal | Security | MEDIUM | routes.ts:893 |
| P | `/api/contact` no Zod schema | Validation | HIGH | routes.ts:2606 |
| Q | `/api/chat` no max length | Validation | MEDIUM | routes.ts:3234 |
| R | `getAllUsers()` no LIMIT | Scale | HIGH | storage.ts:1455 |
| T | Zero test coverage | Enterprise | CRITICAL | entire codebase |
| U | No structured logging | Enterprise | HIGH | entire codebase |
| V | No error tracking | Enterprise | HIGH | entire codebase |
| W | No migration rollback | Enterprise | HIGH | schema |
| X | Announcement not broadcast via WS | Ecosystem | HIGH | routes.ts:1152 |
| Y | `guild.gps_updated` no frontend handler | Ecosystem | MEDIUM | useRealtimeSync.ts |
| Z | Guild chat uses polling not WS | Ecosystem | MEDIUM | GuildMemberPanel, CaptainPortal |
| AA | Accept/kick doesn't update member count | Stale Data | MEDIUM | CaptainPortal:102,136 |
| BB | Task complete doesn't update progress | Stale Data | HIGH | GuildMemberPanel:167 |
| CC | Chat containers fixed px height on mobile | Mobile UX | HIGH | CaptainPortal:444, GuildMemberPanel:386 |
| DD | GuildMemberPanel tabs no overflow-x-auto | Mobile UX | MEDIUM | GuildMemberPanel:253 |
| FF | Guild settings no client-side validation | Form UX | MEDIUM | CaptainPortal:563 |
| GG | Announcement no maxLength | Form UX | MEDIUM | CaptainPortal:183 |
| HH | Chat/DM no max length enforcement | Form UX | MEDIUM | GuildMemberPanel, CaptainPortal |

---

## QUESTIONS FOR BUSINESS LOGIC CLARIFICATION

1. **`grossPkrPerCompletion` field (Finding B):** Should the server strip this field from the `/api/tasks` response for non-admin users, replacing it with a pre-computed `txPointsReward` field? Or is it acceptable that users can see the raw PKR value in network responses (just not in UI)?

2. **`balanceCashPkr` in session (Finding A):** Should this field be completely omitted from the session/auth response for regular users, or is there a frontend use case I'm missing where a user-facing component needs it?

3. **`getAllUsers()` (Finding R):** Is this method currently called on any admin route that runs frequently (e.g. dashboard load)? If yes, should we replace it with paginated lookups or a cached aggregation?

4. **`/api/legacy-register` (Finding L):** Is this endpoint still needed? If it's a migration relic, should it be disabled entirely (return 410 Gone), or does the mobile app still call it?

5. **Announcement WS (Finding X):** Confirming: you want captain announcements to appear instantly on all guild member screens without refresh, correct? (So I add `broadcastGuildEvent()` after saving the announcement.)

6. **Guild Chat WS (Finding Z):** Should guild chat be fully real-time via WS (sub-second delivery), or is 5-second polling acceptable for now given the polling load on DB?
