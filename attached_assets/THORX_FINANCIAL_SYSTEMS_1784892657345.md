# THORX — Financial & Money Flow Systems
## Complete Technical Reference (Verified Against Real Codebase)

> **Verification Status:** Every detail in this document was verified line-by-line against the live codebase.
> No theoretical assumptions, placeholder values, or audit-report claims were included without direct code confirmation.
> **Last Verified:** 2026-07-24
> **Key Files:** `server/storage.ts` · `server/routes.ts` · `server/modules/thorx-card.ts` · `shared/schema.ts`

---

## Table of Contents

1. [TX-Point / Earnings Ledger System](#11-tx-point--earnings-ledger-system)
2. [Ledger-Based Withdrawal Engine](#12-ledger-based-withdrawal-engine)
3. [Platform Fee Split System](#13-platform-fee-split-system)
4. [Referral Payout Engine](#14-referral-payout-engine)
5. [Balance Management & Race Guards](#15-balance-management--race-guards)
6. [Referral Cash Withdrawal System](#16-referral-cash-withdrawal-system)
7. [Withdrawal Preview Calculator](#17-withdrawal-preview-calculator)
8. [Withdrawal Idempotency Cache](#18-withdrawal-idempotency-cache-in-memory)
9. [Founder Withdrawal Tracker](#19-founder-withdrawal-tracker)
10. [System Flow Diagram](#system-flow-diagram)

---

## 1.1 TX-Point / Earnings Ledger System

### Overview
THORX ka core earning system. Har user action (ad dekhna, task karna, guild task) yahan record hota hai. Yeh ek **dual-layer ledger** hai:
- **Display Layer:** TX-Points — randomized number sirf engagement ke liye
- **Real Layer:** PKR value — immutable, withdrawal ka actual base

### Primary Source
- **Function:** `recordEarnEvent()` — `server/storage.ts` ~line 912
- **DB Tables:** `user_transactions`, `earnings`, `users`
- **Module:** `server/modules/thorx-card.ts` — `drawThorxCard()`

---

### Step-by-Step Flow

#### Step 1 — Function Signature
```typescript
recordEarnEvent({
  userId: string,
  engineType: "Engine_A" | "Engine_B" | "Engine_C" | "Indirect",
  grossPkr: string | number,   // string preferred — Decimal-safe
  sourceId: string,            // ad_view.id or task_record.id
  sourceType: "ad_view" | "weekly_task" | "daily_task",
  guildId?: string,            // required for Engine_C
  tx?: any                     // optional outer transaction
})
```

#### Step 2 — Config Fetch (Parallel)
In saat values `system_config` table se ek saath fetch hoti hain:

| Config Key | Default Value | Description |
|-----------|--------------|-------------|
| `ENGINE_A_THORX_CUT_PCT` | `40` | Engine A mein Thorx ka hissa (%) |
| `ENGINE_B_THORX_CUT_PCT` | `40` | Engine B mein Thorx ka hissa (%) |
| `ENGINE_C_THORX_CUT_PCT` | `20` | Engine C mein Thorx ka hissa (%) |
| `ENGINE_C_GUILD_POOL_PCT` | `35` | Engine C — guild weekly pool (%) |
| `ENGINE_C_USER_CUT_PCT` | `45` | Engine C — user ka hissa (%) |
| `CONVERSION_RATE` | `1000` | TX-Points per Rs.10 (global fallback) |
| `ENGINE_A_PLAYERS_JSON` | `"[]"` | Per-ad-player rate overrides |

#### Step 3 — Conversion Rate Priority Chain
```
1st: Per-ad-player override  (ENGINE_A_PLAYERS_JSON mein match)
2nd: Per-engine key          (ENGINE_A_PKR_TO_POINTS_RATIO, etc.)
3rd: Global CONVERSION_RATE  (ultimate fallback)
```
Per-engine illusion variance bhi is chain se resolve hoti hai (`ENGINE_A_ILLUSION_VARIANCE_PCT`, default `10`).

#### Step 4 — Engine PKR Split (Decimal arithmetic)

| Engine | User milta hai | Thorx milta hai | Guild Pool |
|--------|---------------|-----------------|-----------|
| Engine A (Video Ads) | `grossPkr × 60%` | `grossPkr × 40%` | — |
| Engine B (CPA Tasks) | `grossPkr × 60%` | `grossPkr × 40%` | — |
| Engine C (Guild Tasks) | `grossPkr × 45%` | `grossPkr × 20%` | `grossPkr × 35%` |
| Indirect (Referral) | `0` (PS only) | `0` | — |

> **Note:** `userCut = 100 - thorxCut` for Engine A/B — hardcoded formula, not a separate config key.

#### Step 5 — Thorx Card Draw (`drawThorxCard`)

**Purpose:** `userPkrShare` (real PKR) se display TX-Points calculate karna — engagement ke liye randomized.

```typescript
// server/modules/thorx-card.ts

// Base variance from illusioncVariancePct (default 10):
baseVarianceMin = 1 - (illusioncVariancePct / 100)  // → 0.90
baseVarianceMax = 1 + (illusioncVariancePct / 100)  // → 1.10

// Rank bonus applied in recordEarnEvent (storage.ts) BEFORE calling drawThorxCard:
rankBonus = S-Rank ? 0.10 : A-Rank ? 0.05 : 0
varianceMin = Math.max(0, baseVarianceMin - rankBonus)
varianceMax = baseVarianceMax + rankBonus

// Then drawThorxCard ALSO applies rank bonus internally (double-adjustment):
if (A-Rank): min -= 0.05; max += 0.05
if (S-Rank): min -= 0.10; max += 0.10
```

**Effective variance ranges (actual, post-double-adjustment):**

| Rank | Min Multiplier | Max Multiplier |
|------|---------------|---------------|
| Normal (Nawa Aya → Haji Sab) | **0.90** | **1.10** |
| A-Rank | **0.80** | **1.20** |
| S-Rank | **0.70** | **1.30** |

**Points formula:**
```
targetPoints   = (userPkrShare ÷ 10) × conversionRate
cardVariance   = random float in [min, max]
pointsCredited = floor(targetPoints × cardVariance)
```

**Critical design principle:**
```
realPkrValue = userPkrShare (exact Decimal string — NEVER changes)
pointsCredited = randomized integer (display only — NEVER used for withdrawal)
```

`realPkrValue` is stored as `pkrDecimal.toFixed(4)` — never converted to JS float.

#### Step 6 — Database Transaction (Single Atomic Block)

All writes happen inside one `db.transaction()`:

```
1. INSERT user_transactions:
   - points_credited   (display integer)
   - real_pkr_value    (immutable PKR string, 4dp)
   - gross_pkr         (original gross)
   - thorx_profit_pkr  (Thorx's cut)
   - guild_pool_pkr    (Engine C only)
   - source_id / source_type  (idempotency keys)
   - withdrawn = false
   - engine_type, conversion_rate, card_variance

2. INSERT earnings (secondary reference row)

3. UPDATE users:
   - txPointsBalance   += pointsCredited   (integer SQL increment)
   - totalEarnings     += userPkrShare     (Decimal string)
   - availableBalance  += userPkrShare     (Decimal string)

4. Engine C only:
   - UPDATE guilds.currentWeeklyPoints += grossPkr × 100
   - UPDATE guild_members.weeklyPointsContributed += pointsCredited

5. PS award (awardTaskPS) — not for Indirect
6. Streak update (processStreak)
7. Rank tier check (checkAndUpdateRankTier)
```

#### Step 7 — Duplicate Protection

```sql
-- Partial unique index (manual ALTER TABLE — not applied by drizzle-kit push alone):
CREATE UNIQUE INDEX uniq_user_transactions_source
ON user_transactions (source_id, source_type)
WHERE source_id IS NOT NULL;
```

Duplicate sourceId+sourceType → Postgres `23505` error → caught and re-thrown as friendly message.

#### Step 8 — Live Feed Event
Transaction commit ke baad (not inside), `emitFeedEvent()` call hoti hai:
```
"User 'THORX_JD_AGENT_1234' – Engine_A | Real: Rs.6.00 | Points: 620 | Thorx: Rs.4.00"
```

### User Experience
- Thorx Card screen par animated point reveal dikhta hai
- `availableBalance` aur `txPointsBalance` dono immediately update
- Live feed mein activity dikhti hai

---

## 1.2 Ledger-Based Withdrawal Engine

### Overview
User ki earning nikalne ka system. **Core principle:** withdrawal math KABHI points × conversion_rate se nahi hoti — hamesha `user_transactions.real_pkr_value` (immutable historical values) ka FIFO sum use hota hai.

### Primary Source
- `createWithdrawal()` — `server/storage.ts` ~line 2107
- `calculateWithdrawalBreakdown()` — `server/storage.ts` ~line 1922 (private)
- `processWithdrawal()` — `server/storage.ts` ~line 2210
- `rejectWithdrawal()` — `server/storage.ts` ~line 2376
- **Route:** `POST /api/withdrawals` — `server/routes.ts` ~line 1022

---

### PHASE 1: Request — `createWithdrawal()`

**Trigger:** User "Withdraw" button dabata hai.

```
Input: amount (TX-Points), method, accountName, accountNumber, accountDetails
```

**Step 1 — Amount sanitize:**
```typescript
const pointsRequested = new Decimal(amount)
  .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
  .toNumber();
// NaN, Infinity, ≤0 → reject
```

**Step 2 — Single DB transaction starts + User row LOCK:**
```sql
SELECT userRankTier FROM users WHERE id = userId FOR UPDATE
```
Concurrent requests yahan block ho jaati hain jab tak transaction complete na ho.

**Step 3 — `calculateWithdrawalBreakdown()` (private, inside same tx):**

1. FIFO scan:
   ```sql
   SELECT id, pointsCredited, realPkrValue, grossPkr, thorxProfitPkr,
          guildPoolPkr, conversionRate, cardVariance, engineType
   FROM user_transactions
   WHERE userId = ? AND withdrawn = false
   ORDER BY createdAt ASC
   LIMIT 5000
   ```

2. Rows iterate karo jab tak `pointsAccumulated >= pointsRequested`:
   - **Normal row:** Full `realPkrValue` add karo
   - **Last partial row:**
     ```
     fraction   = pointsStillNeeded ÷ row.pointsCredited
     pkrUsed    = row.realPkrValue × fraction
     pkrRemain  = row.realPkrValue - pkrUsed
     ```
     `partialLastRow` descriptor return hota hai — `processWithdrawal` isko `split_remainder` row mein materialize karta hai.

3. **Zero-value fallback chain** (legacy data):
   - `realPkrValue > 0` → use directly ✅
   - `grossPkr > 0` → apply engine-specific user-cut %
   - `conversionRate > 0` → derive from `points ÷ rate × 60%`

4. Fee computation:
   ```
   feeRate           = WITHDRAWAL_FEE_PCT ÷ 100          (default 0.15)
   platformFee       = exactPkr × feeRate
   referralCommission = platformFee × REFERRAL_FEE_SHARE_PCT÷100  (if referrer exists, default 0.50)
   userNetPkr        = exactPkr - platformFee
   ```

**Step 4 — Minimum payout check:**
```
exactPkr >= MIN_PAYOUT (default Rs. 100)
```

**Step 5 — S-Rank fast-track:**
```typescript
const initialStatus = lockedUser.userRankTier === 'S-Rank' ? 'approved' : 'pending';
```

**Step 6 — Duplicate pending check:**
```sql
SELECT id FROM withdrawals WHERE userId = ? AND status = 'pending' LIMIT 1
```

**Step 7 — INSERT withdrawals row:**
```
amount:    pointsRequested (string)
fee:       platformFee (2dp)
netAmount: userNetPkr (2dp)
status:    'pending' or 'approved' (S-Rank)
```

> **Important:** `createWithdrawal` does NOT debit any balance. Balance debit sirf `processWithdrawal` mein hoti hai.

---

### PHASE 2: Approval — `processWithdrawal()`

**Trigger:** Admin "Approve" click.

**Step 1 — Withdrawal row LOCK:**
```sql
SELECT ... FROM withdrawals WHERE id = ? FOR UPDATE
```

**Step 2 — Fresh breakdown compute:**
`calculateWithdrawalBreakdown()` dobara call hoti hai (approval time par fresh data) — Phase 1 ki values use nahi hoti.

**Step 3 — FIFO mark + split_remainder:**
- Consumed rows: `withdrawn = true`
- Partial last row: pehle `split_remainder` row insert (leftover PKR preserve karne ke liye), phir original `withdrawn = true`

**Step 4 — Balance debit (Decimal, atomically):**
```sql
UPDATE users SET
  txPointsBalance  = txPointsBalance  - pointsRequested,
  availableBalance = availableBalance - userNetPkrD,
  totalWithdrawn   = totalWithdrawn   + userNetPkrD
WHERE id = userId
```

**Step 5 — Referral commission (if referrer):**
```sql
UPDATE users SET balanceCashPkr = balanceCashPkr + referralCommission
WHERE id = referrerId
```
+ `referral_commissions` row insert.

**Step 6 — Finalize:**
```
withdrawals.status      = 'completed'
withdrawals.processedAt = now()
withdrawals.transactionId = provided string (optional)
withdrawals.thorxFeeShare = thorxShareD
withdrawals.referralCommissionPaid = referralCommissionD
```

**Step 7 — Post-commit:**
- Audit log insert
- User notification ("Payout Processed — Rs.X sent")
- Live feed event

---

### Rejection — `rejectWithdrawal()`

- Withdrawal row `FOR UPDATE` lock
- `status = 'rejected'`
- **No balance refund** (nothing was debited at request time)
- Audit log + notification

---

## 1.3 Platform Fee Split System

### Overview
Har approved withdrawal par automatic 3-way split. Koi alag function nahi — `processWithdrawal()` ke andar embedded.

### Formula
```
grossWithdrawal (exactPkr)
  ├─ platformFee          = exactPkr × WITHDRAWAL_FEE_PCT÷100     (default 15%)
  │    ├─ referralCut     = platformFee × REFERRAL_FEE_SHARE_PCT÷100  (default 50%)
  │    │                  = exactPkr × 7.5%  [only if referrer exists]
  │    └─ thorxProfit     = platformFee - referralCut
  └─ userReceives         = exactPkr - platformFee                 (85%)
```

### Concrete Example — Rs. 1,000 Withdrawal (with referrer)
| Component | Amount |
|-----------|--------|
| User receives (`netAmount`) | **Rs. 850.00** |
| Platform fee total | Rs. 150.00 |
| → Referrer gets (`referralCommissionPaid`) | Rs. 75.00 |
| → Thorx keeps (`thorxFeeShare`) | Rs. 75.00 |

### Persistence
All three values persist on the `withdrawals` row:
```
withdrawals.fee                    = platformFee (total)
withdrawals.thorx_fee_share        = thorxProfit
withdrawals.referral_commission_paid = referralCut
```

### Fee Configuration
Both rates are configurable via `system_config`:
- `WITHDRAWAL_FEE_PCT` (default: `15`) — total platform fee %
- `REFERRAL_FEE_SHARE_PCT` (default: `50`) — portion of platform fee carved to referrer

Exact rates at time of processing are stored in `referral_commissions.feeRateUsed` and `referral_commissions.refShareRateUsed` for permanent audit trail.

### Aggregation
`thorxFeeShare` values are aggregated by:
- `getFounderProfitSummary()` → `totalProfitEarned = SUM(withdrawals.fee WHERE status='completed')`
- `getProfitLedger()` → 30-day chart + engine cut breakdowns

---

## 1.4 Referral Payout Engine

### Overview
Single-tier (L1 only) passive commission system. Referrer ko uske referral ki har approved withdrawal par platform fee ka hissa milta hai.

### Primary Source
- Embedded in `processWithdrawal()` — `server/storage.ts` ~line 2321
- **DB Tables:** `referral_commissions`, `users` (`balanceCashPkr`, `referredBy`)

### Trigger
`processWithdrawal()` ke andar, sirf approval time par. Earn time par kuch nahi hota.

### Formula
```
referralCommission = exactPkr × 0.15 × 0.50
                   = exactPkr × 0.075
                   = 7.5% of gross withdrawal amount
```

### Credit Path
```sql
UPDATE users
SET balance_cash_pkr = balance_cash_pkr + referralCommission
WHERE id = referrerId
-- Note: balanceCashPkr — NEVER txPointsBalance
```

### Record
`referral_commissions` table mein ek permanent row:
```
referrerId          → who gets paid
inviteeId           → whose withdrawal triggered this
withdrawalId        → which withdrawal
commissionAmountPkr → exact Rs amount
inviteeNetPkr       → what invitee received
platformFeePkr      → total fee that was charged
feeRateUsed         → exact rate at time of payment (e.g. "0.1500")
refShareRateUsed    → exact share at time of payment (e.g. "0.5000")
```

### L2 Status
`commission_logs` table schema mein exist karti hai aur `createCommissionLog()` function bhi hai, lekin yeh function **kisi bhi active route ya module se call nahi hota**. `processWithdrawal()` explicitly isey skip karta hai:
```typescript
// Note: commission_logs is frozen/deprecated (Appendix A #4) — do not write to it.
```
Sirf L1 (`referral_commissions`) active hai.

### Referrer Lookup
`user.referredBy` field — agar null toh referralCommission = 0 aur poori platformFee `thorxFeeShare` ban jaati hai.

---

## 1.5 Balance Management & Race Guards

### Overview
Financial integrity system — concurrent requests se double-spending, overdraft, ya duplicate records ko rokta hai.

### Two-Wallet Model

| Field | DB Column | Type | Purpose |
|-------|-----------|------|---------|
| TX-Points Balance | `tx_points_balance` | `INTEGER` | Display gamification counter |
| Available Balance | `available_balance` | `DECIMAL(10,2)` | Real PKR — withdrawal base |
| Cash PKR Balance | `balance_cash_pkr` | `DECIMAL(10,2)` | Referral commissions wallet |
| Total Earnings | `total_earnings` | `DECIMAL(10,2)` | Lifetime cumulative (never decremented) |
| Total Withdrawn | `total_withdrawn` | `DECIMAL(10,2)` | Lifetime withdrawn sum |
| Pending Balance | `pending_balance` | `DECIMAL(10,2)` | Reserved (schema only) |

### Race Guard Layers

**Layer 1 — FOR UPDATE Row Locks**
Applied at:
```
createWithdrawal    → users row lock
processWithdrawal   → withdrawals row lock
rejectWithdrawal    → withdrawals row lock
createFounderWithdrawal → users row lock
createReferralCashWithdrawal → users row lock
createUser (referral path) → referrer users row lock
adjustUserBalance   → users row lock
```

**Layer 2 — DB Unique Index: One Pending Per User**
```sql
-- uniq_withdrawals_one_pending_per_user
-- (partial index on userId WHERE status = 'pending')
```
Main withdrawal ke liye. Postgres-level guarantee — duplicate pending insert → `23505` error.

**Layer 3 — pg_advisory_xact_lock on Ad-View**
```typescript
// server/routes.ts ~line 1658
await tx.execute(
  sql`SELECT pg_advisory_xact_lock(hashtext(${thorxPid})::bigint)`
);
```
Ad view endpoint par — concurrent ad clicks se duplicate ad_view rows nahi banenge.

**Layer 4 — Source Idempotency Index**
```sql
UNIQUE INDEX uniq_user_transactions_source
ON user_transactions (source_id, source_type)
WHERE source_id IS NOT NULL
```
Same earn event (ad_view ya task) dobara record nahi ho sakta.

**Layer 5 — Decimal.js — No IEEE-754 Float**
Tamam PKR arithmetic `decimal.js` se hoti hai. DB boundary par strings. `toNumber()` financial values par kabhi use nahi hota.

---

## 1.6 Referral Cash Withdrawal System

### Overview
`balanceCashPkr` (referral commission wallet) se paise nikalne ka dedicated path — main TX-Point withdrawal se bilkul alag system.

### Primary Source
- **Route:** `POST /api/withdrawals/referral` — `server/routes.ts` ~line 4831
- **Storage:** `createReferralCashWithdrawal()` — `server/storage.ts` ~line 5080
- **Balance check:** `GET /api/user/referral-balance` — `server/routes.ts` ~line 4820

### Endpoint Details

```
POST /api/withdrawals/referral
Auth: requireSessionAuth + withdrawalRateLimiter + CSRF
```

**Input (Zod validated):**
```typescript
{
  amount:         z.number().finite().min(50),   // Minimum Rs. 50
  method:         z.string().min(1).max(100),
  accountName:    z.string().min(1).max(200),
  accountNumber:  z.string().min(1).max(100),
  accountDetails: z.record(z.unknown()).optional(),
}
```

### Implementation Flow

**Step 1 — FOR UPDATE user lock:**
```sql
SELECT * FROM users WHERE id = userId FOR UPDATE
```

**Step 2 — Balance check:**
```
balanceCashPkr >= amount   → proceed
balanceCashPkr < amount    → "Insufficient referral balance. Available: Rs.X"
```

**Step 3 — Pending check (method-scoped):**
```sql
SELECT id FROM withdrawals
WHERE userId = ? AND status = 'pending' AND method = 'referral:{method}'
LIMIT 1
```
> **Key difference:** Check is `method`-scoped — user CAN have a pending main TX-Point withdrawal AND a pending referral withdrawal simultaneously. They don't block each other.

**Step 4 — Immediate balance debit:**
```sql
UPDATE users SET balance_cash_pkr = balance_cash_pkr - amount
```
> **Key difference:** Main withdrawal mein balance debit nahi hoti jab tak approval na ho. Referral withdrawal mein **immediately** debit hoti hai at request time.

**Step 5 — INSERT withdrawals row:**
```typescript
{
  method:    `referral:${method}`,   // prefixed to distinguish from main withdrawals
  fee:       "0.00",                 // NO platform fee — Spec E.9 explicit
  netAmount: amount.toFixed(2),      // user receives 100% of requested amount
  status:    "pending",
}
```

### Key Differences from Main Withdrawal

| Feature | Main Withdrawal | Referral Withdrawal |
|---------|----------------|---------------------|
| Source wallet | `txPointsBalance` | `balanceCashPkr` |
| Minimum amount | Rs. 100 | **Rs. 50** |
| Platform fee | 15% | **0% (zero)** |
| FIFO scan needed | Haan | Nahi |
| Balance debit timing | At approval | **At request** |
| Pending check scope | userId only | userId + method |
| Idempotency key | Haan | Nahi (rate limiter sufficient) |
| Method stored as | plain method | `referral:{method}` |

---

## 1.7 Withdrawal Preview Calculator

### Overview
User withdrawal submit karne se pehle exact fee breakdown dikhne ka read-only endpoint. Koi state mutation nahi — sirf calculation aur return.

### Primary Source
- **Route:** `GET /api/withdrawals/preview` — `server/routes.ts` ~line 4806
- **Storage:** `previewWithdrawal()` — `server/storage.ts` ~line 5044

### Endpoint Details

```
GET /api/withdrawals/preview?points=N
Auth: requireSessionAuth only (no rate limiter — read-only)
```

**Input:** `points` query parameter — positive integer (parsed with `parseInt`)

### Implementation

```typescript
async previewWithdrawal(userId: string, points: number) {
  // Calls the EXACT same FIFO function used in real withdrawal
  const breakdown = await this.calculateWithdrawalBreakdown(userId, points);
  const feePercent = await this.getSystemConfigValue("WITHDRAWAL_FEE_PCT", 15);
  const user = await this.getUserById(userId);
  return { ... };
}
```

`calculateWithdrawalBreakdown()` wahi function hai jo `createWithdrawal` aur `processWithdrawal` use karte hain — lekin yahan koi write nahi hoti.

### Actual Response Shape

```typescript
{
  exactPkr:           string,   // FIFO se nikala total PKR (4dp string)
  platformFee:        string,   // exactPkr × 15% (4dp string)
  feePercent:         number,   // e.g. 15 (from system_config)
  referralCommission: string,   // platformFee × 50% if referrer exists (4dp)
  referrerName:       string | null,  // referrer ki identity string
  userNetPkr:         string,   // exactPkr - platformFee (4dp string)
  sRankFastTrack:     boolean,  // true → withdrawal will auto-approve
}
```

### UI Behavior
Client is response ko withdrawal modal mein dikhata hai before submit. `sRankFastTrack: true` hone par user ko pata chalta hai ke admin approval nahi chahiye — instant payout hoga.

---

## 1.8 Withdrawal Idempotency Cache (In-Memory)

### Overview
In-memory deduplication layer jo rapid/retried withdrawal requests ko DB tak pahunchne se rokta hai. Belt-and-suspenders — DB unique index primary guard hai, yeh secondary hai.

### Primary Source
- `server/routes.ts` lines 28–39 (Map + cleanup interval)
- `server/routes.ts` lines 1029–1064 (request handling)

### Implementation

```typescript
// Initialization (module level):
const _withdrawalIdempCache = new Map<string, {
  status:    number,
  body:      unknown,
  expiresAt: number,
}>();

// Cleanup — every 30 seconds:
setInterval(() => {
  const now = Date.now();
  _withdrawalIdempCache.forEach((v, k) => {
    if (v.expiresAt < now) _withdrawalIdempCache.delete(k);
  });
}, 30_000).unref();
```

### Request Flow

**On every `POST /api/withdrawals`:**

```
1. Client X-Idempotency-Key header check karo
2. Cache key = `${userId}:${idempotencyKey}`
3. Cache lookup:
   HIT  (expiresAt > now) → cached response return, DB ko skip karo
   MISS → request process karo
4. Successful response (201) ke baad cache mein save karo:
   expiresAt = Date.now() + 60_000  (60 seconds)
```

**Client behavior:**
- Naya withdrawal attempt → fresh UUID generate karo
- Same attempt retry (network timeout etc.) → same UUID bhejo
- Response same milta hai, duplicate withdrawal nahi banti

### Properties

| Property | Value |
|----------|-------|
| Storage | In-memory `Map` (no DB) |
| TTL | 60 seconds |
| Cleanup interval | 30 seconds |
| Cache key | `userId:idempotencyKey` |
| Header name | `x-idempotency-key` (lowercase) |
| Scope | Single process (sufficient for Replit) |
| Persistence | Server restart par lost — DB index durable guard hai |

### Defense in Depth

| Layer | Type | Scope |
|-------|------|-------|
| `_withdrawalIdempCache` | In-memory Map | 60s window, same process |
| `uniq_withdrawals_one_pending_per_user` | DB partial unique index | Permanent, all processes |
| `FOR UPDATE` user lock | DB row lock | Per-transaction |

---

## 1.9 Founder Withdrawal Tracker

### Overview
Platform profit extraction tracking ka alag dedicated system. Jab Thorx accumulated fee revenue bahar nikalta hai, woh `founder_withdrawals` table mein log hoti hai — user `withdrawals` table se completely alag.

### Primary Source
- **Schema:** `shared/schema.ts` ~line 974 — `founderWithdrawals`
- **Storage:** `createFounderWithdrawal()`, `getFounderWithdrawals()`, `getFounderProfitSummary()` — `server/storage.ts` ~lines 3801–3862
- **Routes:** `server/routes.ts` ~lines 2439–2490

### Database Schema

```typescript
// shared/schema.ts ~line 974
export const founderWithdrawals = pgTable("founder_withdrawals", {
  id:             uuid (primary key, auto-generated),
  amount:         decimal(12, 2).notNull(),   // kitna nikala
  withdrawalDate: timestamp.notNull(),         // actual extraction date
  description:    text,                        // optional note
  createdBy:      uuid → users.id,            // founder ka user ID
  createdAt:      timestamp (auto),
});
// Indexes:
// founder_withdrawals_created_at_idx
// founder_withdrawals_created_by_idx
```

### Endpoints

**Log a founder withdrawal:**
```
POST /api/admin/founder/withdrawals
Auth: requirePermission("VIEW_PROFIT_LEDGER") + withdrawalRateLimiter + CSRF
```

Input (Zod validated):
```typescript
{
  amount:         z.string().regex(/^\d+(\.\d{1,4})?$/),  // decimal string
  withdrawalDate: z.string().datetime(),                   // ISO 8601
  description:    z.string().max(500).optional(),
}
```

**View founder withdrawals:**
```
GET /api/admin/founder/withdrawals
Auth: requireTeamRole + role === 'founder' (founder only — extra role check)
```

**View profit summary:**
```
GET /api/admin/founder/profit-summary
Auth: requirePermission("VIEW_PROFIT_LEDGER")
```

### `createFounderWithdrawal()` — Race Protection

```typescript
return await db.transaction(async (tx) => {
  // FOR UPDATE lock on creator's user row — prevents duplicate accounting rows
  await tx.execute(sql`SELECT id FROM users WHERE id = ${createdBy} FOR UPDATE`);
  const [fw] = await tx.insert(founderWithdrawals).values({ ... }).returning();
  return fw;
});
```

### `getFounderProfitSummary()` — Complete Return Shape

```typescript
{
  totalProfitEarned:       string,   // SUM(withdrawals.fee) WHERE status='completed'
  thisMonthProfitEarned:   string,   // same, this calendar month only
  totalWithdrawnToPersonal:string,   // SUM(founder_withdrawals.amount) all time
  thisMonthWithdrawn:      string,   // same, this calendar month only
  safeToWithdrawNow:       string,   // totalProfitEarned - totalWithdrawnToPersonal (floor 0)
  monthlyBalance:          string,   // thisMonthProfit - thisMonthWithdrawn
  isOverWithdrawn:         boolean,  // true if safeD.isNegative()
  overWithdrawnAmount:     string,   // abs value if over-withdrawn
  currentFeeRate:          string,   // current WITHDRAWAL_FEE_PCT as string
  lastWithdrawalDate:      string | null,  // ISO string of last withdrawal's date
  daysSinceLastWithdrawal: number | null,
}
```

**`safeToWithdrawNow` formula:**
```
safeToWithdrawNow = SUM(withdrawals.fee WHERE status='completed')
                  - SUM(founder_withdrawals.amount)
// Clamped at "0.00" if negative (isOverWithdrawn = true)
```

> **Status note:** `processWithdrawal()` sets `status = 'completed'` (not `'processed'`). The `totalProfitEarned` query explicitly uses `'completed'` — a previous bug used `'processed'` which always returned zero.

### Integration Points

| System | How it uses founder_withdrawals |
|--------|--------------------------------|
| Health Engine (`health-engine.ts`) | Reads `SUM(founderWithdrawals.amount)` for financial health dimension score |
| Profit Ledger (`getProfitLedger`) | Includes engine cuts + withdrawal fee revenue + 30-day chart |
| Admin Dashboard | Founder reconciliation panel — safe-to-withdraw display |

---

## System Flow Diagram

```
═══════════════════════════════════════════════════════════════════
  USER EARNS (System 1.1)
═══════════════════════════════════════════════════════════════════

  Ad view / Task complete
         │
         ▼
  recordEarnEvent()
  ├─ Config fetch (parallel): engine cuts, conversion rate, variance
  ├─ PKR split by engine:
  │    Engine A/B → user 60% | Thorx 40%
  │    Engine C   → user 45% | Thorx 20% | Guild 35%
  │    Indirect   → 0 PKR (PS only)
  ├─ drawThorxCard() → randomized pointsCredited (display only)
  └─ db.transaction():
       ├─ INSERT user_transactions (real_pkr_value = immutable)
       ├─ INSERT earnings
       ├─ UPDATE users (txPointsBalance++, availableBalance++, totalEarnings++)
       ├─ [Engine C] UPDATE guilds + guild_members
       ├─ awardTaskPS() + processStreak() + checkAndUpdateRankTier()
       └─ [post-commit] emitFeedEvent()

═══════════════════════════════════════════════════════════════════
  USER WITHDRAWS (Systems 1.2 + 1.3 + 1.4)
═══════════════════════════════════════════════════════════════════

  User submits withdrawal
         │
         ▼ (System 1.8)
  Idempotency Cache check (x-idempotency-key header)
  HIT → return cached 201   |   MISS → continue
         │
         ▼ (System 1.7 — preview before submit)
  GET /api/withdrawals/preview?points=N
  └─ calculateWithdrawalBreakdown() [read-only]
     Returns: exactPkr, platformFee, feePercent,
              referralCommission, referrerName,
              userNetPkr, sRankFastTrack
         │
         ▼
  POST /api/withdrawals → createWithdrawal()
  ├─ db.transaction():
  │    ├─ SELECT users FOR UPDATE
  │    ├─ calculateWithdrawalBreakdown() [FIFO scan, LIMIT 5000]
  │    ├─ Check: exactPkr >= MIN_PAYOUT (Rs. 100)
  │    ├─ Check: no existing pending withdrawal
  │    ├─ S-Rank? → status='approved' else 'pending'
  │    └─ INSERT withdrawals (fee + netAmount pre-computed)
  └─ Cache idempotency response (60s TTL)
         │
         ▼ (admin approval)
  processWithdrawal() → (System 1.2 Phase 2)
  ├─ SELECT withdrawals FOR UPDATE
  ├─ calculateWithdrawalBreakdown() [fresh recompute]
  ├─ FIFO: mark user_transactions withdrawn=true
  ├─ Partial last row → INSERT split_remainder row
  │
  ├─ UPDATE users (System 1.5 balance debit)
  │    txPointsBalance  -= pointsRequested
  │    availableBalance -= userNetPkr
  │    totalWithdrawn   += userNetPkr
  │
  ├─ System 1.3 — Fee split persisted:
  │    withdrawals.fee                     = platformFee (15%)
  │    withdrawals.thorx_fee_share         = thorxProfit
  │    withdrawals.referral_commission_paid = referralCut
  │
  ├─ System 1.4 — Referral payout (if referrer exists):
  │    UPDATE users.balanceCashPkr += referralCommission (7.5%)
  │    INSERT referral_commissions row
  │
  └─ Audit log + notification + live feed

═══════════════════════════════════════════════════════════════════
  REFERRER EARNS PASSIVELY (System 1.4)
═══════════════════════════════════════════════════════════════════

  Referral's withdrawal approved
         │
         ▼
  balanceCashPkr += withdrawal.exactPkr × 7.5%
  referral_commissions row inserted
         │
         ▼ (System 1.6 — referrer withdraws their commission)
  POST /api/withdrawals/referral
  ├─ SELECT users FOR UPDATE
  ├─ Check: balanceCashPkr >= amount (min Rs. 50)
  ├─ Check: no pending referral:{method} withdrawal
  ├─ IMMEDIATE debit: balanceCashPkr -= amount
  └─ INSERT withdrawals:
       method    = 'referral:{method}'
       fee       = "0.00"    ← zero fee
       netAmount = amount    ← 100% to user

═══════════════════════════════════════════════════════════════════
  THORX EXTRACTS PLATFORM PROFIT (System 1.9)
═══════════════════════════════════════════════════════════════════

  Founder logs profit extraction
         │
         ▼
  POST /api/admin/founder/withdrawals
  └─ createFounderWithdrawal()
       ├─ SELECT users FOR UPDATE (founder row)
       └─ INSERT founder_withdrawals (amount, date, description)

  Profit calculation (getFounderProfitSummary):
  safeToWithdrawNow = SUM(withdrawals.fee WHERE status='completed')
                    - SUM(founder_withdrawals.amount)
```

---

## Configuration Reference (system_config defaults)

| Key | Default | Used By |
|-----|---------|---------|
| `ENGINE_A_THORX_CUT_PCT` | `40` | recordEarnEvent |
| `ENGINE_B_THORX_CUT_PCT` | `40` | recordEarnEvent |
| `ENGINE_C_THORX_CUT_PCT` | `20` | recordEarnEvent |
| `ENGINE_C_GUILD_POOL_PCT` | `35` | recordEarnEvent |
| `ENGINE_C_USER_CUT_PCT` | `45` | recordEarnEvent |
| `CONVERSION_RATE` | `1000` | recordEarnEvent (global fallback) |
| `ENGINE_A_ILLUSION_VARIANCE_PCT` | `10` | recordEarnEvent → drawThorxCard |
| `A_RANK_CARD_BONUS_PCT` | `5` | recordEarnEvent + drawThorxCard (both) |
| `S_RANK_CARD_BONUS_PCT` | `10` | recordEarnEvent + drawThorxCard (both) |
| `MIN_PAYOUT` | `100` | createWithdrawal |
| `WITHDRAWAL_FEE_PCT` | `15` | calculateWithdrawalBreakdown, previewWithdrawal |
| `REFERRAL_FEE_SHARE_PCT` | `50` | calculateWithdrawalBreakdown |

---

*Document generated from direct codebase investigation — 2026-07-24*
*Verified files: `server/storage.ts` (5,456 lines) · `server/routes.ts` (5,016 lines) · `server/modules/thorx-card.ts` · `shared/schema.ts`*
