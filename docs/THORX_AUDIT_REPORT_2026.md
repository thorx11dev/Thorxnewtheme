# THORX: GRAND SYSTEM AUDIT REPORT
**Date:** July 14, 2026  
**Against:** THORX Ultimate Grand System Architecture Blueprint (2026)  
**Status:** Pre-Implementation — Awaiting Go-Ahead

---

## EXECUTIVE SUMMARY

The current codebase is a functioning v1 platform built around a PKR-visible, daily-task-gated, multi-level-referral model. The Blueprint mandates a complete paradigm shift to a points-only illusion, weekly guild tasks, Engine C as the social gaming hub, and a single-tier referral model. The gap is significant but structured — most backend infrastructure (guild tables, vault resolution job, leaderboard, risk engine, HilltopAds) can be preserved and extended. What needs removal, rewiring, or new construction is itemized below.

**Compliance Score vs Blueprint: ~28% complete**

---

## SECTION 1: COMPLIANCE AUDIT — LEGACY CODE STILL ACTIVE

### 1.1 ❌ Multi-Level Referral (MLM) — FULLY ACTIVE, MUST BE REMOVED

| Location | Detail |
|---|---|
| `shared/schema.ts` | `referrals.tier` column (int, default 1), `commission_logs.level` (values 1 or 2), `commission_logs.rate` (0.1500 / 0.0750) |
| `server/storage.ts` L1007–1063 | `getReferralStatsDetailed()` queries L1+L2 using `referrals.tier` and `commissionLogs.level` |
| `server/storage.ts` L473–476 | `REFERRAL_FEE_SHARE_PCT = 50%` split across levels |
| `server/routes.ts` L1381–1415 | `/api/referrals/stats/detailed` endpoint returns L1/L2 breakdown |
| `client/src/components/ui/commission-calculator.tsx` L12–13 | Hardcodes `l1Rate = 0.15`, `l2Rate = 0.075` |
| `client/src/components/ui/share-modal.tsx` L272 | Displays "15% + 7.5%" to users |
| `client/src/components/ui/referral-stats-card.tsx` L105–112 | Shows Level 1 / Level 2 commission breakdown |
| `client/src/components/sections/faq-section.tsx` L104–110 | Explains "3-tier referral structure" |
| `client/src/components/sections/earning-reveal.tsx` L16 | Mentions 3 tiers and L1/L2 rates |
| `client/src/pages/TermsAndConditions.tsx` L196 | "Level 1 (15%) and Level 2 (7.5%)" |
| `leaderboard_cache` table | Has `level1Count` and `level2Count` columns |

**Blueprint Rule:** Remove all Tier 2/3 referral logic. Keep only direct (Level 1) referral at a single rate. Referral earnings are displayed in TX-Points, not PKR.

---

### 1.2 ❌ Daily Tasks Blocking Payouts — FULLY ACTIVE, MUST BE REMOVED

| Location | Detail |
|---|---|
| `server/routes.ts` L922–982 | `POST /api/withdrawals` fetches mandatory tasks, checks `rank_payout_requirements`, returns `403 PAYOUT_LOCKED` |
| `server/routes.ts` L855–921 | `GET /api/withdrawals` also gates on task completion |
| `server/storage.ts` | `getDailyTasksForUser()`, `getTodayCompletedTasksByType()` methods power the lock |
| `client/src/pages/UserPortal.tsx` L769–787 | Calculates `rankReqs` and `incompleteMandatory` tasks |
| `client/src/pages/UserPortal.tsx` L2570–2627 | Renders "Payout Locked" overlay with task requirement list |
| `client/src/pages/UserPortal.tsx` L1217–1253 | Shows `dailyTasksEarnings` as a separate earnings category |
| `shared/schema.ts` | `daily_tasks` table (id, title, type, actionUrl, secretCode, targetRank, isMandatory) |
| `shared/schema.ts` | `task_records` table (userId, taskId, status, completedAt) |

**Blueprint Rule:** Daily Tasks are completely deprecated. Payout access is always open once minimum point threshold is met. Tables `daily_tasks` and `task_records` are to be removed.

---

### 1.3 ❌ PKR Visible on Non-Payout Screens — WIDESPREAD, MUST BE CONVERTED

| Location | What it shows |
|---|---|
| `client/src/pages/UserPortal.tsx` L1138 | `formatCurrency = "PKR ${amount}"` — used across all balance displays |
| `client/src/pages/UserPortal.tsx` L1640 | `availableBalance` displayed with PKR formatter |
| `client/src/pages/UserPortal.tsx` L1729, 1736 | Charts label Y-axis as "PKR" / "Weekly PKR Earned" |
| `client/src/components/ui/profile-modal.tsx` L284 | Shows PKR total earnings |
| `client/src/components/ui/referral-stats-card.tsx` L45, 62, 78 | PKR labels for commissions |
| `client/src/components/ui/rank-badge.tsx` L167 | "PKR {remaining} remaining" for rank upgrades |
| `client/src/components/sections/faq-section.tsx` L140, 164 | "2,500 PKR for Chota Don", PKR earnings examples |
| `client/src/components/admin/LeaderboardInsights.tsx` L291, 427, 578 | "PKR" / "Rs." balance labels |
| `client/src/components/admin/ReconciliationPanel.tsx` L111 | "Rs." labels |
| API responses | `/api/user`, `/api/dashboard/stats` return `availableBalance`/`pendingBalance`/`totalEarnings` as PKR strings |

**Blueprint Rule:** Replace ALL user-facing PKR/Rs labels with "TX-Points". PKR only revealed inside the Conversion Room (payout modal). Backend continues storing real PKR values in the DB — only the display layer changes.

---

## SECTION 2: INTERACTION WIRE-UP — DASHBOARD & GRAPHS

### Current Dashboard Cards (non-compliant)
The current dashboard shows:
- Available Balance (PKR)
- Pending Balance (PKR)
- Total Earnings (PKR)
- Total Withdrawn (PKR)

### Blueprint Required Cards
1. **TX-Points Card** — `txPointsBalance` from users table (already exists as a column ✅)
2. **Engine C Vault Card** — locked 15% escrow points from `guild_vault_ledger` (table exists ✅)
3. **Direct Referrals Card** — count of L1 referrals only (needs query change)
4. **Referral Points Earned** — commissions converted to TX-Points display (needs conversion formula)

### Graph Rewiring Needed
- `UserPortal.tsx` weekly earnings graph: Y-axis label "PKR" → "TX-Points"
- Data source: earnings amounts must be displayed as points (divide by conversion rate or map to `txPointsBalance` increments)

**Status: ❌ Not done. All 4 cards need content and label rewiring.**

---

## SECTION 3: ENGINE C — GAP ANALYSIS

### What Exists ✅
- `guilds` table (id, name, description, captainId, rank, score, strikes, createdAt)
- `guild_members` table (guildId, userId, role=captain/member, status=pending/active)
- `guild_strikes` table
- `guild_weekly_cycles` table (weekly goal tracking)
- `guild_vault_ledger` table (15% escrow per user per week)
- `points_ledger` table (with `guildId`, `vaultShareLockedPkr`)
- `server/jobs/guild-vault-resolution.ts` (weekly auto-release of vault funds)
- `GuildVaultPanel.tsx` (basic member + captain UI embedded in UserPortal)
- `GuildManager.tsx` (admin panel for guilds)
- Routes: GET/POST guilds, join, approve/reject, leave, vault, admin

### What is MISSING ❌

#### 3.1 engine_c_messages Table — DOES NOT EXIST
Blueprint requires real-time group chat per guild (WhatsApp-like). Neither the table nor any API routes for guild chat exist.

**Must Add:**
- `engine_c_messages` table: (id, guildId, senderId, message, createdAt)
- `POST /api/guilds/:id/chat` — send message
- `GET /api/guilds/:id/chat` — fetch history (paginated)
- WebSocket broadcast scoped to guild members only
- `EngineCChat.tsx` component (sleek real-time chat UI)

#### 3.2 Public / Social Space — DOES NOT EXIST
No standalone "spectator area" page. `GET /api/guilds` lists guilds but there's no dedicated public-facing guild social page.

**Must Build:**
- `/engine-c` route → Public Social Space page
- Guild Feed: searchable list with banner, badge, rank badge
- Performance Board: real-time guild stats (rank S–E, weekly points, top members)
- Guild Social Card: profile-like modal per guild
- "Send Recruitment Request" button → calls `POST /api/guilds/:id/join`

#### 3.3 Tri-State Routing (Solo / Member / Captain) — PARTIALLY DONE
Currently everything is in one `renderGuildSection()` inside UserPortal.tsx. The blueprint requires clearly distinct UIs.

**Must Refactor:**
- `EngineCGateway.tsx` — top-level router checking membership status
  - Solo → "Create Guild" or "Browse & Join" screen
  - Member → Member Dashboard (Chat, Vault, Roster, Weekly Panel)
  - Captain → Captain Dashboard (all Member features + management tools)

#### 3.4 Captain Exclusive Features — DO NOT EXIST
| Feature | Status |
|---|---|
| Approve/Reject join requests | ✅ Routes exist, basic UI in GuildVaultPanel |
| Kick members | ✅ Route exists |
| Rally Notification Button (once/day) | ❌ Missing — no notification type, no daily-limit guard |
| MVP Pin (pin top member on public wall) | ❌ Missing — no `pinnedMemberId` column on guilds, no UI |
| Guild Customizer (name, description, avatar, min rank to join) | ❌ Partially — no `minRankRequired` column on guilds, no avatar upload route for guilds |
| Warn/Nudge inactive members | ❌ Missing |

#### 3.5 Member Dashboard Features — PARTIALLY DONE
| Feature | Status |
|---|---|
| Weekly Target Progress Bar | ✅ guild_weekly_cycles exists; UI partially in GuildVaultPanel |
| Live Vault Viewer (own 15% escrow) | ✅ guild_vault_ledger exists; GuildVaultPanel shows it |
| Guild Roster (online/offline, contributions) | ❌ Online presence tracking missing; contributions partially shown |
| Engine C Chat | ❌ Missing entirely |
| Spectate Button (back to public space) | ❌ Missing (no public space to link to) |

#### 3.6 Weekly Task Panel — DOES NOT EXIST
Blueprint: Guild members get exclusive high-reward weekly tasks. Solo users cannot see them.

**Must Add:**
- `weekly_tasks` table: (id, title, description, pointReward, weekStart, weekEnd, targetGuildRank, isActive)
- `weekly_task_records` table: (id, userId, guildId, taskId, status, completedAt)
- `GET /api/guilds/weekly-tasks` — returns current week's tasks (members only)
- `WeeklyTaskPanel.tsx` component

---

## SECTION 4: DE-COUPLING CHECK — PAYOUT SECTION

### Current State ❌ Non-Compliant
The withdrawal flow (`POST /api/withdrawals`) has 3 blockers:
1. Mandatory daily task completion check
2. Rank-based minimum ad view count
3. Rank-based minimum task count (from `system_config.rank_payout_requirements`)

### Blueprint Requirement
- Remove all 3 blockers
- Only gate: minimum TX-Points conversion threshold (e.g., 10,000 TX-Points = 100 PKR minimum)
- Payout UI becomes a "Conversion Room": shows points → PKR conversion, fee in TX-Points, then queues the withdrawal

### What Needs Updating
| File | Change |
|---|---|
| `server/routes.ts` L922–982 | Remove task/ad-count gate; keep only minimum balance check |
| `server/routes.ts` L855–921 | Remove task-gate from GET withdrawals |
| `client/src/pages/UserPortal.tsx` L769–787, 2570–2627 | Remove payout-locked overlay and task requirement UI |
| Payout modal | Redesign as "Conversion Room": show TX-Points → PKR rate, fee, confirm |

---

## SECTION 5: ADMIN PORTAL — ENGINE C COMMAND CENTER

### Current Admin Features ✅ (Preserve)
- User Manager (search, ban, trust, balance adjustments)
- Risk Watchlist Panel (risk engine)
- Reconciliation Panel (founder ledger)
- Leaderboard Insights
- HilltopAds Manager
- GuildManager (basic: list guilds, view members)

### Blueprint Additions ❌ (All Missing)
| Feature | Status |
|---|---|
| Guild Audit Console (every guild, captain, member count, rank) | ❌ GuildManager exists but is basic |
| Strike Controls (view history, manually issue/remove strikes) | ❌ strikes table exists, no admin UI |
| Chat Logs & Moderation (view live Engine C messages per guild) | ❌ No chat exists yet |
| Custom Weekly Task Creator (inject tasks into Engine C) | ❌ No weekly tasks system |
| System Health Card: Total Points Generated Globally | ❌ Currently shows PKR metrics |
| Remove MLM tracking cards from admin dashboard | ❌ Level1/Level2 count cards still shown |

---

## SECTION 6: DATABASE MIGRATION PLAN

### Tables to ADD
```sql
-- Engine C Group Chat
CREATE TABLE engine_c_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly Tasks (Guild-exclusive)
CREATE TABLE weekly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    point_reward INTEGER NOT NULL,
    week_start TIMESTAMP NOT NULL,
    week_end TIMESTAMP NOT NULL,
    target_guild_rank VARCHAR(1) DEFAULT 'E',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly Task Completion Records
CREATE TABLE weekly_task_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    task_id UUID REFERENCES weekly_tasks(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'completed',
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);
```

### Tables to MODIFY
```sql
-- Add guild captain control columns
ALTER TABLE guilds ADD COLUMN pinned_member_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE guilds ADD COLUMN min_rank_required VARCHAR(1) DEFAULT 'E';
ALTER TABLE guilds ADD COLUMN recruitment_open BOOLEAN DEFAULT TRUE;
ALTER TABLE guilds ADD COLUMN last_rally_at TIMESTAMP; -- for once-per-day rally limit
ALTER TABLE guilds ADD COLUMN avatar_url TEXT;

-- Add conversion tracking to points_ledger (blueprint Section 5)
-- points_ledger already has vaultShareLockedPkr; ensure it has:
-- locked_pkr_value, conversion_rate_used, is_converted columns
```

### Tables to DEPRECATE (soft-delete, keep data, stop using)
| Table | Action |
|---|---|
| `daily_tasks` | Stop all writes; archive existing data; remove from routes |
| `task_records` | Stop all writes; archive; remove from routes |
| `commission_logs` where level=2 | Stop creating L2 records; L1 only going forward |

---

## SECTION 7: COMPLETE TASK PLAN (Ordered by Priority)

---

### PHASE 1 — CRITICAL REMOVALS & DE-COUPLING (Foundation)
*Remove what must be gone before new things can be built correctly.*

#### Task 1.1: Remove Daily Tasks System & Un-gate Payouts
- **Remove** daily task blocking logic from `server/routes.ts` (withdrawal POST/GET)
- **Remove** payout-locked UI overlay from `UserPortal.tsx`
- **Remove** daily task earnings card from dashboard
- **Keep** `daily_tasks` and `task_records` tables physically (data archive) but stop all reads/writes
- **Files:** `server/routes.ts`, `server/storage.ts`, `client/src/pages/UserPortal.tsx`

#### Task 1.2: Remove Multi-Level Referral (MLM) System
- **Simplify** commission logic to L1 only (single rate, configurable via system_config)
- **Update** `server/storage.ts` `getReferralStatsDetailed()` to return L1 only
- **Remove** L2 commission creation on withdrawals
- **Update** referral-stats-card, share-modal, commission-calculator, faq-section, earning-reveal, TermsAndConditions
- **Files:** `server/routes.ts`, `server/storage.ts`, `shared/schema.ts` (mark tier/level as deprecated), 5 client components

---

### PHASE 2 — POINTS-ONLY DISPLAY LAYER
*Convert all user-facing currency to TX-Points. Backend PKR storage unchanged.*

#### Task 2.1: Global PKR → TX-Points Display Conversion
- Replace `formatCurrency("PKR...")` with `formatPoints("TX-Points...")` in UserPortal.tsx
- Update all chart Y-axis labels: "Weekly PKR Earned" → "Weekly TX-Points"
- Update profile-modal.tsx, referral-stats-card.tsx, rank-badge.tsx
- Define conversion display formula (e.g., 1 PKR = 100 TX-Points, or use txPointsBalance directly)
- **Files:** `client/src/pages/UserPortal.tsx`, `client/src/components/ui/profile-modal.tsx`, `client/src/components/ui/referral-stats-card.tsx`, `client/src/components/ui/rank-badge.tsx`

#### Task 2.2: Rewire Dashboard to Blueprint's 4 Cards
- Card 1: TX-Points (→ `txPointsBalance` from users)
- Card 2: Engine C Vault (→ sum from `guild_vault_ledger` for this user)
- Card 3: Direct Referrals (→ L1 count only)
- Card 4: Referral Points Earned (→ L1 commissions, displayed as TX-Points)
- **Files:** `client/src/pages/UserPortal.tsx` dashboard section, `server/routes.ts` dashboard stats endpoint

#### Task 2.3: Design the Conversion Room (Payout Modal Redesign)
- Replace current withdrawal form with a 2-step Conversion Room UI:
  - Step 1: "You have X TX-Points" → enter amount to convert → see PKR equivalent
  - Step 2: Confirm: "Platform fee: Y TX-Points. You receive: Rs. ZZZ PKR"
- PKR only visible in this modal — nowhere else in the app
- **Files:** Payout section in `client/src/pages/UserPortal.tsx` or new `ConversionRoom.tsx` component

---

### PHASE 3 — ENGINE C INFRASTRUCTURE
*Build the missing backend for Guild Chat and Weekly Tasks.*

#### Task 3.1: Add engine_c_messages Table + Chat API
- Run migration: add `engine_c_messages` table
- Add `POST /api/guilds/:id/chat` (members only, CSRF-protected)
- Add `GET /api/guilds/:id/chat` (members only, paginated, last 100 messages)
- Extend WebSocket (`server/realtime.ts`) with guild-scoped rooms: on message broadcast to all online members of that guild
- **Files:** `shared/schema.ts`, `server/routes.ts`, `server/realtime.ts`, `server/storage.ts`

#### Task 3.2: Add Weekly Tasks Table + API
- Run migration: add `weekly_tasks` + `weekly_task_records` tables
- Add `GET /api/guilds/weekly-tasks` (guild members only)
- Add `POST /api/guilds/weekly-tasks/:id/complete` (with verification logic)
- Add admin `POST /api/admin/weekly-tasks` (create/edit tasks — Custom Task Creator)
- **Files:** `shared/schema.ts`, `server/routes.ts`, `server/storage.ts`

#### Task 3.3: Add Guild Column Migrations
- Add `pinned_member_id`, `min_rank_required`, `recruitment_open`, `last_rally_at`, `avatar_url` to `guilds` table
- Run `db:push` to apply
- **Files:** `shared/schema.ts`

---

### PHASE 4 — ENGINE C UI (The Big Build)
*Build the 3-state Engine C portal and all its components.*

#### Task 4.1: Engine C Gateway Router
- New page `client/src/pages/EngineC.tsx`
- Query `GET /api/guilds/mine` → route to correct sub-UI
  - `null` (solo) → `EngineCLanding.tsx` (browse + create)
  - `member` → `MemberDashboard.tsx`
  - `captain` → `CaptainDashboard.tsx`
- **Files:** New `client/src/pages/EngineC.tsx`, register route in App.tsx

#### Task 4.2: Public Social Space (Spectator Area)
- Publicly accessible guild discovery page (`/engine-c/explore`)
- Guild feed with: banner, badge, guild rank badge, member count, weekly points
- Performance Board: sortable by rank/points
- Guild Social Card modal (like a social media profile)
- "Send Recruitment Request" button → `POST /api/guilds/:id/join`
- Futuristic dark-mode gaming aesthetic per blueprint
- **Files:** New `EngineCPublic.tsx`, `GuildSocialCard.tsx`

#### Task 4.3: Member Dashboard
- Engine C Chat component (real-time, WhatsApp-like)
- Weekly Task Panel (collective progress bar + individual task list)
- Live Vault Viewer (own 15% escrow, countdown to weekly release)
- Guild Roster (member list, online indicators, this-week contribution)
- Spectate Button → links to `/engine-c/explore`
- **Files:** New `MemberDashboard.tsx`, `EngineCChat.tsx`, `WeeklyTaskPanel.tsx`

#### Task 4.4: Captain Dashboard
- All of Member Dashboard features (inherited)
- Roster Management: approve/reject queue, kick, nudge/warn
- Rally Button (once per day — POST `/api/guilds/:id/rally`) with cooldown indicator
- MVP Pin: pick top member to highlight on public social card
- Guild Customizer: name, description, avatar upload, min rank filter, recruitment toggle
- **Files:** New `CaptainDashboard.tsx`, extend guild routes for rally + pin + customizer

---

### PHASE 5 — ADMIN PORTAL UPGRADES

#### Task 5.1: Engine C Command Center Tab
- New tab in `client/src/pages/TeamPortal.tsx`
- Guild Audit Console: full table (guild name, captain, member count, rank, strikes, status)
- Strike Controls: view history, manually add/remove strikes
- Chat Logs & Moderation: view engine_c_messages per guild, ability to delete messages
- Custom Weekly Task Creator: form to inject new weekly tasks with point rewards
- **Files:** `client/src/pages/TeamPortal.tsx`, new `EngineCCommandCenter.tsx`

#### Task 5.2: Admin Dashboard Card Refresh
- Remove Level1/Level2 referral tracking cards
- Add "Total TX-Points Generated Globally" card (sum of txPointsBalance across all users)
- Add "Active Engine C Guilds" card
- Add "Global Vault Status" card (total points locked in escrow across all guilds)
- Update System Health cards to reflect points-era metrics
- **Files:** `client/src/components/admin/AdminDashboard.tsx` or equivalent

---

### PHASE 6 — CONTENT & FAQ CLEANUP

#### Task 6.1: FAQ & Marketing Copy Update
- Rewrite `client/src/components/sections/faq-section.tsx` — remove all MLM/daily task references
- Add new FAQ entries: Engine C Guild Vault, Weekly Task Cycle, Rank Deduction, Points Conversion
- Update `client/src/components/sections/earning-reveal.tsx` — remove tier 2/3
- Update `client/src/pages/TermsAndConditions.tsx` L196 — remove Level 2 referral clause
- **Files:** 3 client content files

---

## SECTION 8: WHAT TO PRESERVE (DO NOT CHANGE)

| System | Reason |
|---|---|
| HilltopAds integration | Fully functional revenue engine — no changes needed |
| Risk Engine (`server/modules/risk-engine.ts`) | Core fraud protection — preserve entirely |
| Health Snapshot Job | Preserve |
| Leaderboard (`leaderboard_cache`, cleanup job) | Preserve, minor label update (PKR→Points) |
| Audit Logs | Preserve all logging |
| Team portal auth (invitations, team keys) | Preserve |
| Session auth / CSRF / rate limiting | Preserve |
| Chatbot (`advanced-chatbot-service.ts`) | Preserve |
| `guild_vault_resolution.ts` job | Preserve — the weekly escrow release logic is correct |
| `points_ledger` table | Keep — extend with missing columns if needed |
| `guilds`, `guild_members`, `guild_strikes`, `guild_weekly_cycles`, `guild_vault_ledger` tables | Keep all — they are the Engine C data backbone |

---

## SECTION 9: RISK NOTES

1. **Balance Display Inversion:** The `availableBalance` column stores real PKR. `txPointsBalance` stores points. These are currently two separate counters. When PKR is earned (ad view, referral), the system must also update `txPointsBalance` in parallel. Verify this is happening in `server/storage.ts` before Phase 2.

2. **Conversion Rate:** The blueprint references a fluctuating conversion rate. A `system_config` key `tx_point_to_pkr_rate` should be introduced (default: 100 TX-Points = 1 PKR) so it can be adjusted without a deploy.

3. **Daily Tasks Archive:** Do not DROP `daily_tasks`/`task_records` tables — only stop using them. The existing task data is historical and should be preserved.

4. **Real-time Chat Scalability:** The existing WebSocket in `server/realtime.ts` uses a single server-wide broadcast. For guild-scoped chat, implement guild rooms (map of guildId → Set of WebSocket connections). This is safe within a single Node.js instance but will need Redis pub/sub if scaled horizontally later.

5. **Engine C Rename:** "Guild" remains the internal DB/code name. "Engine C" is the UI label only — avoid a codebase-wide rename that would break existing references. Use display strings only.

---

*End of Audit Report — Ready for Phase-by-Phase Implementation on Go-Ahead*
