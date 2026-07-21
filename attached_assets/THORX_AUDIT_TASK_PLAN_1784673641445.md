# THORX — AUDIT FIX TASK PLAN
**Based on:** `THORX_DEEP_AUDIT_REPORT.md` (2026-07-20)  
**Total Tasks:** 10 implementation tasks  
**Priority Order:** Financial Integrity → Security → UX/Ecosystem → Polish

---

## HOW TO READ THIS PLAN

Each task has:
- **Findings Covered** — which audit IDs it resolves
- **Files to Change** — exact file paths
- **Done Looks Like** — concrete acceptance criteria
- **Estimated Effort** — relative complexity

Tasks are ordered: complete each before starting the next. Tasks 1–4 are BLOCKING (financial/security). Tasks 5–10 can run in parallel after Task 4 is done.

---

## TASK 1 — Fix Guild Bonus Distribution Float Math
**Priority:** 🔴 CRITICAL — Financial Integrity  
**Findings:** F-01, F-02  
**Effort:** Medium

### What
Replace all native JavaScript float arithmetic in the guild weekly bonus distribution with `Decimal.js` to guarantee that `sum(all shares) === pool` with no rounding leakage.

### Files to Change
- `server/modules/guild-reset.ts` — lines 79–183 (entire distribution block)
- `server/storage.ts` — line 994 (`userPkrShareD.toNumber()` before drawThorxCard)

### Exact Changes

**`guild-reset.ts`:**
```ts
// BEFORE
const pool = parseFloat(guild.weeklyBonusPool);
captainShare = Math.round(pool * 0.30 * 100) / 100;
memberPool = Math.round((pool - captainShare) * 100) / 100;
const share = Math.round(memberPool * (member.weeklyPointsContributed / totalContrib) * 100) / 100;

// AFTER — use Decimal.js throughout
import Decimal from 'decimal.js';
const pool = new Decimal(guild.weeklyBonusPool ?? '0');
const captainShare = pool.mul('0.30').toDecimalPlaces(2, Decimal.ROUND_DOWN);
const memberPool = pool.sub(captainShare); // exact remainder — no float rounding
const share = memberPool
  .mul(new Decimal(member.weeklyPointsContributed).div(totalContrib))
  .toDecimalPlaces(2, Decimal.ROUND_DOWN);
// distribute any remainder (paisa dust) to captain
```

**`storage.ts` line 994:**
```ts
// BEFORE
const userPkrShare = userPkrShareD.toNumber();

// AFTER — keep as Decimal, pass toFixed string to drawThorxCard
// Update drawThorxCard signature to accept string | Decimal, convert inside only for display
```

### Rounding Policy Required (See Q1 in Audit Report)
The remaining paisa dust after distributing shares should go to the captain (safest choice — already the highest earner, avoids DB complexity). Confirm with product owner before implementing.

### Done Looks Like
- [ ] Sum of `captainShare + sum(memberShares)` === `pool` for any test input (verified with unit test)
- [ ] No `parseFloat`, `Math.round`, native `*`, `/` on PKR amounts in `guild-reset.ts`
- [ ] `drawThorxCard` receives a string `toFixed(4)` value, not a JS float

---

## TASK 2 — Fix Mass Assignment + Add Zod Validation on Admin Routes
**Priority:** 🔴 CRITICAL — Security  
**Findings:** S-01, S-02  
**Effort:** Medium-Large

### What
1. Fix the `PATCH /api/admin/tasks/:id` raw `req.body` pass-through (mass assignment)
2. Add Zod schemas to all 12 admin/financial routes that currently have no validation

### Files to Change
- `server/routes.ts` — 12 route handlers (lines: 1277, 1374, 1497, 2079, 2110, 2257, 2372, 2462, 3268, 3482, 4234, 4494, 4565, 4590, 4607, 4625)

### Exact Changes

**Mass assignment fix (line 3482):**
```ts
// BEFORE
const task = await storage.updateDailyTask(req.params.id, req.body);

// AFTER — whitelist only permitted fields
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  pointReward: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
  weekStart: z.string().datetime().optional(),
  weekEnd: z.string().datetime().optional(),
  targetGuildRank: z.string().optional(),
});
const result = updateTaskSchema.safeParse(req.body);
if (!result.success) return res.status(400).json({ message: "Invalid input", errors: result.error.flatten() });
const task = await storage.updateDailyTask(req.params.id, result.data);
```

**Example Zod schema for financial delta routes:**
```ts
const adjustBalanceSchema = z.object({
  realPkrDelta: z.number().finite().optional(),
  txPointsDelta: z.number().int().finite().optional(),
  amount: z.string().regex(/^\d+$/).optional(),
  type: z.enum(['add', 'deduct']),
  reason: z.string().min(5).max(500),
  creditIntent: z.string().optional(),
});
```

### Done Looks Like
- [ ] `PATCH /api/admin/tasks/:id` only accepts whitelisted fields — `id`, `createdAt`, `updatedAt` cannot be overwritten
- [ ] All 12 routes return `400` with field-level errors for invalid input
- [ ] Sending `NaN`, negative amounts, or excessively long strings is rejected at the route level, not the DB level
- [ ] Zod schemas are defined at the top of their route file section for readability

---

## TASK 3 — Secure the Proxy Route + Admin Rate Limiters
**Priority:** 🔴 CRITICAL — Security  
**Findings:** S-03, S-04  
**Effort:** Small

### What
1. Add `requireSessionAuth` or `requireTeamRole` to `GET /api/proxy`
2. Add `withdrawalRateLimiter` to `POST /api/admin/withdrawals/bulk` and `POST /api/admin/founder/withdrawals`

### Files to Change
- `server/routes.ts` — `GET /api/proxy` handler, two admin withdrawal routes

### Exact Changes

**Proxy route:**
```ts
// BEFORE
app.get("/api/proxy", async (req, res) => {

// AFTER
app.get("/api/proxy", requireTeamRole, async (req, res) => {
```

**Bulk withdrawal rate limiter:**
```ts
// BEFORE
app.post("/api/admin/withdrawals/bulk", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {

// AFTER
app.post("/api/admin/withdrawals/bulk", requirePermission("MANAGE_PAYOUTS"), withdrawalRateLimiter, async (req, res) => {
```

**Founder withdrawal rate limiter:**
```ts
app.post("/api/admin/founder/withdrawals", requireTeamRole, withdrawalRateLimiter, async (req, res) => {
```

### Done Looks Like
- [ ] `GET /api/proxy` returns `401` for unauthenticated requests
- [ ] Bulk withdrawal endpoint is throttled (same limits as user withdrawal)
- [ ] Founder withdrawal endpoint is throttled

---

## TASK 4 — Fix Unbounded Queries + Add Pagination
**Priority:** 🟠 HIGH — Performance & Stability  
**Findings:** F-04  
**Effort:** Medium

### What
Add `LIMIT` and pagination to `getWithdrawalsByUserId` and `getAdminWithdrawals`. Update the routes that call them to pass limit/offset parameters.

### Files to Change
- `server/storage.ts` — lines 2024–2029 (`getWithdrawalsByUserId`) and 3159–3172 (`getAdminWithdrawals`)
- `server/routes.ts` — routes calling these functions
- `client/src/pages/UserPortal.tsx` — withdrawals query (add `?limit=50` to API call)

### Exact Changes

**`storage.ts`:**
```ts
// BEFORE
async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> {
  return await db.select().from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt));
}

// AFTER
async getWithdrawalsByUserId(userId: string, limit = 50, offset = 0): Promise<Withdrawal[]> {
  return await db.select().from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(limit)
    .offset(offset);
}

// BEFORE
async getAdminWithdrawals(): Promise<Array<Withdrawal & { user: User }>> {
  const results = await db.select(...)...orderBy(desc(withdrawals.createdAt));

// AFTER
async getAdminWithdrawals(limit = 100, offset = 0): Promise<Array<Withdrawal & { user: User }>> {
  const results = await db.select(...)...orderBy(desc(withdrawals.createdAt)).limit(limit).offset(offset);
}
```

### Done Looks Like
- [ ] A user with 10,000 withdrawals does not cause a memory spike when viewing their history
- [ ] Admin withdrawals page loads max 100 records, with pagination controls
- [ ] IStorage interface updated with new optional `limit/offset` params

---

## TASK 5 — Fix TypeScript Compilation Errors
**Priority:** 🟠 HIGH — Code Quality  
**Findings:** F-05  
**Effort:** Small

### What
Fix all 4 TypeScript errors currently in `tsc_output.txt`.

### Files to Change
- `client/src/lib/fingerprint.ts` — lines 11, 18
- `server/storage.ts` — lines 847, 965

### Exact Changes

**`fingerprint.ts`:**
```ts
// BEFORE
navigator.deviceMemory
window.openDatabase

// AFTER — cast to any for vendor-specific APIs
(navigator as any).deviceMemory
(window as any).openDatabase
```

**`storage.ts` (emailVerifiedAt missing from select):**
The two select queries at lines 847 and 965 that return `User[]` must include `emailVerifiedAt` in their selected columns:
```ts
// Add emailVerifiedAt to the select projection, or use a full table select
// so the return type matches the User interface
```

### Done Looks Like
- [ ] `npx tsc --noEmit` outputs zero errors
- [ ] Build pipeline is clean

---

## TASK 6 — Fix Captain Announcements Visibility in User Portal
**Priority:** 🟠 HIGH — Ecosystem Connectivity  
**Findings:** U-01  
**Effort:** Small-Medium

### What
Display the guild captain's `latestAnnouncement` inside the User Portal guild section. It should appear as a pinned banner/card that is only visible when an announcement exists.

### Files to Change
- `client/src/pages/UserPortal.tsx` — guild section component
- Possibly `client/src/components/GuildMemberPanel.tsx` — where guild data is already displayed

### Implementation
The guild object returned from `GET /api/guilds/:id` already includes `latestAnnouncement` and `announcementPostedAt`. No backend changes needed — this is a pure frontend display addition.

```tsx
{guild.latestAnnouncement && (
  <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-1">
      <Megaphone className="w-3 h-3" />
      CAPTAIN'S MESSAGE
    </div>
    <p className="text-sm text-foreground">{guild.latestAnnouncement}</p>
    <p className="text-xs text-muted-foreground mt-1">
      {formatDistanceToNow(new Date(guild.announcementPostedAt))} ago
    </p>
  </div>
)}
```

### Done Looks Like
- [ ] When a captain posts an announcement in TeamPortal, it appears in UserPortal within the guild panel (after next query refresh or WS push)
- [ ] Announcement is hidden when `latestAnnouncement` is null
- [ ] Shows relative time ("2 hours ago")
- [ ] WS invalidation (already handled by `useRealtimeSync`) causes it to appear without page reload

---

## TASK 7 — Fix Query Key Registry + Cache Invalidation Gaps
**Priority:** 🟠 HIGH — Data Correctness  
**Findings:** U-02, U-03, U-04, U-05  
**Effort:** Medium

### What
1. Add `"session-auth"` to `QUERY_KEYS` registry
2. Align all hardcoded query keys to match the registry
3. Fix 4 mutation `onSuccess` handlers missing invalidation calls

### Files to Change
- `client/src/lib/queryKeys.ts` — add missing keys
- `client/src/hooks/useAuth.ts` — use `QUERY_KEYS.sessionAuth`
- `client/src/hooks/useRealtimeSync.ts` — use registry keys
- `client/src/pages/UserPortal.tsx` — use registry keys throughout
- `client/src/pages/auth.tsx` — use registry keys
- `client/src/components/profile-modal.tsx` — add session-auth invalidation
- `client/src/components/daily-goal-modal.tsx` — add tasks + earnings invalidation

### Registry Updates (`queryKeys.ts`):
```ts
export const QUERY_KEYS = {
  sessionAuth: ["session-auth"] as const,    // ADD THIS
  user: ["/api/user"] as const,
  earnings: ["/api/earnings"] as const,      // standardize all to URL form
  referrals: ["/api/referrals"] as const,
  notifications: ["/api/notifications"] as const,
  withdrawals: ["/api/withdrawals"] as const,
  tasks: ["/api/tasks"] as const,
  // ... existing keys
} as const;
```

### Mutation Fixes:

**`profile-modal.tsx` — add invalidation:**
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionAuth }); // ADD
  toast({ title: "Profile updated" });
  onClose();
}
```

**`daily-goal-modal.tsx` — add invalidation:**
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });    // ADD
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.earnings }); // ADD
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionAuth }); // ADD
}
```

**`UserPortal.tsx` chatMutation — add invalidation:**
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["chat-history", guildId] }); // ADD
}
```

### Done Looks Like
- [ ] Profile name update reflects in navbar immediately (no page refresh)
- [ ] Completing a daily goal shows updated task status and balance without refresh
- [ ] Sent chat message persists after render cycle
- [ ] Zero hardcoded string keys — all use `QUERY_KEYS.*`
- [ ] `QUERY_KEYS.earnings` is used uniformly (not `["earnings"]`)

---

## TASK 8 — Add Missing DB Indexes
**Priority:** 🟡 MEDIUM — Performance  
**Findings:** S-05, S-06  
**Effort:** Small

### What
Add two missing composite indexes to the database schema. These are critical for query performance as data grows.

### Files to Change
- `shared/schema.ts` — add 2 index declarations
- Then run: `npx drizzle-kit push --force`

### Exact Changes

**`shared/schema.ts`:**
```ts
// In earnings table indexes — add after line 179:
index("earnings_user_id_created_at_idx").on(table.userId, table.createdAt),

// In task_records table indexes — add after line 371:
index("task_records_user_completed_at_idx").on(table.userId, table.completedAt),
```

### Done Looks Like
- [ ] `\d earnings` in psql shows `earnings_user_id_created_at_idx`
- [ ] `\d task_records` in psql shows `task_records_user_completed_at_idx`
- [ ] `EXPLAIN ANALYZE` on `getEarningsHistory` query shows "Index Scan" not "Seq Scan"

---

## TASK 9 — Add Global Root ErrorBoundary + Earn Toast
**Priority:** 🟡 MEDIUM — UX & Reliability  
**Findings:** S-07, U-06, U-10  
**Effort:** Small

### What
1. Wrap the entire React app in a root ErrorBoundary
2. Add success toast to `recordAdViewMutation` confirming TX-Points earned
3. Add error toast to `chatMutation` for HTTP/network failures

### Files to Change
- `client/src/main.tsx` — add root ErrorBoundary
- `client/src/pages/UserPortal.tsx` — `recordAdViewMutation.onSuccess`, `chatMutation.onError`

### Exact Changes

**`main.tsx`:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary scope="Application">
    <App />
  </ErrorBoundary>
);
```

**`recordAdViewMutation.onSuccess`:**
```ts
onSuccess: (data) => {
  // existing invalidations...
  toast({
    title: "Points Earned!",
    description: `+${data.pointsCredited} TX-Points credited to your wallet`,
    variant: "default",
  });
}
```

**`chatMutation.onError`:**
```ts
onError: () => {
  toast({
    title: "Message failed",
    description: "Could not send your message. Please try again.",
    variant: "destructive",
  });
}
```

### Done Looks Like
- [ ] An uncaught error anywhere in the app shows an ErrorBoundary fallback UI instead of blank screen
- [ ] After watching an ad, a toast appears confirming TX-Points earned
- [ ] Failed chat message shows a destructive toast

---

## TASK 10 — Fix Mobile Layout + Loading States Polish
**Priority:** 🟡 MEDIUM — UI Polish  
**Findings:** U-07, U-08, U-09  
**Effort:** Medium

### What
1. Wrap LeaderboardInsights tables in `overflow-x-auto`
2. Fix TeamPortal mobile layout (responsive sidebar, responsive stat grid)
3. Replace plain text loading states with proper indicators

### Files to Change
- `client/src/components/LeaderboardInsights.tsx` — lines 343, 506
- `client/src/pages/TeamPortal.tsx` — sidebar and grid classes
- `client/src/components/admin/PayoutControl.tsx` — loading states
- `client/src/components/admin/RiskWatchlistPanel.tsx` — loading state
- `client/src/components/CaptainPortal.tsx` — loading states
- `client/src/components/admin/SystemHealthCard.tsx` — loading state

### Exact Changes

**LeaderboardInsights tables (×2):**
```tsx
// Wrap each <Table> component:
<div className="overflow-x-auto w-full">
  <Table>...</Table>
</div>
```

**TeamPortal responsive sidebar:**
```tsx
// BEFORE: fixed w-64 sidebar
// AFTER: hidden on mobile, shown on lg+
<aside className="hidden lg:block w-64 ...">

// BEFORE: grid-cols-4 stat cards  
// AFTER: responsive grid
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
```

**Plain text loading → spinner:**
```tsx
// BEFORE: "Processing..."
// AFTER:
{isPending ? (
  <span className="flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
  </span>
) : "Process"}
```

**SystemHealthCard "—" → skeleton:**
```tsx
// BEFORE: <span>—</span>
// AFTER:
<Skeleton className="h-6 w-12 rounded" />
```

**CaptainPortal nudgeMutation/mvpMutation — add isPending to button:**
```tsx
<Button disabled={nudgeMutation.isPending} onClick={() => nudgeMutation.mutate(member.id)}>
  {nudgeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
</Button>
```

### Done Looks Like
- [ ] LeaderboardInsights tables are horizontally scrollable on iPhone 12
- [ ] TeamPortal sidebar collapses on mobile (uses a sheet/drawer pattern or is hidden)
- [ ] All mutation buttons show a spinner while pending
- [ ] SystemHealthCard uses skeleton while loading, not "—"
- [ ] No plain "Saving…" / "Posting…" text — all replaced with spinner+label

---

## DEPENDENCY MAP

```
TASK 1 (Float Math)     ─── independent ──► can start immediately
TASK 2 (Zod/Mass Assign)─── independent ──► can start immediately  
TASK 3 (Proxy/Rate)     ─── independent ──► can start immediately
TASK 4 (Pagination)     ─── independent ──► can start immediately
TASK 5 (TS Errors)      ─── independent ──► can start immediately

TASK 6 (Announcements)  ─── needs Q&A answered first (Q2) ──► after clarification
TASK 7 (Query Keys)     ─── independent ──► can start immediately
TASK 8 (DB Indexes)     ─── independent ──► can start immediately (5 min job)
TASK 9 (ErrorBoundary)  ─── independent ──► can start immediately
TASK 10 (Mobile/Polish) ─── independent ──► can start immediately
```

**Tasks 1–5 + 7–10** can all be parallelized. **Task 6** needs product owner to answer Q2 (captain announcement visibility policy) from the audit report.

---

## QUESTIONS THAT MUST BE ANSWERED BEFORE IMPLEMENTATION

These are from the Audit Report — architectural decisions that determine HOW certain tasks are implemented:

| # | Question | Blocks Task |
|---|----------|-------------|
| Q1 | Where does rounding dust go in guild bonus distribution? (captain / next cycle / platform) | Task 1 |
| Q2 | Should captain announcements be visible to regular users in their portal? | Task 6 |
| Q3 | Should query keys use URL form (`/api/earnings`) or short form (`earnings`)? | Task 7 |
| Q4 | Inactivity penalty crash recovery — one transaction or checkpoint-resume? | Task 2 (scope) |
| Q5 | Is `GET /api/proxy` still needed? If yes, which role should access it? | Task 3 |

---

*Task plan generated 2026-07-20 based on THORX_DEEP_AUDIT_REPORT.md*
