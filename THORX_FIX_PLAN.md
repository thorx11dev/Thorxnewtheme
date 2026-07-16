# THORX — MASTER FIX PLAN
**Based on:** THORX_AUDIT_REPORT.md  
**Standard:** Million-dollar production quality  
**Total Tasks:** 14 (grouped by priority and dependency)

---

## PRIORITY ORDER

```
CRITICAL (must ship before any real users)
  → Task 1: PKR Leakage from Session API
  → Task 2: legacy-register Security Hole
  → Task 3: createAdView() Transaction Fix

HIGH (ship before any money moves at scale)
  → Task 4: Float Precision — recordEarnEvent Decimal Fix
  → Task 5: createWithdrawal TOCTOU Race Condition
  → Task 6: Rate Limiters — contact + chat endpoints
  → Task 7: Task Completion → Weekly Progress Stale Data
  → Task 8: Announcement WS Broadcast + Chat WS Handler
  → Task 9: Mobile Chat Fixed Heights

MEDIUM (polish sprint)
  → Task 10: Input Validation — contact/chat Zod + guild forms
  → Task 11: Stale Queries — Captain Accept/Kick member count
  → Task 12: getAllUsers() Pagination
  → Task 13: guild.gps_updated Frontend Handler + GuildMemberPanel tabs

ENTERPRISE (infra/quality sprint)
  → Task 14: Structured Logging + Error Tracking Foundation
```

---

## TASK 1 — Strip `balanceCashPkr` from User Session Response
**Findings:** A, B  
**Files:** `server/routes.ts` (session endpoint), `server/storage.ts` (getUserById), `client/src/hooks/useAuth.ts`

### What to do:

**Step 1.1 — Strip `balanceCashPkr` from session serialization**

In `server/routes.ts`, find the `/api/auth/session` (and `/api/session`) GET endpoint that returns the user object. Add an explicit field-strip before responding:

```typescript
// In GET /api/auth/session (or wherever user profile is returned to frontend)
const { balanceCashPkr: _pkr, passwordHash: _ph, verificationToken: _vt, ...safeUser } = user;
res.json({ user: safeUser });
```

**Step 1.2 — Remove `balanceCashPkr` from User interface in useAuth.ts**

In `client/src/hooks/useAuth.ts`, remove `balanceCashPkr` from the `User` type definition (around line 31). If no frontend component uses it, the type and field are dead weight.

**Step 1.3 — Fix `grossPkrPerCompletion` exposure in tasks API**

In `server/routes.ts`, find the `/api/tasks` GET endpoint that returns tasks to users. Add server-side field projection:

```typescript
// Before sending tasks to non-admin users:
const safeTasks = tasks.map(({ grossPkrPerCompletion, ...rest }) => ({
  ...rest,
  // Pre-compute the TX-Points reward so frontend doesn't need PKR
  txPointsReward: Math.round(
    parseFloat(grossPkrPerCompletion || "0") * conversionRate
  ),
}));
res.json({ weeklyTasks: safeTasks });
```

In `client/src/components/guild/GuildMemberPanel.tsx` line 367, replace the PKR-math formula with the pre-computed `txPointsReward` field from the server.

---

## TASK 2 — Eliminate `POST /api/legacy-register` Security Hole
**Finding:** L  
**File:** `server/routes.ts` line 1706

### What to do:

**Step 2.1 — Disable the endpoint immediately**

Replace the entire handler body with a 410 Gone response:

```typescript
app.post("/api/legacy-register", authRateLimiter, async (_req, res) => {
  res.status(410).json({
    message: "Legacy registration is no longer supported. Use /api/register.",
    error: "ENDPOINT_DEPRECATED",
  });
});
```

Even in deprecated state, attach `authRateLimiter` to prevent endpoint enumeration abuse.

**Step 2.2 — Confirm with team:** If any mobile app or old client still calls this endpoint, coordinate a migration window before hard-disabling.

---

## TASK 3 — Wrap `createAdView()` in Proper DB Transaction
**Finding:** J  
**File:** `server/storage.ts` around line 1111

### What to do:

**Step 3.1 — Replace manual rollback with `db.transaction()`**

Current pattern (fragile):
```typescript
const adViewRow = await db.insert(adViews).values(...).returning()[0];
try {
  await this.recordEarnEvent(...);
} catch (err) {
  await db.delete(adViews).where(eq(adViews.id, adViewRow.id)); // MANUAL ROLLBACK
  throw err;
}
```

Replace with:
```typescript
const result = await db.transaction(async (tx) => {
  const [adViewRow] = await tx.insert(adViews).values(...).returning();
  const earnResult = await this.recordEarnEvent({
    ...,
    tx, // pass tx reference through so recordEarnEvent uses the same transaction
  });
  return { adViewRow, earnResult };
});
```

**Step 3.2 — Verify `recordEarnEvent()` accepts and threads a `tx` parameter** (it already does based on existing code — confirm it uses `tx` for all internal writes).

---

## TASK 4 — Fix Decimal Precision Drift in `recordEarnEvent()`
**Findings:** F, G, H, I  
**File:** `server/storage.ts` lines 981–983, 1122, 3036, 3053, 3424

### What to do:

**Step 4.1 — Keep Decimal values through to SQL boundary (lines 981–983)**

Replace `.toNumber()` conversions with Decimal operations all the way to the SQL write:

```typescript
// BEFORE (wrong):
const userPkrShare = userPkrShareD.toNumber();      // float drift
const thorxProfitPkr = thorxProfitPkrD.toNumber();  // float drift

// AFTER (correct):
// Use userPkrShareD.toFixed(4) directly in SQL interpolation strings
// Never call .toNumber() on financial Decimal values
```

In the SQL UPDATE statements (lines 1025–1031, 1051, 1061), replace:
```typescript
totalEarnings: sql`${users.totalEarnings} + ${cardResult.realPkrValue.toFixed(2)}`
```
with:
```typescript
totalEarnings: sql`${users.totalEarnings} + ${userPkrShareD.toFixed(4)}::numeric`
```
(Pass the string from `Decimal.toFixed()` directly — PostgreSQL numeric is exact.)

**Step 4.2 — Fix `parseFloat(insertAdView.earnedAmount)` (line 1122)**

```typescript
// BEFORE:
grossPkr: parseFloat(insertAdView.earnedAmount)

// AFTER:
grossPkr: new Decimal(insertAdView.earnedAmount).toNumber()
// OR better: change recordEarnEvent() to accept grossPkr as Decimal | number
// and use new Decimal(insertAdView.earnedAmount) all the way through
```

**Step 4.3 — Fix leaderboard `parseFloat()` calls (lines 3036, 3053)**

```typescript
// BEFORE:
.map(u => parseFloat(u.totalEarnings || "0"))

// AFTER:
.map(u => new Decimal(u.totalEarnings || "0").toNumber())
// or use Decimal comparison: new Decimal(a).comparedTo(new Decimal(b))
```

**Step 4.4 — Fix `adjustUserBalance()` ledger entry (lines 3424–3425)**

```typescript
// BEFORE:
realPkrValue: Math.abs(parseFloat(amount)).toFixed(4)

// AFTER:
realPkrValue: new Decimal(amount).abs().toFixed(4)
```

---

## TASK 5 — Fix `createWithdrawal()` TOCTOU Race Condition
**Finding:** D  
**File:** `server/storage.ts` lines 1943–1975

### What to do:

**Step 5.1 — Move ALL pre-flight checks inside the transaction**

Current structure:
```
calculateWithdrawalBreakdown()  ← OUTSIDE transaction (stale read)
S-Rank check                    ← OUTSIDE transaction (stale read)
db.transaction() {
  pending-check + INSERT
}
```

Target structure:
```
db.transaction(async (tx) => {
  SELECT user FOR UPDATE          ← locks the row
  calculateWithdrawalBreakdown()  ← now uses locked, fresh balance
  S-Rank status check             ← from locked row
  pending withdrawal check        ← inside tx
  INSERT withdrawal               ← inside tx
})
```

**Step 5.2 — Implementation**

```typescript
async createWithdrawal(insertWithdrawal: InsertWithdrawal): Promise<Withdrawal> {
  return await db.transaction(async (tx) => {
    // Lock user row — prevents concurrent withdrawal from reading stale balance
    const [lockedUser] = await tx
      .select()
      .from(users)
      .where(eq(users.id, insertWithdrawal.userId))
      .for('update');                           // ← KEY ADDITION

    if (!lockedUser) throw new Error("User not found");

    const pointsRequested = parseInt(insertWithdrawal.amount, 10);
    if (!Number.isFinite(pointsRequested) || pointsRequested <= 0) {
      throw new Error("Withdrawal amount must be a positive whole number of TX-Points");
    }

    // Now safe — balance read is from locked row
    const breakdown = await this.calculateWithdrawalBreakdownTx(tx, lockedUser, pointsRequested);

    const minPayout = await this.getSystemConfigValue<number>("MIN_PAYOUT", 100);
    if (breakdown.exactPkr < minPayout) {
      throw new Error(`Minimum payout not met. Threshold: Rs.${minPayout}.`);
    }

    const initialStatus = lockedUser.userRankTier === 'S-Rank' ? 'approved' : 'pending';

    // Check for existing pending
    const [pending] = await tx
      .select({ id: withdrawals.id })
      .from(withdrawals)
      .where(and(
        eq(withdrawals.userId, insertWithdrawal.userId),
        eq(withdrawals.status, "pending")
      ))
      .limit(1);

    if (pending) {
      throw new Error("A pending withdrawal already exists. Wait for it to be processed.");
    }

    const [withdrawal] = await tx.insert(withdrawals).values({
      ...insertWithdrawal,
      status: initialStatus,
    }).returning();

    return withdrawal;
  });
}
```

Note: `calculateWithdrawalBreakdownTx` is a new internal method that accepts a `tx` object and the locked user row, instead of re-querying the DB.

---

## TASK 6 — Add Rate Limiters to `contact` and `chat` Endpoints
**Findings:** M, N  
**File:** `server/routes.ts` lines 2604, 3232, plus `server/middleware/auth-rate-limit.ts`

### What to do:

**Step 6.1 — Create new rate limiters in `auth-rate-limit.ts`**

```typescript
export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 contact messages per 15 min per IP
  message: { message: "Too many contact messages. Please try again later.", error: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatbotRateLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 20,                   // 20 chatbot messages per minute per IP
  message: { message: "Too many messages. Slow down.", error: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Step 6.2 — Add rate limiters to routes**

```typescript
// line 2604:
app.post("/api/contact", contactRateLimiter, async (req, res) => { ... });

// line 3232:
app.post("/api/chat", chatbotRateLimiter, async (req, res) => { ... });
```

**Step 6.3 — Add Zod schema to `/api/contact`**

```typescript
const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  description: z.string().min(10).max(2000),
});

app.post("/api/contact", contactRateLimiter, async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid contact form data.", errors: parsed.error.flatten().fieldErrors });
  }
  const { name, email, description } = parsed.data;
  // ...
});
```

**Step 6.4 — Add max length to `/api/chat` message**

```typescript
const { message, sessionId } = req.body;
if (!message || typeof message !== 'string' || message.trim().length === 0) { ... }
if (message.length > 1000) {
  return res.status(400).json({ message: "Message too long.", error: "INVALID_INPUT" });
}
```

---

## TASK 7 — Fix Stale Weekly Progress After Task Completion
**Finding:** BB  
**File:** `client/src/components/guild/GuildMemberPanel.tsx` line 167

### What to do:

In `completeTaskMutation`'s `onSuccess`, add the missing invalidations:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "tasks"] });
  // ADD THESE:
  queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId] });
  queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
  // Also invalidate user earnings so balance reflects new points:
  queryClient.invalidateQueries({ queryKey: ["earnings"] });
  toast({ title: "Task completed!", description: "Your contribution has been recorded." });
},
```

---

## TASK 8 — Guild Real-Time: Announcement Broadcast + Chat WS Handler
**Findings:** X, Z  
**Files:** `server/routes.ts`, `client/src/hooks/useRealtimeSync.ts`, `GuildMemberPanel.tsx`, `CaptainPortal.tsx`

### What to do:

**Step 8.1 — Broadcast announcement on post (server)**

In `server/routes.ts` inside `POST /api/guilds/:id/announcement` handler (around line 1157), add after saving:

```typescript
const guild = await storage.postGuildAnnouncement(req.params.id, userId, text);
// ADD:
broadcastGuildEvent(req.params.id, 'guild.announcement_posted', {
  guildId: req.params.id,
  announcement: text,
  postedAt: new Date().toISOString(),
});
res.json({ guild });
```

**Step 8.2 — Add frontend WS handler for announcement (useRealtimeSync.ts)**

```typescript
case 'guild.announcement_posted': {
  const guildId = (payload as any).guildId;
  if (guildId) {
    queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId] });
    queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
    toast({
      title: "📣 New Announcement",
      description: (payload as any).announcement?.substring(0, 100),
    });
  }
  break;
}
```

**Step 8.3 — Add WS handler for guild chat (`engine_c:message`)**

In `useRealtimeSync.ts`, add:

```typescript
case 'engine_c:message': {
  const guildId = (payload as any).guildId;
  if (guildId) {
    queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "chat"] });
  }
  break;
}
```

**Step 8.4 — Reduce chat poll interval now that WS handles updates**

In `GuildMemberPanel.tsx` line 87: change `refetchInterval: 5000` → `refetchInterval: 30000`
In `CaptainPortal.tsx` line 82: change `refetchInterval: 15000` → `refetchInterval: 30000`

---

## TASK 9 — Fix Mobile Chat Fixed Heights
**Finding:** CC, DD  
**Files:** `client/src/components/guild/CaptainPortal.tsx`, `client/src/components/guild/GuildMemberPanel.tsx`

### What to do:

**Step 9.1 — Replace fixed `style={{ height: Npx }}` with responsive Tailwind**

In `CaptainPortal.tsx` line 444:
```tsx
// BEFORE:
<div className="rounded-xl border border-zinc-200 bg-white flex flex-col" style={{ height: 460 }}>

// AFTER:
<div className="rounded-xl border border-zinc-200 bg-white flex flex-col h-[460px] max-h-[60vh] min-h-[240px]">
```

In `CaptainPortal.tsx` line 498 (DM container):
```tsx
<div className="... flex flex-col h-[420px] max-h-[60vh] min-h-[240px]">
```

In `GuildMemberPanel.tsx` lines 386, 415:
```tsx
<div className="... flex flex-col h-[400px] max-h-[60vh] min-h-[200px]">
```

**Step 9.2 — Fix GuildMemberPanel tab overflow**

In `GuildMemberPanel.tsx` line 253, find the tab container div and add `overflow-x-auto`:
```tsx
// BEFORE:
<div className="flex gap-1 bg-zinc-100 rounded-lg p-1">

// AFTER:
<div className="flex gap-1 bg-zinc-100 rounded-lg p-1 overflow-x-auto">
```

---

## TASK 10 — Client-Side Form Validation (Guild Settings, Announcement, Chat)
**Findings:** FF, GG, HH  
**Files:** `client/src/components/guild/CaptainPortal.tsx`

### What to do:

**Step 10.1 — Guild Settings form validation**

Before calling `settingsMutation.mutate(...)`, add client-side guard:
```typescript
if (guildName.trim().length < 3) {
  toast({ title: "Guild name must be at least 3 characters.", variant: "destructive" });
  return;
}
if (guildName.trim().length > 60) {
  toast({ title: "Guild name cannot exceed 60 characters.", variant: "destructive" });
  return;
}
```

**Step 10.2 — Announcement textarea: add `maxLength` attribute + client guard**

```tsx
<textarea
  maxLength={500}
  value={announcementText}
  onChange={e => setAnnouncementText(e.target.value)}
  ...
/>
<div className="text-right text-[10px] text-zinc-400">{announcementText.length}/500</div>
```

**Step 10.3 — Chat/DM: add `maxLength` on input elements + guard before send**

```tsx
<input maxLength={500} ... />
```

And in send handler:
```typescript
if (chatMsg.trim().length === 0 || chatMsg.length > 500) return;
```

---

## TASK 11 — Fix Captain Accept/Kick Stale Member Count in Header
**Finding:** AA  
**File:** `client/src/components/guild/CaptainPortal.tsx` lines 102, 136

### What to do:

In both `appActionMutation` and `kickMutation` `onSuccess`:

```typescript
onSuccess: (_, { action }) => {
  queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "members"] });
  // ADD:
  queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId] });
  toast({ title: action === "accept" ? "Member accepted!" : "Member removed." });
},
```

---

## TASK 12 — Paginate `getAllUsers()` to Prevent Memory Bomb
**Finding:** R  
**File:** `server/storage.ts` lines 1455–1510

### What to do:

**Step 12.1 — Add limit + pagination to `getAllUsers()`**

```typescript
async getAllUsers(limit = 500, offset = 0): Promise<User[]> {
  return await db
    .select({
      // Only the fields that callers actually need — no passwordHash, no verificationToken
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      identity: users.identity,
      totalEarnings: users.totalEarnings,
      availableBalance: users.availableBalance,
      role: users.role,
      isActive: users.isActive,
      // ... other needed fields, NOT passwordHash or verificationToken
    })
    .from(users)
    .limit(limit)
    .offset(offset);
}
```

**Step 12.2 — Audit all callers of `getAllUsers()`** in routes.ts and update to pass explicit limits or switch to paginated endpoints.

**Step 12.3 — Leaderboard force-sync: add cooldown**

In the `/api/admin/leaderboard/force-sync` handler, add a server-side in-memory cooldown (60 seconds) to prevent admin from triggering repeated full-table scans:

```typescript
let lastLeaderboardSync = 0;
app.post("/api/admin/leaderboard/force-sync", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
  const now = Date.now();
  if (now - lastLeaderboardSync < 60_000) {
    return res.status(429).json({ message: "Leaderboard sync is on cooldown (60s)." });
  }
  lastLeaderboardSync = now;
  // ...existing sync logic
});
```

---

## TASK 13 — Wire `guild.gps_updated` Handler + Fix Member Tab Overflow
**Finding:** Y, DD  
**File:** `client/src/hooks/useRealtimeSync.ts`, `GuildMemberPanel.tsx`

### What to do:

**Step 13.1 — Add handler for `guild.gps_updated`**

In `useRealtimeSync.ts`, add:

```typescript
case 'guild.gps_updated': {
  const guildId = (payload as any).guildId;
  if (guildId) {
    queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId] });
  }
  break;
}
```

**Step 13.2 — Ensure `guildId` is included in the broadcast payload**

In `server/routes.ts`, where `guild.gps_updated` is broadcast (line ~4607), confirm:
```typescript
broadcastGuildEvent(guildId, 'guild.gps_updated', { guildId, newGps: updatedGuild.guildPerformanceScore });
```

---

## TASK 14 — Enterprise Foundation: Structured Logging + Error Tracking
**Findings:** T, U, V, W

### What to do:

**Step 14.1 — Install `pino` for structured JSON logging**

```bash
npm install pino pino-pretty
```

Create `server/lib/logger.ts`:
```typescript
import pino from 'pino';
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } }
  })
});
```

Replace key `console.error()` calls in financial routes (withdraw, earn, balance adjust) with:
```typescript
logger.error({ err, userId, amount }, 'Withdrawal processing failed');
```

**Step 14.2 — Add Sentry error tracking (optional but recommended)**

In Replit, check if Sentry integration is available. If so, install `@sentry/node` and add to `server/index.ts`:
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

Add Sentry error handler as the last express middleware.

**Step 14.3 — Write critical unit tests for financial functions**

Create `server/__tests__/financial.test.ts`:
- Test `recordEarnEvent()` with known inputs → verify points credited, PKR split
- Test `processWithdrawal()` fee calculation
- Test `calculateWithdrawalBreakdown()` edge cases (min payout, referral commission, S-Rank)
- Test `createWithdrawal()` concurrent call rejection

**Step 14.4 — Generate migration files (long-term)**

Switch from `drizzle-kit push` to `drizzle-kit generate` + `drizzle-kit migrate` workflow:
```
npx drizzle-kit generate  # generates SQL migration files
npx drizzle-kit migrate   # applies them idempotently
```

This creates a `drizzle/` folder with versioned SQL files that can be rolled back.

---

## EXECUTION ORDER

```
Week 1 — CRITICAL & HIGH (before any user growth)
  Day 1: Task 1 (PKR leakage from session) + Task 2 (legacy-register)
  Day 2: Task 3 (createAdView transaction)
  Day 3: Task 4 (float precision in recordEarnEvent)
  Day 4: Task 5 (createWithdrawal race condition)
  Day 5: Task 6 (rate limiters for contact/chat)

Week 2 — HIGH UX & DATA INTEGRITY
  Day 6-7: Task 7 (task completion stale progress) + Task 8 (WS broadcasts)
  Day 8:   Task 9 (mobile chat heights)
  Day 9-10: Task 10 + 11 (form validation + stale member count)

Week 3 — MEDIUM SCALE & POLISH
  Day 11-12: Task 12 (getAllUsers pagination)
  Day 13:    Task 13 (gps_updated handler)
  Day 14-15: Task 14 (logging foundation, basic tests)
```

---

## QUESTIONS ANSWERED BEFORE STARTING

Before beginning Task 1 (PKR session strip) and Task 4 (Decimal precision):

1. Is `balanceCashPkr` used anywhere in the user-facing frontend? (Check before stripping)
2. Is `/api/legacy-register` still called by any mobile clients?
3. Should `grossPkrPerCompletion` be completely hidden from user API responses?
4. Should guild chat be fully real-time (WS) or is 30-second polling acceptable?
5. What unit testing framework do you prefer? (Jest / Vitest / none for now)
