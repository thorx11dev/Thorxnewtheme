# THORX — MASTER IMPLEMENTATION BLUEPRINT (DEFINITIVE)

> Sources: All three attached spec files + full codebase exploration (schema, routes, storage, client, admin)
> Last updated: July 2026 — canonical work order, supersedes all prior drafts
> Every phase wires into existing features. Nothing is built in isolation.

---

## PART 0 — WHAT IS BEING REMOVED (Do First)

These features exist in the current codebase and **must be fully deleted** before new features are built. Leaving them creates logical conflicts.

| What to Remove | Where It Lives | Replacement |
|---|---|---|
| Multi-level referral (L1 / L2) | `commission_logs.level`, `referrals.tier`, leaderboard `level2Count` | 1-tier `referral_commissions` table |
| Daily Task System (mandatory daily tasks to unlock payout) | `daily_tasks`, `task_records`, all "complete daily task before withdrawal" gates | Guild Task Panel (Engine C) — no withdrawal gate |
| Rally system | `POST /api/guilds/:id/rally`, rally cooldown logic | Removed entirely — no replacement |
| Old "admin fee + platform fee" dual deduction on withdrawal | `server/storage.ts` withdrawal calc, commission_logs deduction | Single 15% platform fee only |
| Old Vault / Locked Points terminology in any user-facing string | All user-facing components, notifications, labels | "Guild Weekly Bonus Pool" exclusively |
| Old rank names (Nawa Aya / Chota Don / Bawa Ji / Haji Sab / Chacha Supreme) | `shared/schema.ts`, `server/storage.ts`, all client components, `rankAvatars.ts` | E-Rank / D-Rank / C-Rank / B-Rank / A-Rank / S-Rank |
| totalEarnings-based rank progression | `checkAndUpdateRank()` in `server/storage.ts` | PS-based `checkAndUpdateRankTier()` |
| `VAULT_HOLD_PCT` single-config split | `system_config`, `bootstrapConfig()` | Per-engine split keys |
| Multi-engine-chat confusion (old Engine C = referral layer) | Any code treating Engine C as referral | Engine C = Guild Tasks exclusively |

**String grep targets for removal:**
```
"Nawa Aya" "Chota Don" "Bawa Ji" "Haji Sab" "Chacha Supreme"
"Vault" (user-facing only — keep in backend column names)
"Locked Points" "locked_points"
"rally" "RALLY" (routes, storage methods, UI)
"level2" "L2" "tier_2" (referral context)
"daily_tasks" gate checks in withdrawal flow
```

---

## PART 1 — SYSTEM OVERVIEW & LEGAL COMPLIANCE

THORX is now a fully 1-tier, legally compliant Pakistan earning platform. The three revenue sources are:

1. **15% withdrawal platform fee** — charged on the real PKR value behind user's TX-Points when they withdraw. The user sees "Net Receivable: Rs. X" — the fee is never labelled as "secret" to the user but the math happens transparently in the backend. A portion of this fee (admin-configurable, default 30%) goes to the user's direct referrer.

2. **Indirect organic traffic tasks in Engine C** — Guild task panel includes tasks like "Subscribe to Thorx YouTube", "Watch this video and enter the code", "Follow Thorx TikTok". These generate indirect ad revenue / organic growth for Thorx at zero monetary cost.

3. **40% platform profit cut on all Engine A & B tasks; 20% on Engine C tasks** — automatically deducted before any user payout is calculated. Users only see the points they receive, never the gross network payout.

---

## PART 2 — THREE USER TYPES & PORTAL ROUTING

### 2.1 User Classification

Every authenticated user has a `guildRole` field that determines which portal they see for Engine C:

| Type | guildRole value | Engine C Default View | Can Access |
|---|---|---|---|
| Simple User | `'simple'` | Public Guild Discovery Area | Engine A + Engine B only |
| Guild Member | `'member'` | Guild Member Panel | Engine A + B + C |
| Guild Captain | `'captain'` | Captain Portal | Engine A + B + C + Captain tools |

**Rule:** Simple users who have a **pending** application show a "Application Pending" waiting screen instead of the Discovery Area.

### 2.2 Dashboard Summary Cards (Three Different Experiences)

**File:** `client/src/pages/UserPortal.tsx`

Each user type sees a different set of summary cards at the top of their dashboard:

**Simple User cards:**
- Total TX-Points Balance
- Available Withdrawal (Rs.)
- Performance Score + Rank badge + progress to next rank
- Referral count + referral balance (balance_cash_pkr)
- "Join a Guild" CTA card with teaser of bonus potential

**Guild Member cards:**
- Total TX-Points Balance
- This Week's Contribution (personal points contributed to guild this week)
- Guild Weekly Progress (X / Target points, % bar)
- "Sunday Bonus Status" — "In Progress" / "Target Hit! Bonus incoming Sunday night"
- Performance Score + Rank badge

**Guild Captain cards:**
- Guild GPS Score + Guild Rank badge
- Total Members / Capacity (e.g., "8 / 10")
- Pending Join Requests count (with red badge if > 0)
- Weekly Target Progress (full guild, same as member view but with management context)
- This week's Inactive Members count (zero-contribution members)

---

## PART 3 — THE THREE EARNING ENGINES

### 3.1 Engine A — Ad Tasks (Video Ads)

**Who can use:** All users (E-Rank+)

**Revenue math (all backend, never shown to user):**
```
Network gross revenue = R (e.g., Rs. 10.00)
Thorx profit cut      = R × ENGINE_A_THORX_CUT_PCT / 100  → Thorx reserve  (e.g., Rs. 4.00)
User PKR share        = R × ENGINE_A_USER_CUT_PCT / 100   → goes to Thorx Card engine (e.g., Rs. 6.00)
```

**User sees:** A "Thorx Card" animation showing random TX-Points (e.g., 520 pts or 680 pts)

**PS awarded:** +5 PS per completion

### 3.2 Engine B — CPA Offers (Premium Offers / App Installs)

**Who can use:** C-Rank and above (rank gate enforced at route level)

**Revenue math:** Identical split to Engine A (40% Thorx / 60% user)

**PS awarded:** +25 PS per completion

**Unlock gate:** Users below C-Rank see Engine B section as locked with progress bar showing how much PS needed.

### 3.3 Engine C — Guild Tasks

**Who can use:** Guild Members and Captains only (guildRole = 'member' | 'captain')

**Task types in Engine C panel:**
1. **CPA Offer tasks** — same type as Engine B but exclusive to guild members, higher payouts. Team portal can toggle which CPA offers appear in Engine C vs public Engine B.
2. **Indirect tasks** — "Subscribe to Thorx YouTube channel", "Watch this video and submit the code", "Follow Thorx TikTok", etc. These generate 100% indirect revenue for Thorx. Admin creates and manages these in Team Portal.

**Revenue math for Engine C CPA/Offer tasks:**
```
Network gross revenue  = R (e.g., Rs. 10.00)
Thorx direct profit    = R × ENGINE_C_THORX_CUT_PCT / 100       → Thorx reserve (e.g., Rs. 2.00 = 20%)
Guild Weekly Bonus Pool= R × ENGINE_C_GUILD_POOL_PCT / 100      → guilds.weeklyBonusPool (e.g., Rs. 3.50 = 35%)
  (internally: 20% bonus pool + 15% vault pool, merged as one)
User immediate payout  = R × ENGINE_C_USER_CUT_PCT / 100        → Thorx Card engine (e.g., Rs. 4.50 = 45%)
```

**Revenue math for indirect tasks (YouTube subscribe, etc.):**
```
100% indirect organic value → Thorx (no monetary payout to user from these tasks)
User receives: +15 PS only, plus their standard guild contribution tracking
```

**Critical UX rule — NEVER show in user UI:**
- The word "Vault"
- The word "Locked Points"
- The exact accumulated pool amount
- Any breakdown of the 35% pool

**What users DO see:** "If your Guild hits the weekly target, everyone gets a Sunday Bonus! 🎁"

**PS awarded:** +15 PS per Engine C task completion

---

## PART 4 — THE THORX CARD (RANDOM REWARD ENGINE)

### 4.1 Concept

Every time a user completes an Engine A, B, or C task that has a monetary payout, instead of receiving a fixed point amount, they receive a **Thorx Card** — a gamified reveal showing a random point amount. The randomness is visual only. The backend always stores the exact real PKR value.

### 4.2 The Math

```
Step 1: Calculate target points
  targetPoints = (userPkrShare / 10.00) × CONVERSION_RATE
  (e.g., Rs. 6.00 user share, rate = 1000 pts per Rs.10 → targetPoints = 600)

Step 2: Apply rank bonus to variance bounds
  baseMin = CARD_VARIANCE_MIN  (default 0.80)
  baseMax = CARD_VARIANCE_MAX  (default 1.20)
  if userRankTier === 'A-Rank': min -= 0.05, max += 0.05  → (0.75 – 1.25)
  if userRankTier === 'S-Rank': min -= 0.10, max += 0.10  → (0.70 – 1.30)

Step 3: Generate random card value
  cardVariance = random float between min and max
  pointsCredited = Math.round(targetPoints × cardVariance)
  (e.g., 600 × 1.08 = 648 points shown on card)

Step 4: Store dual-ledger entry
  INSERT INTO user_transactions:
    engineType      = 'Engine_A' | 'Engine_B' | 'Engine_C'
    pointsCredited  = 648           ← shown to user on card
    realPkrValue    = 6.00          ← NEVER affected by variance, always exact
    conversionRate  = 1000          ← snapshot
    cardVariance    = 1.08          ← logged for audit
    sourceId        = ad_view.id or task_record.id
```

### 4.3 Why Thorx Cannot Lose Money

- **Thorx profit cut happens before the card is drawn** — the 40%/20% is already deducted from gross before `userPkrShare` is even calculated
- **Withdrawal uses `realPkrValue`**, not points math — even if a user got 1.5x card variance, withdrawal only pays out Rs. 6.00, not Rs. 9.00
- **Double profit**: Thorx earns at task completion (Engine cut) AND at withdrawal (15% fee)

### 4.4 Thorx Card UI Component

**File:** `client/src/components/ThorxCard.tsx` (NEW)

Trigger: API response from any earn endpoint includes `thorxCard: { pointsCredited, realPkrValue, cardVariance }` payload.

UI flow:
1. Card face-down animation (THORX logo, dark background)
2. User taps → card flips
3. Large animated point number reveals (e.g., "648 TX-Points")
4. Subtle sub-text in small muted font: "Locked value: Rs. 6.00"
5. "Claim" button → dismisses card, updates dashboard balance counters

**Rule:** Never show the word "Vault" on the card. Show "Locked value" or "Saved value".

---

## PART 5 — THE BULLETPROOF WITHDRAWAL LEDGER

### 5.1 How Withdrawal PKR is Calculated

**File:** `server/storage.ts` → new `calculateWithdrawalBreakdown(userId, pointsRequested)`

```typescript
async function calculateWithdrawalBreakdown(userId: string, pointsRequested: number) {
  // Step 1: FIFO sum of real_pkr_value from user_transactions
  // Walk transactions oldest-first until cumulative pointsCredited >= pointsRequested
  // The sum of realPkrValue for those records = exactPkr
  
  const exactPkr = await sumLedgerPkr(userId, pointsRequested); // e.g., Rs. 100.00

  // Step 2: Apply 15% platform fee
  const feeRate = await getConfig('WITHDRAWAL_FEE_PCT') / 100;  // default 0.15
  const platformFee = exactPkr × feeRate;                        // e.g., Rs. 15.00

  // Step 3: Referral commission split (from the fee, not from user's payout)
  const referrer = await getReferrerOf(userId);
  let referralCommission = 0;
  if (referrer) {
    const refRate = await getConfig('REFERRAL_FEE_SHARE_PCT') / 100; // default 0.30
    referralCommission = platformFee × refRate;  // e.g., Rs. 15.00 × 0.30 = Rs. 4.50
    // Thorx net from fee = platformFee - referralCommission = Rs. 10.50
  }

  const userNetPkr = exactPkr - platformFee;  // e.g., Rs. 85.00

  return { exactPkr, platformFee, referralCommission, userNetPkr, referrerId: referrer?.id };
}
```

### 5.2 Referral Math (Concrete Example)

User B (invited by User A) withdraws 10,000 TX-Points:

```
real_pkr_value from ledger  = Rs. 100.00
15% platform fee             = Rs. 15.00
User B receives              = Rs. 85.00

Fee split (if REFERRAL_FEE_SHARE_PCT = 30%):
  User A commission          = Rs. 15.00 × 30% = Rs. 4.50  → credited to users.balanceCashPkr
  Thorx net profit           = Rs. 15.00 - Rs. 4.50 = Rs. 10.50

INSERT referral_commissions(referrerId=UserA, inviteeId=UserB, withdrawalId, amount=4.50, rate=0.30)
UPDATE users SET balanceCashPkr = balanceCashPkr + 4.50 WHERE id = UserA
```

**User A's referral cash (`balanceCashPkr`) is separate from TX-Points** and can be withdrawn independently.

### 5.3 S-Rank Fast Track

If `users.userRankTier === 'S-Rank'`: withdrawal `status` is set to `'approved'` immediately on creation — no admin review required.

### 5.4 Withdrawal Preview Endpoint

**Route:** `GET /api/withdrawals/preview?points=X`

Returns the full breakdown before user confirms:
```json
{
  "pointsRequested": 10000,
  "realPkrFromLedger": 100.00,
  "platformFee": 15.00,
  "feePercent": 15,
  "referralCommission": 4.50,
  "referrerName": "Ahmad K.",
  "userNetPkr": 85.00,
  "sRankFastTrack": false
}
```

### 5.5 User-Facing Withdrawal Summary (UI)

**File:** `client/src/components/WithdrawalModal.tsx`

Show this breakdown before confirm:
```
Points Requested:        10,000 TX-Points
Real Value:              Rs. 100.00
Platform Fee (15%):    − Rs. 15.00
You Receive:             Rs. 85.00
─────────────────────────────────────
Referral bonus to [Ahmad K.]: Rs. 4.50  (shown only if referrer exists)
```

Confirm button only activates after user has seen this screen for ≥2 seconds.

---

## PART 6 — PERFORMANCE SCORE (PS) & USER RANK SYSTEM

### 6.1 PS Accrual Rules

| Event | PS Awarded |
|---|---|
| Engine A task completed | +5 PS |
| Engine B task completed | +25 PS |
| Engine C task completed | +15 PS |
| Daily streak — Day 1 | +5 PS |
| Daily streak — Day 2 | +10 PS |
| Daily streak — Day 3 and every day after (unbroken) | +20 PS |
| Streak broken (missed a day) | Resets to Day 1 (+5) on next activity |
| Inactivity ≥ 48 consecutive hours | −10 PS per day (capped at 0, never negative) |

**Streak logic:** A "day" is a calendar day (PKT timezone). If user completes at least 1 task on consecutive calendar days, streak increments. If they miss a calendar day entirely, streak resets to 1 on next login.

### 6.2 User Rank Tiers

| Rank | PS Required | Unlocks / Perks |
|---|---|---|
| E-Rank | 0 – 999 | Engine A tasks only. Cannot join/create guilds. |
| D-Rank | 1,000 – 2,999 | Can apply to join guilds. |
| C-Rank | 3,000 – 5,999 | Engine B (premium CPA) unlocked. |
| B-Rank | 6,000 – 9,999 | Can create a guild (become Captain). |
| A-Rank | 10,000 – 19,999 | Thorx Card variance expands ±5% (wider jackpot range). |
| S-Rank | 20,000+ | Auto-approved withdrawals (within 2 hours) + exclusive CPA offers. |

### 6.3 Rank Thresholds as Admin-Configurable Values

Store in `system_config` so admin can change without code deploy:
```
PS_RANK_E_MAX    = 999
PS_RANK_D_MIN    = 1000
PS_RANK_D_MAX    = 2999
PS_RANK_C_MIN    = 3000
PS_RANK_C_MAX    = 5999
PS_RANK_B_MIN    = 6000
PS_RANK_B_MAX    = 9999
PS_RANK_A_MIN    = 10000
PS_RANK_A_MAX    = 19999
PS_RANK_S_MIN    = 20000
```

These are editable from the Admin → Ranks Customizer UI.

### 6.4 `checkAndUpdateRankTier()` — Full Rewrite

**File:** `server/storage.ts`

```typescript
async function checkAndUpdateRankTier(userId: string): Promise<void> {
  const user = await getUser(userId);
  if (user.rankLocked) return;

  const ps = user.performanceScore;
  const thresholds = await getRankThresholds(); // reads from system_config
  
  const newRank = computeRankFromPS(ps, thresholds);
  if (newRank === user.userRankTier) return;

  await db.update(users).set({ userRankTier: newRank }).where(eq(users.id, userId));
  await db.insert(rank_logs).values({ userId, oldRank: user.userRankTier, newRank, triggerSource: 'ps_engine' });
  
  // Auto-assign rank avatar if user still has default
  await assignRankAvatar(userId, newRank);
  
  // Push notification + WS broadcast
  await createNotification(userId, `You've reached ${newRank}! ${RANK_UNLOCK_DESCRIPTIONS[newRank]}`);
  await broadcastUserUpdated(userId);
}
```

Keep `checkAndUpdateRank()` as deprecated alias pointing to new function.

---

## PART 7 — GUILD SYSTEM

### 7.1 Guild Philosophy (The Job Market Analogy)

Every UX decision in the guild system must reinforce this feeling:
- **Creating a guild** → feels like registering your own business
- **Joining a guild** → feels like applying for a job
- **Cover letter** → feels like writing a job proposal / showcasing your skills
- **Captain reviewing applications** → feels like an owner reviewing job applications
- **Captain managing roster** → feels like a business owner managing employees
- **Being kicked** → feels like being let go from a job
- **Guild tasks** → feels like daily work assignments from the boss
- **Sunday bonus** → feels like the company's weekly performance bonus

### 7.2 Guild Discovery (Public Area — All Users See This)

**File:** `client/src/components/guild/GuildDiscoveryPanel.tsx` (NEW)

Visible to: Simple users, guild members, captains — everyone can browse. Guild members and captains see it as a secondary tab, not their default.

**What is displayed per guild card:**
- Guild name, avatar, description
- Guild Rank badge (E-S with color)
- Guild Performance Score (GPS total)
- Total TX-Points ever earned by guild (shown as points, never PKR)
- Total Weekly Bonus distributed (shown as points)
- Current member count / capacity (e.g., "7 / 10")
- Minimum rank required to apply
- "Slots Available" indicator

**Ranking:** Sorted by GPS descending (highest GPS = top of leaderboard)

**Application flow:**
1. User must meet `minRankRequired` set by captain (enforced client + server)
2. If eligible and slot available: "Apply to Join" button appears
3. Modal opens with a text area: "Write your application letter — tell the Captain why you'd be a great team member and what you can contribute"
4. Minimum 50 characters enforced
5. Submit → `POST /api/guilds/:id/join` with `coverLetter` in body
6. User sees "Application Submitted" status on that guild card

**Rank gate message (if user rank < minRankRequired):** "This guild requires D-Rank or higher. You are E-Rank. Earn 1,000 PS to qualify." (with progress bar)

### 7.3 Guild Member Panel (Workers Hub)

**File:** `client/src/components/guild/GuildMemberPanel.tsx` (REPLACES GuildVaultPanel.tsx)

**Default view for guildRole = 'member'**

Sections:

**A. Weekly Target Tracker (top of panel)**
- Full-width progress bar: `currentWeeklyPoints / weeklyTarget × 100%`
- Color coding: 0-50% = orange, 50-90% = yellow, 90-100% = green, 100%+ = celebration state
- Status text:
  - Below target: "Weekly Target: In Progress — Keep going!"
  - 100%+ hit: "🎉 Target Achieved! Sunday Bonus unlocking this week."
- Countdown timer to Sunday 11:59 PM PKT

**B. Contribution Board**
- "My Contribution This Week: 2,500 TX-Points"
- Top 5 internal leaderboard (guild members ranked by weeklyPointsContributed)
- User's own position highlighted even if outside top 5

**C. Engine C Task List**
- CPA offers exclusive to guild (fetched by `GET /api/guilds/weekly-tasks`)
- Indirect tasks (YouTube/TikTok etc.) — clearly labelled "Indirect Task — No Points, Boosts Guild"
- Each task shows: payout estimate (in points, randomised display), engine type badge
- On completion: Thorx Card animation fires

**D. Team Communication**
- "Guild Chat" tab — WhatsApp-style group chat (`GET/POST /api/guilds/:id/chat`)
- "Captain Channel" tab — 1-on-1 DM with captain only (`GET/POST /api/guilds/:id/dm/captainId`)
- Unread message badge on each tab

**E. Guild Info Footer**
- Guild GPS score + rank badge
- Captain name with crown icon
- Guild creation date

### 7.4 Captain Portal (Management Suite)

**File:** `client/src/components/guild/CaptainPortal.tsx` (NEW)

**Default view for guildRole = 'captain'**

**Section A — Join Request Queue**
- List of pending applications, newest first
- Per application card:
  - Applicant name + userRankTier badge + PS score
  - Performance history: Engine A completed, Engine B completed, Engine C completed, failed/fraudulent attempts (from risk_cases)
  - Cover letter text (full, scrollable)
  - "Accept" button → sets guildRole='member', guildId, updates guild member count
  - "Reject" button → opens required text field "Why are you rejecting?" (min 10 chars enforced) → sends rejection notification to applicant
- Feels like reviewing a job application

**Section B — Roster Management**
- Table of all guild members:
  - Avatar, name, userRankTier badge
  - "This week's contribution" (weeklyPointsContributed) — highlighted red if 0
  - Join date
- Per-member actions:
  - **[Kick]** button with confirmation dialog: "Are you sure? This member will be removed from the guild."
  - **[Nudge]** button — only shown if weeklyPointsContributed === 0, disabled for 24h after use. Sends: "Yar, aap ke Captain ne yaad kiya hai! Jaldi se team tasks complete karo taake Sunday ka bonus miss na ho! 🚨"
  - **[DM]** button → opens captain channel with that member
  - **[Set as MVP]** button — one use per week, only available if member has contribution > 0
- Crown icon next to captain's own row
- "Assign Assistant Captain" option appears if guild GPS ≥ B-Rank (70,000 GPS)

**Section C — Direct Member Channels (DM Hub)**
- List of all members with:
  - Unread DM count badge
  - Last message preview
- Click to open 1-on-1 thread

**Section D — Weekly Goal Stats**
- Bar chart: last 8 weeks — green bar = success, red bar = fail
- Stats: Success rate %, average achieved points, largest bonus pool distributed
- Current week: live progress + countdown to Sunday
- (Optional) Target difficulty selector: Captain can choose Low / Medium / High preset (all within admin-configured limits per guild rank tier)

**Section E — Guild Settings**
- Guild name (editable)
- Description (editable)
- Profile photo (editable)
- Minimum rank to join (dropdown: E-Rank to S-Rank)
- Weekly target (read-only — set by admin based on guild rank)
- "Transfer Captain Role" → select any current member → confirm → captain becomes member, selected user becomes captain

### 7.5 Guild Performance Score (GPS) & Guild Ranks

**GPS Accrual:**
```
On every Engine C task completion by any member:
  GPS += pointsCredited × GPS_MEMBER_POINTS_PCT / 100   (default 10%)

On weekly target hit (Sunday reset, success path):
  GPS += GPS_MILESTONE_BONUS   (default 1,000)

On MVP selection by captain:
  GPS += GPS_MVP_BONUS         (default 200)
```

**Guild Rank Tiers:**

| Rank | GPS Required | Member Capacity | Perks |
|---|---|---|---|
| E-Rank | 0 – 9,999 | 10 | Standard |
| D-Rank | 10,000 – 29,999 | 15 | Standard weekly targets |
| C-Rank | 30,000 – 69,999 | 20 | Custom guild badge colors |
| B-Rank | 70,000 – 149,999 | 25 | Assistant Captain role unlocked |
| A-Rank | 150,000 – 299,999 | 30 | Featured in "Recommended Guilds" list |
| S-Rank | 300,000+ | 50 | Listed on Thorx homepage, Legendary badge |

**GPS thresholds are also admin-configurable** (stored in system_config, editable from Ranks Customizer in admin panel).

### 7.6 Sunday Night Guild Reset

**File:** `server/modules/guild-reset.ts`

**Cron schedule:** Sunday 23:59 PKT = Sunday 18:59 UTC
```typescript
cron.schedule('59 18 * * 0', runWeeklyGuildReset, { timezone: 'UTC' });
```

**Reset logic:**
```typescript
async function runWeeklyGuildReset() {
  const activeGuilds = await getAllActiveGuilds();
  
  for (const guild of activeGuilds) {
    if (guild.currentWeeklyPoints >= guild.weeklyTarget) {
      // SUCCESS PATH
      const pool = guild.weeklyBonusPool;
      const captainPkr = pool × 0.30;
      const memberPoolPkr = pool × 0.70;
      
      // Credit captain
      await creditUserBalance(guild.captainId, captainPkr);
      await createNotification(guild.captainId, `Guild bonus credited: Rs. ${captainPkr} (Captain's 30% share)`);
      
      // Credit active members proportionally
      const members = await getGuildMembersWithContribution(guild.id);
      const totalContrib = sum(members.map(m => m.weeklyPointsContributed));
      for (const member of members.filter(m => m.weeklyPointsContributed > 0)) {
        const share = memberPoolPkr × (member.weeklyPointsContributed / totalContrib);
        await creditUserBalance(member.userId, share);
        await createNotification(member.userId, `Sunday Guild Bonus credited: Rs. ${share}`);
      }
      
      // GPS milestone award
      await addGuildGPS(guild.id, GPS_MILESTONE_BONUS);
      
      // Snapshot: success
      await insertGuildWeeklySnapshot(guild.id, { wasSuccessful: true, poolDisposition: 'distributed', bonusPoolPkr: pool });

    } else {
      // FAIL PATH — pool voided to Thorx reserve
      await insertGuildWeeklySnapshot(guild.id, { wasSuccessful: false, poolDisposition: 'voided', bonusPoolPkr: guild.weeklyBonusPool });
    }
    
    // ALWAYS reset for new week
    await db.update(guilds).set({ currentWeeklyPoints: 0, weeklyBonusPool: 0 }).where(eq(guilds.id, guild.id));
    await db.update(guild_members).set({ weeklyPointsContributed: 0 }).where(eq(guild_members.guildId, guild.id));
  }
}
```

**Important:** User-facing notification says "Sunday Guild Bonus credited" — never "vault released" or "pool distributed".

---

## PART 8 — DATABASE SCHEMA CHANGES

### 8.1 Users Table — New Columns

```sql
ALTER TABLE users ADD COLUMN performanceScore integer DEFAULT 0;
ALTER TABLE users ADD COLUMN userRankTier text DEFAULT 'E-Rank';
ALTER TABLE users ADD COLUMN guildRole text DEFAULT 'simple';
ALTER TABLE users ADD COLUMN guildId text REFERENCES guilds(id);
ALTER TABLE users ADD COLUMN lastActiveAt timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN streakDays integer DEFAULT 0;
ALTER TABLE users ADD COLUMN lastStreakDate date;
ALTER TABLE users ADD COLUMN inactivityPenaltyAt timestamp;
ALTER TABLE users ADD COLUMN balanceCashPkr decimal(10,2) DEFAULT 0.00;
-- balanceCashPkr: referral commission earnings, withdrawable separately from TX-Points
```

**Drop / deprecate:**
- `rank` column → replaced by `userRankTier` (keep temporarily, remove after all references updated)
- `personalRank` → keep (separate guild-contribution axis, unchanged)

### 8.2 Guilds Table — New Columns

```sql
ALTER TABLE guilds ADD COLUMN guildPerformanceScore integer DEFAULT 0;
ALTER TABLE guilds ADD COLUMN guildRankTier text DEFAULT 'E-Rank';
ALTER TABLE guilds ADD COLUMN memberCapacity integer DEFAULT 10;
ALTER TABLE guilds ADD COLUMN minRankRequired text DEFAULT 'E-Rank';
ALTER TABLE guilds ADD COLUMN weeklyBonusPool decimal(12,4) DEFAULT 0;
ALTER TABLE guilds ADD COLUMN currentWeeklyPoints integer DEFAULT 0;
ALTER TABLE guilds ADD COLUMN weeklyTarget integer DEFAULT 50000;
ALTER TABLE guilds ADD COLUMN assistantCaptainId text REFERENCES users(id);
ALTER TABLE guilds ADD COLUMN targetDifficulty text DEFAULT 'medium'; -- 'low'|'medium'|'high'
```

### 8.3 Guild Members Table — New Columns

```sql
ALTER TABLE guild_members ADD COLUMN isMVP boolean DEFAULT false;
ALTER TABLE guild_members ADD COLUMN mvpSetAt timestamp;
ALTER TABLE guild_members ADD COLUMN lastNudgedAt timestamp;
-- weeklyPointsContributed already exists, verify it resets on Sunday
```

### 8.4 New Table — user_transactions

```sql
CREATE TABLE user_transactions (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId          text NOT NULL REFERENCES users(id),
  engineType      text NOT NULL,          -- 'Engine_A' | 'Engine_B' | 'Engine_C' | 'Indirect'
  pointsCredited  integer NOT NULL,       -- random card output shown to user
  realPkrValue    decimal(10,4) NOT NULL, -- exact backend PKR value, never changes
  grossPkr        decimal(10,4),          -- network gross before split (admin reference)
  thorxProfitPkr  decimal(10,4),          -- Thorx's cut from this transaction
  guildPoolPkr    decimal(10,4),          -- Engine C pool contribution (0 for A/B)
  conversionRate  integer NOT NULL,       -- snapshot of CONVERSION_RATE at earn time
  cardVariance    decimal(5,4) NOT NULL,  -- random multiplier used
  sourceId        text,                   -- ad_view.id or task_record.id
  withdrawn       boolean DEFAULT false,  -- true once consumed by a withdrawal
  withdrawalId    text,                   -- linked after withdrawal processes
  createdAt       timestamp DEFAULT now()
);

CREATE INDEX idx_user_transactions_user ON user_transactions(userId, createdAt);
CREATE INDEX idx_user_transactions_withdrawn ON user_transactions(userId, withdrawn);
```

### 8.5 New Table — referral_commissions

```sql
CREATE TABLE referral_commissions (
  id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrerId          text NOT NULL REFERENCES users(id),
  inviteeId           text NOT NULL REFERENCES users(id),
  withdrawalId        text REFERENCES withdrawals(id),
  commissionAmountPkr decimal(10,2) NOT NULL,
  feeRateUsed         decimal(5,4) NOT NULL,   -- snapshot of WITHDRAWAL_FEE_PCT
  refShareRateUsed    decimal(5,4) NOT NULL,   -- snapshot of REFERRAL_FEE_SHARE_PCT
  status              text DEFAULT 'paid',      -- always 'paid' on creation
  createdAt           timestamp DEFAULT now()
);
```

### 8.6 New Table — captain_messages

```sql
CREATE TABLE captain_messages (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guildId     text NOT NULL REFERENCES guilds(id),
  fromUserId  text NOT NULL REFERENCES users(id),
  toUserId    text NOT NULL REFERENCES users(id),
  message     text NOT NULL,
  isRead      boolean DEFAULT false,
  createdAt   timestamp DEFAULT now()
);

CREATE INDEX idx_captain_messages_thread ON captain_messages(guildId, fromUserId, toUserId);
```

### 8.7 New Table — guild_weekly_snapshots

```sql
CREATE TABLE guild_weekly_snapshots (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guildId         text NOT NULL REFERENCES guilds(id),
  weekStart       date NOT NULL,
  targetPoints    integer NOT NULL,
  achievedPoints  integer NOT NULL,
  wasSuccessful   boolean NOT NULL,
  bonusPoolPkr    decimal(12,4) NOT NULL,
  poolDisposition text NOT NULL,  -- 'distributed' | 'voided'
  captainShare    decimal(10,2) DEFAULT 0,
  createdAt       timestamp DEFAULT now()
);
```

### 8.8 New Config Keys (bootstrapConfig additions)

```typescript
// Engine splits
ENGINE_A_THORX_CUT_PCT    : 40
ENGINE_A_USER_CUT_PCT     : 60
ENGINE_B_THORX_CUT_PCT    : 40
ENGINE_B_USER_CUT_PCT     : 60
ENGINE_C_THORX_CUT_PCT    : 20
ENGINE_C_GUILD_POOL_PCT   : 35    // 20% bonus + 15% vault merged
ENGINE_C_USER_CUT_PCT     : 45

// Thorx Card
CARD_VARIANCE_MIN          : 0.80
CARD_VARIANCE_MAX          : 1.20
A_RANK_CARD_BONUS_PCT      : 5    // expand bounds by this at A-Rank
S_RANK_CARD_BONUS_PCT      : 10   // expand bounds by this at S-Rank

// PS system
PS_ENGINE_A_REWARD         : 5
PS_ENGINE_B_REWARD         : 25
PS_ENGINE_C_REWARD         : 15
PS_STREAK_DAY1             : 5
PS_STREAK_DAY2             : 10
PS_STREAK_DAY3_PLUS        : 20
PS_INACTIVITY_PENALTY      : 10
PS_INACTIVITY_HOURS        : 48

// PS rank thresholds (admin-editable)
PS_RANK_E_MAX              : 999
PS_RANK_D_MIN              : 1000
PS_RANK_D_MAX              : 2999
PS_RANK_C_MIN              : 3000
PS_RANK_C_MAX              : 5999
PS_RANK_B_MIN              : 6000
PS_RANK_B_MAX              : 9999
PS_RANK_A_MIN              : 10000
PS_RANK_A_MAX              : 19999
PS_RANK_S_MIN              : 20000

// GPS system
GPS_MILESTONE_BONUS        : 1000
GPS_MVP_BONUS              : 200
GPS_MEMBER_POINTS_PCT      : 10

// GPS guild rank thresholds (admin-editable)
GPS_RANK_E_MAX             : 9999
GPS_RANK_D_MIN             : 10000
GPS_RANK_D_MAX             : 29999
GPS_RANK_C_MIN             : 30000
GPS_RANK_C_MAX             : 69999
GPS_RANK_B_MIN             : 70000
GPS_RANK_B_MAX             : 149999
GPS_RANK_A_MIN             : 150000
GPS_RANK_A_MAX             : 299999
GPS_RANK_S_MIN             : 300000

// Sunday reset pool splits
GUILD_CAPTAIN_POOL_SHARE   : 30
GUILD_MEMBER_POOL_SHARE    : 70

// Referral
REFERRAL_FEE_SHARE_PCT     : 30   // % of the 15% withdrawal fee → referrer

// Withdrawal
WITHDRAWAL_FEE_PCT         : 15
MIN_PAYOUT                 : 100  // minimum points to withdraw

// Weekly targets by guild rank (admin sets these)
WEEKLY_TARGET_E_RANK       : 20000
WEEKLY_TARGET_D_RANK       : 50000
WEEKLY_TARGET_C_RANK       : 100000
WEEKLY_TARGET_B_RANK       : 200000
WEEKLY_TARGET_A_RANK       : 350000
WEEKLY_TARGET_S_RANK       : 500000
```

---

## PART 9 — BACKEND MODULES (New Files)

### 9.1 `server/modules/thorx-card.ts` (NEW)

```typescript
export function drawThorxCard(params: {
  userPkrShare: number;
  conversionRate: number;
  userRankTier: string;
  varianceMin: number;
  varianceMax: number;
  aRankBonus: number;
  sRankBonus: number;
}): { pointsCredited: number; realPkrValue: number; cardVariance: number }

export function simulateThorxCards(params: {
  grossPkr: number;
  engineType: string;
  userRankTier: string;
  iterations: number;
  config: CardConfig;
}): SimulationResult[]
```

### 9.2 `server/modules/ps-engine.ts` (NEW)

```typescript
export async function awardPS(userId: string, engineType: 'A' | 'B' | 'C'): Promise<void>
export async function processStreakBonus(userId: string): Promise<void>
  // - Read users.lastStreakDate
  // - If yesterday = last streak date: increment streakDays
  // - If missed: reset streakDays to 1
  // - Award PS based on streakDays: 1→+5, 2→+10, 3+→+20
  // - Update lastStreakDate = today
export async function applyInactivityPenalties(): Promise<void>
  // - Find users where lastActiveAt < now - 48h AND performanceScore > 0
  // - Deduct PS_INACTIVITY_PENALTY, floor at 0
  // - Call checkAndUpdateRankTier
```

### 9.3 `server/modules/gps-engine.ts` (NEW)

```typescript
export async function updateGuildGPS(guildId: string, pointsEarned: number): Promise<void>
export async function awardMilestoneGPS(guildId: string): Promise<void>
export async function awardMVPGPS(guildId: string): Promise<void>
export async function checkAndUpdateGuildRankTier(guildId: string): Promise<void>
  // - Read guildPerformanceScore
  // - Determine guildRankTier from GPS thresholds (from system_config)
  // - Update memberCapacity per GPS rank table
  // - Log rank change, broadcast guild update via WS
```

### 9.4 `server/middleware/rankGate.ts` (NEW)

```typescript
const RANK_ORDER = { 'E-Rank': 0, 'D-Rank': 1, 'C-Rank': 2, 'B-Rank': 3, 'A-Rank': 4, 'S-Rank': 5 };

export function requireMinRank(minRank: string) {
  return (req, res, next) => {
    const userRank = req.session.user?.userRankTier ?? 'E-Rank';
    if (RANK_ORDER[userRank] < RANK_ORDER[minRank]) {
      return res.status(403).json({
        error: 'RANK_GATE',
        message: `Requires ${minRank} or higher.`,
        currentRank: userRank,
        requiredRank: minRank,
        currentPS: req.session.user?.performanceScore
      });
    }
    next();
  };
}
```

### 9.5 `server/modules/live-feed.ts` (NEW)

Powers the admin Live Activity Feed:

```typescript
export interface FeedEvent {
  type: 'earn' | 'rank_up' | 'guild_target' | 'withdrawal' | 'registration';
  timestamp: Date;
  userId?: string;
  username?: string;
  data: Record<string, any>;
  displayMessage: string;  // Pre-formatted admin-readable string
}

export async function emitFeedEvent(event: FeedEvent): Promise<void>
  // Inserts to activity_feed table + broadcasts via WS to admin connections
```

Example feed messages:
- `"User 'Ali99' completed Engine A task. Real Revenue: Rs. 1.20 | Card Points: 82 | Thorx Profit: Rs. 0.48"`
- `"Guild 'Alpha_Warriors' hit 100% Weekly Target! Sunday Bonus Pool: Rs. 4,500 unlocked."`
- `"User 'Zain_Pro' reached C-Rank! Engine B tasks now unlocked."`
- `"Withdrawal approved: User 'Sara22' received Rs. 85.00. Fee: Rs. 15.00. Referral to 'Ahmed11': Rs. 4.50."`

### 9.6 New Table — activity_feed (for Live Feed)

```sql
CREATE TABLE activity_feed (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  eventType    text NOT NULL,
  userId       text REFERENCES users(id),
  displayMessage text NOT NULL,
  data         jsonb,
  createdAt    timestamp DEFAULT now()
);

CREATE INDEX idx_feed_created ON activity_feed(createdAt DESC);
```

---

## PART 10 — API ROUTES

### 10.1 New Routes

```
# Performance Score
GET  /api/user/ps-history             — PS log (rank_logs with annotations)
GET  /api/user/rank-unlocks           — What current rank unlocks

# Guilds - Public Discovery
GET  /api/guilds/discovery            — GPS-sorted list with transparency fields

# Captain DM Channel
GET  /api/guilds/:id/dm/:memberId     — Fetch thread (captain or that member only)
POST /api/guilds/:id/dm/:memberId     — Send message

# Nudge
POST /api/guilds/:id/members/:userId/nudge   — Captain triggers nudge (24h rate limit)

# Guild weekly history
GET  /api/guilds/:id/weekly-history   — guild_weekly_snapshots for captain portal chart

# Withdrawal preview
GET  /api/withdrawals/preview?points=X   — Full ledger breakdown before confirm

# Referral cash balance
GET  /api/user/referral-balance       — Current balanceCashPkr
POST /api/withdrawals/referral        — Withdraw referral cash (separate from TX-Points)

# Admin: Live Activity Feed
GET  /api/admin/live-feed?limit=50&type=all   — Recent feed events (SSE or polling)
GET  /api/admin/live-feed/stream              — Server-Sent Events stream for real-time

# Admin: Thorx Card Simulator
POST /api/admin/simulate/thorx-card           — Run N simulations
GET  /api/admin/simulate/thorx-card/history   — Past simulation runs saved by admin

# Admin: Ledger Validator
GET  /api/admin/ledger/validate/:userId       — Single user check
GET  /api/admin/ledger/validate/all           — Full system scan (paginated)

# Admin: GPS & Rank overrides
PATCH /api/admin/users/:userId/ps             — Manual PS adjustment + reason
PATCH /api/admin/guilds/:id/gps              — Manual GPS adjustment + reason
PATCH /api/admin/guilds/:id/target           — Override weekly target
PATCH /api/admin/guilds/:id/captain          — Replace captain
POST  /api/admin/guilds/:id/kick/:userId     — Admin force-kick

# Admin: Referral analytics
GET  /api/admin/referrals/stats              — Total payouts, top promoters
GET  /api/admin/referrals/leaderboard        — Top referrers by total commission earned

# Admin: Inactive Captain alerts
GET  /api/admin/guilds/inactive-captains     — Guilds where captain lastActiveAt > 7 days ago
```

### 10.2 Modified Routes

```
POST /api/ad-view             — Engine A split + Thorx Card draw + PS award + feed event
POST /api/tasks/:id/verify    — Engine B or C split based on task.engineType; PS award; feed event
POST /api/withdrawals         — Bulletproof ledger calc; S-Rank auto-approve; referral commission
POST /api/guilds              — Rank gate: requireMinRank('B-Rank')
POST /api/guilds/:id/join     — Rank gate: requireMinRank('D-Rank'); check minRankRequired; cover letter required
GET  /api/user                — Add performanceScore, userRankTier, guildRole, guildId, balanceCashPkr, streakDays
GET  /api/dashboard/stats     — Add performanceScore, userRankTier, streakDays, weeklyContribution, guildWeeklyProgress
GET  /api/referrals           — L1 only, from referral_commissions table
GET  /api/commissions         — From referral_commissions only (commission_logs = read-only historical)
```

### 10.3 Removed Routes

```
DELETE POST /api/guilds/:id/rally        — Rally removed entirely
```

---

## PART 11 — CRON JOBS

**File:** `server/index.ts` — add alongside existing HealthEngine job

```typescript
import cron from 'node-cron';

// Job 1: Daily midnight PKT (19:00 UTC) — Inactivity penalty + streak processing
cron.schedule('0 19 * * *', async () => {
  await applyInactivityPenalties();    // -10 PS to inactive users
  // Note: streak bonus is awarded at task completion time, not by cron
}, { timezone: 'UTC' });

// Job 2: Sunday 11:59 PM PKT (18:59 UTC Sunday)
cron.schedule('59 18 * * 0', async () => {
  await runWeeklyGuildReset();         // pool distribution + GPS + reset
}, { timezone: 'UTC' });
```

---

## PART 12 — ADMIN PANEL (Team Portal) — COMPLETE GOD-MODE REBUILD

The admin panel is not a boring data table. Every section gives the team full live visibility and control over the system. Add these as new sections to `TeamPortal.tsx`.

---

### 12.1 Dynamic Financial & Profit Control Center

**File:** `client/src/components/admin/FinancialControlCenter.tsx` (NEW)

**Engine Multi-Controller (Profit Knobs):**
```
Engine A — Ad Tasks
  Thorx Cut %:  [████░░░░░░] 40%  ← live slider (20–60 range)
  User Gets %:  60%               ← auto-calculated, read-only

Engine B — CPA Offers  
  Thorx Cut %:  [████░░░░░░] 40%  ← live slider
  User Gets %:  60%               ← read-only

Engine C — Guild Tasks
  Thorx Cut %:  [██░░░░░░░░] 20%  ← live slider
  Guild Pool %: [███░░░░░░░] 35%  ← live slider
  User Gets %:  45%               ← read-only (100 - Thorx - Pool)
  Validation: Must sum to 100%
```

**Global Conversion Rate Configurator:**
```
1,000 TX-Points = Rs. [10.00] ← editable input
(i.e., 1 Point = Rs. 0.01)
[Save Rate] → updates CONVERSION_RATE in system_config instantly
```

**Withdrawal Fee Controller:**
```
Platform Fee on Withdrawal: [15%] ← editable input (5–25 range)
[Save] → next withdrawal calculation uses new rate
```

**Referral Share Controller:**
```
Referrer's share of withdrawal fee: [30%] ← editable input (0–100)
Example preview: "On a Rs.100 withdrawal → Fee = Rs.15 → Referrer gets Rs.4.50"
[Save]
```

**Implementation:** All sliders call `PATCH /api/admin/config/:key` on save. Changes take effect on next earn/withdrawal event — no restart required.

---

### 12.2 Thorx Card Sandbox (Illusion Engine Manager)

**File:** `client/src/components/admin/ThorxCardSandbox.tsx` (NEW)

**Deviation Range Slider:**
```
Card Randomness Range:
  Min Multiplier: [0.80×] ← slider (0.50 – 1.00)
  Max Multiplier: [1.20×] ← slider (1.00 – 1.50)

Presets:
  [Stable — 0.90×–1.10×]   ← minimal variance, predictable cards
  [Standard — 0.80×–1.20×] ← default
  [Jackpot — 0.50×–1.50×]  ← high excitement, wide range
```

**Simulation Tool:**
```
Inputs:
  CPA/Ad Network payout: Rs. [10.00]
  Engine Type: [A ▼]
  User Rank: [E-Rank ▼]
  Run [100] simulations

[Run Simulation]

Output:
  Card 1: 520 TX-Points    Real value: Rs. 6.00
  Card 2: 648 TX-Points    Real value: Rs. 6.00
  Card 3: 591 TX-Points    Real value: Rs. 6.00
  ...
  
  Statistics:
  Min: 480 pts  Max: 720 pts  Average: 600 pts  Median: 597 pts
  Thorx profit per transaction: Rs. 4.00
  If user withdraws average output: Net to user = Rs. 5.10 (after 15% fee)
```

**API:** `POST /api/admin/simulate/thorx-card` — returns array of simulation results.

---

### 12.3 Payouts Approvals & Security Desk (Anti-Fraud Hub)

**File:** `client/src/components/admin/PayoutControl.tsx` (ENHANCE existing)

**Double-Entry Audit Table per withdrawal request:**

Each withdrawal card in the approval queue shows:
```
┌─────────────────────────────────────────────────┐
│  User: Ahmed Khan (@ahmed_k)    Rank: C-Rank    │
│  Requested: 10,000 TX-Points                    │
│                                                  │
│  SYSTEM CALCULATION:                            │
│  Real PKR from ledger:     Rs. 100.00           │
│  Platform fee (15%):     − Rs. 15.00            │
│  Referral to @zaini:     − Rs.  4.50            │
│  User receives:            Rs. 85.00            │
│                                                  │
│  Payment Details:                               │
│  JazzCash: 0300-1234567 — Ahmed Khan            │
│  [📋 Copy Account]                              │
│                                                  │
│  [✅ Approve]    [❌ Reject]                    │
└─────────────────────────────────────────────────┘
```

**Fraud Warning System (RED ALERT):**

Before showing the approval card, run ledger validation:
```typescript
// Validate: sum of user_transactions.pointsCredited should equal users.txPointsBalance
// Validate: sum of user_transactions.realPkrValue should equal users.totalEarnings (within 0.01 tolerance)
const mismatch = await validateUserLedger(userId);
```

If mismatch detected, show:
```
⚠️ RED ALERT — Points Mismatch Detected!
Expected: 10,000 pts from ledger  |  Actual on account: 12,500 pts
Possible exploit or manual balance adjustment.
[Flag for Review]  [Block Withdrawal]  [Override & Approve]
```

**One-Click Copy:** The `[📋 Copy Account]` button copies `"0300-1234567 — Ahmed Khan"` to clipboard so admin can paste directly into JazzCash/EasyPaisa app.

---

### 12.4 Guild & Captain Super-Moderator Suite

**File:** `client/src/components/admin/GuildManager.tsx` (ENHANCE)

**Weekly Target Assigner:**
```
Set Weekly Targets by Guild Rank:
  E-Rank Guilds: [20,000] pts/week
  D-Rank Guilds: [50,000] pts/week
  C-Rank Guilds: [100,000] pts/week
  B-Rank Guilds: [200,000] pts/week
  A-Rank Guilds: [350,000] pts/week
  S-Rank Guilds: [500,000] pts/week
[Apply to All Active Guilds]  [Apply to New Guilds Only]
```

**Active GPS Modifier:**
- Search guild by name
- Input: `± GPS amount` + reason field (required)
- Preview: "Alpha Warriors: 45,230 GPS → 45,730 GPS"
- Confirm → logged in audit_logs with admin name + reason

**⚠️ Inactive Captain Alert (Red List):**
```
INACTIVE CAPTAINS (7+ days without login):
─────────────────────────────────────────────
Guild: "Alpha Warriors"   Captain: @ali_cap
Last Login: 14 days ago   Members: 8/10   Pending Requests: 3
[⚠️ Warn Captain]  [Replace Captain]  [Dissolve Guild]

Guild: "Pro Team"   Captain: @zara_k
Last Login: 9 days ago   Members: 5/10   Pending Requests: 1
[⚠️ Warn Captain]  [Replace Captain]  [Dissolve Guild]
```

API: `GET /api/admin/guilds/inactive-captains` — guilds where captain's `lastActiveAt` > 7 days ago.

**[Replace Captain]** → opens user search to select new captain from current members → `PATCH /api/admin/guilds/:id/captain` → logged to audit_logs.

---

### 12.5 Gamification Rules & Ranks Customizer

**File:** `client/src/components/admin/RanksCustomizer.tsx` (NEW) → add to TeamPortal sections

**User Rank PS Threshold Editor:**
```
User Performance Score (PS) Rank Thresholds:
  E-Rank: 0 – [999]       ← editable
  D-Rank: [1,000] – [2,999]
  C-Rank: [3,000] – [5,999]
  B-Rank: [6,000] – [9,999]
  A-Rank: [10,000] – [19,999]
  S-Rank: [20,000]+ ← minimum only, no max
[Save Thresholds]
```

**Guild GPS Rank Threshold Editor:**
```
Guild GPS Rank Thresholds:
  E-Rank: 0 – [9,999]
  D-Rank: [10,000] – [29,999]
  C-Rank: [30,000] – [69,999]
  B-Rank: [70,000] – [149,999]
  A-Rank: [150,000] – [299,999]
  S-Rank: [300,000]+
[Save GPS Thresholds]
```

**Inactivity Penalty Configurator:**
```
Inactivity Settings:
  Trigger after: [48] hours of no activity
  Daily PS deduction: [10] PS
  PS floor (never below): 0 (fixed — always E-Rank floor)
[Save]
```

**All values stored in `system_config` and read dynamically — no code redeploy needed.**

---

### 12.6 Live Activity Feed & Logger

**File:** `client/src/components/admin/LiveActivityFeed.tsx` (NEW)

A real-time scrolling feed showing every significant platform event with full transparent math.

**UI:**
```
🟢 LIVE FEED                              [Pause]  [Filter ▼]  [Export]
─────────────────────────────────────────────────────────────────────────
⚡ 14:32:01  User 'Ali99' completed Engine A task
             Real Revenue: Rs. 1.20 | Card Points Issued: 82 | Thorx Profit: Rs. 0.48

🏆 14:31:45  User 'Zain_Pro' reached C-Rank!
             Engine B tasks now unlocked. PS: 3,021

💰 14:30:22  Withdrawal approved: User 'Sara22' received Rs. 85.00
             Fee collected: Rs. 15.00 | Referral to 'Ahmed11': Rs. 4.50 | Thorx net: Rs. 10.50

🎯 14:28:11  Guild 'Alpha_Warriors' hit 100% Weekly Target!
             Combined Bonus Pool: Rs. 4,500 — distributes Sunday night

📋 14:27:55  User 'New_User7' registered via referral link of 'Ali99'

⚡ 14:27:30  User 'Maria_K' completed Engine B task
             Real Revenue: Rs. 25.00 | Card Points: 1,480 | Thorx Profit: Rs. 10.00
```

**Filter options:** All / Earn Events / Rank Changes / Guild Events / Withdrawals / Registrations

**Implementation:**
- Server: `GET /api/admin/live-feed/stream` → Server-Sent Events (SSE) endpoint
- OR: Polling `GET /api/admin/live-feed?limit=50` every 5 seconds
- `emitFeedEvent()` called from earn routes, withdrawal processing, rank changes, registrations
- Feed stored in `activity_feed` table (keep last 30 days, then auto-purge)

---

### 12.7 Referral Analytics Dashboard

**File:** Add section to `client/src/components/admin/LeaderboardInsights.tsx` OR new file

```
REFERRAL PROGRAM ANALYTICS
──────────────────────────────────────────────────────
Total Referral Commissions Paid:     Rs. 12,450.00
This Month:                          Rs.  3,200.00
Active Referral Relationships:       847 pairs
Average Commission per Payout:       Rs. 4.20

TOP PROMOTERS LEADERBOARD:
# | Username    | Referrals | Total Commission Earned
1 | @ali_99     | 234       | Rs. 1,847.50
2 | @zain_pro   | 189       | Rs. 1,203.00
3 | @sara_k     | 156       | Rs.   980.25
...

[Export CSV]
```

**Custom Referral Rate Setter:** Already in Financial Control Center (Section 12.1). Link/reference it here.

---

### 12.8 PS Override & Rank Admin Tools

**File:** `client/src/components/admin/UserManager.tsx` (ENHANCE)

Per user detail panel:
- Display current PS + rank badge + progress bar to next rank
- **[Adjust PS]** → input field `± value` + required reason → `PATCH /api/admin/users/:userId/ps` → logged to audit_logs
- **[Lock Rank]** → sets `rankLocked = true`, input which rank to lock at → manual override
- **[Unlock Rank]** → sets `rankLocked = false`, triggers re-evaluation of current PS
- All changes show in user's rank_logs history

---

### 12.9 Engine C Task Manager (Guild Task Admin)

**File:** Enhance existing `TaskManager` component or new `EngineCTaskManager.tsx`

Admin can:
- Create new CPA offer tasks → toggle: "Show in Engine B (public)" / "Show in Engine C (guild only)" / "Both"
- Create indirect tasks (YouTube, TikTok, etc.) → set as Engine C only, no monetary payout
- Set payout per task (gross PKR — system auto-splits per engine rule)
- Activate / deactivate tasks
- See completion stats per task: completions today / this week, total Thorx profit generated

---

### 12.10 System Health — Fix NaN Scores

**File:** `server/modules/health-engine.ts`

- Guard every division: `const ratio = totalUsers > 0 ? (flaggedUsers / totalUsers) * 100 : 0`
- Replace `NaN` with `0` before saving to health_snapshots
- Add `?? 0` to all score aggregations
- Frontend: display `"–"` instead of `"NaN"` for null/undefined scores

---

## PART 13 — USER PORTAL FRONTEND CHANGES

### 13.1 Engine C Tab Routing

**File:** `client/src/pages/UserPortal.tsx`

```typescript
const EngineCContent = () => {
  if (user.guildRole === 'captain') return <CaptainPortal />;
  if (user.guildRole === 'member') return <GuildMemberPanel />;
  if (user.pendingGuildApplication) return <ApplicationPendingScreen />;
  return <GuildDiscoveryPanel />;
};
```

Engine C tab label adapts:
- Simple: "Guild — Join a Team"
- Pending: "Guild — Application Pending"
- Member: "Guild — [Guild Name]"
- Captain: "Guild — [Guild Name] 👑"

### 13.2 E/D/C/B/A/S Rank Badge Component

**File:** `client/src/components/RankBadge.tsx` (NEW)

```typescript
const RANK_CONFIG = {
  'E-Rank': { color: '#71717a', bg: '#f4f4f5', icon: 'shield', label: 'E' },
  'D-Rank': { color: '#16a34a', bg: '#f0fdf4', icon: 'shield', label: 'D' },
  'C-Rank': { color: '#2563eb', bg: '#eff6ff', icon: 'shield', label: 'C' },
  'B-Rank': { color: '#7c3aed', bg: '#f5f3ff', icon: 'shield-star', label: 'B' },
  'A-Rank': { color: '#ea580c', bg: '#fff7ed', icon: 'crown', label: 'A' },
  'S-Rank': { color: '#dc2626', bg: 'linear-gradient(135deg, #fef3c7, #fca5a5)', icon: 'crown', label: 'S' },
};
```

Every user-facing surface that shows rank (profile, leaderboard, guild roster, application card, discovery panel) uses this component.

### 13.3 PS Progress Display

**File:** `client/src/components/PSProgressCard.tsx` (NEW)

Shows:
- Current rank badge (large)
- PS score (e.g., "4,230 PS")
- Progress bar to next rank (e.g., "4,230 / 6,000 to B-Rank — 70.5%")
- Streak counter: "🔥 5-day streak (+20 PS/day bonus)"
- Small "What does my rank unlock?" expandable tooltip

### 13.4 Profile Page Additions

- Replace old rank badge → new E-S badge
- Add PS score + progress bar
- Add streak indicator
- Add guild name + guildRole (member/captain icon)
- Add MVP trophy badge if `guild_members.isMVP = true` this week
- Add referral cash balance (separate from TX-Points, shows as Rs. amount)

### 13.5 Engine A/B Locked State (E-Rank Gate for Engine B)

If user is below C-Rank and navigates to Engine B section:
```
🔒 Engine B — Unlocks at C-Rank
Premium CPA offers with higher payouts.
You are E-Rank (120 PS). Need 2,880 more PS to unlock.
[Progress bar: 120/3000]
Complete more Engine A tasks to rank up!
```

---

## PART 14 — WEBSOCKET REAL-TIME EVENTS

**File:** `server/ws.ts`

New broadcast event types:
```typescript
'user.ps_updated'          // PS changed (award or penalty)
'user.rank_changed'        // Rank tier changed
'user.balance_updated'     // Balance changed (earn, withdrawal)
'guild.weekly_points'      // Guild currentWeeklyPoints updated
'guild.pool_credited'      // Sunday reset distributed bonus
'guild.nudge_received'     // Captain nudged this member
'guild.dm_new_message'     // New DM in captain channel
'guild.mvp_selected'       // Captain named MVP
'guild.rank_changed'       // Guild GPS rank upgraded
'admin.feed_event'         // Live feed event (admin connections only)
```

Client listeners:
- `GuildMemberPanel` — listens to `guild.weekly_points` to update progress bar live
- `CaptainPortal` — listens to `guild.weekly_points`, `guild.mvp_selected`
- `ThorxCard` component — no WS needed, triggered by API response payload
- Admin `LiveActivityFeed` — listens to `admin.feed_event`

---

## PART 15 — MIGRATION & CLEANUP

### 15.1 Migration Script

**File:** `scripts/migrate-to-spec.ts`

Execute in this order:
1. Add new columns to `users` (performanceScore, userRankTier, guildRole, guildId, lastActiveAt, streakDays, lastStreakDate, inactivityPenaltyAt, balanceCashPkr)
2. Add new columns to `guilds` (guildPerformanceScore, guildRankTier, memberCapacity, minRankRequired, weeklyBonusPool, currentWeeklyPoints, weeklyTarget, assistantCaptainId, targetDifficulty)
3. Add new columns to `guild_members` (isMVP, mvpSetAt, lastNudgedAt)
4. Create `user_transactions` table + indexes
5. Create `referral_commissions` table
6. Create `captain_messages` table
7. Create `guild_weekly_snapshots` table
8. Create `activity_feed` table
9. Backfill `userRankTier` from existing `rank` column (map: "Nawa Aya"→"E-Rank", "Chota Don"→"D-Rank", "Bawa Ji"→"C-Rank", "Haji Sab"→"B-Rank", "Chacha Supreme"→"S-Rank")
10. Backfill `guildId` + `guildRole` from guild_members + guilds.captainId
11. Backfill `lastActiveAt` = `updatedAt` for existing users
12. Seed `user_transactions` from existing `earnings` records (realPkrValue = amount, pointsCredited = amount × CONVERSION_RATE, cardVariance = 1.0, engineType = 'Engine_A' default)
13. Seed new `system_config` keys from Part 8.8
14. Mark `commission_logs` as deprecated (add DB comment)
15. Remove `daily_tasks` route references from withdrawal gate logic

### 15.2 Complete String Replacement Map

Run `grep -r` and replace across entire codebase:

```
"Nawa Aya"        → "E-Rank"
"Chota Don"       → "D-Rank"
"Bawa Ji"         → "C-Rank"
"Haji Sab"        → "B-Rank"
"Chacha Supreme"  → "S-Rank"
"Vault"           → (user-facing only) "Bonus Pool" or remove entirely
"Locked Points"   → remove entirely from user UI
"locked_balance"  → "weeklyBonusPool" (backend rename)
"rally"           → remove all references
"L2 commission"   → remove
"level2Count"     → remove from leaderboard
"daily task"      → replace with "Guild task" where applicable
```

---

## PART 16 — TESTING CHECKLIST

### Engine & Card
- [ ] Engine A ad completion → user_transactions created with correct split (40/60)
- [ ] Engine B CPA completion → same split; E-Rank user blocked with rank gate message
- [ ] Engine C guild task → 20/35/45 split; user_transactions.guildPoolPkr populated
- [ ] Thorx Card variance is within configured bounds
- [ ] A-Rank user gets wider variance range on card
- [ ] realPkrValue in user_transactions is never affected by cardVariance

### PS & Ranks
- [ ] New user = E-Rank, PS = 0
- [ ] Engine A completion → +5 PS
- [ ] Engine B completion → +25 PS (only if C-Rank+)
- [ ] Engine C completion → +15 PS
- [ ] Day 1 streak → +5 PS
- [ ] Day 2 streak (next day) → +10 PS
- [ ] Day 3 (next day, unbroken) → +20 PS
- [ ] Missed day → streak resets to Day 1 next task
- [ ] 48h inactivity → −10 PS; capped at 0
- [ ] PS hits 1,000 → auto-upgrade to D-Rank, notification + WS broadcast
- [ ] PS hits 3,000 → C-Rank, Engine B now accessible
- [ ] PS hits 6,000 → B-Rank, guild creation now accessible
- [ ] rankLocked = true → no automatic rank change even if PS qualifies

### Guild Flow
- [ ] E-Rank user tries to apply to guild → 403 rank gate
- [ ] D-Rank user applies with cover letter → application queued
- [ ] E-Rank user tries to create guild → 403 rank gate
- [ ] Captain sees application with PS, cover letter, Engine history, fraud count
- [ ] Captain reject requires reason (min 10 chars, enforced)
- [ ] Captain accept → user.guildRole = 'member', guildId set, portal switches
- [ ] Guild Member Panel shows correct weekly progress bar
- [ ] Captain nudge to zero-contribution member → notification delivered; nudge disabled 24h
- [ ] MVP selection → GPS +200; MVP badge on member; button disabled until next Sunday reset
- [ ] Captain DM thread works both directions (captain → member, member → captain)

### Sunday Reset
- [ ] Guild hits target → captain gets 30%, active members proportional 70%
- [ ] Guild misses target → pool voided, snapshot records wasSuccessful=false
- [ ] After reset: weeklyBonusPool=0, currentWeeklyPoints=0, all member weeklyPointsContributed=0
- [ ] GPS milestone +1,000 added only on successful reset
- [ ] GPS rank upgrade fires if threshold crossed

### Withdrawal
- [ ] Preview endpoint returns correct PKR from ledger (not point math)
- [ ] 15% fee deducted from ledger PKR value
- [ ] Referral commission = 30% of fee → credited to referrer.balanceCashPkr
- [ ] referral_commissions table record created
- [ ] commission_logs NOT written for new commissions
- [ ] S-Rank withdrawal auto-approved immediately
- [ ] Non-S-Rank withdrawal status = 'pending' for admin review

### Admin
- [ ] Engine split sliders save; next earn event uses updated percentages
- [ ] Conversion rate change takes effect immediately on next card draw
- [ ] Withdrawal fee change takes effect on next withdrawal request
- [ ] Referral share % change takes effect on next withdrawal
- [ ] Card sandbox simulates correct distribution with correct Thorx profit shown
- [ ] Ledger validator detects synthetic mismatch in test user
- [ ] RED ALERT fires on withdrawal with points/PKR mismatch
- [ ] Copy button copies JazzCash/EasyPaisa details to clipboard
- [ ] Inactive Captain alert shows guilds with captain offline > 7 days
- [ ] Captain replacement via admin → logged in audit_logs
- [ ] PS threshold change (e.g., S-Rank from 20,000 → 30,000) → checkAndUpdateRankTier honors new value
- [ ] Live Activity Feed shows correct math for each earn event
- [ ] NaN scores gone from System Health dashboard
- [ ] GPS manual adjustment logged in audit_logs

---

## PART 17 — FILE CHANGE MAP

```
NEW FILES:
  server/modules/thorx-card.ts
  server/modules/ps-engine.ts
  server/modules/gps-engine.ts
  server/modules/live-feed.ts
  server/middleware/rankGate.ts
  scripts/migrate-to-spec.ts
  client/src/components/ThorxCard.tsx
  client/src/components/RankBadge.tsx
  client/src/components/PSProgressCard.tsx
  client/src/components/guild/GuildDiscoveryPanel.tsx
  client/src/components/guild/GuildMemberPanel.tsx
  client/src/components/guild/CaptainPortal.tsx
  client/src/components/admin/FinancialControlCenter.tsx
  client/src/components/admin/ThorxCardSandbox.tsx
  client/src/components/admin/LedgerValidator.tsx
  client/src/components/admin/RanksCustomizer.tsx
  client/src/components/admin/LiveActivityFeed.tsx

HEAVILY MODIFIED:
  shared/schema.ts                               ← 5 new tables, many new columns
  server/storage.ts                              ← recordEarnEvent rewrite, rank rewrite, withdrawal rewrite
  server/routes.ts                               ← 14 new routes, 10 modified routes, rally deleted
  server/index.ts                                ← 2 new cron jobs, feed init
  server/modules/guild-reset.ts                  ← Sunday pool split, GPS awards, snapshots
  server/modules/health-engine.ts                ← NaN guard fixes
  client/src/pages/UserPortal.tsx               ← three-portal routing, dashboard card variants
  client/src/lib/rankAvatars.ts                  ← E-S rank mapping
  client/src/components/guild/GuildVaultPanel.tsx ← absorbed into GuildMemberPanel (keep as re-export shim)
  client/src/components/WithdrawalModal.tsx      ← ledger preview UI
  client/src/components/admin/SystemSettingsManager.tsx  ← merged into FinancialControlCenter or linked
  client/src/components/admin/GuildManager.tsx   ← inactive captain alert, GPS modifier, target assigner
  client/src/components/admin/UserManager.tsx    ← PS override, rank tools
  client/src/components/admin/AdminDashboard.tsx ← engine revenue breakdown, NaN fix
  client/src/components/admin/PayoutControl.tsx  ← double-entry audit, RED ALERT, copy button
  client/src/pages/TeamPortal.tsx               ← new sections registered: FinancialControlCenter, ThorxCardSandbox, LedgerValidator, RanksCustomizer, LiveActivityFeed
  server/middleware/auth.ts                      ← touch lastActiveAt on every authenticated request

DELETED / DEPRECATED:
  Rally routes and storage methods              ← fully removed
  Daily task withdrawal gate logic              ← removed (no task required to withdraw)
  commission_logs write paths                   ← read-only, no new writes
  Multi-level referral logic everywhere         ← removed
```

---

## PART 18 — EXECUTION ORDER

```
Step 1   scripts/migrate-to-spec.ts          — DB schema first, everything else depends on it
Step 2   shared/schema.ts                    — Add Drizzle definitions for new tables/columns
Step 3   server/modules/thorx-card.ts        — Card engine (needed by all earn routes)
Step 4   server/modules/ps-engine.ts         — PS logic (needed by earn routes + cron)
Step 5   server/modules/gps-engine.ts        — GPS logic (needed by Engine C earn + Sunday reset)
Step 6   server/middleware/rankGate.ts        — Rank gates (needed by routes)
Step 7   server/storage.ts (recordEarnEvent) — Core earn logic rewrite using modules from 3-6
Step 8   server/storage.ts (withdrawal)      — Bulletproof ledger + referral commission
Step 9   server/modules/guild-reset.ts       — Sunday reset using GPS engine
Step 10  server/modules/live-feed.ts         — Feed emitter (used by routes)
Step 11  server/index.ts                     — Wire cron jobs + feed init
Step 12  server/routes.ts                    — All new + modified routes
Step 13  client/src/lib/rankAvatars.ts       — E-S rank name + avatar mapping
Step 14  client/src/components/RankBadge.tsx — Reusable rank badge
Step 15  client/src/components/ThorxCard.tsx — Card reveal animation
Step 16  client/src/components/PSProgressCard.tsx
Step 17  client/src/components/guild/*       — All three portals
Step 18  client/src/pages/UserPortal.tsx     — Portal routing + dashboard cards
Step 19  client/src/components/admin/*       — All new admin components
Step 20  client/src/pages/TeamPortal.tsx     — Register new admin sections
Step 21  Part 0 deletions                    — Remove rally, multi-level, old gates
Step 22  Part 15.2 string replacement        — Global rank name purge
Step 23  Part 16 testing                     — Full checklist verification
```

---

## PART 19 — KEY INVARIANTS (Must Never Break)

1. **`realPkrValue` is immutable after creation.** No code path should ever update a `user_transactions.realPkrValue` after insert. It is the financial source of truth.

2. **Withdrawal math ALWAYS reads `user_transactions`, never converts points directly.** `availableBalance` is a display convenience; the ledger is the contract.

3. **"Vault" and "Locked Points" never appear in any user-facing string.** Only "Guild Weekly Bonus Pool" or "Sunday Bonus". Backend column names (`weeklyBonusPool`, `vaultBalancePkr`) are fine.

4. **1-tier referral only.** No code may create a referral commission for anyone other than the direct inviter. `commission_logs` is read-only legacy data.

5. **PS is the only input to `checkAndUpdateRankTier()`.** `totalEarnings` does not affect rank. `rankLocked = true` bypasses automatic updates entirely.

6. **Engine type must be set at earn time and never changed.** The `engineType` in `user_transactions` drives all revenue accounting and reporting.

7. **Sunday pool distribution is the only path for weeklyBonusPool credits.** No mid-week pool payouts. Admin can trigger the reset early via `/api/admin/guild-cycles/run-resolution` but the same `runWeeklyGuildReset()` function runs — no special admin-only payout path.

8. **Admin config changes are live immediately.** No restart required. All engine splits, fee rates, rank thresholds, and card variance settings are read from `system_config` on each request, never cached beyond the request lifecycle.
