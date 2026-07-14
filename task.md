# THORX SYSTEM SPECIFICATION — MASTER IMPLEMENTATION BLUEPRINT

> Cross-reference: attached_assets/Pasted--THORX-SYSTEM-SPECIFICATION-ARCHITECTURE-BLUEPRINT-A-co_1784065659375.txt
> Codebase state: fully explored — schema, routes, storage, client, admin portal
> This file is the canonical work order. Every phase must wire into every existing feature.

---

## GAP ANALYSIS SUMMARY (Current vs. Spec)

| Area | Current State | Spec Requirement | Gap |
|---|---|---|---|
| Referral tiers | Multi-tier (L1/L2) in commission_logs | 1-tier direct only | Remove multi-level logic |
| Rank system | Custom names (Nawa Aya→Chacha Supreme) based on totalEarnings | E/D/C/B/A/S based on Performance Score (PS) | Full rank overhaul |
| PS field | In leaderboard_cache only, not on users | Direct column on users, live-updated | Add performanceScore to users table |
| Thorx Card | Fixed conversion only | ±20% random variance, dual-ledger (points_credited + real_pkr_value) | Build random card engine |
| User types | Platform roles (user/admin/founder) | Guild-aware types (simple/member/captain) | Add guild_role routing |
| Engine splits | Single VAULT_HOLD_PCT for all | A/B = 40% Thorx / 60% User; C = 20% Thorx / 35% Pool / 45% User | Per-engine split config |
| Guild rank (GPS) | E-S schema exists but unused in UI | GPS drives member capacity (10→50) | Implement GPS progression |
| Captain DM | Missing | Dedicated 1-on-1 captain↔member channel | Build DM system |
| Nudge system | Missing | Captain triggers mobile push to inactive member | Build nudge endpoint + UI |
| Weekly reset | Basic cycle, no Sunday trigger, no captain share | Sunday night, captain 30% / members 70% proportional | Rebuild reset logic |
| Withdrawal math | Uses availableBalance | Must trace real_pkr_value from user_transactions | Rebuild withdrawal ledger |
| Inactivity penalty | Missing | −10 PS/day after 48h idle, capped at E-Rank floor | Build inactivity cron |
| Admin profit sliders | Single fee config | Per-engine sliders (A/B/C) + Ref% separately | Add split controls to admin |
| Ledger Validator | Missing | Admin tool to cross-check points vs. real_pkr_value | Build reconciliation tool |
| Simulation Sandbox | Missing | Admin tool to simulate Thorx Card outcomes | Build sandbox UI |
| PS unlock gates | Missing | D-Rank to join guild, B-Rank to create, C-Rank for premium CPA | Add rank gate middleware |
| MVP badge | Basic pin endpoint exists | Weekly captain designation, pinned badge on profile | Wire to profile display |
| Application cover letter | Schema exists (guild_applications) | UI must collect and display it with PS + history | Enhance application flow |

---

## PHASE 1 — DATABASE & SCHEMA OVERHAUL

### 1.1 Users Table — New Columns

**File:** `shared/schema.ts`

Add the following columns to the `users` table:

```
performanceScore    integer     DEFAULT 0          -- PS: primary rank driver
userRankTier        text        DEFAULT 'E-Rank'   -- E/D/C/B/A/S (replaces old Nawa Aya system)
guildRole           text        DEFAULT 'simple'   -- 'simple' | 'member' | 'captain'
guildId             text        REFERENCES guilds  -- null if not in a guild
lastActiveAt        timestamp   DEFAULT now()      -- drives inactivity penalty
streakDays          integer     DEFAULT 0          -- consecutive active days
inactivityPenaltyAt timestamp   NULLABLE           -- when next -10 PS fires
```

**Breaking change:** The `rank` column currently stores "Nawa Aya" / "Chota Don" etc. Migrate this to `userRankTier` (E/D/C/B/A/S). Keep `personalRank` for the guild-contribution axis (unchanged). The `guildContributionScore` field stays for guild-internal leaderboard.

**Migration steps:**
1. Add new columns with defaults
2. Map old rank names → new E-S tiers (existing users default to E-Rank unless their totalEarnings suggests higher — use a seed migration)
3. Backfill `guildId` and `guildRole` from existing `guild_members` records
4. Keep `rank` column temporarily as alias, drop after all code references are updated

---

### 1.2 Guilds Table — GPS & Rank

**File:** `shared/schema.ts`

Current `guilds` table already has most fields. Add/verify:

```
guildPerformanceScore  integer   DEFAULT 0       -- GPS total
guildRankTier          text      DEFAULT 'E-Rank' -- E/D/C/B/A/S
memberCapacity         integer   DEFAULT 10       -- driven by guildRankTier
minRankRequired        text      DEFAULT 'E-Rank' -- captain sets, gates applications
weeklyBonusPool        decimal(12,4) DEFAULT 0   -- accumulates 35% of Engine C earnings
currentWeeklyPoints    integer   DEFAULT 0       -- resets Sunday
weeklyTarget           integer   DEFAULT 50000   -- set by admin per guild rank
assistantCaptainId     text      NULLABLE        -- unlocked at B-Rank GPS
```

**GPS Member Capacity table (enforced in code, not DB):**

| GPS Rank | Range | Capacity |
|---|---|---|
| E-Rank | 0 – 9,999 | 10 |
| D-Rank | 10,000 – 29,999 | 15 |
| C-Rank | 30,000 – 69,999 | 20 |
| B-Rank | 70,000 – 149,999 | 25 |
| A-Rank | 150,000 – 299,999 | 30 |
| S-Rank | 300,000+ | 50 |

---

### 1.3 New Table — user_transactions (Bulletproof Ledger)

**File:** `shared/schema.ts`

```sql
CREATE TABLE user_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userId          text NOT NULL REFERENCES users(id),
  engineType      text NOT NULL,          -- 'Engine_A' | 'Engine_B' | 'Engine_C'
  pointsCredited  integer NOT NULL,        -- random card output (shown to user)
  realPkrValue    decimal(10,4) NOT NULL,  -- actual backend PKR value
  conversionRate  integer NOT NULL,        -- snapshot of rate at time of earn
  cardVariance    decimal(5,4) NOT NULL,   -- the random multiplier used (0.80–1.20)
  sourceId        text,                    -- ad_view id, task_record id, etc.
  createdAt       timestamp DEFAULT now()
);
```

**This table is the single source of truth for withdrawal calculations.** The existing `earnings` table continues for user-facing history display. `user_transactions` is backend-only and never exposed raw to users.

---

### 1.4 referral_commissions Table

**File:** `shared/schema.ts`

The existing `commission_logs` table has `level` (L1/L2). Spec mandates 1-tier only.

Changes:
- Add a `referral_commissions` table as the clean new schema (mirrors spec Section 7)
- Keep `commission_logs` for historical records only (add `deprecated: true` comment)
- All new commission writes go to `referral_commissions`

```
referral_commissions:
  id                uuid PK
  referrerId        text REFERENCES users(id)
  inviteeId         text REFERENCES users(id)
  withdrawalId      text REFERENCES withdrawals(id)
  commissionAmountPkr decimal(10,2)
  rate              decimal(5,4)       -- snapshot of REFERRAL_FEE_SHARE_PCT
  status            text DEFAULT 'pending'  -- 'pending' | 'paid'
  createdAt         timestamp
```

---

### 1.5 New Table — captain_messages (Direct Captain Channel)

```
captain_messages:
  id          uuid PK
  guildId     text REFERENCES guilds(id)
  fromUserId  text REFERENCES users(id)
  toUserId    text REFERENCES users(id)  -- captain↔specific member only
  message     text NOT NULL
  isRead      boolean DEFAULT false
  createdAt   timestamp
```

---

### 1.6 New Table — guild_weekly_snapshots (Captain Portal Charts)

```
guild_weekly_snapshots:
  id              uuid PK
  guildId         text REFERENCES guilds(id)
  weekStart       date NOT NULL
  targetPoints    integer
  achievedPoints  integer
  wasSuccessful   boolean
  bonusPoolPkr    decimal(12,4)
  poolDisposition text  -- 'distributed' | 'voided'
  createdAt       timestamp
```

---

### 1.7 Config Keys to Add/Update

**File:** `server/storage.ts` → `bootstrapConfig()`

New keys for `system_config`:
```
ENGINE_A_THORX_CUT_PCT     = 40    -- % of Engine A revenue kept by platform
ENGINE_A_USER_CUT_PCT      = 60
ENGINE_B_THORX_CUT_PCT     = 40
ENGINE_B_USER_CUT_PCT      = 60
ENGINE_C_THORX_CUT_PCT     = 20
ENGINE_C_GUILD_POOL_PCT    = 35    -- combined bonus pool (20% direct + 15% vault)
ENGINE_C_USER_CUT_PCT      = 45
CARD_VARIANCE_MIN          = 0.80  -- Thorx Card lower bound
CARD_VARIANCE_MAX          = 1.20  -- Thorx Card upper bound
A_RANK_CARD_BONUS_PCT      = 5     -- expands card bounds by this amount at A-Rank
PS_ENGINE_A_REWARD         = 5
PS_ENGINE_B_REWARD         = 25
PS_ENGINE_C_REWARD         = 15
PS_STREAK_MIN              = 5
PS_STREAK_MAX              = 20
PS_INACTIVITY_PENALTY      = 10
PS_INACTIVITY_HOURS        = 48
GPS_MILESTONE_BONUS        = 1000
GPS_MVP_BONUS              = 200
GPS_MEMBER_POINTS_PCT      = 10    -- % of member weekly points → GPS
GUILD_CAPTAIN_POOL_SHARE   = 30    -- % of bonus pool to captain on success
GUILD_MEMBER_POOL_SHARE    = 70    -- remainder, proportional
```

---

## PHASE 2 — CORE BUSINESS LOGIC (Backend)

### 2.1 Thorx Card Random Reward Engine

**File:** `server/modules/thorx-card.ts` (NEW)

```typescript
// Core function
function drawThorxCard(realPkrUserShare: number, conversionRate: number, userRank: string): {
  pointsCredited: number;
  realPkrValue: number;
  cardVariance: number;
}
```

**Logic:**
1. Calculate base target points: `targetPoints = (realPkrUserShare / 10) * conversionRate` (e.g., Rs.10 = 1000 points at rate 100)
2. Apply rank bonus: If A-Rank, expand bounds by +5% (0.75–1.25). If S-Rank, +10% (0.70–1.30).
3. Generate variance: `cardVariance = random(CARD_VARIANCE_MIN, CARD_VARIANCE_MAX)`
4. Final points: `pointsCredited = Math.round(targetPoints * cardVariance)`
5. Store both in `user_transactions` (pointsCredited shown to user, realPkrValue used for withdrawal math)

**Guarantee:** `realPkrValue` is ALWAYS the exact user PKR share from the split — never affected by the random multiplier. Point inflation is visual only.

---

### 2.2 Engine A/B/C Revenue Split Engine

**File:** `server/storage.ts` → replace `recordEarnEvent()`

**Current:** Single `VAULT_HOLD_PCT` for everything.

**New logic per engine type:**

**Engine A (Ad Views):**
```
grossPkr = network payout for the ad
thorxProfit = grossPkr × ENGINE_A_THORX_CUT_PCT / 100   → Thorx reserve (never touches user)
userPkr = grossPkr × ENGINE_A_USER_CUT_PCT / 100
→ drawThorxCard(userPkr, rate, rank) → pointsCredited + realPkrValue
→ INSERT user_transactions(Engine_A, pointsCredited, realPkrValue)
→ UPDATE users: txPointsBalance += pointsCredited, availableBalance += userPkr
→ PS award: +PS_ENGINE_A_REWARD to users.performanceScore
→ checkAndUpdateRankTier(userId)
```

**Engine B (CPA Offers):**
```
Same as Engine A but uses ENGINE_B cuts.
PS award: +PS_ENGINE_B_REWARD
Gate: user must be C-Rank or higher for premium CPA offers (check userRankTier)
```

**Engine C (Guild Tasks):**
```
grossPkr = task payout
thorxProfit = grossPkr × ENGINE_C_THORX_CUT_PCT / 100   → Thorx reserve
guildPool = grossPkr × ENGINE_C_GUILD_POOL_PCT / 100    → guilds.weeklyBonusPool
userPkr = grossPkr × ENGINE_C_USER_CUT_PCT / 100        → immediate user payout
→ drawThorxCard(userPkr, rate, rank) → pointsCredited + realPkrValue
→ INSERT user_transactions(Engine_C, ...)
→ UPDATE guilds: weeklyBonusPool += guildPool, currentWeeklyPoints += pointsCredited, guildScore += GPS contribution
→ UPDATE guild_members: weeklyPointsContributed += pointsCredited
→ UPDATE guilds GPS: guildPerformanceScore += (pointsCredited × GPS_MEMBER_POINTS_PCT / 100)
→ PS award: +PS_ENGINE_C_REWARD
→ checkAndUpdateRankTier(userId)
→ checkAndUpdateGuildRankTier(guildId)
```

---

### 2.3 Performance Score (PS) Engine

**File:** `server/modules/ps-engine.ts` (NEW)

```typescript
// Award PS on task completion
async function awardPS(userId: string, engineType: 'A' | 'B' | 'C'): Promise<void>

// Daily streak bonus (called by daily cron at midnight)
async function processStreakBonus(userId: string): Promise<void>

// Inactivity penalty (called by hourly cron, checks lastActiveAt)
async function applyInactivityPenalties(): Promise<void>
```

**PS Accrual Rules:**
- Engine A complete: +5 PS
- Engine B complete: +25 PS
- Engine C complete: +15 PS
- Daily streak active: +5 to +20 PS (scales with streak length: 1–3 days = +5, 4–7 = +10, 8–14 = +15, 15+ = +20)
- Inactivity: −10 PS/day after 48 consecutive hours idle (capped at E-Rank floor of 0)

**PS Rank Tiers (replaces old Nawa Aya system):**

| Rank | PS Range | Unlocks |
|---|---|---|
| E-Rank | 0 – 999 | Engine A only |
| D-Rank | 1,000 – 2,999 | Can apply to / join guilds |
| C-Rank | 3,000 – 5,999 | Premium Engine B CPA offers unlocked |
| B-Rank | 6,000 – 9,999 | Can create a guild (become captain) |
| A-Rank | 10,000 – 19,999 | Card variance bounds expand by +5% |
| S-Rank | 20,000+ | VIP fast-track withdrawals (auto-process) + exclusive CPA |

**Implementation:**
- `users.performanceScore` is the live PS value
- `users.userRankTier` is derived from PS and updated by `checkAndUpdateRankTier()`
- `rank_logs` table continues to log all tier changes (add `triggerSource = 'ps_engine'`)
- `users.lastActiveAt` is updated on any authenticated API call (middleware touch)
- Streak: compare `lastLoginDate` to today; if consecutive, increment `streakDays`

---

### 2.4 checkAndUpdateRankTier() — Full Rewrite

**File:** `server/storage.ts`

Replace the current `checkAndUpdateRank()` (which uses `totalEarnings` and custom rank names) with a new `checkAndUpdateRankTier()`:

```typescript
async function checkAndUpdateRankTier(userId: string): Promise<void> {
  // 1. Read users.performanceScore
  // 2. Determine new rank from PS_RANK_THRESHOLDS constant
  // 3. If rankLocked === true, skip
  // 4. If rank changed:
  //    a. UPDATE users.userRankTier
  //    b. INSERT rank_logs (oldRank, newRank, triggerSource='ps_engine')
  //    c. Apply rank-specific perks (auto-avatar assignment from rankAvatars.ts)
  //    d. broadcastUserUpdated(userId) via WS
  //    e. Create notification: "You've reached [Rank]! [unlock description]"
}
```

**Keep `checkAndUpdateRank()` as a deprecated alias** pointing to the new function during transition.

---

### 2.5 Guild GPS Engine

**File:** `server/modules/gps-engine.ts` (NEW)

```typescript
// Called after every Engine C earn event
async function updateGuildGPS(guildId: string, weeklyPointsEarned: number): Promise<void> {
  // GPS contribution = weeklyPointsEarned × GPS_MEMBER_POINTS_PCT / 100
  // UPDATE guilds.guildPerformanceScore += contribution
  // Check for guild rank tier change → update guildRankTier + memberCapacity
}

// Called when weekly target is hit
async function awardMilestoneGPS(guildId: string): Promise<void> {
  // UPDATE guilds.guildPerformanceScore += GPS_MILESTONE_BONUS
}

// Called when captain selects MVP
async function awardMVPGPS(guildId: string): Promise<void> {
  // UPDATE guilds.guildPerformanceScore += GPS_MVP_BONUS
}
```

**Member capacity enforcement:**
- `checkAndUpdateGuildRankTier()` updates `guilds.memberCapacity` based on GPS → rank table
- Any join request must check `current members < memberCapacity` (currently hardcoded to 10)

---

### 2.6 Sunday Night Guild Reset

**File:** `server/modules/guild-reset.ts` (replaces/enhances existing weekly resolution)

**Current:** Runs on-demand via `/api/admin/guild-cycles/run-resolution`.

**Spec:** Must also run automatically on Sunday at 23:59 PKT (UTC+5, so Sunday 18:59 UTC).

**New logic:**
```typescript
async function runWeeklyGuildReset(): Promise<void> {
  // For each active guild:
  const guild = await getGuild(guildId);
  
  if (guild.currentWeeklyPoints >= guild.weeklyTarget) {
    // SUCCESS PATH
    const pool = guild.weeklyBonusPool;
    const captainShare = pool × GUILD_CAPTAIN_POOL_SHARE / 100;
    const memberPool = pool × GUILD_MEMBER_POOL_SHARE / 100;
    
    // Captain gets 30%
    await creditUserPkr(guild.captainId, captainShare, 'guild_pool_captain');
    
    // Active members get proportional 70% (based on weeklyPointsContributed ratio)
    const totalContributed = sum(all member.weeklyPointsContributed);
    for each member with weeklyPointsContributed > 0:
      const memberShare = memberPool × (member.weeklyPointsContributed / totalContributed);
      await creditUserPkr(member.userId, memberShare, 'guild_pool_member');
    
    // Award milestone GPS
    await awardMilestoneGPS(guildId);
    
    // Record snapshot: wasSuccessful=true, poolDisposition='distributed'
  } else {
    // FAIL PATH: pool voided back to Thorx reserve
    // Record snapshot: wasSuccessful=false, poolDisposition='voided'
  }
  
  // Reset for next week
  await resetGuildWeeklyCycle(guildId); // clears weeklyBonusPool, currentWeeklyPoints, member weekly contributions
}
```

**Cron schedule:**
```typescript
// In server/index.ts — add alongside existing HealthEngine hourly job
cron.schedule('59 18 * * 0', runWeeklyGuildReset, { timezone: 'UTC' }); // Sunday 23:59 PKT
```

---

### 2.7 Bulletproof Withdrawal Ledger

**File:** `server/routes.ts` → `POST /api/withdrawals` + `server/storage.ts` → `createWithdrawal()`

**Current:** Uses `users.availableBalance` directly.

**New spec calculation:**
```typescript
async function calculateWithdrawalPkr(userId: string, pointsRequested: number): Promise<{
  exactPkrFromLedger: number;
  platformFee: number;
  referralCommission: number;
  userNetPkr: number;
}> {
  // 1. Sum real_pkr_value from user_transactions in FIFO order until
  //    cumulative pointsCredited >= pointsRequested
  // 2. exactPkrFromLedger = sum of real_pkr_value for those records
  // 3. platformFee = exactPkrFromLedger × WITHDRAWAL_FEE_PCT / 100
  // 4. If user has a referrer:
  //    referralCommission = platformFee × REFERRAL_FEE_SHARE_PCT / 100
  //    → INSERT referral_commissions(referrerId, inviteeId, withdrawalId, referralCommission)
  // 5. userNetPkr = exactPkrFromLedger - platformFee
  // 6. Thorx net profit = platformFee - referralCommission (internal ledger only)
}
```

**S-Rank fast-track:** If `users.userRankTier === 'S-Rank'`, set withdrawal `status = 'approved'` immediately without admin review.

---

### 2.8 1-Tier Referral Cleanup

**Files:** `server/storage.ts`, `server/routes.ts`

- Remove all references to `tier`, `level2Count`, L2 commission logic
- `referrals` table: `tier` column → hardcode to 1, remove multi-level join queries
- `commission_logs` with `level = 2` entries: mark as deprecated in DB, stop writing new ones
- `leaderboard_cache`: remove `level2Count` from sync logic
- `GET /api/commissions`: return only L1 records
- `GET /api/referrals/stats/detailed`: remove L2 stats from response
- Admin `LeaderboardInsights`: remove L2 column from display

---

### 2.9 Nudge System (Captain → Inactive Member)

**File:** `server/routes.ts` (new endpoint) + `server/modules/nudge.ts` (NEW)

```
POST /api/guilds/:id/members/:userId/nudge
  - Auth: captain only
  - Rate limit: once per member per 24h
  - Action: send notification to member (notifications table)
  - Message: "Yar, aap ke Captain ne yaad kiya hai! Jaldi se team tasks complete karo..."
  - Only available if member.weeklyPointsContributed === 0
  - Broadcast via WebSocket to target user if online
```

---

### 2.10 MVP Selection & Badge

**File:** `server/routes.ts` → existing `POST /api/guilds/:id/pin/:memberId` — enhance

- Rate limit: captain can designate exactly 1 MVP per 7-day window
- On designation: set `guild_members.isMVP = true` (add column), clear previous MVP
- Award GPS: `awardMVPGPS(guildId)` → +200 GPS
- Create notification for the MVP member: "🏆 You've been named MVP of the Week!"
- Broadcast via WS
- Profile display: add `isMVP` badge to user profile card in guild context

---

### 2.11 Inactivity Penalty Cron

**File:** `server/index.ts` + `server/modules/ps-engine.ts`

```typescript
// Run hourly — find users inactive ≥ 48h with PS > 0
cron.schedule('0 * * * *', async () => {
  await applyInactivityPenalties();
});

async function applyInactivityPenalties() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const inactiveUsers = await db
    .select()
    .from(users)
    .where(and(
      lt(users.lastActiveAt, cutoff),
      gt(users.performanceScore, 0)
    ));
  
  for (const user of inactiveUsers) {
    const newPS = Math.max(0, user.performanceScore - PS_INACTIVITY_PENALTY);
    await db.update(users).set({
      performanceScore: newPS,
      inactivityPenaltyAt: new Date()
    }).where(eq(users.id, user.id));
    await checkAndUpdateRankTier(user.id);
  }
}
```

---

## PHASE 3 — API ROUTES (New & Modified)

### 3.1 New Routes Required

```
# Performance Score
GET  /api/user/ps-history          — PS change log for current user (from rank_logs + annotation)
GET  /api/user/rank-unlocks        — What the user's current rank unlocks (gates)

# Guild Public Discovery (enhanced)
GET  /api/guilds/discovery         — GPS-sorted guild list with transparency info for Simple users
                                     Returns: name, description, avatar, guildRankTier, gps, slots available

# Captain Direct Channel
GET  /api/guilds/:id/dm/:memberId  — Fetch DM thread between captain and specific member (requireSessionAuth)
POST /api/guilds/:id/dm/:memberId  — Send DM (captain or the specific member only)

# Nudge System
POST /api/guilds/:id/members/:userId/nudge  — Captain triggers nudge notification

# Guild Weekly Snapshots
GET  /api/guilds/:id/weekly-history         — Historical weekly success/fail data (for captain charts)

# Withdrawal Ledger Preview
GET  /api/withdrawals/preview?points=X      — Returns PKR breakdown before user confirms

# Admin: Thorx Card Simulator
POST /api/admin/simulate/thorx-card         — Input: grossPkr, engineType, rank → simulate N draws
GET  /api/admin/simulate/thorx-card/history — Past simulation runs

# Admin: Ledger Validator
GET  /api/admin/ledger/validate/:userId     — Cross-check user points vs real_pkr_value
GET  /api/admin/ledger/validate/all         — System-wide reconciliation report

# Admin: Guild Moderation (extended)
PATCH /api/admin/guilds/:id/target          — Override weekly target
PATCH /api/admin/guilds/:id/captain        — Replace captain (admin override)
PATCH /api/admin/guilds/:id/gps            — Manual GPS adjustment with reason
POST  /api/admin/guilds/:id/kick/:userId   — Admin force-kick member

# Admin: PS Override
PATCH /api/admin/users/:userId/ps          — Manual PS adjustment with reason (logged in audit_logs)
```

### 3.2 Modified Routes

```
POST /api/ad-view               — Now calls Engine A split + Thorx Card + PS award
POST /api/tasks/:id/verify      — Engine B or Engine C split based on task type; PS award per engine
POST /api/withdrawals           — New bulletproof ledger math; S-Rank auto-approve
POST /api/guilds                — Gate: userRankTier must be B-Rank or higher
POST /api/guilds/:id/join       — Gate: userRankTier must be D-Rank or higher; check minRankRequired
GET  /api/guilds                — Simple users see discovery view; members see their guild
GET  /api/referrals             — Return only L1 data
GET  /api/commissions           — Return only from referral_commissions table (new)
GET  /api/dashboard/stats       — Add performanceScore, userRankTier, streakDays to response
GET  /api/user                  — Add performanceScore, userRankTier, guildRole, guildId
```

### 3.3 Rank-Gate Middleware

**File:** `server/middleware/rankGate.ts` (NEW)

```typescript
function requireMinRank(minRank: string) {
  return (req, res, next) => {
    const userRank = req.session.user?.userRankTier ?? 'E-Rank';
    if (RANK_ORDER[userRank] < RANK_ORDER[minRank]) {
      return res.status(403).json({
        message: `This action requires ${minRank} or higher. You are ${userRank}.`,
        error: 'RANK_GATE',
        currentRank: userRank,
        requiredRank: minRank
      });
    }
    next();
  };
}

const RANK_ORDER = { 'E-Rank': 0, 'D-Rank': 1, 'C-Rank': 2, 'B-Rank': 3, 'A-Rank': 4, 'S-Rank': 5 };
```

---

## PHASE 4 — USER PORTAL OVERHAUL (Frontend)

### 4.1 Three-Portal Routing System

**File:** `client/src/pages/UserPortal.tsx`

The Engine C section must dynamically render based on `users.guildRole`:

```typescript
// Current: single GuildVaultPanel for everyone
// New: conditional portal
const engineCPanel = () => {
  if (user.guildRole === 'captain') return <CaptainPortal />;
  if (user.guildRole === 'member') return <GuildMemberPanel />;
  return <GuildDiscoveryPanel />;  // 'simple' users and applicants waiting
};
```

**Navigation label:** "Engine C" tab (or equivalent current label) must also change its badge to show guild name if member, "Captain" crown icon if captain, or "Join a Guild" if simple.

---

### 4.2 E-Rank Display System

**Files:** `client/src/lib/rankAvatars.ts`, any rank badge components

- Replace all occurrences of "Nawa Aya", "Chota Don", "Bawa Ji", "Haji Sab", "Chacha Supreme" with E/D/C/B/A/S rank labels throughout the UI
- Add rank badge component with color system:

| Rank | Color | Icon |
|---|---|---|
| E-Rank | Gray / Zinc | Basic shield |
| D-Rank | Green | Bronze shield |
| C-Rank | Blue | Silver shield |
| B-Rank | Purple | Gold shield |
| A-Rank | Orange | Platinum crown |
| S-Rank | Red/Gold gradient | Legendary crown |

- Update `rankAvatars.ts` to map E/D/C/B/A/S → avatar sets
- Every place the user's rank is displayed (profile, leaderboard, guild roster, application card) must show the new badge

---

### 4.3 PS Progress Bar & Rank Display

**File:** `client/src/components/UserStats.tsx` (or equivalent stats card)

Add a PS progress section showing:
- Current PS number
- Current rank badge
- Progress bar to next rank threshold
- Streak counter (fire emoji + streak days)
- Small tooltip: "What does my rank unlock?"

---

### 4.4 Thorx Card Reveal UI

**File:** `client/src/components/ThorxCard.tsx` (NEW)

When a user completes Engine A/B/C task:
1. Show a card flip animation (front: THORX logo, back: point amount)
2. Large point number with glow effect and ± indicator vs. base
3. Sub-text: "Real value locked: Rs. [realPkrValue]" (shown in small gray text)
4. Dismiss button returns to dashboard with updated balance

**Trigger:** Any endpoint that creates a `user_transactions` record should return a `thorxCard: { pointsCredited, realPkrValue, cardVariance }` payload in the response for the UI to display.

---

### 4.5 Guild Public Discovery Panel

**File:** `client/src/components/guild/GuildDiscoveryPanel.tsx` (NEW — replaces simple guild list for Simple users)

Features:
- **GPS Leaderboard:** Guilds sorted by `guildPerformanceScore` descending
- **Guild cards:** Name, description, avatar, guildRankTier badge (E-S), GPS score, member count / capacity, min rank required
- **Available slots indicator:** "3 slots open" / "Full"
- **Apply button:** Only if user.userRankTier ≥ guild.minRankRequired AND guild has capacity
- **Application modal:** Text area for cover letter (required, min 50 chars), submit → `POST /api/guilds/:id/join`
- **Pending state:** If user has pending application, show "Application Pending" card with guild name
- **Rank gate UI:** If user doesn't meet minRankRequired, show "You need D-Rank to apply. You are E-Rank." with PS progress

---

### 4.6 Guild Member Panel

**File:** `client/src/components/guild/GuildMemberPanel.tsx` (ENHANCE existing GuildVaultPanel.tsx)

New sections to add:
1. **Weekly Target Progress Bar:** `currentWeeklyPoints / weeklyTarget × 100%` with color (green approaching, red failing)
2. **Contribution Board:** My points this week vs. top 5 members (mini leaderboard within guild)
3. **Guild Chat:** Already exists — keep, wire to new `chat_messages` with guildId scope
4. **Captain Direct Channel:** New tab/section — `GET /api/guilds/:id/dm/captainId` — WhatsApp-style 1-on-1 view
5. **Engine C Tasks:** Exclusive task list (currently basic) — filter by `type = 'Engine_C'` from daily_tasks
6. **GPS Badge:** Show guild's current GPS rank (E-S) and total GPS score

---

### 4.7 Captain Portal

**File:** `client/src/components/guild/CaptainPortal.tsx` (NEW — replaces current captain view in GuildVaultPanel)

Sections:
1. **Roster Controller:**
   - Table: member avatar, name, userRankTier badge, weekly points contributed, joined date
   - Actions per member: "Kick" button (with confirmation dialog), "Nudge" button (only if weeklyPoints === 0, disabled after use for 24h), "DM" button
   - Crown icon on captain row
   - Assistant Captain slot (if B-Rank GPS) with "Assign" dropdown

2. **Application Review Board:**
   - Pending applications list with: applicant name, userRankTier badge, PS score, cover letter text
   - Performance history: tasks completed (Engine A/B/C counts), fraudulent attempts from `risk_cases`
   - Accept / Reject buttons; Reject requires a reason text field (enforced, min 10 chars)

3. **Direct Member Channels:**
   - List of all members with unread DM count badge
   - Click to open 1-on-1 thread

4. **Weekly Goal Metrics:**
   - Bar chart: last 8 weeks of success/fail from `guild_weekly_snapshots`
   - Stats: Win rate %, average achieved points, biggest pool distributed
   - Current week progress with countdown timer to Sunday reset

5. **MVP Selection:**
   - "Select MVP" section — list of active members (contributed > 0 this week)
   - One member can be designated per week (button disabled after use until next reset)
   - Selected MVP gets a trophy badge on their guild profile card

6. **Guild Settings:**
   - Min rank required (dropdown: E-Rank to S-Rank)
   - Weekly target (read-only, set by admin)
   - Guild description / avatar update

---

### 4.8 Withdrawal Flow — Ledger Preview

**File:** `client/src/components/WithdrawalModal.tsx` (ENHANCE)

Before confirming withdrawal:
1. User enters point amount
2. UI calls `GET /api/withdrawals/preview?points=X`
3. Show breakdown:
   ```
   Points Requested:      10,000 pts
   Real PKR Value:        Rs. 100.00     ← from bulletproof ledger
   Platform Fee (15%):   - Rs. 15.00
   You Receive:           Rs. 85.00
   [If referrer exists]: Referral fee sent to [referrer name]: Rs. X.XX
   ```
4. Confirm button only enabled after user sees the breakdown

---

### 4.9 Profile Page Updates

**File:** wherever user profile is displayed (UserPortal, profile modal)

- Replace old rank badge with new E-S badge
- Add PS score prominently
- Add streak indicator
- Add guild name + guildRole badge (Captain crown / Member icon)
- Add MVP badge if `isMVP === true` in current week

---

## PHASE 5 — ADMIN & TEAM PORTAL UPDATES

### 5.1 Engine Profit Split Controls

**File:** `client/src/components/admin/SystemSettingsManager.tsx` (ENHANCE)

Add a new "Revenue Splits" section with labeled sliders/inputs:

```
Engine A (Ad Views):
  Thorx Cut: [40%] ← slider
  User Payout: [60%] ← auto-calculated, read-only

Engine B (CPA Offers):
  Thorx Cut: [40%] ← slider
  User Payout: [60%] ← auto-calculated, read-only

Engine C (Guild Tasks):
  Thorx Cut: [20%] ← slider
  Guild Bonus Pool: [35%] ← slider
  User Payout: [45%] ← auto-calculated, read-only
  
Referral Fee:
  Fee Share to Referrer (of 15% platform fee): [20%] ← slider
  
Thorx Card Variance:
  Min Multiplier: [0.80] ← input
  Max Multiplier: [1.20] ← input
  A-Rank Bonus: [5%] ← input
```

**Validation:** Engine C sliders must sum to 100% (enforce in UI + API).

---

### 5.2 Ledger Validator Tool

**File:** `client/src/components/admin/LedgerValidator.tsx` (NEW) → add to TeamPortal.tsx sections

Features:
- Search user by email/ID
- Show: Total pointsCredited from user_transactions vs. users.txPointsBalance (should match)
- Show: Sum of realPkrValue from user_transactions vs. users.totalEarnings (should match within rounding)
- Flag discrepancies with severity levels (red = critical mismatch, yellow = minor rounding)
- "Run Full System Check" button: calls `GET /api/admin/ledger/validate/all` — returns list of mismatched users
- Export to CSV

---

### 5.3 Thorx Card Simulation Sandbox

**File:** `client/src/components/admin/ThorxCardSandbox.tsx` (NEW) → add to TeamPortal.tsx

Features:
- Inputs: Gross PKR from network, Engine type (A/B/C), User rank (E-S), Number of simulations (1–1000)
- Shows:
  - Distribution histogram of point outcomes
  - Min / Max / Average / Median points
  - Corresponding realPkrValue that would be stored
  - "What withdrawal would yield" preview for the average outcome
- "Run Simulation" → calls `POST /api/admin/simulate/thorx-card`

---

### 5.4 Guild Moderation Panel (Extended)

**File:** `client/src/components/admin/GuildManager.tsx` (ENHANCE)

Add:
- **Weekly Target Override:** Input to set custom weeklyTarget for a specific guild (bypasses rank-based default)
- **Captain Replacement:** Search user → assign as new captain (existing captain demoted to member). Requires audit log entry.
- **GPS Manual Adjustment:** Input ± GPS amount + reason → logged in `audit_logs`
- **Force-Kick Member:** Admin can remove any member from any guild with reason
- **Guild Weekly History:** Show guild_weekly_snapshots table (success/fail history)

---

### 5.5 PS & Rank Admin Tools

**File:** `client/src/components/admin/UserManager.tsx` (ENHANCE)

Per user card/detail, add:
- Current PS value + rank badge
- "Adjust PS" button: input ±value + reason → `PATCH /api/admin/users/:userId/ps` → logged in audit_logs
- "Override Rank Tier" button: manual set → sets `rankLocked = true`, logs in rank_logs
- "Release Rank Lock" button: sets `rankLocked = false`, triggers re-evaluation

---

### 5.6 Admin Dashboard — Fix NaN Scores

**File:** `server/modules/health-engine.ts`

- Guard all division operations against zero denominators:
  ```typescript
  const ratio = totalUsers > 0 ? (flaggedUsers / totalUsers) * 100 : 0;
  ```
- Replace any `NaN` result with `0` before saving to health_snapshots
- Add `?? 0` fallback to all score aggregations
- Frontend: if score is null/undefined/NaN, display "–" not "NaN"

---

### 5.7 Updated Admin Dashboard Metrics

**File:** `client/src/components/admin/AdminDashboard.tsx` (ENHANCE)

Add:
- **Engine Revenue Breakdown card:** Engine A profit / Engine B profit / Engine C profit (separated by engineType from user_transactions)
- **Active Guild Count + GPS distribution** (how many E/D/C/B/A/S guilds)
- **PS Distribution** histogram (how many users at each rank tier)

---

## PHASE 6 — WEBSOCKET & REAL-TIME SYNC

**File:** `server/ws.ts` (or wherever WS is handled — identified as using express-session middleware on upgrade)

Add broadcast events for:
- `user.ps_updated` — fire when PS changes (rank progression, penalty)
- `user.rank_changed` — fire on rank tier change
- `guild.weekly_points` — fire when guild's currentWeeklyPoints updates (members see progress bar update live)
- `guild.pool_credited` — fire when Sunday reset distributes pool
- `guild.nudge_received` — fire when captain nudges a member
- `captain_dm.new_message` — fire when a DM is sent in a captain channel
- `guild.mvp_selected` — fire when MVP is designated

Client-side: add listeners in GuildMemberPanel and CaptainPortal to update state without polling.

---

## PHASE 7 — DATA INTEGRITY & MIGRATION

### 7.1 Migration Script

**File:** `scripts/migrate-to-spec.ts` (NEW)

Run order:
1. Add new columns to users (performanceScore, userRankTier, guildRole, guildId, lastActiveAt, etc.)
2. Backfill `userRankTier` from existing `rank` column (map old names → E-S via earnings proxy)
3. Backfill `guildId` + `guildRole` from guild_members + guilds.captainId
4. Create `user_transactions` table
5. Create `captain_messages` table
6. Create `guild_weekly_snapshots` table
7. Create `referral_commissions` table
8. Add `isMVP` + `weeklyPointsContributed` to guild_members (already has weeklyPoints)
9. Add `guildRankTier`, `memberCapacity`, `guildPerformanceScore`, `weeklyBonusPool` to guilds
10. Add `assistantCaptainId` to guilds
11. Seed `user_transactions` from existing `earnings` records (best-effort: use amount as realPkrValue, generate synthetic pointsCredited using current conversion rate, variance = 1.0)
12. Run `npx drizzle-kit push --force` equivalent via executeSql

### 7.2 Rank Name Sunset

All these strings must be replaced across the entire codebase (grep and replace):
```
"Nawa Aya"       → "E-Rank"
"Chota Don"      → "D-Rank"  
"Bawa Ji"        → "C-Rank"
"Haji Sab"       → "B-Rank"
"Chacha Supreme" → "S-Rank"
```

Search paths: `shared/schema.ts`, `server/storage.ts`, `server/routes.ts`, `client/src/**`, `server/modules/**`

---

## PHASE 8 — TESTING CHECKLIST

After implementation, verify each of the following manually:

### Auth & PS Engine
- [ ] Register new user → lands at E-Rank, PS = 0
- [ ] Complete Engine A ad → PS +5, txPointsBalance increases, user_transactions record created
- [ ] Complete Engine B CPA → PS +25; E-Rank user cannot access premium CPA (403 with rank message)
- [ ] PS reaches 1000 → auto-upgrade to D-Rank, notification fires, WS broadcast
- [ ] PS reaches 6000 → B-Rank unlocked, can now create guild
- [ ] User inactive 48h → PS drops 10, capped at 0

### Thorx Card
- [ ] Ad completion returns `thorxCard` payload in response
- [ ] Points credited ≠ base target (variance is applied)
- [ ] `realPkrValue` in user_transactions is exact user PKR share (no variance)
- [ ] A-Rank user has wider variance range

### Guild System
- [ ] E-Rank user tries to join guild → 403 "need D-Rank"
- [ ] D-Rank user can apply with cover letter
- [ ] E-Rank user tries to create guild → 403 "need B-Rank"
- [ ] Captain sees application with PS score + cover letter + Engine history
- [ ] Captain rejects with required reason → applicant notified
- [ ] Captain accepts → user.guildRole = 'member', guildId set, portal switches to Member view
- [ ] Captain nudges zero-contribution member → notification delivered, nudge button disabled 24h
- [ ] Captain selects MVP → GPS +200, member gets trophy badge, button locked for 7 days
- [ ] Engine C task completed → user gets 45% as PKR, guild pool gets 35%, Thorx gets 20%

### Sunday Reset
- [ ] Guild hits weekly target → captain gets 30% of pool, active members share 70% proportional
- [ ] Guild misses target → pool voided, guild_weekly_snapshots records wasSuccessful=false
- [ ] After reset: weeklyBonusPool = 0, currentWeeklyPoints = 0, member weeklyPointsContributed = 0

### Withdrawal Ledger
- [ ] Preview endpoint returns exact PKR from user_transactions (not just balance conversion)
- [ ] S-Rank user withdrawal auto-approved (status = 'approved' immediately)
- [ ] Referral commission written to referral_commissions table (not commission_logs)
- [ ] No L2 referral commission ever created

### Admin
- [ ] Engine split sliders save correctly, next earn event uses new percentages
- [ ] Ledger validator detects synthetic mismatch in test user
- [ ] Thorx Card sandbox generates realistic distribution
- [ ] Captain replacement via admin logs to audit_logs
- [ ] NaN scores no longer appear in System Health dashboard

---

## FILE CHANGE MAP

```
NEW FILES:
  server/modules/thorx-card.ts
  server/modules/ps-engine.ts
  server/modules/gps-engine.ts
  server/middleware/rankGate.ts
  server/modules/nudge.ts
  scripts/migrate-to-spec.ts
  client/src/components/guild/GuildDiscoveryPanel.tsx
  client/src/components/guild/GuildMemberPanel.tsx       ← replaces/extends GuildVaultPanel
  client/src/components/guild/CaptainPortal.tsx
  client/src/components/ThorxCard.tsx
  client/src/components/admin/LedgerValidator.tsx
  client/src/components/admin/ThorxCardSandbox.tsx

HEAVILY MODIFIED:
  shared/schema.ts                        ← new tables, new columns
  server/storage.ts                       ← recordEarnEvent rewrite, rank rewrite
  server/routes.ts                        ← new routes, modified withdrawal/guild/ad routes
  server/index.ts                         ← new cron jobs
  server/modules/guild-reset.ts           ← Sunday night logic
  server/modules/health-engine.ts         ← NaN fixes
  client/src/pages/UserPortal.tsx         ← three-portal routing
  client/src/lib/rankAvatars.ts           ← E-S rank mapping
  client/src/components/admin/SystemSettingsManager.tsx  ← engine split sliders
  client/src/components/admin/GuildManager.tsx           ← extended moderation
  client/src/components/admin/UserManager.tsx            ← PS override tools
  client/src/components/admin/AdminDashboard.tsx         ← engine revenue breakdown, NaN fix

LIGHT MODIFICATIONS:
  client/src/components/WithdrawalModal.tsx  ← ledger preview
  client/src/components/guild/GuildVaultPanel.tsx  ← absorbed into GuildMemberPanel
  server/middleware/csrf.ts               ← no change
  server/middleware/auth.ts              ← add lastActiveAt touch
```

---

## EXECUTION ORDER (Dependency Chain)

```
1. Phase 7.1 (Migration Script + DB schema) — everything depends on this
2. Phase 1 (shared/schema.ts) — required before any server changes
3. Phase 2.1 (thorx-card.ts) — required before 2.2
4. Phase 2.2 (Engine splits) — required before 2.7 (withdrawal)
5. Phase 2.3 (PS engine) — required before 2.4 (rank rewrite)
6. Phase 2.4 (rank rewrite) — required before 3.3 (rank gate middleware)
7. Phase 2.5 (GPS engine) — can parallel with 2.3/2.4
8. Phase 2.6 (Sunday reset) — requires 2.5
9. Phase 2.7 (Withdrawal) — requires 2.2 + user_transactions table
10. Phase 2.8 (1-tier cleanup) — independent, can run anytime after schema
11. Phase 3 (Routes) — requires all Phase 2 modules
12. Phase 6 (WebSocket events) — requires Phase 2 + 3
13. Phase 4 (User Portal) — requires Phase 3 APIs to exist
14. Phase 5 (Admin Portal) — requires Phase 3 APIs to exist
15. Phase 8 (Testing) — final
```

---

## KEY ARCHITECTURAL DECISIONS

1. **Dual-ledger design is non-negotiable.** `user_transactions.realPkrValue` is the financial ground truth. `txPointsBalance` is display-only. Withdrawal math must ALWAYS trace from the ledger, never from point balance arithmetic.

2. **PS is the single rank driver.** `users.performanceScore` is the only input to `checkAndUpdateRankTier()`. Old totalEarnings-based ranking is retired. Old rank name strings are fully purged.

3. **Engine type determines the profit split.** The `engineType` field in `user_transactions` and `ad_views` / `task_records` must be correctly set at earn time — it drives revenue accounting.

4. **Guild role is derived from DB state, not a flag.** `users.guildRole` is set by the guild join/leave/kick system, not manually. The portal routing reads this field authoritatively.

5. **All new commission writes go to `referral_commissions`.** The `commission_logs` table is preserved for historical display only (read-only going forward).

6. **Sunday reset is the only pool distribution path.** No mid-week payouts from the guild pool. Admin can trigger it early via the existing `/api/admin/guild-cycles/run-resolution` endpoint, which must be updated to use the new reset logic.
