# THORX — Financial & Money Flow Systems
## Complete Technical Deep-Dive (Roman Urdu)
**Date:** 2026-07-23 | **Source:** Live Codebase Inspection — Zero Assumptions

---

> **Methodology:** Yeh document sirf actual codebase se likha gaya hai.  
> Har claim ke sath exact file path, function name, DB table/column, aur mathematical formula diya gaya hai.

---

## 1.1 TX-Point / Earnings Ledger System

### Code Location
| File | Key Function | DB Tables |
|------|-------------|-----------|
| `server/storage.ts` | `recordEarnEvent` (~line 912) | `user_transactions`, `earnings`, `users` |
| `server/modules/thorx-card.ts` | `drawThorxCard()` | — |
| `shared/schema.ts` | Schema definitions | `user_transactions`, `users` |

---

### Practical Logic & Mathematical Formulas

THORX ek **dual-layer ledger** use karta hai:

- **Layer 1 — TX-Points:** Sirf display ke liye. Gamified number jo user screen pe dekhta hai.
- **Layer 2 — Real PKR:** Immutable decimal value jo actual withdrawal basis hai.

**`recordEarnEvent` ka parameter set:**
```
{ userId, grossPkr, engineType, sourceId, sourceType }
```

**Engine-wise PKR split:**
```
Engine A (Ad View):        userPkrShare = grossPkr × 0.60   (40% Thorx cut)
Engine B (Task):           userPkrShare = grossPkr × 0.60   (40% Thorx cut)
Engine C (Guild Task):     userPkrShare = grossPkr × 0.45   (55% Thorx cut)
Engine Indirect (Referral): userPkrShare = 0  (commission-on-withdrawal model)
```

**TX-Point conversion formula (via `drawThorxCard`):**
```
conversionRate  = system_config["CONVERSION_RATE"]  (default: 100)
targetPoints    = (userPkrShare / 10) × conversionRate
cardVariance    = rank-based random multiplier (±variance)
pointsCredited  = targetPoints × cardVariance
```

Matlab: agar `userPkrShare = 0.012 PKR` aur `conversionRate = 100`:
```
targetPoints = (0.012 / 10) × 100 = 0.12 → rounded per rank
```

---

### Safety & Concurrency Mechanisms

1. **Unique Index — Idempotency:**  
   `uniq_user_transactions_source` — partial unique index on `(source_id, source_type)`.  
   Iska matlab ek hi ad view ya task completion dobara credit nahi ho sakti, chahe retry ho.

2. **`db.transaction()` wrapper:**  
   Poora earn event ek single atomic transaction me:
   - `INSERT INTO user_transactions`
   - `INSERT INTO earnings`
   - `UPDATE users SET txPointsBalance += ..., totalEarnings += ...`  
   Teen operations — sab committed hotay hain ya sab rollback.

3. **Decimal.js precision:**  
   `realPkrValue` kabhi bhi JavaScript floating-point se calculate nahi hoti.  
   `new Decimal(grossPkr).times("0.60")` — string boundary pe `.toFixed(4)` se DB me store.

---

### Complete End-to-End Flow

```
Client (ad view / task complete)
    ↓
POST /api/ad-view  OR  POST /api/task-verify
    ↓
Middleware: requireSessionAuth → CSRF check → rate limiter
    ↓
server/routes.ts: grossPkr determine karo (systemConfig se)
    ↓
storage.recordEarnEvent({ userId, grossPkr, engineType, sourceId, sourceType })
    ↓
├── 1. userPkrShare = grossPkr × engine_pct
├── 2. drawThorxCard(userPkrShare, rank) → { pointsCredited, realPkrValue }
└── 3. db.transaction():
        INSERT user_transactions (points_credited, real_pkr_value, withdrawn=false)
        INSERT earnings (reference row)
        UPDATE users SET txPointsBalance += pointsCredited,
                         totalEarnings   += realPkrValue
    ↓
Response: { pointsCredited, realPkrValue, txRow }
    ↓
WebSocket broadcast → client query invalidation
```

---

## 1.2 Ledger-Based Withdrawal Engine

### Code Location
| File | Key Functions | DB Tables |
|------|-------------|-----------|
| `server/storage.ts` | `createWithdrawal` (~line 2102), `processWithdrawal` (~line 2205), `calculateWithdrawalBreakdown` (~line 1917) | `withdrawals`, `user_transactions`, `users`, `referral_commissions` |
| `server/routes.ts` | `POST /api/withdrawals` (~line 1022), `PATCH /api/admin/withdrawals/:id` (~line 2680) | — |
| `shared/schema.ts` | `withdrawals` table | — |

---

### Practical Logic & Mathematical Formulas

**Request Phase — `createWithdrawal`:**
```
1. SELECT users FOR UPDATE  (row-level lock — race guard)
2. Validate: amount >= MIN_PAYOUT (Rs. 100)
3. Validate: amount <= users.availableBalance
4. Check: koi aur withdrawal "pending" nahi (uniq_withdrawals_one_pending_per_user)
5. calculateWithdrawalBreakdown(userId, amount) → FIFO scan
6. INSERT INTO withdrawals (status = 'pending')
```

**FIFO Scan logic — `calculateWithdrawalBreakdown`:**
```sql
SELECT * FROM user_transactions
WHERE user_id = $1 AND withdrawn = false
ORDER BY created_at ASC
```
Rows consume karo jab tak `amount` pura na ho. Agar last row partially consume ho:
- Partial row ka `split_remainder` descriptor generate hota hai
- `processWithdrawal` baad me actual split insert karta hai

**Fee breakdown formulas:**
```
platformFee       = grossWithdrawal × WITHDRAWAL_FEE_PCT  (default 0.15 = 15%)
referralCommission = platformFee × REFERRAL_FEE_SHARE_PCT (default 0.50 = 50%)
thorxFeeShare     = platformFee − referralCommission
userNetPkr        = grossWithdrawal − platformFee
```

**Example — Rs. 1000 withdrawal, referrer exist:**
```
platformFee       = 1000 × 0.15 = Rs. 150
referralCommission = 150 × 0.50 = Rs. 75  → referrer ka balanceCashPkr
thorxFeeShare     = 150 − 75   = Rs. 75   → Thorx profit
userNetPkr        = 1000 − 150  = Rs. 850  → user actual payta hai
```

**Approval Phase — `processWithdrawal`:**
```
1. SELECT withdrawals FOR UPDATE (stale approval prevent)
2. Re-run calculateWithdrawalBreakdown (fresh calculation)
3. Mark consumed user_transactions.withdrawn = true
4. Agar partial last row: INSERT split_remainder row
5. UPDATE users SET availableBalance -= grossAmount (Decimal-exact)
6. Agar referrerId: UPDATE users SET balanceCashPkr += referralCommission
                    INSERT referral_commissions (record)
7. UPDATE withdrawals SET status = 'approved', transactionId = ...
8. Audit log insert
```

---

### Safety & Concurrency Mechanisms

| Guard | Mechanism | Location |
|-------|-----------|----------|
| Double-spend prevention | `SELECT ... FOR UPDATE` on `users` | `createWithdrawal` |
| Stale approval prevention | `SELECT ... FOR UPDATE` on `withdrawals` | `processWithdrawal` |
| One pending per user | Partial unique index `uniq_withdrawals_one_pending_per_user` | `shared/schema.ts` |
| Source deduplication | `uniq_user_transactions_source` | `shared/schema.ts` |
| PKR precision | `Decimal.js` throughout, `decimal(10,4)` in DB | All storage functions |

---

### Complete End-to-End Flow

```
User: withdrawal form submit
    ↓
POST /api/withdrawals
    ↓
requireSessionAuth → CSRF → withdrawalRateLimiter
    ↓
Idempotency cache check (X-Idempotency-Key header)
    ↓
storage.createWithdrawal():
    ├── SELECT users FOR UPDATE
    ├── Balance & min-payout validate
    ├── Pending check (partial unique index)
    ├── calculateWithdrawalBreakdown() → FIFO scan
    └── INSERT withdrawals (status=pending)
    ↓
Response: { withdrawal: { id, status: 'pending', grossAmount, platformFee, netAmount } }

--- Admin Panel ---
Admin: PATCH /api/admin/withdrawals/:id { action: 'approve' }
    ↓
requirePermission('MANAGE_WITHDRAWALS')
    ↓
storage.processWithdrawal(withdrawalId, adminId):
    ├── SELECT withdrawals FOR UPDATE
    ├── Re-calculate breakdown
    ├── Mark user_transactions.withdrawn = true (FIFO)
    ├── Insert split_remainder if partial
    ├── Debit users.availableBalance
    ├── Credit referrer.balanceCashPkr + INSERT referral_commissions
    └── UPDATE withdrawals status = 'approved'
    ↓
Audit log → WebSocket broadcast to user
```

---

## 1.3 Platform Fee Split System

### Code Location
| File | Key Function | DB Tables |
|------|-------------|-----------|
| `server/storage.ts` | `processWithdrawal`, `calculateWithdrawalBreakdown` | `withdrawals` (`fee`, `thorx_fee_share`, `referral_commission_paid`) |
| `server/storage.ts` | `getFounderLedger` / `getProfitLedger` | `withdrawals`, `founder_withdrawals` |

---

### Practical Logic & Mathematical Formulas

Har approved withdrawal se **3-way split** hoti hai:

```
┌─────────────────────────────────────────────────────┐
│              Gross Withdrawal Amount                 │
│                    (Rs. X)                           │
├─────────────────┬───────────────────────────────────┤
│  Platform Fee   │       User Net Payout              │
│  15% of X       │       85% of X                    │
│                 │                                    │
├────────┬────────┤                                    │
│Referral│ Thorx  │                                    │
│  Cut   │ Profit │                                    │
│7.5%    │ 7.5%  │                                    │
│of X    │ of X  │                                    │
└────────┴────────┴────────────────────────────────────┘
```

**DB fields on `withdrawals` row:**
- `fee` = platformFee (15%)
- `thorx_fee_share` = thorxProfit (7.5% net)  
- `referral_commission_paid` = referralCommission (7.5% → referrer)
- `net_amount` = userNetPkr (85%)

**Profit aggregation:**
```
getFounderLedger / getProfitLedger:
  SELECT SUM(thorx_fee_share) FROM withdrawals WHERE status = 'approved'
  + HilltopAds publisher balance (via API)
  − founder_withdrawals (extracted profit)
  = Net Platform Profit
```

---

### Safety & Concurrency Mechanisms

- Sab amounts `Decimal.js` se calculate, `.toFixed(4)` se DB me persist.
- `processWithdrawal` ke andar calculate — create time pe fee sirf preview ke liye thi.
- Admin approval ke time fresh calculation ensure karta hai correct rates.

---

### Complete End-to-End Flow

```
processWithdrawal() called:
    ↓
platformFee = grossAmount × 0.15
referralCut = platformFee × 0.50 (agar referrerId exist)
thorxShare  = platformFee − referralCut
userNet     = grossAmount − platformFee
    ↓
withdrawals row update:
    fee                     = platformFee
    thorx_fee_share         = thorxShare
    referral_commission_paid = referralCut
    net_amount              = userNet
    ↓
Referrer balanceCashPkr += referralCut
referral_commissions INSERT
    ↓
Profit Ledger query reads SUM(thorx_fee_share) → Admin dashboard
```

---

## 1.4 Referral Payout Engine

### Code Location
| File | Key Function | DB Tables |
|------|-------------|-----------|
| `server/storage.ts` | `processWithdrawal` (~line 2312) | `referral_commissions`, `users` (`balanceCashPkr`, `referredBy`) |
| `shared/schema.ts` | `referrals`, `referral_commissions` | — |

---

### Practical Logic & Mathematical Formulas

**Architecture:** Single-tier (L1 only). L2 chain retire ho chuki — codebase me koi path nahi.

**Trigger:** Earn time pe nahi — **Withdrawal Approval** pe fire hota hai.

**Commission formula:**
```
referralCommission = withdrawalGrossAmount × 0.15 × 0.50
                   = withdrawalGrossAmount × 0.075
                   = 7.5% of gross withdrawal
```

**Destination wallet:** `users.balanceCashPkr` (Cash Wallet — TX-Point ledger se alag).

**DB record:** `referral_commissions` table:
```
referrer_id          → jis ka referral code tha
referred_user_id     → jis ne withdrawal ki
withdrawal_id        → source withdrawal
commission_amount_pkr → 7.5% of gross
created_at
```

**Note:** `commission_logs` table schema me exist karta hai lekin write-frozen hai — function exist karta hai, call nahi hoti.

---

### Safety & Concurrency Mechanisms

- Commission credit `processWithdrawal` ke same transaction me hoti hai:
  ```sql
  UPDATE users SET balanceCashPkr = balanceCashPkr + $referralCut
  WHERE id = $referrerId
  ```
- Agar referrerId null ho (no referrer), commission step silently skip.
- `referral_commissions` INSERT withdrawal_id ke sath — same withdrawal pe double commission possible nahi (withdrawal sirf ek baar approve ho sakti).

---

### Complete End-to-End Flow

```
User A ne User B ko refer kiya (referralCode use karke register)
    ↓
users.referredBy = User A's ID (registration pe set, immutable)

User B: withdrawal submit karta hai (Rs. 1000)
    ↓
createWithdrawal → pending status

Admin: approve karta hai
    ↓
processWithdrawal():
    ├── breakdown.referrerId = User A (users.referredBy se)
    ├── referralCommission = 1000 × 0.075 = Rs. 75
    ├── UPDATE users (User A) SET balanceCashPkr += 75.0000
    └── INSERT referral_commissions (referrerId=A, referredId=B, amount=75)
    ↓
User A: apne Cash Wallet me Rs. 75 dekhta hai
User A: /api/withdrawals/referral se withdraw kar sakta hai (min Rs. 50)
```

---

## 1.5 Balance Management & Race Guards

### Code Location
| File | Key Functions | DB Tables |
|------|-------------|-----------|
| `server/storage.ts` | `updateUserEarnings`, `adjustUserBalance`, `createWithdrawal`, `processWithdrawal` | `users` |
| `shared/schema.ts` | `users` balance fields | `users` |

---

### Practical Logic — Two-Wallet Model

**`users` table ke balance-related columns:**

| Column | Type | Purpose |
|--------|------|---------|
| `txPointsBalance` | `integer` | Display-only TX-Points (engagement layer) |
| `totalEarnings` | `decimal(10,2)` | Cumulative lifetime PKR earned (ever increasing) |
| `availableBalance` | `decimal(10,2)` | Withdrawable PKR (debited on withdrawal) |
| `balanceCashPkr` | `decimal(10,4)` | Referral cash wallet (separate pipeline) |

**`updateUserEarnings` logic:**
```typescript
// server/storage.ts ~line 808
availableBalance += Decimal(amount)
totalEarnings    += Decimal(amount)
// optionally calls checkAndUpdateRank after balance update
```

**`adjustUserBalance` (admin-only manual credit/debit):**
```typescript
// server/storage.ts ~line 3686
SELECT users FOR UPDATE
// ↑ lock first — prevent concurrent adjustment
availableBalance += or -= amount (Decimal-exact)
INSERT audit_logs (mandatory — no silent adjustments)
INSERT notifications (user ko inform)
```

---

### Safety & Concurrency Mechanisms

| Mechanism | Where Used | Purpose |
|-----------|-----------|---------|
| `SELECT ... FOR UPDATE` on `users` | `createWithdrawal` | Prevent double-spend during withdrawal creation |
| `SELECT ... FOR UPDATE` on `users` | `adjustUserBalance` | Prevent race in manual balance ops |
| `SELECT ... FOR UPDATE` on `withdrawals` | `processWithdrawal` | Prevent double-approval |
| `pg_advisory_xact_lock(userId)` | `/api/ad-view` endpoint | Serialize concurrent ad views per user |
| `uniq_withdrawals_one_pending_per_user` | `shared/schema.ts` | DB-level: max 1 pending withdrawal per user |
| `uniq_user_transactions_source` | `shared/schema.ts` | DB-level: no duplicate earn events |
| `Decimal.js` throughout | All financial functions | IEEE-754 floating-point errors eliminate |
| `decimal(10,4)` DB fields | `user_transactions.realPkrValue` | 4 decimal places precision in storage |

**PKR arithmetic pattern (har jagah consistent):**
```typescript
const newBalance = new Decimal(user.availableBalance)
                     .plus(new Decimal(amount))
                     .toFixed(4);
// DB me string as string — JS number conversion kabhi nahi
```

---

### Complete End-to-End Flow

```
Concurrent scenario: User A ne ek saath 2 withdrawal requests bheji

Request 1:
    db.transaction() → SELECT users FOR UPDATE → lock acquired
    balance check: 500 >= 100 ✅
    INSERT withdrawals (pending)
    COMMIT → lock release

Request 2 (milliseconds baad):
    db.transaction() → SELECT users FOR UPDATE → WAIT (Request 1 ka lock)
    lock milta hai → partial unique index check:
    "1 pending withdrawal already exists" → REJECT 409
```

---

## 1.6 ⭐ Referral Cash Withdrawal System

### Code Location
| File | Key Function | DB Tables |
|------|-------------|-----------|
| `server/routes.ts` | `POST /api/withdrawals/referral` (~line 4831) | `users` (`balanceCashPkr`), `withdrawals` |

---

### Practical Logic & Mathematical Formulas

Yeh **alag pipeline** hai main TX-Point withdrawal se. Referral Cash Wallet (`balanceCashPkr`) ka apna dedicated withdrawal flow hai.

**Zod validation schema (actual code):**
```typescript
z.object({
  amount:        z.number().finite().min(50, "Minimum referral cash withdrawal is Rs. 50."),
  method:        z.string().min(1).max(50),
  accountName:   z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(50),
})
```

**Thresholds comparison:**
```
TX-Point Withdrawal minimum: Rs. 100  (system_config: MIN_PAYOUT)
Referral Cash Withdrawal minimum: Rs. 50  (hardcoded in Zod schema)
```

**Processing flow:**
```
1. Validate: amount >= 50
2. Validate: amount <= users.balanceCashPkr
3. Debit: balanceCashPkr -= amount (direct — no FIFO scan needed)
4. INSERT INTO withdrawals (source = 'referral', status = 'pending')
5. No FIFO scan — kyunki balanceCashPkr PKR cash hai, TX-Points nahi
```

---

### Safety & Concurrency Mechanisms

- `requireSessionAuth` — unauthenticated request blocked.
- `withdrawalRateLimiter` — same rate limiter as main withdrawal.
- `CSRF` — session cookie + header.
- Balance check `amount <= balanceCashPkr` — Server-side enforce.

---

### Complete End-to-End Flow

```
User A: referral commissions se Rs. 75 balance mila
    ↓
User A: Cash Wallet withdrawal form submit (amount=75, method=easypaisa, ...)
    ↓
POST /api/withdrawals/referral
    ↓
requireSessionAuth → CSRF → withdrawalRateLimiter
    ↓
Zod validate (min Rs. 50 ✅, max balanceCashPkr ✅)
    ↓
Debit: users.balanceCashPkr -= 75
INSERT withdrawals { source: 'referral', amount: 75, status: 'pending' }
    ↓
Admin panel me dikhai deta hai (separate flag se identify)
Admin: approve → user account pe Rs. 75 transfer
```

---

## 1.7 ⭐ Withdrawal Preview Calculator

### Code Location
| File | Key Function | DB Tables |
|------|-------------|-----------|
| `server/routes.ts` | `GET /api/withdrawals/preview` (~line 4805) | `users` (balance read-only), `system_config` |
| `server/storage.ts` | `previewWithdrawal` (~line 5032), `calculateWithdrawalBreakdown` (~line 1917) | `user_transactions` (FIFO read-only) |

---

### Practical Logic & Mathematical Formulas

Yeh endpoint **pure read-only** hai — koi state mutation nahi hoti. User withdrawal submit karne se pehle exact breakdown dekh sakta hai.

**`previewWithdrawal` implementation (actual code pattern):**
```typescript
async previewWithdrawal(userId: string, points: number): Promise<{...}> {
  const breakdown = await this.calculateWithdrawalBreakdown(userId, points);
  // Same FIFO scan — no writes
  return breakdown;
}
```

**Response structure:**
```json
{
  "grossAmount": "1000.00",
  "platformFee": "150.00",
  "referralCommission": "75.00",
  "thorxFeeShare": "75.00",
  "userNetPkr": "850.00",
  "ledgerRows": [
    { "txId": "...", "realPkrValue": "0.0120", "consumed": "0.0120" },
    { "txId": "...", "realPkrValue": "0.0300", "consumed": "0.0300" }
  ],
  "pointsToConsume": 4200,
  "partialLastRow": null
}
```

**UI behavior (client side):**
- Withdrawal modal me `disabled` state tab tak — jab tak user preview dekh ke confirm na kare.
- `ledgerRows` se exactly dikhai deta hai konse TX-Point rows consume honge.

---

### Safety & Concurrency Mechanisms

- **No rate limiter** — read-only endpoint, koi abuse surface nahi.
- `requireSessionAuth` — sirf logged-in user apna preview dekh sake.
- **No locks** — read-only FIFO scan, koi mutation nahi.
- Exact same `calculateWithdrawalBreakdown` call as real withdrawal — preview aur actual results guaranteed same.

---

### Complete End-to-End Flow

```
User: withdrawal modal open karta hai, amount enter karta hai
    ↓
GET /api/withdrawals/preview?amount=1000
    ↓
requireSessionAuth
    ↓
storage.previewWithdrawal(userId, 1000):
    └── calculateWithdrawalBreakdown(userId, 1000):
            SELECT user_transactions WHERE withdrawn=false ORDER BY created_at ASC
            FIFO traverse karo until Rs. 1000 consume
            Fee calculate karo (Decimal-exact)
            Return breakdown (NO DB writes)
    ↓
Response: { grossAmount, platformFee, referralCommission, netAmount, ledgerRows }
    ↓
Client: modal me breakdown display → user "Confirm Withdrawal" click karta hai
    ↓
POST /api/withdrawals (actual request)
```

---

## 1.8 ⭐ Withdrawal Idempotency Cache (In-Memory)

### Code Location
| File | Location | Type |
|------|----------|------|
| `server/routes.ts` | Line 28–42 (top of file) | In-memory `Map` (no DB) |

---

### Practical Logic

**Actual implementation (server/routes.ts ~line 28):**
```typescript
// ── H-01: Withdrawal idempotency cache ─────────────────────────────────────
const _withdrawalIdempCache = new Map<
  string,
  { status: number; body: unknown; expiresAt: number }
>();

setInterval(() => {
  const now = Date.now();
  _withdrawalIdempCache.forEach((v, k) => {
    if (v.expiresAt < now) _withdrawalIdempCache.delete(k);
  });
}, 30_000).unref();   // ← har 30 seconds me stale entries clean
```

**Cache key format:**
```
"${userId}:${idempotencyKey}"
```
Jahan `idempotencyKey` client ka `X-Idempotency-Key` HTTP header value hai.

**Request handling (routes.ts ~line 1031):**
```typescript
const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;
if (idempotencyKey) {
  const cached = _withdrawalIdempCache.get(`${userId}:${idempotencyKey}`);
  if (cached && cached.expiresAt > Date.now()) {
    // Cache hit → same response return karo, DB touch mat karo
    return res.status(cached.status).json(cached.body);
  }
}

// ... actual withdrawal processing ...

if (idempotencyKey) {
  _withdrawalIdempCache.set(`${userId}:${idempotencyKey}`, {
    status: res.statusCode,
    body: responseBody,
    expiresAt: Date.now() + 60_000  // 60 second TTL
  });
}
```

---

### Key Properties

| Property | Value |
|----------|-------|
| Cache TTL | 60 seconds |
| Cleanup interval | Every 30 seconds |
| Cache key | `userId:idempotencyKey` |
| Storage | Process memory (Map) |
| Durability | Server restart pe lost |
| Primary guard | `uniq_withdrawals_one_pending_per_user` (DB) |
| This cache's role | First line of defense — DB tak pahunche bina duplicate reject |

**Defense layering:**
```
Request 1 (X-Idempotency-Key: abc123) → DB INSERT → Cache set (abc123 → response)
Request 2 (X-Idempotency-Key: abc123, 5 seconds baad) → Cache hit → same response → DB NEVER touched
Request 3 (X-Idempotency-Key: abc123, 61 seconds baad) → Cache expired → DB check:
    unique index: "pending withdrawal exists" → DB-level reject
```

---

### Safety & Concurrency Mechanisms

- **Belt-and-suspenders design:** Cache single-process guard; DB index cross-process guard.
- Single-process deployment (Replit) me in-memory sufficient.
- Multi-instance deployment ke liye Redis-backed cache needed hogi (noted as limitation in audit).
- Cache sirf `X-Idempotency-Key` header present hone pe activate — backward compatible.

---

### Complete End-to-End Flow

```
Mobile client: network glitch ke baad withdrawal retry karta hai

Attempt 1 (T=0s):
    POST /api/withdrawals + X-Idempotency-Key: uuid-xyz
    Cache: miss → DB: INSERT withdrawals (pending)
    Cache: set("userId:uuid-xyz", { status:201, body:{...}, expiresAt: T+60s })
    Response: 201 Created

Attempt 2 (T=3s, network retry):
    POST /api/withdrawals + X-Idempotency-Key: uuid-xyz
    Cache: HIT → expiresAt > now ✅
    Response: 201 Created (same body)  — DB never touched
    ← No duplicate withdrawal created

Attempt 3 (T=65s, much later):
    POST /api/withdrawals + X-Idempotency-Key: uuid-xyz
    Cache: MISS (expired at T+60s)
    DB: partial unique index → "pending withdrawal exists" → 409 Conflict
```

---

## 1.9 ⭐ Founder Withdrawal Tracker

### Code Location
| File | Key Functions | DB Tables |
|------|-------------|-----------|
| `shared/schema.ts` | `founderWithdrawals` table definition | `founder_withdrawals` |
| `server/storage.ts` | `getFounderLedger`, `getProfitLedger` | `founder_withdrawals`, `withdrawals` |
| `server/routes.ts` | `POST /api/admin/founder/withdrawals` (~line 2449), `GET /api/admin/founder/withdrawals` (~line 2472) | — |

---

### Practical Logic

**`founder_withdrawals` table schema (shared/schema.ts):**
```
id            — UUID primary key
amount        — decimal(10,2) — extracted profit amount
method        — varchar — payment method
accountDetails — jsonb — account info
status        — varchar — pending/completed
createdAt     — timestamp
```

**Purpose:** Founder role platform profit extract karta hai (jo `thorxFeeShare` accumulate hoti hai user withdrawals se). Yeh records alag table me hain — regular `withdrawals` se mix nahi hote.

**Endpoint:**
```
POST /api/admin/founder/withdrawals
    requirePermission("VIEW_PROFIT_LEDGER")
    withdrawalRateLimiter
    Zod validate → INSERT founder_withdrawals

GET /api/admin/founder/withdrawals
    requireTeamRole
    SELECT * FROM founder_withdrawals
```

**Profit Ledger integration:**
```
Net Platform Profit = 
  SUM(withdrawals.thorx_fee_share WHERE status='approved')
  + HilltopAds publisher balance
  - SUM(founder_withdrawals.amount WHERE status='completed')
```

---

### Safety & Concurrency Mechanisms

- `requirePermission("VIEW_PROFIT_LEDGER")` — sirf authorized team members.
- Zod schema enforce — amount, method, accountDetails validated.
- `withdrawalRateLimiter` — abuse prevention.
- DB records immutable once inserted — audit trail permanent.
- Health engine yahan se financial health dimension calculate karta hai:
  ```
  health_signal = "fee_collection_integrity" (health-engine.ts ~line 152)
  ```

---

### Complete End-to-End Flow

```
Platform: user withdrawals approve hoti hain over time
    ↓
withdrawals.thorx_fee_share accumulate: Rs. 75 + Rs. 120 + Rs. 45 = Rs. 240

Founder: Admin Dashboard → Profit Ledger → "Total Available: Rs. 240"
    ↓
Founder: "Extract Profit" → POST /api/admin/founder/withdrawals
    { amount: 200, method: "bank", accountDetails: {...} }
    ↓
requirePermission("VIEW_PROFIT_LEDGER") ✅
Zod validate ✅
INSERT founder_withdrawals { amount: 200, status: 'pending' }
    ↓
Founder ya team member: status 'completed' update
    ↓
Profit Ledger re-calculates:
    thorxFeeShare total = Rs. 240
    founder_withdrawals = Rs. 200
    Net remaining = Rs. 40 (still in platform)
    ↓
Health Engine: financial dimension = healthy (thresholds met)
```

---

## Quick Reference — All 9 Systems

| System | Primary File | Key DB Tables | Status |
|--------|-------------|---------------|--------|
| 1.1 TX-Point Ledger | `storage.ts:recordEarnEvent` | `user_transactions`, `users` | ✅ Live |
| 1.2 Withdrawal Engine | `storage.ts:createWithdrawal`, `processWithdrawal` | `withdrawals`, `user_transactions` | ✅ Live |
| 1.3 Fee Split | `storage.ts:processWithdrawal` | `withdrawals` (fee cols) | ✅ Live |
| 1.4 Referral Payout | `storage.ts:processWithdrawal` ~line 2312 | `referral_commissions`, `users.balanceCashPkr` | ✅ Live |
| 1.5 Race Guards | `storage.ts` FOR UPDATE + schema indexes | `withdrawals`, `user_transactions` | ✅ Live |
| 1.6 Referral Withdrawal | `routes.ts:POST /api/withdrawals/referral` | `users.balanceCashPkr`, `withdrawals` | ✅ Live |
| 1.7 Preview Calculator | `storage.ts:previewWithdrawal` | read-only scan | ✅ Live |
| 1.8 Idempotency Cache | `routes.ts` line 28–42 | In-memory Map only | ✅ Live |
| 1.9 Founder Tracker | `routes.ts:POST /api/admin/founder/withdrawals` | `founder_withdrawals` | ✅ Live |

---

## Critical Constants (system_config keys)

| Key | Default | System |
|-----|---------|--------|
| `CONVERSION_RATE` | 100 | TX-Point conversion |
| `WITHDRAWAL_FEE_PCT` | 0.15 (15%) | Fee Split |
| `REFERRAL_FEE_SHARE_PCT` | 0.50 (50%) | Referral Payout |
| `MIN_PAYOUT` | 100 | Withdrawal Engine |
| `MAX_ADS_PER_DAY` | configurable | Engine A cap |
| `PS_ENGINE_A_REWARD` | 10 | PS awards |
| `PS_ENGINE_B_REWARD` | 25 | PS awards |
| `PS_ENGINE_C_REWARD` | 15 | PS awards |
| `AD_INVENTORY_JSON` | `[{...}]` | Engine A inventory (60s cached) |

---

*Document generated from live codebase inspection. All line numbers approximate — use grep to find exact current positions.*
