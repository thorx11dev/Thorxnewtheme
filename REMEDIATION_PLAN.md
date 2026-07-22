# THORX Platform — Remediation Plan
**Date:** 2026-07-22  
**Source:** AUDIT_REPORT.md (31 findings across 3 categories)  
**Format:** Prioritized by business impact. Each item maps to one or more audit findings, states the exact fix, and estimates effort.

---

## Priority 1 — Fix Immediately (Blocking / High Impact)

---

### R-01 · Fix referral earnings reading from deprecated table
**Audit refs:** F-05, U-02  
**Effort:** 30 min  
**Risk of not fixing:** Every user with referral commissions sees Rs. 0.00 on their dashboard indefinitely. High trust impact.

**Fix in `server/storage.ts`, `getDashboardStats()`** — replace the `commissionLogs` query at lines 2597–2603 with a query against `referralCommissions`:

```typescript
// BEFORE (reads from deprecated/write-frozen commission_logs):
const [referralEarningsResult] = await db
  .select({ total: sql<string>`COALESCE(SUM(${commissionLogs.amount}), '0.00')` })
  .from(commissionLogs)
  .where(and(eq(commissionLogs.beneficiaryId, userId), eq(commissionLogs.status, "paid")));

// AFTER (reads from the live referral_commissions table):
const [referralEarningsResult] = await db
  .select({ total: sql<string>`COALESCE(SUM(${referralCommissions.commissionAmountPkr}), '0.00')` })
  .from(referralCommissions)
  .where(eq(referralCommissions.referrerId, userId));
```

---

### R-02 · Fix password reset — stop silently doing nothing
**Audit refs:** E-04, U-01  
**Effort:** 2–4 hrs (add real reset flow) or 30 min (honest stub)  
**Risk of not fixing:** Users are locked out with no recovery path. Highest user-trust impact.

**Option A — Honest stub (30 min, immediate):** Change `POST /api/forgot-password` to return HTTP 200 with a message that directs users to contact support directly, so they know to take action rather than waiting for an email that never arrives:

```typescript
app.post("/api/forgot-password", authRateLimiter, async (req, res) => {
  res.json({
    success: true,
    message: "Automated password reset is not available. Please contact support at support@thorx.com to reset your password.",
    action: "contact_support",
    contactEmail: "support@thorx.com",
  });
});
```

Update the frontend to render this message and show a mailto link / support contact button instead of "Check your email."

**Option B — Real token-based reset (4 hrs, recommended long-term):** Add a `password_reset_tokens` table, generate a signed token, send email via a transactional provider, and implement the `POST /api/reset-password` handler. Remove the HTTP 410 stub.

---

### R-03 · Remove `parseFloat()` at the ad-view earn boundary
**Audit refs:** F-01  
**Effort:** 15 min  
**Risk of not fixing:** Systematic sub-paisa float drift enters every ad-view earning record.

**Fix in `server/routes.ts`**, ad-view handler:

```typescript
// BEFORE:
const grossPkr = parseFloat(adConfig.reward);
await storage.recordEarnEvent({ ..., grossPkr });

// AFTER — keep as string; Decimal conversion happens inside recordEarnEvent:
await storage.recordEarnEvent({ ..., grossPkr: adConfig.reward });
```

Verify `recordEarnEvent`'s signature accepts `string | number` for `grossPkr` (it uses `Decimal` internally, so `new Decimal(string)` is exact). If typed as `number`, change the parameter type to `string | number`.

---

### R-04 · Add `requireSessionAuth` to `GET /api/rank/history`
**Audit refs:** F-04  
**Effort:** 5 min

```typescript
// BEFORE:
app.get("/api/rank/history", async (req, res) => {
  const userId = getThorxPrincipalId(req);
  if (!userId) return res.status(401)...

// AFTER:
app.get("/api/rank/history", requireSessionAuth, async (req, res) => {
  const userId = req.userProfile.id;
```

---

### R-05 · Fix ad-view success message — remove PKR, fix terminology
**Audit refs:** F-03, U-06  
**Effort:** 10 min

**Fix in `server/routes.ts`**, ad-view success response:

```typescript
// BEFORE:
res.json({ message: "Authentication Successful: 0.25 PKR credited", ... });

// AFTER (example — use the actual TX-Points awarded, not PKR):
res.json({ message: `Ad viewed — ${txPointsAwarded} TX-Points credited`, ... });
```

The response should speak in TX-Points only. Remove all PKR/Rs. references from the ad-view response body.

---

### R-06 · Add Zod validation to `PATCH /api/admin/withdrawals/:id`
**Audit refs:** E-05  
**Effort:** 20 min

```typescript
const withdrawalUpdateSchema = z.object({
  status:          z.enum(["completed", "rejected", "pending"]),
  transactionId:   z.string().max(200).optional(),
  rejectionReason: z.string().max(500).optional(),
});

app.patch("/api/admin/withdrawals/:id", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {
  const parsed = withdrawalUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
  const { status, transactionId, rejectionReason } = parsed.data;
  // ... rest of handler unchanged
```

---

### R-07 · Add Zod and `requirePermission` to `POST /api/admin/weekly-tasks`
**Audit refs:** F-11  
**Effort:** 30 min

Replace `requireTeamRole` with `requirePermission("MANAGE_TASKS")` (add this permission to the permission system if not already present, or reuse the most appropriate existing permission). Add a Zod schema:

```typescript
const weeklyTaskSchema = z.object({
  title:        z.string().min(3).max(200),
  description:  z.string().max(1000).optional(),
  pointReward:  z.number().int().min(1).max(100000),
  guildId:      z.string().uuid().optional(),
  // ... other fields per the actual schema
});
```

Apply `weeklyTaskSchema.safeParse(req.body)` and use `parsed.data` throughout — no `parseInt`.

---

## Priority 2 — Fix This Sprint (Important, Lower Urgency)

---

### R-08 · Fix `dailyGoal` hardcoded to 20 — read from systemConfig
**Audit refs:** F-14, U-04  
**Effort:** 30 min

In `getDashboardStats()`:
```typescript
// BEFORE:
const dailyGoal = 20;

// AFTER:
const dailyGoal = await this.getSystemConfigValue<number>("MAX_ADS_PER_DAY", 20);
```

Ensure `MAX_ADS_PER_DAY` is seeded in `bootstrapConfig` (it likely already is — verify the key name matches).

---

### R-09 · Fix PayoutControl.tsx — use Decimal for breakdown display
**Audit refs:** F-07, U-03  
**Effort:** 30 min

Install or import the same `decimal.js` used server-side (or use a lightweight client-side alternative). In `PayoutControl.tsx`:

```typescript
import Decimal from "decimal.js";

const net   = new Decimal(selectedWithdrawal.netAmount  || "0");
const fee   = new Decimal(selectedWithdrawal.fee         || "0");
const gross = net.plus(fee);

// Render:
<span>Rs. {gross.toFixed(2)}</span>
<span>− Rs. {fee.toFixed(2)}</span>
<span>Rs. {net.toFixed(2)}</span>
```

---

### R-10 · Fix `GET /api/stats` — add auth guard and Decimal display
**Audit refs:** F-02  
**Effort:** 20 min

Decide: is this endpoint intentionally public for marketing/SEO purposes? If yes, sanitize what is exposed (hide raw payout totals — return only user count and a rounded headline). If no, add `requireSessionAuth`.

Either way, replace `parseFloat()` with `new Decimal(...).toFixed(2)` for any financial aggregates in the response.

---

### R-11 · Move `broadcastUserUpdated` call out of the `checkAndUpdateRank` transaction
**Audit refs:** F-09  
**Effort:** 45 min

Move the `broadcastUserUpdated` call to after the transaction commits, not inside it:

```typescript
// In checkAndUpdateRank — return a flag from inside the tx:
const { updatedUser, rankChanged, oldRank, newRank } = await db.transaction(async (tx) => {
  // ... all DB writes ...
  return { updatedUser, rankChanged: newRank !== user.rank, oldRank: user.rank, newRank };
});

// After tx commits — safe to broadcast:
if (rankChanged) {
  try {
    const { broadcastUserUpdated } = await import("./realtime");
    broadcastUserUpdated(userId, "rank_updated", { oldRank, newRank });
  } catch (e) {
    logger.error({ err: e }, "Failed to broadcast rank update");
  }
}
return updatedUser;
```

---

### R-12 · Fix admin UserManager.tsx — replace `parseFloat` with safe display
**Audit refs:** F-08  
**Effort:** 20 min

For display-only financial fields in admin tables, use a shared `formatPkr(value: string): string` helper that wraps `new Decimal(value || "0").toFixed(2)` and applies `toLocaleString`. Replace all `parseFloat(user.availableBalance)` and `parseFloat(user.totalEarnings)` calls with this helper.

---

### R-13 · Add Zod to `PATCH /api/admin/users/:userId` (adjust-balance) legacy path
**Audit refs:** E-07 (related)  
**Effort:** 20 min

The legacy `amount` / `type` path in `POST /api/admin/users/:userId/adjust-balance` currently has only a manual reason-length check before routing. Add a Zod schema for the legacy path that validates `amount` as a non-negative decimal string and `type` as `"add" | "subtract"`:

```typescript
const legacySchema = z.object({
  amount:  z.string().regex(/^\d+(\.\d{1,4})?$/, "amount must be a non-negative decimal"),
  type:    z.enum(["add", "subtract"]),
  reason:  z.string().min(5).max(500),
  creditIntent: z.enum(["verified_deposit", "admin_credit"]).optional(),
});
```

---

### R-14 · Fix founder-only routes — replace manual role check with `requirePermission`
**Audit refs:** E-06  
**Effort:** 45 min

Add a `FOUNDER_FINANCIALS` permission (or `VIEW_PROFIT_LEDGER`) to the permission system. Grant it to the `founder` role. Replace the three routes:

```typescript
// BEFORE:
app.get("/api/admin/profit-ledger", requireTeamRole, async (req, res) => {
  if (req.userProfile!.role !== 'founder') return res.status(403)...

// AFTER:
app.get("/api/admin/profit-ledger", requirePermission("VIEW_PROFIT_LEDGER"), async (req, res) => {
  // No manual role check needed
```

Apply the same to `GET /api/admin/founder/profit-summary` and `POST /api/admin/founder/withdrawals`.

---

### R-15 · Fix `GET /api/admin/engine-a/players` — use `requirePermission`
**Audit refs:** F-13  
**Effort:** 15 min

Add an `MANAGE_ENGINE_CONFIG` permission (or reuse an appropriate existing one). Replace `requireTeamRole` on all four engine-A player routes:

```typescript
app.get("/api/admin/engine-a/players",    requirePermission("MANAGE_ENGINE_CONFIG"), ...)
app.post("/api/admin/engine-a/players",   requirePermission("MANAGE_ENGINE_CONFIG"), ...)
app.patch("/api/admin/engine-a/players/:id", requirePermission("MANAGE_ENGINE_CONFIG"), ...)
app.delete("/api/admin/engine-a/players/:id", requirePermission("MANAGE_ENGINE_CONFIG"), ...)
```

---

### R-16 · Fix `getDashboardStats` timezone — use PKT offset for day boundaries
**Audit refs:** E-09  
**Effort:** 1 hr

Replace server-local `new Date()` and `setHours(0,0,0,0)` with explicit UTC+5 arithmetic:

```typescript
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const nowUtc = Date.now();
const nowPkt = new Date(nowUtc + PKT_OFFSET_MS);
// Truncate to midnight PKT:
const todayPkt = new Date(Math.floor(nowPkt.getTime() / 86400000) * 86400000 - PKT_OFFSET_MS);
const tomorrowPkt = new Date(todayPkt.getTime() + 86400000);
```

Alternatively, store all user activity with an explicit timezone tag and perform date-truncation in SQL using `AT TIME ZONE 'Asia/Karachi'`.

---

## Priority 3 — Backlog (Low Risk, Medium Effort)

---

### R-17 · Move AD_INVENTORY to `system_config`
**Audit refs:** F-10  
**Effort:** 2–3 hrs

Create an `AD_INVENTORY_JSON` system_config key (similar to `ENGINE_A_PLAYERS_JSON`). Seed it in `bootstrapConfig`. Expose CRUD admin routes under `/api/admin/engine-a/inventory`. The ad-view handler reads from config at request time (with a short in-memory cache — e.g., 60-second TTL).

---

### R-18 · Fix `bootstrapConfig` N+1 — batch upsert
**Audit refs:** F-06  
**Effort:** 1 hr

Replace the 57-query loop with a single bulk upsert:

```typescript
// Build all defaults as a flat array, then:
await db.insert(systemConfig).values(allDefaults)
  .onConflictDoNothing(); // Only inserts missing keys
```

This reduces cold-start DB round-trips from up to 114 to 1.

---

### R-19 · Harden device fingerprint — server-side generation or secondary signal
**Audit refs:** E-01  
**Effort:** 3–4 hrs

Client-supplied fingerprints provide no real protection. Options (in order of effectiveness):
1. **Server-side IP + User-Agent hash** as a secondary signal alongside the client fingerprint — flag accounts that share IP+UA combos for manual review without hard-blocking.
2. **Require the client to prove its fingerprint** via a challenge-response before registration (computationally expensive to spoof at scale).
3. **Accept the limitation** and document it as a best-effort deterrent rather than a hard control.

At minimum: add server-side logging of IP + User-Agent on registration alongside the fingerprint, so the admin Risk Watchlist can surface multi-account clusters.

---

### R-20 · Stream bulk exports instead of loading into memory
**Audit refs:** E-03  
**Effort:** 2 hrs

Replace the `limit: 10000` pattern with a cursor-based stream:

```typescript
// Use a generator or pipeline to stream CSV rows:
res.setHeader("Content-Type", "text/csv");
res.write(headers.join(",") + "\n");
let offset = 0;
const BATCH = 500;
while (true) {
  const { users: batch } = await storage.getUsersPaginated({ page: 1, limit: BATCH, offset, search });
  if (batch.length === 0) break;
  for (const u of batch) res.write(rowToCSV(u) + "\n");
  offset += BATCH;
}
res.end();
```

---

### R-21 · Fix `processWithdrawal` amount parsing — assert integer
**Audit refs:** F-12  
**Effort:** 15 min

```typescript
// BEFORE:
const pointsRequested = parseInt(withdrawal.amount, 10);

// AFTER:
const pointsRequested = parseInt(withdrawal.amount, 10);
if (isNaN(pointsRequested) || String(pointsRequested) !== withdrawal.amount) {
  throw new Error(`Withdrawal amount is not a valid integer: "${withdrawal.amount}"`);
}
```

This converts a silent truncation risk into a hard, auditable failure.

---

### R-22 · Fix registration dual-validation — remove manual field check
**Audit refs:** E-07  
**Effort:** 15 min

Delete the manual `if (!firstName || !email || !identity || !password)` block from `POST /api/register`. The Zod `registerSchema.safeParse(...)` call immediately below it provides equivalent and stronger validation. Two validators for the same fields will drift.

---

### R-23 · Add per-email rate limit to `/api/contact`
**Audit refs:** E-08  
**Effort:** 30 min

Add a secondary rate limiter keyed on the submitted email address. Use `express-rate-limit` with a custom key generator:

```typescript
const contactEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => req.body?.email?.toLowerCase() ?? req.ip,
  message: { message: "Too many contact attempts from this email. Please try again later." },
});

app.post("/api/contact", contactRateLimiter, contactEmailRateLimiter, async (req, res) => { ... });
```

---

### R-24 · Clarify `DELETE /api/admin/users/:id` semantics
**Audit refs:** E-02  
**Effort:** 30 min

1. Confirm whether `storage.deleteUser()` is a soft-delete (sets `isActive = false`) or a hard-delete (removes the row). Document it clearly in the function's JSDoc.
2. If soft-delete: rename the audit log action to `USER_DEACTIVATED` and update the response message to `"User account deactivated successfully"` (already correct — but the audit log action `USER_DELETED` needs fixing).
3. If hard-delete: cascade-check all FK `onDelete: "restrict"` tables to ensure no orphan references; consider changing to soft-delete to preserve audit history.

---

### R-25 · Paginate `getAllUsers` — replace hard cap with true pagination
**Audit refs:** F-15  
**Effort:** 1 hr

The `getAllUsers(limit=500)` method should be deprecated in favor of the already-existing `getUsersPaginated()`. Audit all callers of `getAllUsers` and replace them with paginated calls or streaming (see R-20). The 500-row hard cap in `getAllUsers` itself should become 50 with a warning log if a caller requests more.

---

### R-26 · Surface guild `isPublic` status in CaptainPortal settings
**Audit refs:** U-07  
**Effort:** 1 hr

In the CaptainPortal guild settings form, add a visible toggle for "Public (discoverable)" / "Private (invite only)" that reads and writes the `isPublic` field. Show a live badge on the guild header indicating current discoverability status.

---

### R-27 · Replace HTTP 410 on reset-password with a user-friendly message
**Audit refs:** U-05  
**Effort:** 10 min

```typescript
app.post("/api/reset-password", authRateLimiter, async (req, res) => {
  res.status(200).json({
    message: "Password reset is handled by our support team. Please contact support@thorx.com with your registered email address.",
    action: "contact_support",
  });
});
```

This removes the confusing HTTP 410 status from any frontend that might reach this endpoint.

---

## Implementation Order (Recommended Sprint Plan)

### Sprint 1 — 1 day
| Task | Finding | Effort |
|------|---------|--------|
| R-01 Fix referral earnings query | F-05, U-02 | 30 min |
| R-02 Password reset — honest stub | E-04, U-01 | 30 min |
| R-03 Remove `parseFloat` at earn boundary | F-01 | 15 min |
| R-04 Add `requireSessionAuth` to rank/history | F-04 | 5 min |
| R-05 Fix ad-view success message | F-03, U-06 | 10 min |
| R-06 Zod on `PATCH /api/admin/withdrawals/:id` | E-05 | 20 min |
| R-07 Zod + permission on weekly-tasks | F-11 | 30 min |
| R-22 Remove duplicate registration validator | E-07 | 15 min |
| R-27 Replace 410 with friendly message | U-05 | 10 min |
| **Total** | | **~2.5 hrs** |

### Sprint 2 — 1–2 days
| Task | Finding | Effort |
|------|---------|--------|
| R-08 `dailyGoal` from systemConfig | F-14, U-04 | 30 min |
| R-09 PayoutControl Decimal display | F-07, U-03 | 30 min |
| R-10 `GET /api/stats` auth + Decimal | F-02 | 20 min |
| R-11 Move broadcast out of rank tx | F-09 | 45 min |
| R-12 Admin table Decimal display | F-08 | 20 min |
| R-13 Legacy adjust-balance Zod | E-06 related | 20 min |
| R-14 Founder routes → `requirePermission` | E-06 | 45 min |
| R-15 Engine-A routes → `requirePermission` | F-13 | 15 min |
| R-16 Dashboard timezone → PKT | E-09 | 1 hr |
| R-21 Assert integer in processWithdrawal | F-12 | 15 min |
| R-23 Contact per-email rate limit | E-08 | 30 min |
| R-24 Clarify delete vs. deactivate | E-02 | 30 min |
| **Total** | | **~6 hrs** |

### Sprint 3 — Backlog
| Task | Finding | Effort |
|------|---------|--------|
| R-17 AD_INVENTORY to systemConfig | F-10 | 3 hrs |
| R-18 `bootstrapConfig` batch upsert | F-06 | 1 hr |
| R-19 Harden device fingerprint | E-01 | 3–4 hrs |
| R-20 Stream bulk exports | E-03 | 2 hrs |
| R-25 Paginate `getAllUsers` | F-15 | 1 hr |
| R-26 Guild isPublic in CaptainPortal | U-07 | 1 hr |
| **Total** | | **~12 hrs** |

---

## Findings With No Code Fix Required

| Finding | Disposition |
|---------|-------------|
| E-04 (Option B — real password reset) | Product decision: adopt transactional email provider and implement full reset flow in a future sprint |
| E-01 (device fingerprint bypass) | Accept as best-effort deterrent; document limitation; enhance with server-side IP clustering (R-19) |
| F-15 (getAllUsers scale) | Monitor; enforce pagination in new callers; revisit at 10K+ users |

---

*End of Remediation Plan*
