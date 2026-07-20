# THORX — ENTERPRISE TASK PLAN V2
**Based on:** Audit Report V2 (2026-07-17)
**Standard:** Zero-bug, million-dollar production quality
**Total Tasks:** 18 (2 Critical → 9 High → 5 Medium → 2 Infrastructure)

---

## PRIORITY LEGEND
```
CRITICAL  — Ship before any user can send/receive guild messages or earn points
HIGH      — Ship before scaling beyond 1,000 users
MEDIUM    — Ship before public launch / marketing push
INFRA     — Ship before first production deploy
```

---

## CRITICAL PRIORITY

---

### TASK 1 — Fix WebSocket Guild Broadcast (Finding 1-A + 1-B)
**Priority:** CRITICAL | **Files:** `server/realtime.ts`  
**Findings addressed:** 1-A, 1-B

**Problem:** `broadcastGuildMessage()` sends every guild chat message to every connected WebSocket client on the entire platform. Any user can read any guild's messages by inspecting their WS stream. Additionally, `join_guild` WS message has no server-side membership verification — any user can subscribe to any guild channel.

**Enterprise solution:**

**Step 1 — Verify membership before registering socket in guild channel:**
```typescript
// server/realtime.ts — in the ws.on("message") handler
if (msg.type === "join_guild" && typeof msg.guildId === "string") {
  // Verify user actually belongs to this guild before registering
  const { storage } = await import("./storage");
  const user = await storage.getUserById(userId);
  if (user?.guildId === msg.guildId) {
    setSocketGuild(ws, msg.guildId);
  }
  // Silently ignore unauthorized join_guild attempts
}
```

**Step 2 — Scope `broadcastGuildMessage` to guild members only:**
```typescript
export function broadcastGuildMessage(guildId: string, payload: unknown) {
  if (!wss) return;
  const message = JSON.stringify({ ...(payload as object), guildId });
  sockets.forEach((meta, ws) => {
    // Only send to sockets registered in THIS guild's channel
    if (meta.guildId === guildId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}
```

**Step 3 — Add `guildId` to socket metadata type:**
```typescript
type SocketMeta = {
  userId: string;
  canSeeUserActivity: boolean;
  guildId: string | null;  // tracks which guild channel this socket is subscribed to
};
```

**Done looks like:**
- Guild A members cannot receive Guild B's chat messages
- A user cannot `join_guild` for a guild they're not a member of
- All existing `broadcastGuildMessage` call sites continue working unchanged

---

### TASK 2 — Fix `refreshLeaderboardCache()` Memory Bomb (Finding 1-E + 1-F)
**Priority:** CRITICAL | **Files:** `server/storage.ts`  
**Findings addressed:** 1-E, 1-F

**Problem:** `refreshLeaderboardCache()` loads ALL active users into Node.js heap memory, performs O(n log n) in-memory sorts, then does N individual INSERT calls to `score_history`. At scale, this OOM-crashes the server.

**Enterprise solution — SQL-native leaderboard computation:**

```typescript
async refreshLeaderboardCache(): Promise<void> {
  const TOP_N = 100; // Only cache the competitive range

  // Step 1: Compute ranks entirely in SQL — no heap allocation
  const ranked = await db.execute(sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email, u.avatar,
      u.rank, u.performance_score, u.tx_points_balance,
      u.guild_id, u.user_rank_tier,
      RANK() OVER (ORDER BY u.performance_score DESC NULLS LAST) as rank_position,
      PERCENT_RANK() OVER (ORDER BY u.performance_score DESC NULLS LAST) as percentile
    FROM users u
    WHERE u.role = 'user' AND u.is_active = true
    ORDER BY u.performance_score DESC NULLS LAST
    LIMIT ${TOP_N}
  `);

  // Step 2: Batch insert score history in ONE statement
  if (ranked.rows.length > 0) {
    const now = new Date();
    const historyRows = ranked.rows.map(u => ({
      userId: u.id as string,
      score: String(u.performance_score ?? 0),
      rank: Number(u.rank_position),
      recordedAt: now,
    }));
    await db.insert(scoreHistory).values(historyRows);  // single batch insert
  }

  // Step 3: Cache the result
  leaderboardCache = { data: ranked.rows, updatedAt: new Date() };
}
```

**Additional fix — decouple leaderboard refresh from earn events:**
- Remove `await this.refreshLeaderboardCache()` from `recordEarnEvent()` (line 2852)
- Move to a cron job running every 5 minutes: `setInterval(refreshLeaderboardCache, 5 * 60 * 1000)`
- Earn events return immediately without waiting for leaderboard recomputation

**Done looks like:**
- Leaderboard refresh never allocates all users in memory
- N+1 inserts replaced with single batch insert
- Earn events are no longer blocked by leaderboard recomputation

---

## HIGH PRIORITY

---

### TASK 3 — WebSocket Rate Limiting (Finding 1-C)
**Priority:** HIGH | **Files:** `server/realtime.ts`

**Problem:** No rate limiting on WS messages — authenticated users can flood the WS message handler.

**Enterprise solution:**
```typescript
// Add per-socket rate limiter in ws.on("message") handler
const WS_RATE_LIMIT = 10; // messages per 10 seconds
const wsMessageCounts = new WeakMap<WebSocket, { count: number; resetAt: number }>();

ws.on("message", (raw) => {
  const now = Date.now();
  const tracker = wsMessageCounts.get(ws) ?? { count: 0, resetAt: now + 10_000 };
  if (now > tracker.resetAt) { tracker.count = 0; tracker.resetAt = now + 10_000; }
  tracker.count++;
  wsMessageCounts.set(ws, tracker);

  if (tracker.count > WS_RATE_LIMIT) {
    ws.close(1008, "Rate limit exceeded");
    return;
  }
  // ... existing message handling
});
```

---

### TASK 4 — Fix Remaining `parseFloat` in Financial Paths (Findings 1-J, 1-K, 1-L)
**Priority:** HIGH | **Files:** `server/storage.ts`

**Three specific fixes:**

**Fix A — `createReferralCashWithdrawal` balance comparison (line 4746):**
```typescript
// Before:
const balance = parseFloat(user.balanceCashPkr);
if (balance < amount) throw new Error(...);

// After:
const balanceD = new Decimal(user.balanceCashPkr ?? "0");
if (balanceD.lt(new Decimal(amount))) throw new Error(...);
```

**Fix B — `pendingTotal` in reconciliation (line 3664):**
```typescript
// Before:
const pendingTotal = pendingRows.reduce((s, w) => s + parseFloat(w.amount), 0);

// After:
const pendingTotal = pendingRows
  .reduce((s, w) => s.plus(new Decimal(w.amount ?? "0")), new Decimal(0))
  .toFixed(2);
```

**Fix C — `totalCommissionsPaid` (line 4951):**
```typescript
// Before:
totalCommissionsPaid: parseFloat(row?.total ?? "0")
// After:
totalCommissionsPaid: new Decimal(row?.total ?? "0").toFixed(2)
```

---

### TASK 5 — Add Zod Validation to Admin Routes (Findings 2-A, 2-B, 2-C, 2-D)
**Priority:** HIGH | **Files:** `server/routes.ts`

**Four route fixes:**

**Route A — `PATCH /api/admin/config/:key`:**
```typescript
const configUpdateSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown())])
});
// Apply: const { value } = configUpdateSchema.parse(req.body);
```

**Route B — `POST /api/admin/users/:id/action`:**
```typescript
const userActionSchema = z.object({
  type: z.enum(["add", "deduct"]),
  amount: z.number().positive().max(1_000_000),
  reason: z.string().min(1).max(500),
});
```

**Route C — `PATCH /api/profile`:**
```typescript
const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  identity: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().max(100).optional(),
  profilePicture: z.string().max(2_000_000).optional(), // base64 limit
  // Explicitly EXCLUDED: role, permissions, isActive, balanceCashPkr
});
```

**Route D — `PATCH /api/guilds/weekly-tasks/:taskId`:**
```typescript
const weeklyTaskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  pointsReward: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  taskCategory: z.enum(["direct", "indirect"]).optional(),
});
```

---

### TASK 6 — Add Rate Limiters to Missing Routes (Findings 2-E, 2-F, 2-G, 2-H)
**Priority:** HIGH | **Files:** `server/routes.ts`

**Four route additions:**
```typescript
// POST /api/team/invitations (line 372) — email spam risk
app.post("/api/team/invitations", requirePermission("MANAGE_TEAM"), contactRateLimiter, ...)

// PATCH /api/admin/config/:key (line 438) — config manipulation rate control
app.patch("/api/admin/config/:key", requirePermission("MANAGE_SYSTEM"), profileRateLimiter, ...)

// POST /api/guilds (line ~973) — guild creation spam
app.post("/api/guilds", requireSessionAuth, guildInteractionRateLimiter, ...)

// POST /api/guilds/:id/join (line ~1021) — join request flood
app.post("/api/guilds/:id/join", requireSessionAuth, guildInteractionRateLimiter, ...)
```

---

### TASK 7 — Add Missing Database Indexes (Findings 2-I, 2-J, 2-K, 2-L)
**Priority:** HIGH | **Files:** `shared/schema.ts` + raw SQL migration

**Four indexes in schema.ts:**
```typescript
// 1. Referral commission lookups
export const referralsReferrerStatusIdx = index("referrals_referrer_status_idx")
  .on(referrals.referrerId, referrals.status);

// 2. Leaderboard sort
export const usersPerformanceScoreIdx = index("users_performance_score_idx")
  .on(users.performanceScore);

// 3. Top earner / referral leaderboard
export const usersTotalEarningsIdx = index("users_total_earnings_idx")
  .on(users.totalEarnings);

// 4. Weekly task duplicate check + uniqueness enforcement at DB level
export const taskRecordsUserTaskIdx = uniqueIndex("task_records_user_task_idx")
  .on(taskRecords.userId, taskRecords.taskId);
```

**Apply via raw SQL** (non-TTY environment):
```sql
CREATE INDEX IF NOT EXISTS referrals_referrer_status_idx ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS users_performance_score_idx ON users(performance_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS users_total_earnings_idx ON users(total_earnings DESC NULLS LAST);
CREATE UNIQUE INDEX IF NOT EXISTS task_records_user_task_idx ON task_records(user_id, task_id);
```

---

### TASK 8 — Harden `risk-engine.ts` and `ps-engine.ts` (Findings 2-M, 2-N)
**Priority:** HIGH | **Files:** `server/modules/risk-engine.ts`, `server/modules/ps-engine.ts`

**Pattern to apply to every DB call in both modules:**
```typescript
// Before (unguarded):
const result = await scoreUser(userId);
await upsertRiskCase(result);

// After (defensive):
try {
  const result = await scoreUser(userId);
  await upsertRiskCase(result);
  logger.info({ userId, score: result.riskScore }, '[RiskEngine] Score updated');
} catch (err) {
  logger.error({ err, userId }, '[RiskEngine] DB failure during scoring — skipping, will retry on next trigger');
  // Do NOT throw — background scoring failure must never crash the server
}
```

Key principle: **engine failures must be logged and swallowed, never propagated as unhandled rejections.**

---

### TASK 9 — Fix Dockerfile Security (Finding 2-O)
**Priority:** HIGH | **Files:** `Dockerfile`

```dockerfile
# --- Production Image ---
FROM node:20-slim

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs thorx

WORKDIR /app

# ... dependency install and build copy steps ...

# Switch to non-root user BEFORE starting the process
USER thorx

CMD ["node", "--max-old-space-size=256", "dist/index.js"]
```

---

### TASK 10 — Add Startup Environment Validation (Finding 2-P)
**Priority:** HIGH | **Files:** `server/index.ts`

```typescript
// Add at the TOP of server/index.ts, before any other initialization:
function validateEnv(): void {
  const required: Array<{ key: string; hint: string }> = [
    { key: "DATABASE_URL", hint: "Add a PostgreSQL database to this Replit" },
    { key: "SESSION_SECRET", hint: "Generate with: openssl rand -hex 32" },
  ];
  const missing = required.filter(({ key }) => !process.env[key]);
  if (missing.length > 0) {
    console.error("\n[THORX] FATAL: Missing required environment variables:");
    missing.forEach(({ key, hint }) => console.error(`  • ${key} — ${hint}`));
    console.error("\nAdd these to your environment secrets and restart.\n");
    process.exit(1);
  }
}
validateEnv(); // Must be called before registerRoutes()
```

---

### TASK 11 — Remove All Frontend `console.*` Calls (Finding 1-O)
**Priority:** HIGH | **Files:** Multiple frontend files

**Systematic approach for each file:**

| File | Action |
|------|--------|
| `auth.tsx:486,515` | Replace `console.error` with toast: `toast({ title: "Authentication failed", variant: "destructive" })` |
| `UserPortal.tsx:235,247` | Share/copy errors → silent no-op or brief toast |
| `UserPortal.tsx:1037,1100` | Chat errors → show inline error state in chat UI |
| `UserPortal.tsx:2673` | Withdrawal error → already has toast, remove the console.error |
| `HilltopAdsPlayer.tsx:43-127` | Keep in `import.meta.env.DEV` guard only |
| `ErrorBoundary.tsx:40` | Keep in `import.meta.env.DEV` guard |
| `enhanced-video-player.tsx:412,452` | Silent catch — fullscreen is non-critical |
| `fingerprint.ts:48` | Silent catch — fingerprint failure should not surface any detail |

---

### TASK 12 — Fix Referral Code in `call-to-action.tsx` (Finding 3-C)
**Priority:** HIGH | **Files:** `client/src/components/sections/call-to-action.tsx`

```tsx
// Before:
const [referralCode, setReferralCode] = useState<string>("THORX-XXXX");

// After:
const { data: user } = useQuery({ queryKey: ["/api/user"], retry: false });
const referralCode = user?.referralCode ?? null;

// In JSX:
{referralCode ? (
  <span className="font-mono">{referralCode}</span>
) : user === undefined ? (
  <Skeleton className="h-5 w-28" />
) : null}
```

---

## MEDIUM PRIORITY

---

### TASK 13 — Add `LIMIT` to Unbounded Queries (Findings 1-G, 1-H, 1-I)
**Priority:** MEDIUM | **Files:** `server/storage.ts`

```typescript
// getDailyTasks (line 1665)
return await db.select().from(dailyTasks)
  .where(eq(dailyTasks.isActive, true))
  .orderBy(desc(dailyTasks.createdAt))
  .limit(500);

// getHilltopAdsZones (line 1762)
return await db.select().from(hilltopAdsZones)
  .where(eq(hilltopAdsZones.isActive, true))
  .orderBy(desc(hilltopAdsZones.createdAt))
  .limit(100);

// getGuilds (line ~949)
return await db.select().from(guilds)
  .orderBy(desc(guilds.currentWeeklyPoints))
  .limit(200);
```

---

### TASK 14 — Fix Missing Query Invalidations (Findings 1-M, 1-N)
**Priority:** MEDIUM | **Files:** `client/src/pages/UserPortal.tsx`

```typescript
// chatMutation onSuccess (line ~1004)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "messages"] });
  queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "chat"] });
},

// recordAdViewMutation onSuccess (line ~798)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["earnings"] });
  queryClient.invalidateQueries({ queryKey: ["ad-views"] });
  queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // updates txPointsBalance
},
```

---

### TASK 15 — Standardize React Query Keys + Fix `ProtectedRoute` (Findings 1-Q, 3-B)
**Priority:** MEDIUM | **Files:** `client/src/lib/queryKeys.ts` (new file), `client/src/components/auth/ProtectedRoute.tsx`

**Create `client/src/lib/queryKeys.ts`:**
```typescript
export const QUERY_KEYS = {
  user:              ["/api/user"] as const,
  earnings:          ["/api/earnings"] as const,
  withdrawals:       ["/api/withdrawals"] as const,
  withdrawalPreview: ["/api/withdrawals/preview"] as const,
  adViews:           ["/api/ad-views"] as const,
  tasks:             ["/api/tasks"] as const,
  guildMessages:     (guildId: string) => ["/api/guilds", guildId, "messages"] as const,
  // ... etc
} as const;
```

**Fix `ProtectedRoute.tsx` null returns:**
```tsx
// Before:
if (isLoading) return null;

// After:
if (isLoading) return <PortalSkeleton />;  // full-page skeleton matching the route layout
```

---

### TASK 16 — Fix `value-proposition.tsx` PKR Leak (Finding 3-A) + Admin Panel Empty States (Finding 3-D)
**Priority:** MEDIUM | **Files:** `client/src/components/sections/value-proposition.tsx`, `client/src/components/admin/UserInspectorPanel.tsx`

**value-proposition.tsx:** Replace any Rs./PKR amounts with TX-Points equivalents or qualitative language.

**UserInspectorPanel.tsx:**
```tsx
// Before:
if (!selectedUser) return null;

// After:
if (!selectedUser) return (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    <UserSearch className="h-12 w-12 mb-4 opacity-30" />
    <p className="text-sm font-medium">Select a user to inspect</p>
    <p className="text-xs mt-1">Click any row in the user list</p>
  </div>
);
```

---

### TASK 17 — WS Disconnect UI Feedback (Finding 1-D, 3-E)
**Priority:** MEDIUM | **Files:** `client/src/hooks/useRealtimeSync.ts`, `client/src/components/ui/WsStatusBanner.tsx` (new)

```typescript
// useRealtimeSync.ts — expose connection state
const [wsConnected, setWsConnected] = useState(false);
ws.onopen = () => setWsConnected(true);
ws.onclose = () => setWsConnected(false);
ws.onerror = () => setWsConnected(false);

// WsStatusBanner.tsx — show when disconnected
export function WsStatusBanner() {
  const { wsConnected } = useRealtimeSync();
  if (wsConnected) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
      Live connection lost — reconnecting…
    </div>
  );
}
```

---

## INFRASTRUCTURE SPRINT

---

### TASK 18 — Fix Cascade Delete on Financial Tables (Finding 2-Q) + Graceful Shutdown (Finding 2-R)
**Priority:** INFRA | **Files:** `shared/schema.ts`, `server/index.ts`

**Part A — Soft-delete users, protect financial audit trail:**
- Change `users` delete logic (admin panel) to set `isActive = false`, anonymize email to `deleted_{id}@thorx.void`
- Remove `onDelete: "cascade"` from `earnings`, `withdrawals`, `user_transactions`, `commission_logs` tables
- Keep cascade only on `notifications`, `sessions`, `score_history` (non-financial)

**Part B — Graceful shutdown (server/index.ts:30):**
```typescript
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception — initiating graceful shutdown');
  // Give in-flight requests 5 seconds to complete before forcing exit
  const timeout = setTimeout(() => {
    logger.fatal('Graceful shutdown timeout — forcing exit');
    process.exit(1);
  }, 5000).unref();
  server.close(() => {
    clearTimeout(timeout);
    logger.fatal('Server closed gracefully');
    process.exit(1);
  });
});
```

---

## EXECUTION ORDER

```
WEEK 1 — CRITICAL (ship immediately)
  Day 1: Task 1 (WS guild scoping) + Task 2 (leaderboard memory bomb)
  Day 2: Task 10 (env validation) + Task 9 (Dockerfile root user)

WEEK 1 — HIGH PRIORITY
  Day 3: Task 3 (WS rate limit) + Task 6 (missing rate limiters)
  Day 4: Task 5 (Zod validation on admin routes)
  Day 5: Task 7 (DB indexes — raw SQL, instant) + Task 4 (parseFloat fixes)
  Day 6: Task 8 (risk/ps engine hardening) + Task 11 (frontend console.* removal)
  Day 7: Task 12 (referral code fix)

WEEK 2 — MEDIUM PRIORITY
  Day 8: Task 13 (unbounded query limits) + Task 14 (query invalidations)
  Day 9: Task 15 (Query key standardization + ProtectedRoute skeleton)
  Day 10: Task 16 (PKR leak in marketing + admin empty states)
  Day 11: Task 17 (WS disconnect UI feedback)
  Day 12: Task 18 (cascade delete + graceful shutdown) + final regression
```

---

## DONE CRITERIA (per task)

Each task is complete when:
1. The specific file:line from the audit finding is addressed
2. TypeScript compiles with zero errors (`npm run check`)
3. The workflow restarts cleanly
4. A targeted live test confirms the fix (curl or browser verification)
5. Memory updated to record the decision/pattern

The full platform is release-ready when all 18 tasks pass and a full auth regression + financial flow regression runs clean end-to-end.
