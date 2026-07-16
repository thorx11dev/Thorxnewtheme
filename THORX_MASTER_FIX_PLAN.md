# THORX — MASTER FIX PLAN
**Based on:** Audit Report (THORX_AUDIT_REPORT.md) + Architecture Rewrite Spec + User Requirements (2026-07-16)  
**Date Created:** 2026-07-16  
**Last Updated:** 2026-07-16  
**Status:** PLAN FINALIZED — Ready for enterprise execution

---

## DECISIONS MADE (All open decisions resolved before execution)

| # | Decision | Resolution |
|---|---|---|
| D1 | CONVERSION_RATE migration for existing users | **Option A** — Accept discrepancy. Old balances stay; new earns mint at rate 1000. Dual-ledger: `real_pkr_balance` is always the source of truth; TX-Points are display-only illusion. |
| D2 | AD_INVENTORY management | **Option A** — Move to `system_config` JSON key; admin-editable from Team Portal. |
| D3 | Referrer TX-Points on referral commission | **Option A** — When referrer receives PKR commission, also credit proportional TX-Points (illusion) to referrer's visible balance so dashboard stays consistent. |
| D4 | PKR visibility to users | **NEVER show real PKR to users** — only TX-Points everywhere in user-facing UI. Real PKR is revealed only on the withdrawal summary screen at payout time. |
| D5 | Per-engine config granularity | **Per-engine AND per-ad-player** — Each engine has a default ratio + variance; individual ad players / CPA offers within Engine A can override this ratio. |
| D6 | Guild chat architecture | **Two separate systems** — (1) Guild Group Chat: all members can read/write like a WhatsApp group. (2) Captain Private DM: one-on-one between captain and a specific member, invisible to other members. |
| D7 | MVP lock scope | **Full week lock** — Once captain sets MVP for the current ISO week, no reassignment is possible until Sunday's automated reset runs. |
| D8 | Referral commission flow | **15% withdrawal fee split**: configurable % of 15% → referrer's real PKR balance (+ proportional TX-Points illusion); remaining % → Thorx profit ledger. |
| D9 | Thorx Profit sources | **Two sources tracked separately**: (1) 40% cut on every Engine A/B/C earn event. (2) Net withdrawal fee (15% minus referral commission paid out). Both flow into a unified Thorx Profit Card in Team Portal finance section. |

---

## OVERVIEW: WHAT IS CHANGING AND WHY

This plan merges three documents:
1. **Audit Report** — 53 bugs/gaps across security, standards, and UX
2. **New Architecture Spec** — 4 major feature rewrites that override previous implementation
3. **Extended Requirements (2026-07-16)** — Full TX-Points illusion, per-player engine config, referral commission, guild chat clarity, profit ledger

### Core Principle: The TX-Points Illusion
The fundamental UX contract of THORX is:
- **Users see TX-Points only.** Every earning, balance, and history view shows TX-Points — never PKR.
- **Backend stores real PKR.** The 60% user share from every earn event is calculated in PKR and stored in `users.real_pkr_balance` (never exposed via API to the user).
- **TX-Points are a display layer.** When a user earns, the system converts their PKR share to TX-Points using the configured per-engine (or per-ad-player) ratio + random variance within a team-configured band. The exact ratio is invisible to the user.
- **The reveal happens at withdrawal.** When a user requests a payout, the summary screen converts their real PKR balance to the "equivalent" amount after the 15% platform fee — this is the first and only time they see a PKR figure.

### The 40/60 Earn Rule
When money arrives from an ad network or CPA network:
- **40% → Thorx profit** (logged to `thorx_profit_pkr` in `user_transactions`)
- **60% → User's real PKR balance** (stored in `users.real_pkr_balance`, NEVER shown directly)
- TX-Points shown on Thorx Card = user's PKR share × (per-engine PKR→TX ratio) × (random variance within ±variance_pct%)

### The Spec overrides these existing systems:
- **Engine Config** — Global `CONVERSION_RATE` → per-engine + per-ad-player `ratio` + `variance` fields
- **Withdrawal Flow** — Manual keypad entry → timeframe-based selection + single-screen PKR reveal
- **Manual Balance Adjust** — Single PKR field → dual (real PKR delta + TX-Points delta), both required
- **DM Access Control** — Zero auth → strict captain/member-only enforcement
- **User-facing PKR displays** — Remove all; replace with TX-Points equivalent

Everything in this plan is organized in dependency order. Items that touch the DB schema come first.

---

## PHASE 1 — DATABASE SCHEMA CHANGES
*Must complete before any backend code changes. Requires `drizzle-kit push` after.*

---

### 1.1 — `guild_members` table: Add `mvpSetWeek` column
**Why:** Spec §4.1 and audit C1-14. MVP must be locked per ISO week. Current `mvpSetAt` timestamp is not enough — captain can reassign to a different member after clearing the first one.  
**What:** Add `mvpSetWeek varchar(10)` (format: `"2026-W29"`) to `guild_members` in `shared/schema.ts`.  
**Migration:** After `drizzle-kit push`, backfill existing rows where `isMvp = true` → set `mvpSetWeek` to the ISO week of `mvpSetAt`.

```typescript
// In shared/schema.ts — guild_members table additions:
mvpSetWeek: varchar("mvp_set_week", { length: 10 }), // e.g. "2026-W29"
```

---

### 1.2 — `system_config` table: Add 6 new per-engine config keys
**Why:** Spec §1.1. Each engine needs its own `pkr_to_tx_points_ratio` and `illusion_variance_percentage` instead of the current global `CONVERSION_RATE` + `CARD_VARIANCE_MIN/MAX`.  
**What:** Seed 6 new `system_config` rows in `storage.seedSystemConfig()`:

| Key | Default | Description |
|---|---|---|
| `ENGINE_A_PKR_TO_POINTS_RATIO` | 1000 | Engine A: TX-Points per 1.00 PKR of user share |
| `ENGINE_A_ILLUSION_VARIANCE_PCT` | 10 | Engine A: Variance % on Thorx Card draw (±10%) |
| `ENGINE_B_PKR_TO_POINTS_RATIO` | 1000 | Engine B: TX-Points per 1.00 PKR |
| `ENGINE_B_ILLUSION_VARIANCE_PCT` | 10 | Engine B: Variance % |
| `ENGINE_C_PKR_TO_POINTS_RATIO` | 1000 | Engine C: TX-Points per 1.00 PKR |
| `ENGINE_C_ILLUSION_VARIANCE_PCT` | 10 | Engine C: Variance % |

**Note on CONVERSION_RATE:** Keep the existing global `CONVERSION_RATE` key as a fallback default. The new per-engine keys take precedence in `recordEarnEvent`.

---

### 1.3 — `activity_feed` table: Add `user_id` index
**Why:** Audit C2.4. Feed is frequently filtered by userId in admin views; no index exists.  
**What:** Add `index("idx_activity_feed_user_id").on(table.userId, table.createdAt)` to the activity_feed indexes in `shared/schema.ts`.

---

### 1.4 — `guild_weekly_snapshots` table: Add indexes
**Why:** Audit C2.4. Weekly history query in Captain Portal sorts by guildId + createdAt with no index.  
**What:** Add `index("idx_guild_weekly_snapshots_guild").on(table.guildId, table.createdAt)` in `shared/schema.ts`.

---

### 1.5 — `guild_members` table: Add composite index
**Why:** Audit C2.4. "Get all active members of guild X" is the most common query; no composite index.  
**What:** Add `index("idx_guild_members_active").on(table.guildId, table.userId, table.status)` in `shared/schema.ts`.

---

### 1.6 — Run migration
After all schema changes in `shared/schema.ts`:
```bash
npx drizzle-kit push --force
```
Then run the `mvpSetWeek` backfill script (one-time SQL):
```sql
UPDATE guild_members
SET mvp_set_week = TO_CHAR(mvp_set_at, 'IYYY"-W"IW')
WHERE is_mvp = true AND mvp_set_at IS NOT NULL;
```

---

## PHASE 2 — BACKEND: CRITICAL SECURITY FIXES
*These must go live before any user traffic is allowed.*

---

### 2.1 — Fix Captain DM access control (CRITICAL — C1-10)

**File:** `server/storage.ts` — `getCaptainMessageThread()` and `sendCaptainMessage()`  
**File:** `server/routes.ts` — `GET /api/guilds/:id/dm/:memberId` and `POST /api/guilds/:id/dm/:memberId`

**Current state:** Zero access control. Any authenticated user knowing a `guildId` + `memberId` UUID can read and write any DM thread.

**Fix (route level):**
```typescript
// Before calling storage, verify the caller is either the guild captain OR the exact member
const guild = await storage.getGuildById(guildId);
const callerId = getThorxPrincipalId(req) as string;
const isCaptain = guild?.captainUserId === callerId;
const isMember = req.params.memberId === callerId;
if (!isCaptain && !isMember) {
  return res.status(403).json({ message: "Access denied. DM threads are private." });
}
```

**Fix (storage level):** `getCaptainMessageThread` must accept a `viewerId` parameter and validate it matches either `userId1` or `userId2`.

---

### 2.2 — Add `earnRateLimiter` middleware to earning routes (CRITICAL)

**File:** `server/routes.ts`  
**Current state:** `POST /api/ad-view` and `POST /api/tasks/:id/verify` have NO rate limiter — only an in-handler timing check with a race condition.

**Fix:** Create a new rate limiter in the limiter config section (alongside existing `authRateLimiter`, `withdrawalRateLimiter`):
```typescript
const earnRateLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute window
  max: 15,                   // max 15 earn attempts per minute per IP
  keyGenerator: (req) => {   // key by userId, not just IP
    const uid = getThorxPrincipalId(req);
    return uid ? `earn:${uid}` : req.ip;
  },
  message: { message: "Too many earn requests. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});
```
Apply to: `POST /api/ad-view`, `POST /api/tasks/:id/click`, `POST /api/tasks/:id/verify`

---

### 2.3 — Fix `POST /api/ad-view` race condition (CRITICAL — C1-08)

**File:** `server/routes.ts` — `POST /api/ad-view` handler  
**Current state:** Time check happens in application layer before the insert, allowing two concurrent requests to both pass the check.

**Fix:** Move the cooldown check into a DB transaction with an advisory lock:
```typescript
// Use pg_try_advisory_xact_lock keyed by userId hash
// Inside the transaction: check last ad_view, if too recent → throw, else insert
await db.transaction(async (tx) => {
  const userId = thorxPid;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
  // Now safe to check last view time and insert new record
  const [lastView] = await tx.select()
    .from(adViews)
    .where(eq(adViews.userId, userId))
    .orderBy(desc(adViews.createdAt))
    .limit(1);
  if (lastView && timeSinceMs(lastView.createdAt) < (adConfig.duration - 2) * 1000) {
    throw new Error("RATE_LIMITED");
  }
  // insert ad view row...
});
```

---

### 2.4 — Wrap task verify in atomic transaction (C1-09)

**File:** `server/routes.ts` — `POST /api/tasks/:id/verify` handler  
**Current state:** `updateTaskRecord` + `recordEarnEvent` are two separate DB calls. Server crash between them leaves task completed but points not awarded.

**Fix:** Wrap both calls in `db.transaction()`. Since `recordEarnEvent` already uses its own transaction internally, restructure it to accept an optional transaction client `tx` and pass it through.

---

### 2.5 — Fix rank-up event name for admin PS adjust (C3-04)

**File:** `server/routes.ts` — `PATCH /api/admin/users/:userId/ps` handler (line 4500)  
**Current state:** Broadcasts `ps_updated`. Client's `useRealtimeSync` only listens for `rank_updated` for the rank-up toast.

**Fix:**
```typescript
// After checkAndUpdateRankTier, if rank changed:
if (newRank !== oldRank) {
  broadcastToUser(userId, 'rank_updated', { newRank, userId });
} else {
  broadcastToUser(userId, 'ps_updated', { newPs: updatedUser.performanceScore });
}
```

---

### 2.6 — Wrap `nudgeGuildMember` in DB transaction (C1-06)

**File:** `server/storage.ts` — `nudgeGuildMember()` method  
**Fix:** Wrap the cooldown SELECT + UPDATE + INSERT into `db.transaction()`:
```typescript
async nudgeGuildMember(captainId, guildId, memberId) {
  return db.transaction(async (tx) => {
    const membership = await tx.select()...  // cooldown check
    if (cooldownViolation) throw new Error("...");
    await tx.update(guildMembers).set({ lastNudgedAt: new Date() }).where(...);
    await tx.insert(notifications).values({ userId: memberId, ... });
  });
}
```

---

### 2.7 — Wrap `sendCaptainMessage` in DB transaction (C1-07)

**File:** `server/storage.ts` — `sendCaptainMessage()` method  
**Fix:** Wrap the INSERT + UPDATE for read-status into `db.transaction()`.

---

## PHASE 3 — BACKEND: ENGINE CONFIG REWRITE (Spec §1.1 + §1.2)

---

### 3.1 — Update `recordEarnEvent` to use per-engine ratio + variance

**File:** `server/storage.ts` — `recordEarnEvent()` method (line ~870)  
**Current state:** Uses global `CONVERSION_RATE` and global `CARD_VARIANCE_MIN`/`CARD_VARIANCE_MAX` for all engines.

**Change:** Read per-engine keys first; fall back to global:
```typescript
const engineKey = params.engineType.replace("Engine_", "ENGINE_");
// e.g. "ENGINE_A" → reads ENGINE_A_PKR_TO_POINTS_RATIO, ENGINE_A_ILLUSION_VARIANCE_PCT
const [ratio, variancePct, globalConvRate] = await Promise.all([
  this.getSystemConfigValue<number>(`${engineKey}_PKR_TO_POINTS_RATIO`, 1000),
  this.getSystemConfigValue<number>(`${engineKey}_ILLUSION_VARIANCE_PCT`, 10),
  this.getSystemConfigValue<number>("CONVERSION_RATE", 1000),
]);
const conversionRate = ratio ?? globalConvRate;
// Convert variancePct (e.g. 10 = 10%) into min/max multipliers:
const varianceMin = 1 - (variancePct / 100);  // e.g. 10% → 0.90
const varianceMax = 1 + (variancePct / 100);  // e.g. 10% → 1.10
```

Pass `conversionRate`, `varianceMin`, `varianceMax` to `drawThorxCard()`. Remove the old global `CARD_VARIANCE_MIN`/`CARD_VARIANCE_MAX` reads from this function.

---

### 3.2 — Move AD_INVENTORY to `system_config` table

**Files:** `server/routes.ts` — `POST /api/ad-view` handler (lines 1400–1408)  
**Current state:** Hard-coded dictionary in route handler — not configurable by admin.

**Change:** Create a `system_config` entry `AD_INVENTORY_JSON` (type: JSON string) seeded with the default inventory. Read it in the route:
```typescript
const inventoryJson = await storage.getSystemConfigValue<string>("AD_INVENTORY_JSON", JSON.stringify(DEFAULT_AD_INVENTORY));
const AD_INVENTORY = JSON.parse(inventoryJson);
```
Add an admin UI field in SystemSettingsManager to edit the JSON (advanced mode, behind a warning).

---

### 3.3 — Update `CONVERSION_RATE` default from 100 → 1000

**File:** `server/storage.ts` line 137 and the `seedSystemConfig` call at line 528  
**Current state:** `CONVERSION_RATE = 100` (100 points per Rs.1). Spec §1.1 example: `1 PKR = 1000 TX-Points`.  
**Change:** Update seed default to `1000`. Update `DEFAULT_CONVERSION_RATE` constant to `1000`.  
**DB:** Run `UPDATE system_config SET value = 1000 WHERE key = 'CONVERSION_RATE'` after push.

> ⚠️ **Impact:** Existing users' earned TX-Points were minted at rate 100. New earnings will be at rate 1000. This creates a 10× discrepancy. **Options:**
> - Option A: Accept the discrepancy (existing balance stays, new earns are 10× higher) — simplest.
> - Option B: Multiply all existing `user_transactions.points_credited` and `users.total_points` by 10 — one-time migration.  
> **User must decide which option before this step executes.**

---

## PHASE 4 — BACKEND: WITHDRAWAL FLOW REWRITE (Spec §2)

---

### 4.1 — New endpoint: `GET /api/withdrawals/timeframe-breakdown`

**File:** `server/routes.ts`  
**Purpose:** Returns the real PKR breakdown for each of the 5 timeframes without creating a withdrawal request.

**Query params:** None needed — compute all 5 timeframes in one call.

**Response:**
```json
{
  "today": { "points": 1500, "exactPkr": 1.50, "platformFee": 0.225, "netPkr": 1.275 },
  "thisWeek": { "points": 8400, "exactPkr": 8.40, ... },
  "thisMonth": { "points": 32000, "exactPkr": 32.00, ... },
  "last3Months": { "points": 91000, "exactPkr": 91.00, ... },
  "allTime": { "points": 145000, "exactPkr": 145.00, ... }
}
```

**Storage:** New method `getWithdrawalTimeframeBreakdowns(userId)` in `storage.ts`. Queries `user_transactions` grouping by date ranges:
- **Today:** `created_at >= date_trunc('day', now())`
- **This Week:** `created_at >= date_trunc('week', now())`
- **This Month:** `created_at >= date_trunc('month', now())`
- **Last 3 Months:** `created_at >= now() - interval '3 months'`
- **All Time:** No date filter

Each bucket: `WHERE withdrawn = false` — only show available (unspent) balance per timeframe.

---

### 4.2 — Update `createWithdrawal` to accept timeframe OR explicit points

**File:** `server/storage.ts` — `createWithdrawal()` method  
**File:** `server/routes.ts` — `POST /api/withdrawals`  
**Current state:** Accepts `amount` (TX-Points as integer string).

**Change:** Accept either a `timeframe` field (`"today" | "thisWeek" | "thisMonth" | "last3Months" | "allTime"`) OR the existing `amount` (points). If `timeframe` is provided, resolve it to the actual point count via the timeframe breakdown query first, then proceed with existing FIFO ledger math.

**Zod schema update:**
```typescript
const withdrawalSchema = z.union([
  z.object({ timeframe: z.enum(["today", "thisWeek", "thisMonth", "last3Months", "allTime"]), method: z.string(), accountName: z.string(), accountNumber: z.string() }),
  z.object({ amount: z.string().regex(/^\d+$/), method: z.string(), accountName: z.string(), accountNumber: z.string() }),
]);
```

---

### 4.3 — Update withdrawal preview endpoint

**File:** `server/routes.ts` — `GET /api/withdrawals/preview`  
**Change:** Support `?timeframe=thisWeek` as an alternative to `?points=NNNN`. When timeframe is given, resolve to points first.

---

## PHASE 5 — BACKEND: MANUAL BALANCE ADJUST REWRITE (Spec §1.3)

---

### 5.1 — Update `/api/admin/users/:userId/adjust-balance` route

**File:** `server/routes.ts`  
**Current state:** Accepts `{ amount, type, reason, creditIntent }` — single PKR amount.

**New contract:** Accept `{ realPkrDelta, txPointsDelta, type, reason }`:
- `realPkrDelta`: PKR amount to add/subtract from `real_pkr_balance`  
- `txPointsDelta`: TX-Points to add/subtract from user's visible balance (via `user_transactions` insert)
- Both are **required**. If either is missing, return 400.
- Validation: `realPkrDelta` must be ≤ ±10,000. `txPointsDelta` must be ≤ ±10,000,000.

**Zod schema:**
```typescript
const adjustSchema = z.object({
  realPkrDelta: z.number().min(-10000).max(10000),
  txPointsDelta: z.number().int().min(-10000000).max(10000000),
  type: z.enum(["add", "deduct"]),
  reason: z.string().min(5).max(500),
});
```

---

### 5.2 — Update storage `adjustUserBalance` method

**File:** `server/storage.ts`  
**Current state:** Updates `real_pkr_balance` only.

**Change:** In a single DB transaction:
1. `UPDATE users SET real_pkr_balance = real_pkr_balance + realPkrDelta WHERE id = userId`
2. If `txPointsDelta !== 0`, `INSERT user_transactions` with `engineType = 'Manual'`, `pointsCredited = txPointsDelta`, `realPkrValue = realPkrDelta`, `sourceType = 'manual_adjustment'`, `sourceId = adminId + timestamp`
3. This keeps the ledger consistent — every points change has a matching transaction row.

---

## PHASE 6 — BACKEND: REALTIME SYNC GAPS (Audit C3.01–C3.07)

---

### 6.1 — Captain replacement WS broadcast

**File:** `server/routes.ts` — `PATCH /api/admin/guilds/:id/captain`  
After DB update, add:
```typescript
broadcastToUser(oldCaptainId, 'guild.captain_changed', { demoted: true, guildId });
broadcastToUser(newCaptainUserId, 'guild.captain_changed', { promoted: true, guildId });
```

---

### 6.2 — Withdrawal status WS broadcast to user

**File:** `server/routes.ts` — `PATCH /api/admin/withdrawals/:id` (line 2395)  
After status update:
```typescript
broadcastToUser(withdrawal.userId, 'withdrawal_status_changed', { status, withdrawalId });
```

---

### 6.3 — Weekly target change WS broadcast to guild members

**File:** `server/routes.ts` — `PATCH /api/guilds/:id/settings`  
After save:
```typescript
broadcastGuildEvent(guildId, 'guild.settings_updated', { weeklyTarget: targetDifficulty });
```

---

### 6.4 — Guild pool credited WS broadcast (Sunday reset)

**File:** `server/jobs/guild-weekly-reset.ts`  
After distributing the bonus pool, the broadcast already fires. **Verify** the event name is `guild.pool_credited` with `{ guildId, totalDistributed }`.

---

## PHASE 7 — BACKEND: AUTH MIDDLEWARE + VALIDATION HARDENING (Audit §2.1–§2.3)

---

### 7.1 — Replace manual auth checks with `requireSessionAuth` middleware

Replace the `if (!getThorxPrincipalId) return 401` early-return in all 15 routes listed in the audit:

| Route | Current Line |
|---|---|
| `GET /api/notifications` | 756 |
| `GET /api/earnings` | 774 |
| `GET /api/referrals` | 809 |
| `POST /api/ad-view` | 1387 |
| `GET /api/dashboard/stats` | 1505 |
| `GET /api/earnings/history` | 1543 |
| `GET /api/referrals/leaderboard` | 1570 |
| `GET /api/referrals/stats/detailed` | 1596 |
| `GET /api/transactions/history` | 1631 |
| `GET /api/chat/stats` | 3278 |
| `GET /api/chat/history` | 3292 |
| `GET /api/tasks` | 3480 |
| `POST /api/tasks/:id/click` | ~3510 |
| `POST /api/tasks/:id/verify` | 3534 |
| `GET /api/tasks/completed/today/:type` | 4117 |

**Mechanical change:** Add `requireSessionAuth` as the second argument in each `app.get/post()` call. Remove the manual check inside the handler body.

---

### 7.2 — Add Zod schema to `PATCH /api/guilds/:id/settings`

```typescript
const guildSettingsSchema = z.object({
  name: z.string().min(3).max(60).optional(),
  description: z.string().max(500).optional(),
  targetDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  isOpen: z.boolean().optional(),
  memberCapacity: z.number().int().min(10).max(50).optional(),
});
```

---

### 7.3 — Cap admin PS delta validation

**File:** `server/routes.ts` — `PATCH /api/admin/users/:userId/ps`  
Add: `delta` must be between -500 and +500. Reject outside range with 400.

---

### 7.4 — Add maxLength to all free-text reason fields

All `reason` or `message` fields going into audit logs or notifications: enforce `z.string().max(1000)` in their Zod schemas.

---

### 7.5 — Guild app & chat rate limiters

Add a `guildInteractionRateLimiter` (20 req/min per userId):
- `POST /api/guilds/:id/apply`
- `POST /api/guilds/:id/chat`
- `POST /api/guilds/:id/dm/:memberId`

---

## PHASE 8 — BACKEND: MVP WEEK-LOCK (Spec §4.1 + Audit C1-14)

---

### 8.1 — Update `setGuildMemberMvp` in storage.ts

**File:** `server/storage.ts` — `setGuildMemberMvp()` method (line ~4455)  
**Current state:** Prevents same member being set twice, but allows reassignment to a different member.

**Fix:** Check if any member in the guild has an `mvpSetWeek` matching the current ISO week:
```typescript
const currentWeek = getISOWeekString(); // e.g. "2026-W29"
const existingMvp = await tx.select()
  .from(guildMembers)
  .where(and(
    eq(guildMembers.guildId, guildId),
    eq(guildMembers.mvpSetWeek, currentWeek)
  ))
  .limit(1);
if (existingMvp.length > 0) {
  throw new Error("MVP already set this week. Cannot reassign until Sunday reset.");
}
// On set: write both isMvp = true AND mvpSetWeek = currentWeek
await tx.update(guildMembers)
  .set({ isMvp: true, mvpSetAt: new Date(), mvpSetWeek: currentWeek })
  .where(eq(guildMembers.id, membership.id));
```

**Sunday reset job:** Clear `mvpSetWeek` alongside `isMvp = false` in `server/jobs/guild-weekly-reset.ts`.

---

## PHASE 9 — FRONTEND: WITHDRAWAL UI REWRITE (Spec §2.1)

---

### 9.1 — Replace keypad with timeframe selector in UserPortal.tsx

**File:** `client/src/pages/UserPortal.tsx` — withdrawal modal section (lines ~2724–2900)

**Current flow:** Step 1: Numeric keypad → Step 2: Payment method → Step 3: Bio data  
**New flow:** Step 1: Timeframe selection → Step 2: Payment method + account details → Step 3: Summary screen

**Step 1 UI — Timeframe Selector:**
```
┌────────────────────────────────────────┐
│  SELECT YOUR EARNING PERIOD            │
│                                        │
│  [Today]          [This Week]          │
│  [This Month]     [Last 3 Months]      │
│  [All-Time Balance]                    │
│                                        │
│  (Each card shows: "XX,XXX TX-Points") │
│  (Actual PKR hidden until Step 3)      │
└────────────────────────────────────────┘
```
- Query `GET /api/withdrawals/timeframe-breakdown` on modal open
- Show ONLY TX-Points for each period in the selector (illusion preserved)
- No PKR shown on this screen

**Step 3 UI — Summary Screen (The Reveal):**
```
┌────────────────────────────────────────┐
│  PAYMENT SUMMARY                       │
│  ─────────────────────────────────── │
│  Selected Period Earning:  Rs. 1,500   │
│  Platform Fee (15%):      - Rs. 225    │
│  ─────────────────────────────────── │
│  Final Transfer Amount:    Rs. 1,275   │
└────────────────────────────────────────┘
```
- Fetch `GET /api/withdrawals/preview?timeframe=thisWeek` to get the breakdown
- Show PKR ONLY on this final summary screen

**State variables needed:**
```typescript
const [withdrawStep, setWithdrawStep] = useState<1|2|3>(1);
const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
const [timeframeBreakdowns, setTimeframeBreakdowns] = useState<TimeframeBreakdown | null>(null);
```

---

### 9.2 — Add `disabled={isPending}` + spinner to withdrawal confirm button (Audit C3-20)

**File:** `client/src/pages/UserPortal.tsx` — withdrawal confirm button  
Simple one-line change on the final submit button.

---

## PHASE 10 — FRONTEND: MANUAL BALANCE ADJUST UI REWRITE (Spec §1.3)

---

### 10.1 — Update UserManager.tsx balance adjustment modal

**File:** `client/src/components/admin/UserManager.tsx` — balance adjustment section (lines ~750–800)  
**Current state:** Single "Amount (₨)" input field.

**New UI:**
```
┌─────────────────────────────────────────┐
│  MANUAL BALANCE ADJUSTMENT              │
│  ───────────────────────────────────── │
│  Real PKR Value (₨):                   │
│  [          ±₨ Input          ]         │
│                                         │
│  TX-Points Value:                       │
│  [       ±Points Input        ]         │
│                                         │
│  Reason (required):                     │
│  [         Textarea           ]         │
│                                         │
│  ⚠ Both fields must match the change.  │
│  [Cancel]          [Confirm Adjustment] │
│  (disabled until both fields filled)    │
└─────────────────────────────────────────┘
```
- Both `realPkrDelta` and `txPointsDelta` are required — confirm button stays disabled until both have non-zero values and reason is filled
- Show a warning: "TX-Points entered must match the illusion equivalent of the PKR change"
- Two-step confirm: First click shows "Apply ₨{pkr} + {points} TX-Points to {username}?" — second click confirms

---

## PHASE 11 — FRONTEND: ENGINE CONFIG UI (Spec §1.1)

---

### 11.1 — Update SystemSettingsManager.tsx — Per-Engine Config Section

**File:** `client/src/components/admin/SystemSettingsManager.tsx`  
**Current state:** Shows global `CONVERSION_RATE` + `CARD_VARIANCE_MIN`/`CARD_VARIANCE_MAX`.

**New layout:** Replace the global "Points per PKR" section with a 3-engine config panel:

```
┌──────────────────────────────────────────────────────┐
│  ENGINE CONFIGURATION                                │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  ENGINE A   │  │  ENGINE B   │  │  ENGINE C   │ │
│  │  (Ad Slots) │  │  (CPA/Tasks)│  │  (Guild)    │ │
│  │             │  │             │  │             │ │
│  │ PKR→Points  │  │ PKR→Points  │  │ PKR→Points  │ │
│  │ Ratio:1000  │  │ Ratio:1000  │  │ Ratio:1000  │ │
│  │             │  │             │  │             │ │
│  │ Illusion    │  │ Illusion    │  │ Illusion    │ │
│  │ Variance%:10│  │ Variance%:10│  │ Variance%:10│ │
│  │             │  │             │  │             │ │
│  │ Thorx Cut:40│  │ Thorx Cut:40│  │ Thorx Cut:20│ │
│  │ User Cut: 60│  │ User Cut: 60│  │ User Cut: 45│ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────┘
```

Each card reads/writes the corresponding `system_config` keys via `PATCH /api/admin/config/:key`.  
**Keep** the global `CONVERSION_RATE` field as a "Global Fallback" below these cards.

---

## PHASE 12 — FRONTEND: THORX PROFIT CARD (Spec §3.2)

---

### 12.1 — Enhance FounderProfitCard.tsx

**File:** `client/src/components/admin/FounderProfitCard.tsx`  
**Current state:** Simple total Earned vs Withdrawn. Not a full ledger.

**New sections to add:**

**Section 1 — Engine Earnings Split:**
- Query: `SUM(thorx_profit_pkr) GROUP BY engine_type FROM user_transactions` → new endpoint `GET /api/admin/profit-ledger`
- Display: `Engine A Cut (40%): Rs. X,XXX` | `Engine B Cut (40%): Rs. X,XXX` | `Engine C Cut (20%): Rs. X,XXX`

**Section 2 — Withdrawal Fee Revenue:**
- Query: `SUM(platform_fee - referral_commissions_paid) FROM withdrawals WHERE status = 'approved'`
- Display: `Platform's withdrawal fee share: Rs. X,XXX`

**Section 3 — Timeline Chart:**
- 30-day bar chart: Daily thorx_profit accumulation (use existing Recharts setup)

**New endpoint needed:** `GET /api/admin/profit-ledger`  
Returns: `{ engineCuts: { A: number, B: number, C: number }, withdrawalFeeShare: number, totalProfit: number, daily30Days: { date: string, amount: number }[] }`

---

## PHASE 13 — FRONTEND: GUILD CHAT — DOUBLE SYSTEM (Spec §4.3)

---

### 13.1 — Clarify Group Chat vs DM in GuildMemberPanel.tsx

**File:** `client/src/components/guild/GuildMemberPanel.tsx`  
**Current state:** Two tabs — "Chat" (group) and "Captain DM" — both exist but the DM has no access control.

**Changes:**
- Rename "Chat" tab → "Guild Chat" with a group icon  
- Rename "Captain DM" → "Captain Channel" with a lock icon  
- Add label under the Captain Channel header: "🔒 Private — Only visible to you and your Guild Captain"  
- No structural change needed — the routes already separate the two; just the UI label and access control fix (Phase 2.1) is the real work

---

### 13.2 — Clarify Group Chat vs DM in CaptainPortal.tsx

**File:** `client/src/components/guild/CaptainPortal.tsx`  
**Current state:** "DM Hub" tab lets captain select a member and chat.

**Changes:**
- Keep "DM Hub" tab but add a label: "All conversations are end-to-end private between you and each member"  
- Ensure when captain selects a member to DM, the `selectedDmMember` is passed to the route correctly  
- The access control fix (Phase 2.1) secures the backend automatically  
- Add "Guild Group Chat" as a separate tab (re-use the same `/api/guilds/:id/chat` endpoint already used by members) so captain can also participate in group chat

---

## PHASE 14 — FRONTEND: GUILD DISCOVERY POOL ILLUSION (Spec §4.2 + Audit C1-01)

---

### 14.1 — Remove `weeklyBonusPool` from GuildDiscoveryPanel.tsx

**File:** `client/src/components/guild/GuildDiscoveryPanel.tsx`  
**Change:** Replace the rendered PKR pool amount with a styled badge:
```tsx
{/* Before: Rs. {guild.weeklyBonusPool} */}
{/* After: */}
<span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold tracking-wide">
  Active Weekly Pool
</span>
```

Also remove `weeklyBonusPool` from the `GuildDiscovery` TypeScript type and from the `getGuildDiscoveryList()` SELECT query in `server/storage.ts`.

---

## PHASE 15 — FRONTEND: UX POLISH (Audit Category 3)

---

### 15.1 — Replace raw text loading states with skeletons

**File:** `client/src/components/guild/GuildDiscoveryPanel.tsx` line 139  
Replace `<div>Loading guilds…</div>` with a skeleton grid matching the loaded card layout (3-column, 6 cards).

**File:** `client/src/components/guild/CaptainPortal.tsx` line 217  
Replace `<div>Loading guild data…</div>` with a skeleton matching the portal card structure (header skeleton + 3 stat skeletons + tabs).

---

### 15.2 — Add `onError` toast handlers to all mutations

**Files:** `client/src/pages/UserPortal.tsx`, `client/src/components/guild/CaptainPortal.tsx`, `client/src/components/guild/GuildMemberPanel.tsx`

Add to every `useMutation` that currently has no `onError`:
```typescript
onError: (err: any) => toast({
  title: "Action failed",
  description: err?.message ?? "Something went wrong. Please try again.",
  variant: "destructive",
})
```

Mutations missing this: ad-view record, task click, task verify, guild chat, DM send, guild apply, referral link copy, withdrawal confirm.

---

### 15.3 — Add empty states to guild panels

**CaptainPortal.tsx — Roster tab (when no active members):**
```tsx
<div className="text-center py-16">
  <Users className="mx-auto mb-3 text-zinc-600" size={36} />
  <p className="text-zinc-400 text-sm">No active members yet.</p>
  <p className="text-zinc-500 text-xs mt-1">Review pending applications to build your team.</p>
</div>
```

**GuildMemberPanel.tsx — Tasks tab (when no tasks):**
```tsx
<div className="text-center py-16">
  <ListTodo className="mx-auto mb-3 text-zinc-600" size={36} />
  <p className="text-zinc-400 text-sm">No tasks this cycle.</p>
  <p className="text-zinc-500 text-xs mt-1">Check back when your Captain publishes weekly tasks.</p>
</div>
```

**GuildDiscoveryPanel.tsx — When guilds array is empty:**
```tsx
<div className="text-center py-20">
  <Shield className="mx-auto mb-3 text-zinc-600" size={40} />
  <p className="text-zinc-300 text-sm font-semibold">No guilds available yet.</p>
  <p className="text-zinc-500 text-xs mt-1">Reach B-Rank to create the first one.</p>
</div>
```

---

### 15.4 — Fix mobile grid breakpoints in AdminDashboard.tsx

**File:** `client/src/components/admin/AdminDashboard.tsx`  
- Line 158: `grid-cols-3` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`  
- Line 352: `grid-cols-2 lg:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

---

### 15.5 — Add `overflow-x-auto` to admin tables

**Files:** `client/src/components/admin/UserManager.tsx`, `client/src/components/admin/GuildManager.tsx`  
Wrap each `<table>` element in `<div className="overflow-x-auto w-full">`.

---

### 15.6 — Two-step confirm for PS/GPS adjust modals

**File:** `client/src/components/admin/UserManager.tsx` — PS adjust section  
Add a confirmation step: after filling delta + reason, show "Apply +{delta} PS to {username}?" with Cancel/Confirm before submitting.

---

### 15.7 — Replace 5s DM polling with WS push

**Files:** `CaptainPortal.tsx` (line 79), `GuildMemberPanel.tsx` (line 95)  
Remove `refetchInterval: 5000`. In `server/routes.ts` — `POST /api/guilds/:id/dm/:memberId`, after insert:
```typescript
broadcastToUser(toUserId, 'guild.dm_received', { guildId, fromUserId: callerId });
```
In `useRealtimeSync`, add handler for `guild.dm_received`:
```typescript
case 'guild.dm_received':
  queryClient.invalidateQueries({ queryKey: ['/api/guilds', data.guildId, 'dm', req.currentUserId] });
  break;
```

---

### 15.8 — Subscribe frontend to `guild.pool_credited`

**File:** `client/src/hooks/useRealtimeSync.tsx` (or equivalent WS handler)  
```typescript
case 'guild.pool_credited':
  queryClient.invalidateQueries({ queryKey: ['/api/guilds', data.guildId] });
  toast({ title: "🎉 Sunday Bonus Credited!", description: "Your weekly guild bonus has been distributed.", variant: "default" });
  break;
```

---

### 15.9 — Subscribe frontend to `withdrawal_status_changed`

**File:** WS handler / `useRealtimeSync`  
```typescript
case 'withdrawal_status_changed':
  queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
  toast({
    title: data.status === 'approved' ? "✅ Withdrawal Approved" : "❌ Withdrawal Rejected",
    description: data.status === 'approved' ? "Your payout is being processed." : "Please contact support.",
    variant: data.status === 'approved' ? "default" : "destructive",
  });
  break;
```

---

### 15.10 — Subscribe frontend to `guild.captain_changed`

**File:** WS handler / `useRealtimeSync`  
```typescript
case 'guild.captain_changed':
  queryClient.invalidateQueries({ queryKey: ['/api/guilds/mine'] });
  queryClient.invalidateQueries({ queryKey: ['session-auth'] });
  if (data.promoted) toast({ title: "⚔️ You are now Guild Captain!", variant: "default" });
  if (data.demoted) toast({ title: "You have been replaced as Guild Captain.", variant: "destructive" });
  break;
```

---

## EXECUTION ORDER (CRITICAL PATH)

```
Phase 1   →   DB Schema (foundation — nothing else can run without this)
    ↓
Phase 2   →   Critical Security Fixes (DM access, rate limiters, race condition)
    ↓
Phase 3   →   Engine Config Backend (blocks Phase 11 frontend)
    ↓
Phase 4   →   Withdrawal Flow Backend (blocks Phase 9 frontend)
    ↓
Phase 5   →   Manual Balance Backend (blocks Phase 10 frontend)
    ↓
Phases 6–8  →  Realtime + Auth + MVP (independent of each other, can parallelize)
    ↓
Phases 9–10 →  Withdrawal UI + Balance UI (depend on Phase 4/5 backend)
    ↓
Phases 11–12 →  Engine UI + Profit Card UI (depend on Phase 3 backend)
    ↓
Phases 13–14 →  Guild UI (DM labels + pool illusion — depend on Phase 2.1)
    ↓
Phase 15   →  UX polish (independent, can do any time after Phase 9)
```

---

## FILE-LEVEL CHANGE SUMMARY

| File | Phases | Type of Change |
|---|---|---|
| `shared/schema.ts` | 1.1–1.5 | Add `mvpSetWeek` column, add 4 indexes |
| `server/storage.ts` | 2.6, 2.7, 3.1, 3.2, 4.1, 4.2, 5.2, 8.1 | Transaction wraps, per-engine config, new storage methods |
| `server/routes.ts` | 2.1–2.5, 4.3, 5.1, 6.1–6.4, 7.1–7.5, 8.x | Security, new endpoints, auth middleware, Zod schemas, WS events |
| `client/src/pages/UserPortal.tsx` | 9.1, 9.2, 15.2 | Full withdrawal modal rewrite + onError toasts |
| `client/src/components/admin/UserManager.tsx` | 10.1, 15.6 | Dual-field balance modal + PS confirm step |
| `client/src/components/admin/SystemSettingsManager.tsx` | 11.1 | Per-engine config UI |
| `client/src/components/admin/FounderProfitCard.tsx` | 12.1 | Full profit ledger with engine cuts + fee share |
| `client/src/components/guild/CaptainPortal.tsx` | 13.2, 15.1, 15.2, 15.7 | Group Chat tab + DM labels + skeleton + WS push |
| `client/src/components/guild/GuildMemberPanel.tsx` | 13.1, 15.2, 15.3, 15.7 | DM labels + onError + empty state + WS push |
| `client/src/components/guild/GuildDiscoveryPanel.tsx` | 14.1, 15.1, 15.3 | Remove pool PKR + skeleton + empty state |
| `client/src/components/admin/AdminDashboard.tsx` | 15.4 | Mobile grid breakpoints |
| `client/src/components/admin/UserManager.tsx` | 15.5 | overflow-x-auto on tables |
| `client/src/hooks/useRealtimeSync.ts` (or equivalent) | 15.8–15.10 | WS event subscriptions |

---

## PHASE 16 — BACKEND: PER-AD-PLAYER ENGINE CONFIGURATION (Extended Req §1)

---

### 16.1 — New `system_config` keys for per-ad-player ratios

**Why:** Team members need to set different PKR→TX-Point ratios for each individual ad player/offer within Engine A, not just per-engine. Engine B and C operate at engine level only.

**What:** Store per-player config as a JSON blob in `system_config`:

| Key | Default | Description |
|---|---|---|
| `ENGINE_A_PLAYERS_JSON` | `[]` | Array of `{ id, name, pkrToPointsRatio, variancePct }` for each Engine A ad player |

**Structure:**
```json
[
  { "id": "player_1", "name": "Ad Network Alpha", "pkrToPointsRatio": 1200, "variancePct": 8 },
  { "id": "player_2", "name": "Ad Network Beta",  "pkrToPointsRatio": 900,  "variancePct": 15 }
]
```

Admin creates/edits/removes players from Team Portal. The `id` field matches the `adNetworkId` field passed to `recordEarnEvent` for Engine A events.

---

### 16.2 — Update `recordEarnEvent` lookup chain

**File:** `server/storage.ts` — `recordEarnEvent()`

**Lookup priority (most specific wins):**
1. Per-ad-player ratio: check `ENGINE_A_PLAYERS_JSON` for entry matching `params.adNetworkId`
2. Per-engine ratio: `ENGINE_{type}_PKR_TO_POINTS_RATIO`
3. Global fallback: `CONVERSION_RATE` (= 1000)

```typescript
async function resolveEngineRatio(engineType: string, adNetworkId?: string) {
  if (engineType === 'Engine_A' && adNetworkId) {
    const playersJson = await storage.getSystemConfigValue<string>('ENGINE_A_PLAYERS_JSON', '[]');
    const players = JSON.parse(playersJson) as AdPlayer[];
    const player = players.find(p => p.id === adNetworkId);
    if (player) return { ratio: player.pkrToPointsRatio, variancePct: player.variancePct };
  }
  const engineKey = engineType.replace('Engine_', 'ENGINE_');
  const ratio = await storage.getSystemConfigValue<number>(`${engineKey}_PKR_TO_POINTS_RATIO`, 1000);
  const variancePct = await storage.getSystemConfigValue<number>(`${engineKey}_ILLUSION_VARIANCE_PCT`, 10);
  return { ratio, variancePct };
}
```

---

### 16.3 — New admin endpoints for player management

**File:** `server/routes.ts`

```
GET  /api/admin/engine-a/players          → list all configured ad players
POST /api/admin/engine-a/players          → add a new player { name, pkrToPointsRatio, variancePct }
PATCH /api/admin/engine-a/players/:id     → update ratio/variance for a player
DELETE /api/admin/engine-a/players/:id    → remove a player
```

All gated behind `requireTeamMemberOrFounder` middleware. The route handlers read/write the `ENGINE_A_PLAYERS_JSON` config key atomically.

---

### 16.4 — Frontend: Per-Ad-Player Config UI in SystemSettingsManager

**File:** `client/src/components/admin/SystemSettingsManager.tsx`

Add a new "Ad Players" tab (or expandable section within Engine A card):

```
┌─────────────────────────────────────────────────────┐
│  ENGINE A — AD PLAYERS                              │
│  ─────────────────────────────────────────────────  │
│  Name              PKR→TX Ratio    Variance%  [Del] │
│  Ad Network Alpha  1,200           ±8%        [×]   │
│  Ad Network Beta   900             ±15%       [×]   │
│  ─────────────────────────────────────────────────  │
│  [+ Add New Ad Player]                              │
└─────────────────────────────────────────────────────┘
```

Each row is inline-editable. "Add New Ad Player" opens a small form (name + ratio + variance). Save button updates via `PATCH /api/admin/engine-a/players/:id`.

---

## PHASE 17 — FRONTEND: COMPLETE TX-POINTS ILLUSION UI (Extended Req §2)

**Goal:** Remove every PKR figure from user-facing pages. Users only ever see TX-Points. PKR appears exclusively on the withdrawal summary screen.

---

### 17.1 — UserPortal.tsx: Replace all balance displays with TX-Points

**File:** `client/src/pages/UserPortal.tsx`

| Current display | New display |
|---|---|
| `Rs. {availableBalance}` on dashboard cards | `{txPointsBalance.toLocaleString()} TX-PTS` |
| `Rs. {totalEarnings}` on stats card | `{totalEarningsInPoints.toLocaleString()} TX-PTS` (calculated: totalEarnings × engineRatio) |
| `Balance: Rs. X` in any modal header | `Balance: {txPointsBalance.toLocaleString()} TX-PTS` |

The `totalEarningsInPoints` is computed client-side as `totalEarnings (PKR) × CONVERSION_RATE`. Fetch conversion rate from `GET /api/config/public` (a new public endpoint — see 17.6).

**Important:** The `real_pkr_balance` field must be stripped from `GET /api/user` response entirely — it is never sent to the client. This is already the case in the current `/api/user` route; verify and enforce with an explicit `omit` in the response serializer.

---

### 17.2 — Earnings History: Show TX-Points, not PKR

**File:** `client/src/pages/UserPortal.tsx` — earnings history section  
**File:** `server/routes.ts` — `GET /api/earnings`

API response currently includes `realPkrValue` per earn event. This field must be **excluded** from the user-facing earnings endpoint. Only return:
- `pointsCredited` (TX-Points) ✓
- `engineType` ✓
- `sourceType` ✓
- `createdAt` ✓
- ~~`realPkrValue`~~ — REMOVE from user response (keep in DB for admin use)

UI: Show `+{pointsCredited.toLocaleString()} TX-PTS` per row. No PKR column.

---

### 17.3 — Referral Stats: Replace PKR commission with TX-Points

**File:** `client/src/pages/UserPortal.tsx` — referral section  
**File:** `server/routes.ts` — `GET /api/referrals`

Current: Shows `referral_cash_balance` in PKR.  
New: Convert `referral_cash_balance` to TX-Points for display: `Math.round(referralCashBalance × conversionRate)`.  
Label: `Referral Earnings: {X.toLocaleString()} TX-PTS`

Real PKR value of referral commission is only revealed on the withdrawal summary screen.

---

### 17.4 — Thorx Card: Verify TX-Points only (no PKR leakage)

**File:** `client/src/components/ThxCard.tsx` (or equivalent)

Audit the card draw result display. Ensure:
- The drawn value shown is always `pointsCredited` (TX-Points), never `realPkrValue`
- The "random" variance is already applied by `recordEarnEvent` in backend — frontend just displays what comes back
- No tooltip or subtitle accidentally reveals PKR

---

### 17.5 — Transaction History: TX-Points only

**File:** `client/src/pages/UserPortal.tsx` — transaction history  
**File:** `server/routes.ts` — `GET /api/transactions/history`

Remove `realPkrValue` from user-facing transaction history response. Show only `pointsCredited`. Format: `+X TX-PTS` for credits, `-X TX-PTS` for deductions.

---

### 17.6 — New public endpoint: `GET /api/config/public`

**File:** `server/routes.ts`

A **no-auth-required** endpoint that returns the display parameters needed for client-side TX-Points conversion. Never returns per-engine secrets or PKR values.

```json
{
  "conversionRate": 1000,
  "platformName": "THORX",
  "withdrawalFeePct": 15
}
```

Used by frontend to convert displayed values and show the fee on the withdrawal summary screen without exposing business logic.

---

## PHASE 18 — BACKEND: REFERRAL COMMISSION FLOW (Extended Req §3)

*Expands and supersedes the basic referral note in Phase 5.*

---

### 18.1 — Two new `system_config` keys for referral commission

| Key | Default | Description |
|---|---|---|
| `REFERRAL_FEE_SHARE_PCT` | 50 | % of the 15% withdrawal fee paid to referrer as real PKR |
| `REFERRAL_TX_ILLUSION_RATE` | `ENGINE_A_PKR_TO_POINTS_RATIO` | PKR→TX ratio used when crediting referrer's illusion balance |

These are already partially present — confirm both keys are seeded and editable from Team Portal SystemSettingsManager.

---

### 18.2 — Update `processWithdrawal` to split fee correctly

**File:** `server/storage.ts` — withdrawal approval handler (called when team member approves payout)

**Fee split logic:**
```typescript
const platformFeePct = 15;
const referralSharePct = await storage.getSystemConfigValue<number>('REFERRAL_FEE_SHARE_PCT', 50);

const grossFee = withdrawalAmount * (platformFeePct / 100);
const referralCommission = grossFee * (referralSharePct / 100);  // → referrer's real PKR
const thorxFeeShare = grossFee - referralCommission;              // → Thorx profit

if (referrerId && referralCommission > 0) {
  // 1. Add real PKR to referrer's real_pkr_balance
  await tx.update(users).set({
    real_pkr_balance: sql`real_pkr_balance + ${referralCommission}`
  }).where(eq(users.id, referrerId));

  // 2. Credit TX-Points illusion to referrer (D3 decision: Option A)
  const illusionRate = await storage.getSystemConfigValue<number>('REFERRAL_TX_ILLUSION_RATE', 1000);
  const illusionPoints = Math.round(referralCommission * illusionRate);
  await storage.recordEarnEvent({
    userId: referrerId,
    engineType: 'Referral',
    pointsCredited: illusionPoints,
    realPkrValue: referralCommission,
    sourceType: 'referral_commission',
    sourceId: withdrawalId,
  });
}

// 3. Log thorxFeeShare to profit ledger
await tx.update(withdrawals).set({
  thorx_fee_share: thorxFeeShare,
  referral_commission_paid: referralCommission,
}).where(eq(withdrawals.id, withdrawalId));
```

---

### 18.3 — Add `thorx_fee_share` + `referral_commission_paid` columns to `withdrawals` table

**File:** `shared/schema.ts` — `withdrawals` table

```typescript
thorxFeeShare: numeric("thorx_fee_share", { precision: 10, scale: 2 }).default("0"),
referralCommissionPaid: numeric("referral_commission_paid", { precision: 10, scale: 2 }).default("0"),
```

Required for the Thorx Profit Card to correctly account for fee revenue vs referral payouts.

---

## PHASE 19 — BACKEND + FRONTEND: THORX PROFIT LEDGER (Extended Req §4)

*Supersedes Phase 12 with full implementation detail.*

---

### 19.1 — New endpoint: `GET /api/admin/profit-ledger`

**File:** `server/routes.ts`  
**Auth:** `requireFounder`

```json
{
  "engineCuts": {
    "A": 12500.00,
    "B": 8300.00,
    "C": 4100.00,
    "Referral": 200.00
  },
  "withdrawalFeeRevenue": 3800.00,
  "referralCommissionsPaid": 1200.00,
  "netWithdrawalFeeShare": 2600.00,
  "totalProfit": 27700.00,
  "daily30Days": [
    { "date": "2026-07-16", "engineCut": 850.00, "feeShare": 120.00, "total": 970.00 }
  ]
}
```

**Storage queries:**
- `engineCuts`: `SELECT engine_type, SUM(thorx_profit_pkr) FROM user_transactions GROUP BY engine_type`
- `withdrawalFeeRevenue`: `SELECT SUM(thorx_fee_share + referral_commission_paid) FROM withdrawals WHERE status = 'approved'`
- `netWithdrawalFeeShare`: `SELECT SUM(thorx_fee_share) FROM withdrawals WHERE status = 'approved'`
- `daily30Days`: Group above by `date_trunc('day', created_at)` for last 30 days

---

### 19.2 — Update FounderProfitCard.tsx with full ledger

**File:** `client/src/components/admin/FounderProfitCard.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  THORX PROFIT LEDGER                                    │
│  ───────────────────────────────────────────────────── │
│  ENGINE CUTS (40% per earn event)                       │
│    Engine A (Ad Slots):    Rs. 12,500                   │
│    Engine B (CPA/Tasks):   Rs.  8,300                   │
│    Engine C (Guild Pool):  Rs.  4,100                   │
│    Referral Bonus Credit:  Rs.    200                   │
│  ───────────────────────────────────────────────────── │
│  WITHDRAWAL FEE REVENUE (15% platform fee)              │
│    Gross Fee Collected:    Rs.  5,000                   │
│    Referral Payouts:      -Rs.  1,200                   │
│    Net Fee Share:          Rs.  3,800                   │
│  ───────────────────────────────────────────────────── │
│  TOTAL THORX PROFIT:       Rs. 27,700                   │
│  ═══════════════════════════════════════════════════════│
│  [30-Day Bar Chart: Daily engine cut + fee share]       │
└─────────────────────────────────────────────────────────┘
```

---

## PHASE 20 — FRONTEND: GUILD CHAT ARCHITECTURE CLARITY (Extended Req §5)

*Supersedes Phase 13 with complete scope.*

---

### 20.1 — Confirm two-chat-system architecture

**Backend already has:**
- `GET/POST /api/guilds/:id/chat` — group chat (all members)
- `GET/POST /api/guilds/:id/dm/:memberId` — captain ↔ member private thread

**Frontend gap:** UI labels are confusing and captain cannot access group chat from their portal.

**Changes required:**

**GuildMemberPanel.tsx:**
- Tab 1: **"Guild Chat"** — group icon — shows group messages, any member can post
- Tab 2: **"Captain Private"** — lock icon — shows DM thread between this member and captain only. Label: *"🔒 Only you and your Captain can see this conversation"*

**CaptainPortal.tsx:**
- Tab: **"Guild Chat"** — captain participates in group chat (same `/api/guilds/:id/chat` endpoint)
- Tab: **"DM Hub"** — captain selects a member → opens private thread. Label: *"All conversations are private between you and each member individually"*

---

### 20.2 — Remove 5s polling; replace with WS push (Phase 15.7 reconfirmed)

Already in Phase 15.7. Ensure this covers **both** the group chat AND the DM hub:
- Group chat: `broadcastGuildEvent(guildId, 'guild.chat_message', { fromUserId })` → invalidate group chat query for all guild members
- DM: `broadcastToUser(toUserId, 'guild.dm_received', { guildId, fromUserId })` → invalidate DM query for recipient only

---

## EXECUTION ORDER (UPDATED — CRITICAL PATH)

```
Phase 1    → DB Schema (mvpSetWeek + indexes)
Phase 18.3 → DB Schema addendum (withdrawal fee columns)
    ↓
Phase 2    → Critical Security (DM access, rate limiters, race condition)
    ↓
Phase 3    → Engine Config Backend (per-engine ratio) ← feeds Phase 16
Phase 16   → Per-Ad-Player Backend (ENGINE_A_PLAYERS_JSON, lookup chain)
    ↓ (Phase 3 + 16 must both finish before Phase 4)
Phase 4    → Withdrawal Backend (timeframe breakdown endpoint)
Phase 18   → Referral Commission Backend (fee split, TX illusion credit)
    ↓
Phase 5    → Manual Balance Backend (dual PKR + TX delta)
    ↓
Phases 6–8 → Realtime Sync + Auth Hardening + MVP Week-Lock (parallelizable)
    ↓
Phase 9    → Withdrawal UI (timeframe selector + PKR reveal summary)
Phase 10   → Manual Balance Adjust UI (dual-field modal)
Phase 17   → Full Illusion UI (remove all PKR from user-facing pages)
    ↓
Phase 11   → Engine Config UI (per-engine cards in SystemSettingsManager)
Phase 16.4 → Per-Ad-Player Config UI
Phase 19   → Thorx Profit Ledger (endpoint + FounderProfitCard)
    ↓
Phase 12   → (absorbed into Phase 19 — skip)
Phase 13   → (absorbed into Phase 20 — skip)
Phase 20   → Guild Chat Clarity (labels + captain group chat access)
Phase 14   → Guild Discovery Pool (remove PKR illusion from discovery)
    ↓
Phase 15   → UX Polish (skeletons, empty states, error toasts, mobile grids)
```

---

## FILE-LEVEL CHANGE SUMMARY (UPDATED)

| File | Phases | Type of Change |
|---|---|---|
| `shared/schema.ts` | 1.1–1.5, 18.3 | Add `mvpSetWeek` column, 4 indexes, withdrawal fee columns |
| `server/storage.ts` | 2.6, 2.7, 3.1, 4.1, 4.2, 5.2, 8.1, 16.2, 18.2 | Transaction wraps, per-engine+per-player config, withdrawal fee split, referral commission credit |
| `server/routes.ts` | 2.1–2.5, 3.2, 4.3, 5.1, 6.1–6.4, 7.1–7.5, 16.3, 17.6, 19.1 | Security, new endpoints, auth middleware, Zod schemas, WS events, player CRUD, profit ledger, public config |
| `client/src/pages/UserPortal.tsx` | 9.1, 9.2, 15.2, 17.1, 17.2, 17.3, 17.5 | Full withdrawal modal + all PKR→TX-Points display replacements |
| `client/src/components/admin/UserManager.tsx` | 10.1, 15.5, 15.6 | Dual-field balance modal + table overflow + PS confirm step |
| `client/src/components/admin/SystemSettingsManager.tsx` | 11.1, 16.4 | Per-engine config UI + per-ad-player management table |
| `client/src/components/admin/FounderProfitCard.tsx` | 19.2 | Full profit ledger with engine cuts + fee share + 30-day chart |
| `client/src/components/guild/CaptainPortal.tsx` | 20.1, 20.2, 15.1, 15.2, 15.7 | Group Chat tab + DM labels + skeleton + WS push |
| `client/src/components/guild/GuildMemberPanel.tsx` | 20.1, 20.2, 15.2, 15.3, 15.7 | DM labels + group chat + onError + empty state + WS push |
| `client/src/components/guild/GuildDiscoveryPanel.tsx` | 14.1, 15.1, 15.3 | Remove pool PKR + skeleton + empty state |
| `client/src/components/admin/AdminDashboard.tsx` | 15.4 | Mobile grid breakpoints |
| `client/src/hooks/useRealtimeSync.ts` (or equiv) | 15.8–15.10, 20.2 | WS event subscriptions for chat, DM, captain changes, pool credits |
| `client/src/components/ThxCard.tsx` (or equiv) | 17.4 | Verify zero PKR leakage on card draw display |

---

## ALL DECISIONS RESOLVED — NO OPEN ITEMS

All previously open decisions (D1–D9) have been resolved above. Execution can begin immediately with Phase 1 (DB schema changes).
