# THORX PLATFORM — DEFINITIVE IMPLEMENTATION SPECIFICATION
### Enterprise System Architecture Blueprint · Version 3.0 · July 2026

> **Document Authority:** This file supersedes all prior task.md drafts. It is the single source of truth for the complete rebuild. Every existing feature is catalogued, every new feature is specified, and every transformation is traced.
>
> **Sources:** Full codebase exploration (schema, all routes, storage layer, all admin components, all user components, all server modules) + three specification documents + complete chat context.
>
> **Reading guide:** Parts A–C establish context. Part D is the schema DDL. Parts E–H are the implementation specs. Parts I–K are data flows, migration, and testing. Execute in the order given.

---

## TABLE OF CONTENTS

```
PART A  —  Legacy Feature Complete Inventory
PART B  —  Transformation Matrix (Legacy → New)
PART C  —  System Architecture Overview (New)
PART D  —  Schema Evolution (Complete DDL)
PART E  —  Backend: Modules, Business Logic, Routes
PART F  —  Frontend: User Portal (All Three Experiences)
PART G  —  Frontend: Admin / Team Portal (Complete)
PART H  —  Real-Time & Background Systems
PART I  —  Complete Data Flow Specifications
PART J  —  Configuration Reference (system_config)
PART K  —  Migration Execution Plan
PART L  —  Quality Assurance & Test Protocol
```

---

## PART A — LEGACY FEATURE COMPLETE INVENTORY

*Everything that currently exists in the codebase, catalogued for traceability. Every item below maps to a disposition in Part B.*

### A.1 Database Tables (Existing)

| # | Table | Key Columns | Current Purpose |
|---|---|---|---|
| 1 | `users` | id, firstName, lastName, identity, phone, email, passwordHash, referralCode, referredBy, role, totalEarnings, availableBalance, pendingBalance, totalWithdrawn, isActive, isVerified, loginStreak, lastLoginDate, avatar, rank, rankLocked, trustStatus, trustReason, profilePicture, permissions (JSONB), emailVerifiedAt, personalRank, guildContributionScore, txPointsBalance | Core user accounts |
| 2 | `team_invitations` | id, email, role, permissions, token, expiresAt, createdBy, consumedAt | Cryptographic team onboarding |
| 3 | `device_fingerprints` | id, userId, fingerprintHash, userAgent, ipAddress, createdAt, lastSeenAt | Fraud/device tracking |
| 4 | `system_config` | id, key, value (JSONB), description, updatedBy, updatedAt | Platform-wide config |
| 5 | `earnings` | id, userId, type, amount, description, status, metadata (JSONB) | User-facing earnings history |
| 6 | `leaderboard_cache` | id, userId, globalRank, performanceScore, earningsScore, teamScore, activeScore, healthScore, level1Count, level2Count, recordedAt | Leaderboard snapshot |
| 7 | `ad_views` | id, userId, adId, adType, adNetwork, duration, completed, earnedAmount, ipAddress, userAgent | Engine A ad completions |
| 8 | `referrals` | id, referrerId, referredId, status, tier, totalEarned | Referral relationships |
| 9 | `withdrawals` | id, userId, amount, method, accountName, accountNumber, accountDetails (JSONB), status, transactionId, processedAt, rejectionReason, fee, netAmount | Payout requests |
| 10 | `guilds` | id, name, description, captainId, guildRank, guildScore, strikes, status, isPublic, memberCount, vaultBalancePkr, pinnedMemberId, minRankRequired, recruitmentOpen, lastRallyAt, avatarUrl | Guild entities |
| 11 | `points_ledger` | id, userId, guildId, sourceType, sourceRefId, pointsDisplayed, lockedPkrValue, conversionRateUsed, vaultShareLockedPkr, weekStart, isConverted, metadata (JSONB) | Dual-value ledger (existing) |
| 12 | `guild_members` | id, guildId, userId, role, status, requestedAt, joinedAt, leftAt | Guild membership roster |
| 13 | `guild_strikes` | id, guildId, reason, source, addedBy, clearedBy, clearedAt | Guild disciplinary record |
| 14 | `guild_weekly_cycles` | id, guildId, weekStart, weekEnd, targetPoints, actualPoints, goalMet, multiplierApplied, resolved, resolvedAt | Weekly guild cycle tracking |
| 15 | `guild_vault_ledger` | id, guildId, userId, weekStart, pointsHeld, pkrHeld, status, releasedMultiplier, releasedPkrValue, releasedAt | Per-member vault entries |
| 16 | `engine_c_messages` | id, guildId, senderId, message, createdAt | Guild group chat |
| 17 | `weekly_tasks` | id, title, description, pointReward, weekStart, weekEnd, targetGuildRank, isActive, createdBy | Guild weekly task definitions |
| 18 | `weekly_task_records` | id, userId, guildId, taskId, status, completedAt. Unique(userId, taskId) | Task completion tracking |
| 19 | `daily_tasks` | id, title, type, actionUrl, secretCode, instructions, targetRank, isActive, isMandatory | Daily task definitions |
| 20 | `task_records` | id, userId, taskId, status, clickedAt, completedAt | Daily task completions |
| 21 | `commission_logs` | id, beneficiaryId, sourceUserId, triggerWithdrawalId, amount, rate, level, status, metadata (JSONB) | Multi-level commission history |
| 22 | `rank_logs` | id, userId, oldRank, newRank, triggerSource | Rank change audit trail |
| 23 | `notifications` | id, userId, title, message, type, adminName, adminRole, amount, adjustmentType, isRead | In-app notifications |
| 24 | `risk_cases` | id, userId (Unique), riskScore, severity, status, signals (JSONB), assignedTo, notes, notesBy, resolvedBy, resolvedAt, resolution | Fraud/risk case management |
| 25 | `score_history` | id, userId, performanceScore, riskScore, earningsScore, teamScore, activeScore, healthScore, snapshotAt | Multi-dimensional score snapshots |
| 26 | `health_snapshots` | id, overallScore, financialScore, operationalScore, userHealthScore, riskHealthScore, integrityScore, signalsJson (JSONB), topReason, delta1h, delta24h | System health timeline |
| 27 | `audit_logs` | id, adminId, action, targetType, targetId, details (JSONB), ipAddress | Admin action ledger |
| 28 | `internal_notes` | id, adminId, targetType, targetId, content | Admin private case notes |
| 29 | `hilltop_ads_config` | id, apiKey, publisherId, isActive, settings (JSONB), lastSyncedAt | HilltopAds integration config |
| 30 | `hilltop_ads_zones` | id, zoneId, siteName, zoneName, adFormat, status, settings (JSONB), totalImpressions, totalClicks, totalRevenue | Ad zone configuration |
| 31 | `hilltop_ads_stats` | id, zoneId, date, impressions, clicks, cpm, revenue, ctr, metadata (JSONB) | Per-zone daily stats |
| 32 | `error_events` | id, route, status, message, occurredAt | Server error tracking |
| 33 | `founder_withdrawals` | id, amount, withdrawalDate, description, createdBy | Founder ledger |
| 34 | `team_emails`, `team_keys`, `user_credentials`, `chat_messages` | Various | Team infra |

### A.2 Existing API Routes

| Method | Path | Auth | Current Function |
|---|---|---|---|
| POST | /api/register | Public | User registration with referral support |
| POST | /api/login | Public | Session-based login, streak update |
| POST | /api/logout | Auth | Session destroy |
| GET | /api/user | Session/Anon | Profile + permissions |
| PATCH | /api/users/:id | Auth (Self) | Update name, avatar, profilePicture |
| POST | /api/auth/mark-verified | Auth | Email verification |
| POST | /api/bootstrap-founder | Dev | Founder node + cryptographic key |
| GET | /api/guilds | Auth | List active guilds |
| POST | /api/guilds | Auth | Create guild |
| POST | /api/guilds/:id/join | Auth | Request membership |
| POST | /api/guilds/:id/leave | Auth | Leave guild |
| POST | /api/guilds/:id/chat | Auth+Member | Send group chat message |
| GET | /api/guilds/:id/chat | Auth+Member | Fetch group chat history |
| PATCH | /api/guilds/:id/settings | Auth+Captain | Update guild metadata |
| POST | /api/guilds/:id/rally | Auth+Captain | Rally trigger (cooldown-gated) |
| POST | /api/guilds/weekly-tasks/:taskId/complete | Auth+Member | Complete a weekly task |
| GET | /api/earnings | Auth | Earnings history |
| POST | /api/ad-view | Auth | Record ad completion (Engine A) |
| GET | /api/dashboard/stats | Auth | Full financial dashboard |
| POST | /api/hilltopads/ad-completion | Auth | HilltopAds network callback |
| GET | /api/tasks | Auth | Daily tasks filtered by rank |
| POST | /api/tasks/:id/click | Auth | Initialize task session |
| POST | /api/tasks/:id/verify | Auth | Verify task code + timer |
| GET | /api/admin/users | VIEW_USERS | Paginated user list |
| PATCH | /api/admin/users/:id/action | VIEW_ANALYTICS | Suspend or balance adjust |
| PATCH | /api/admin/withdrawals/:id | MANAGE_PAYOUTS | Approve/reject payout |
| POST | /api/admin/tasks | requireTeamRole | CRUD daily tasks |
| PATCH | /api/admin/config/:key | MANAGE_SYSTEM | Update system_config |
| GET | /api/admin/audit-logs | VIEW_AUDIT_LOGS | Audit log retrieval |
| POST | /api/team/members | requireTeamRole | Mint team entry keys |
| PATCH | /api/admin/users/:id/rank | MANAGE_USERS | Manual rank override/lock |
| POST | /api/withdrawals | Auth | Create withdrawal request |
| GET | /api/withdrawals | Auth | User withdrawal history |

### A.3 Existing Storage Functions

| Function | Tables Touched | Current Behavior |
|---|---|---|
| `createUser()` | users, referrals | Creates account, generates referral code, links referrer |
| `updateUserEarnings()` | users | Updates availableBalance, pendingBalance, totalEarnings |
| `recordEarnEvent()` | earnings, adViews, commissionLogs, users | Entry point for all earnings; triggers commission chain |
| `checkAndUpdateRank()` | users, rankLogs | Evaluates `totalEarnings` + active referral count → sets `rank` |
| `processWithdrawal()` | withdrawals, commissionLogs, users | Finalizes payout; triggers multi-level (L1/L2/L3) commissions |
| `resolveGuildWeeklyCycle()` | guildWeeklyCycles, guildVaultLedger, guild_members, guilds | Processes weekly guild performance, vault release, strikes |
| `adjustUserBalance()` | users, auditLogs | Admin balance modification with audit trail and rank re-eval |

### A.4 Existing Server Modules

| Module | Location | Current Function |
|---|---|---|
| Risk Engine | `server/modules/risk-engine.ts` | 5-signal fraud scoring: velocity, bot network, device clustering, chain linearity, task speed |
| Health Engine | `server/modules/health-engine.ts` | 6-dimension health score: financial, operational, user health, risk, integrity. NaN bug present. |
| HilltopAds | `server/hilltopads-service.ts` | Ad network integration for impression/click tracking and revenue |
| Chatbot | `server/chatbot/` | NLP-based support assistant |
| Jobs | `server/jobs/` | Guild resolution, leaderboard cleanup, health snapshots |
| WebSocket | `server/ws.ts` | Real-time user data sync |

### A.5 Existing Admin Portal Sections

| Component | File | Current Feature Set |
|---|---|---|
| AdminDashboard | `admin/AdminDashboard.tsx` | 6 sections: System Health widget, Core Metrics (revenue/registrations/members/pending payouts), Growth & Network (registrations area chart, L1/L2 referral stats), Financial Integrity (commissions paid, unverified credit exposure, payout queue), Analytics panel. Date range: 24h/7d/30d/all. |
| PayoutControl | `admin/PayoutControl.tsx` | Search + export + status filter (all/pending/completed/cancelled) + sort (latest/rank/deadtime) + bulk select. Per-row: copy account, approve (requires Ref ID), reject (requires reason). Detail modal: full breakdown with IBAN. |
| UserManager | `admin/UserManager.tsx` | Search + export + bulk select. Per-row: view internal notes, view referral network topology (L1/L2 map), adjust balance (add/subtract + reason + credit intent), terminate node, update trust status (Special/Trusted/Normal/Dangerous). |
| GuildManager | `admin/GuildManager.tsx` | Search + status filter (active/frozen/disbanded). Per-guild: freeze/unfreeze, disband, add strike (requires reason), clear strikes, run weekly resolution. Shows: rank, status, member count, points, vault balance (Rs), strike count. |
| SystemSettingsManager | `admin/SystemSettingsManager.tsx` | 6 sections: Economic Thresholds (min payout, withdrawal fee%, referral fee share%, conversion rate, vault hold%), Core Integration, Ad Network Waterfall (name/zoneId/format/priority/status), CPA Network Waterfall, Guild Rank Tiers (weekly goal, release multiplier per E-S), Performance & Risk Scoring (score weights, risk thresholds, cohort discount days). |
| LeaderboardInsights | `admin/LeaderboardInsights.tsx` | 3 tabs: All Members (global rank, member, status, total earned, team size L1/L2, PS), Top Recruiters, Risk Watchlist. Summary: total members, top earner, top recruiter, watchlist count. Actions: refresh, export CSV, view user inspector. |
| Risk/Watchlist | `admin/RiskWatchlistPanel.tsx` | Search + sort + severity/status filters. Per-case: composite risk score (0-100), severity (Low/Medium/High/Critical), status workflow (Open→Investigating→Cleared→Actioned→Reopen), assign team member, notes with author trail, timeline. Charts: score trend, signal accuracy (precision % vs. times triggered). |
| Health Dashboard | (within AdminDashboard or separate) | 6-score display: overall, financial, operational, user health, risk health, integrity. Deltas: 1h, 24h. Top reason text. NaN issue present. |
| HilltopAds Admin | `pages/HilltopAdsAdmin.tsx` | Zone management, API key/publisher ID config, impressions/clicks/CPM/revenue per zone, sync controls. |
| Team Portal Shell | `pages/TeamPortal.tsx` | Access-controlled shell that routes to admin sub-modules based on role/permissions. Permission-based section blocking for 'team' role. |

### A.6 Existing User Portal

| Feature | Current State |
|---|---|
| Earnings display | TX-Points balance, total earnings, available/pending balance |
| Engine A (ads) | HilltopAds player + ad-view recording |
| Engine B (tasks) | Daily tasks filtered by rank, click + verify code flow |
| Guild access | GuildVaultPanel showing vault mechanics |
| GuildVaultPanel | Weekly goal progress, vault balance PKR, guild chat, scratch card reveal |
| ScratchCardModal | Animated scratch-to-reveal card for task completions |
| Referral display | L1/L2 counts, commission earned |
| Withdrawal | Create request, view history |
| Profile | Name, avatar, rank badge (old system), profilePicture |

---

## PART B — TRANSFORMATION MATRIX

*Every legacy feature mapped to its disposition in the new system. Nothing is orphaned.*

### B.1 Schema Changes

| Legacy Table/Column | Disposition | Reason | New Replacement |
|---|---|---|---|
| `users.rank` | **MIGRATE → DEPRECATE** | Old Urdu names → E-S system | `users.userRankTier` (new column) |
| `users.totalEarnings` | **KEEP + READ-ONLY** | Still needed for admin display | Unchanged; rank no longer reads it |
| `users.availableBalance` | **KEEP + RECLASSIFY** | User-facing TX-Points display | Stays; withdrawal math moves to ledger |
| `users.loginStreak` | **RENAME + EXTEND** | Streak exists but no PS award | → `users.streakDays`; add `lastStreakDate`, PS awards wired |
| `users.lastLoginDate` | **KEEP + EXTEND** | Exists; no inactivity penalty | Add `users.lastActiveAt` (updated per task, not just login) |
| `users.personalRank` | **KEEP** | GPS-axis rank (E-S per guild role) | Unchanged label; now driven by GPS |
| `users.guildContributionScore` | **RECLASSIFY** | Exists but ad-hoc | Formalized as `weeklyPointsContributed` in guild_members |
| `users.permissions` (JSONB) | **KEEP** | Admin RBAC | Unchanged |
| `guilds.vaultBalancePkr` | **RENAME** | "Vault" terminology banned in user UI | Backend column name kept; UI label = "Guild Weekly Bonus Pool" |
| `guilds.lastRallyAt` | **REMOVE** | Rally system deleted | Column dropped after migration |
| `guilds.guildRank` | **KEEP + RENAME** | Exists (E-S text) | → `guildRankTier` for clarity |
| `guilds.guildScore` | **RENAME** | Exists | → `guildPerformanceScore` |
| `guild_vault_ledger` | **KEEP + EXTEND** | Core vault mechanics | Add `engineType`, `cardVariance` columns; becomes source for withdrawal calc |
| `points_ledger` | **SUPERSEDED** | Replaced by `user_transactions` | Keep as legacy read-only; new writes go to `user_transactions` |
| `commission_logs` | **FREEZE** | Multi-level commissions removed | No new writes; replaced by `referral_commissions` |
| `referrals.tier` | **FREEZE** | Multi-level removed | Column stays for legacy data; new referrals only have tier='L1' |
| `leaderboard_cache.level2Count` | **NULLED** | L2 referral removed | Set to 0 going forward; L1 count kept |
| `daily_tasks` | **PRESERVE + REPURPOSE** | Daily task system removed as withdrawal gate | Table kept; tasks become Engine C indirect tasks (admin manages in guild task panel) |
| `task_records` | **KEEP** | Completion history | Unchanged |
| `weekly_tasks` | **KEEP + ENHANCE** | Already guild tasks | Add `taskCategory` column: 'cpa_offer' | 'indirect' | 'platform' |
| `guild_weekly_cycles` | **KEEP + EXTEND** | Core weekly reset | Add `bonusPoolPkr`, `poolDisposition` columns |
| `engine_c_messages` | **KEEP** | Guild group chat | Unchanged; captain DMs go to new `captain_messages` table |
| `hilltop_ads_*` | **KEEP INTACT** | HilltopAds integration stays | All three tables unchanged |
| `risk_cases` | **KEEP INTACT** | Risk engine unchanged | Unchanged |
| `score_history` | **KEEP + EXTEND** | Add PS, rank columns | Add `userRankTier`, `guildRole` for new axes |
| `health_snapshots` | **KEEP + FIX** | NaN bug to fix | Add null guards in health-engine.ts |
| `audit_logs` | **KEEP + EXTEND** | Add new action types | New enum values for PS adjustments, GPS adjustments, captain replacement |
| `rank_logs` | **KEEP** | Unchanged purpose | Add new rank name values (E-S) |
| `notifications` | **KEEP** | Unchanged | Add new notification types |
| `error_events` | **KEEP** | Unchanged | Unchanged |
| `founder_withdrawals` | **KEEP** | Unchanged | Unchanged |
| `internal_notes` | **KEEP** | Unchanged | Unchanged |

### B.2 Route Disposition

| Legacy Route | Disposition | Change |
|---|---|---|
| POST /api/register | **KEEP + EXTEND** | Add: set guildRole='simple', performanceScore=0, lastActiveAt=now |
| POST /api/login | **KEEP + EXTEND** | Add: update lastActiveAt; trigger streak evaluation |
| POST /api/logout | **KEEP** | Unchanged |
| GET /api/user | **EXTEND** | Add: userRankTier, guildRole, guildId, performanceScore, streakDays, balanceCashPkr, lastActiveAt |
| PATCH /api/users/:id | **KEEP** | Unchanged |
| POST /api/auth/mark-verified | **KEEP** | Unchanged |
| POST /api/bootstrap-founder | **KEEP** | Unchanged |
| GET /api/guilds | **EXTEND** | Add GPS fields, minRankRequired, weeklyTarget, currentWeeklyPoints, bonusPool hint |
| POST /api/guilds | **EXTEND** | Add rank gate: requireMinRank('B-Rank'); initialize weeklyTarget from config |
| POST /api/guilds/:id/join | **EXTEND** | Add: rank gate (D-Rank min); cover letter required (min 50 chars); minRankRequired enforcement |
| POST /api/guilds/:id/leave | **KEEP** | Unchanged |
| POST /api/guilds/:id/chat | **KEEP** | Unchanged (group chat) |
| GET /api/guilds/:id/chat | **KEEP** | Unchanged |
| PATCH /api/guilds/:id/settings | **EXTEND** | Add: minRankRequired, targetDifficulty, description, avatarUrl |
| POST /api/guilds/:id/rally | **REMOVE** | Rally system deleted |
| POST /api/guilds/weekly-tasks/:taskId/complete | **EXTEND** | Add Engine C math (20/35/45 split), PS award, GPS update, feed event |
| GET /api/earnings | **KEEP** | Unchanged |
| POST /api/ad-view | **EXTEND** | Add: Engine A math (40/60 split), Thorx Card draw, PS award, feed event, lastActiveAt update |
| GET /api/dashboard/stats | **EXTEND** | Add: performanceScore, userRankTier, streakDays, guildRole, guildId, weeklyContribution, guildWeeklyProgress |
| POST /api/hilltopads/ad-completion | **KEEP** | Unchanged callback handler |
| GET /api/tasks | **EXTEND** | Also returns guild weekly_tasks for Engine C |
| POST /api/tasks/:id/click | **KEEP** | Unchanged |
| POST /api/tasks/:id/verify | **EXTEND** | Add Engine B math (40/60 split + C-Rank gate), Thorx Card draw, PS award, feed event |
| GET /api/admin/users | **EXTEND** | Add: performanceScore, userRankTier, guildRole, balanceCashPkr, lastActiveAt columns |
| PATCH /api/admin/users/:id/action | **EXTEND** | Add: PS manual adjust (new action type), rank lock/unlock |
| PATCH /api/admin/withdrawals/:id | **EXTEND** | Add: ledger validation pre-approval, RED ALERT flag check, referral commission trigger |
| POST /api/admin/tasks | **EXTEND** | Add: taskCategory field (cpa_offer/indirect/platform); visibility toggle (engineB/engineC/both) |
| PATCH /api/admin/config/:key | **KEEP** | Unchanged |
| GET /api/admin/audit-logs | **KEEP** | Unchanged |
| POST /api/team/members | **KEEP** | Unchanged |
| PATCH /api/admin/users/:id/rank | **EXTEND** | Add: PS override mode, GPS override (separate endpoint for guild) |
| POST /api/withdrawals | **OVERHAUL** | New: ledger-based calc, 15% fee, referral commission, S-Rank auto-approve |
| GET /api/withdrawals | **KEEP** | Unchanged |

### B.3 Storage Function Disposition

| Legacy Function | Disposition | Change Required |
|---|---|---|
| `createUser()` | **EXTEND** | Initialize: performanceScore=0, userRankTier='E-Rank', guildRole='simple', lastActiveAt=now, streakDays=0, balanceCashPkr=0 |
| `updateUserEarnings()` | **KEEP** | Used for user-facing balance display; withdrawal math bypasses it |
| `recordEarnEvent()` | **OVERHAUL** | Full rewrite: engine-specific split, Thorx Card draw, user_transactions insert, PS award, streak check, GPS update for Engine C, feed event emit |
| `checkAndUpdateRank()` | **OVERHAUL** | Rename to `checkAndUpdateRankTier()`; input = PS (not totalEarnings); reads PS thresholds from system_config; old function kept as alias |
| `processWithdrawal()` | **OVERHAUL** | New: FIFO ledger walk on user_transactions, single 15% fee, 1-tier referral commission to balanceCashPkr, S-Rank auto-approve |
| `resolveGuildWeeklyCycle()` | **OVERHAUL** | New: captain 30% / members 70% proportional split of weeklyBonusPool; GPS milestone award; guild_weekly_snapshots insert; no multiplier logic |
| `adjustUserBalance()` | **KEEP + EXTEND** | Add: PS adjustment mode with reason; re-call `checkAndUpdateRankTier()` after balance change |

### B.4 Admin Component Disposition

| Legacy Component | Disposition | Changes |
|---|---|---|
| AdminDashboard | **EXTEND** | Remove: L2 referral metrics; Add: Engine A/B/C revenue breakdown card, engine split live stats, feed event summary; Fix: NaN health scores |
| PayoutControl | **OVERHAUL** | Add: double-entry audit table per withdrawal, RED ALERT fraud banner, one-click payment copy, ledger PKR vs. points display, referral commission breakdown |
| UserManager | **EXTEND** | Add: performanceScore column, userRankTier badge, guildRole indicator, balanceCashPkr field; Change: Referral Network modal shows L1-only (remove L2); Add: PS manual adjust action; Remove: L2 from topology display |
| GuildManager | **EXTEND** | Add: inactive captain alert section, weekly target assigner (per rank), GPS manual adjustment, captain replacement action, member force-kick |
| SystemSettingsManager | **OVERHAUL** | Split into dedicated components; Add: per-engine profit sliders (A/B/C), Thorx Card variance controls; Remove: vault hold% (replaced by per-engine config); Keep: all other sections |
| LeaderboardInsights | **EXTEND** | Update: leaderboard now uses PS from score_history (not totalEarnings-based); Add: referral analytics tab (top promoters, total commissions); Remove: L2 count column from tables |
| Risk/Watchlist | **KEEP INTACT** | No changes to risk engine signals or case management UI |
| Health Dashboard | **FIX + KEEP** | Fix NaN divide-by-zero in health-engine.ts; all other features preserved |
| HilltopAds Admin | **KEEP INTACT** | No changes |

### B.5 User Component Disposition

| Legacy Component | Disposition | Changes |
|---|---|---|
| UserPortal | **OVERHAUL** | Add: three-context routing (simple/member/captain); new summary card variants per context; Engine C tab routing |
| GuildVaultPanel | **SUPERSEDED** | Absorbed into GuildMemberPanel; keep as re-export shim for backward compatibility |
| ScratchCardModal | **SUPERSEDED** | Replaced by ThorxCard component (new design, same concept — card reveal animation) |
| HilltopAdsPlayer | **KEEP INTACT** | Engine A delivery mechanism unchanged |

---

## PART C — SYSTEM ARCHITECTURE OVERVIEW

### C.1 Three Earning Engines

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THORX EARNING ENGINES                        │
├──────────────────┬──────────────────┬──────────────────────────────┤
│   ENGINE A       │   ENGINE B       │   ENGINE C                   │
│   Video Ads      │   CPA Offers     │   Guild Tasks                │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ Who: All users   │ Who: C-Rank+     │ Who: Members & Captains only │
│ Min rank: E-Rank │ Min rank: C-Rank │ Min role: guildRole≠'simple' │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ Gross: 100%      │ Gross: 100%      │ Gross: 100%                  │
│ Thorx cut: 40%   │ Thorx cut: 40%   │ Thorx cut: 20%               │
│ User gets: 60%   │ User gets: 60%   │ Guild pool: 35%              │
│                  │                  │ User gets: 45%               │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ PS per task: +5  │ PS per task: +25 │ PS per task: +15             │
│ Provider:        │ Provider: CPA    │ Task types:                  │
│ HilltopAds +     │ networks         │ - CPA offers (guild-only)    │
│ ad_views table   │                  │ - Indirect (YouTube/TikTok)  │
└──────────────────┴──────────────────┴──────────────────────────────┘
```

### C.2 Three User Experience Contexts

```
┌───────────────────────────────────────────────────────────────────┐
│                      USER EXPERIENCE ROUTING                       │
│           (determined by users.guildRole at session load)          │
├───────────────┬───────────────────┬──────────────────────────────┤
│ SIMPLE USER   │ GUILD MEMBER      │ GUILD CAPTAIN                │
│ guildRole=    │ guildRole=        │ guildRole=                   │
│ 'simple'      │ 'member'          │ 'captain'                    │
├───────────────┼───────────────────┼──────────────────────────────┤
│ Engine C tab: │ Engine C tab:     │ Engine C tab:                │
│ Guild         │ Guild Member      │ Captain Portal               │
│ Discovery     │ Panel (Workers    │ (Management Suite)           │
│ Area (public  │ Hub)              │                              │
│ leaderboard)  │                   │                              │
├───────────────┴───────────────────┴──────────────────────────────┤
│              Engines A and B: visible to ALL users                │
│        (Engine B gated at C-Rank; shows locked state below)       │
└───────────────────────────────────────────────────────────────────┘
```

### C.3 Revenue Model (Legal Compliance)

```
THORX EARNS FROM THREE LEGAL SOURCES:

1. Platform Fee on Withdrawal
   ├── 15% of real PKR value from ledger
   ├── 30% of that fee → referrer's balanceCashPkr (if referrer exists)
   └── 70% of fee (or 100% if no referrer) → Thorx net profit

2. Indirect Organic Traffic (Engine C indirect tasks)
   ├── "Subscribe to Thorx YouTube" → organic subscriber
   ├── "Watch this video + enter code" → ad revenue
   └── "Follow Thorx TikTok" → social growth
       → 100% value to Thorx, 0% PKR cost

3. Engine Revenue Cut (per task completion)
   ├── Engine A: 40% of gross network revenue
   ├── Engine B: 40% of gross network revenue
   └── Engine C: 20% of gross network revenue (+ 35% to bonus pool)
```

### C.4 The Thorx Card (Randomized Reward Engine)

```
TASK COMPLETION FLOW:
─────────────────────────────────────────────────────────────────────

  [User completes task]
         │
         ▼
  [Network reports: Gross Revenue = R]
         │
         ▼
  [Engine split (backend only)]
  ┌──────────────────────────────────────────────────────────┐
  │ Engine A/B: userPkrShare = R × 0.60                     │
  │ Engine C:   userPkrShare = R × 0.45                     │
  │             guildPool    += R × 0.35  → guilds table     │
  └──────────────────────────────────────────────────────────┘
         │
         ▼
  [Thorx Card engine]
  ┌──────────────────────────────────────────────────────────┐
  │ targetPoints = (userPkrShare / 10.00) × CONVERSION_RATE │
  │ variance     = random(CARD_MIN, CARD_MAX)                │
  │              [A-Rank: bounds expand ±5%]                 │
  │              [S-Rank: bounds expand ±10%]               │
  │ pointsCredited = round(targetPoints × variance)          │
  └──────────────────────────────────────────────────────────┘
         │
         ▼
  [user_transactions INSERT]
  ┌──────────────────────────────────────────────────────────┐
  │ pointsCredited = 648   ← user sees this on card         │
  │ realPkrValue   = 6.00  ← IMMUTABLE, never changes       │
  │ cardVariance   = 1.08  ← logged for audit               │
  └──────────────────────────────────────────────────────────┘
         │
         ▼
  [Thorx Card UI animates → user sees 648 TX-Points]
  [Balance updated → PS awarded → streak checked]
```

---

## PART D — SCHEMA EVOLUTION (COMPLETE DDL)

### D.1 New Columns on `users` Table

```sql
-- Performance & Rank (new PS-based system)
ALTER TABLE users ADD COLUMN performance_score integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN user_rank_tier text NOT NULL DEFAULT 'E-Rank';
  -- Valid: 'E-Rank' | 'D-Rank' | 'C-Rank' | 'B-Rank' | 'A-Rank' | 'S-Rank'

-- Guild membership (replaces implicit lookup via guild_members)
ALTER TABLE users ADD COLUMN guild_role text NOT NULL DEFAULT 'simple';
  -- Valid: 'simple' | 'member' | 'captain'
ALTER TABLE users ADD COLUMN guild_id text REFERENCES guilds(id) ON DELETE SET NULL;

-- Activity tracking (for inactivity penalty cron)
ALTER TABLE users ADD COLUMN last_active_at timestamp NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_streak_date date;
ALTER TABLE users ADD COLUMN inactivity_penalty_at timestamp;
  -- Set by cron when penalty fires; null = not yet penalized

-- Referral cash (separate wallet for referral commissions)
ALTER TABLE users ADD COLUMN balance_cash_pkr decimal(10,2) NOT NULL DEFAULT 0.00;
  -- INVARIANT: never negative; never mixed with txPointsBalance

-- Soft-delete the old rank column after backfill
-- (keep temporarily; drop after all code references updated)
-- ALTER TABLE users DROP COLUMN rank;  -- run only after migration confirmed
```

### D.2 New Columns on `guilds` Table

```sql
-- GPS & rank (formalized)
ALTER TABLE guilds ADD COLUMN guild_performance_score integer NOT NULL DEFAULT 0;
ALTER TABLE guilds ADD COLUMN guild_rank_tier text NOT NULL DEFAULT 'E-Rank';
ALTER TABLE guilds ADD COLUMN member_capacity integer NOT NULL DEFAULT 10;

-- Weekly mechanics (replaces vault-language columns)
ALTER TABLE guilds ADD COLUMN weekly_bonus_pool decimal(12,4) NOT NULL DEFAULT 0;
  -- Accumulates Engine C guildPool portions (35% per task)
  -- User-facing label: "Guild Weekly Bonus Pool" ONLY
ALTER TABLE guilds ADD COLUMN current_weekly_points integer NOT NULL DEFAULT 0;
ALTER TABLE guilds ADD COLUMN weekly_target integer NOT NULL DEFAULT 50000;
ALTER TABLE guilds ADD COLUMN target_difficulty text NOT NULL DEFAULT 'medium';
  -- Valid: 'low' | 'medium' | 'high' — captain sets, admin limits per rank

-- Governance
ALTER TABLE guilds ADD COLUMN assistant_captain_id text REFERENCES users(id) ON DELETE SET NULL;
  -- Unlocked at B-Rank GPS
ALTER TABLE guilds ADD COLUMN min_rank_required text NOT NULL DEFAULT 'E-Rank';
  -- Note: minRankRequired already exists; verify column name and keep one

-- Remove rally remnant
ALTER TABLE guilds DROP COLUMN IF EXISTS last_rally_at;
```

### D.3 New Columns on `guild_members` Table

```sql
ALTER TABLE guild_members ADD COLUMN weekly_points_contributed integer NOT NULL DEFAULT 0;
  -- Resets to 0 every Sunday; drives proportional bonus split
ALTER TABLE guild_members ADD COLUMN is_mvp boolean NOT NULL DEFAULT false;
ALTER TABLE guild_members ADD COLUMN mvp_set_at timestamp;
ALTER TABLE guild_members ADD COLUMN last_nudged_at timestamp;
ALTER TABLE guild_members ADD COLUMN cover_letter text;
  -- Stored with the membership record (from application)
```

### D.4 New Columns on `guild_weekly_cycles` Table

```sql
ALTER TABLE guild_weekly_cycles ADD COLUMN bonus_pool_pkr decimal(12,4) NOT NULL DEFAULT 0;
  -- Total PKR in the combined bonus pool at resolution time
ALTER TABLE guild_weekly_cycles ADD COLUMN pool_disposition text;
  -- Valid: 'distributed' | 'voided'
ALTER TABLE guild_weekly_cycles ADD COLUMN captain_share_pkr decimal(10,2);
ALTER TABLE guild_weekly_cycles ADD COLUMN members_share_pkr decimal(10,2);
```

### D.5 New Columns on `weekly_tasks` Table

```sql
ALTER TABLE weekly_tasks ADD COLUMN task_category text NOT NULL DEFAULT 'cpa_offer';
  -- Valid: 'cpa_offer' | 'indirect' | 'platform'
  -- 'indirect' = YouTube/TikTok/social tasks (no PKR payout; PS only)
  -- 'platform' = Thorx-internal tasks
ALTER TABLE weekly_tasks ADD COLUMN visibility text NOT NULL DEFAULT 'engine_c';
  -- Valid: 'engine_b' | 'engine_c' | 'both'
  -- Admin can toggle from Team Portal
ALTER TABLE weekly_tasks ADD COLUMN gross_pkr_per_completion decimal(10,4);
  -- Network gross for CPA tasks; null for indirect tasks
```

### D.6 New Columns on `score_history` Table

```sql
ALTER TABLE score_history ADD COLUMN user_rank_tier text;
ALTER TABLE score_history ADD COLUMN guild_role text;
ALTER TABLE score_history ADD COLUMN streak_days integer;
```

### D.7 New Table — `user_transactions`

```sql
CREATE TABLE user_transactions (
  id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             text        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engine_type         text        NOT NULL,
    -- Valid: 'Engine_A' | 'Engine_B' | 'Engine_C' | 'Indirect'
  points_credited     integer     NOT NULL,
    -- Displayed to user on Thorx Card (random)
  real_pkr_value      decimal(10,4) NOT NULL,
    -- IMMUTABLE — actual backend PKR value; basis for withdrawal
  gross_pkr           decimal(10,4),
    -- Network gross before any split (admin reference only)
  thorx_profit_pkr    decimal(10,4),
    -- Thorx's cut from this transaction (40% or 20%)
  guild_pool_pkr      decimal(10,4),
    -- Engine C: 35% pool contribution; 0 for Engine A/B
  conversion_rate     integer     NOT NULL,
    -- Snapshot of CONVERSION_RATE at time of earn (e.g., 1000)
  card_variance       decimal(5,4) NOT NULL,
    -- Random multiplier applied (e.g., 1.08)
  source_id           text,
    -- FK: ad_views.id | weekly_task_records.id | task_records.id
  source_type         text,
    -- 'ad_view' | 'weekly_task' | 'daily_task'
  withdrawn           boolean     NOT NULL DEFAULT false,
    -- true once this entry is consumed by a withdrawal
  withdrawal_id       text,
    -- Set after withdrawal_id is finalized
  created_at          timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_transactions_user_created
  ON user_transactions(user_id, created_at ASC);
CREATE INDEX idx_user_transactions_user_withdrawn
  ON user_transactions(user_id, withdrawn) WHERE withdrawn = false;
CREATE INDEX idx_user_transactions_withdrawal
  ON user_transactions(withdrawal_id) WHERE withdrawal_id IS NOT NULL;
```

### D.8 New Table — `referral_commissions`

```sql
CREATE TABLE referral_commissions (
  id                    text          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id           text          NOT NULL REFERENCES users(id),
  invitee_id            text          NOT NULL REFERENCES users(id),
  withdrawal_id         text          NOT NULL REFERENCES withdrawals(id),
  commission_amount_pkr decimal(10,2) NOT NULL,
    -- Credited to referrer.balance_cash_pkr
  invitee_net_pkr       decimal(10,2) NOT NULL,
    -- What invitee received after fee
  platform_fee_pkr      decimal(10,2) NOT NULL,
    -- Total 15% fee charged
  fee_rate_used         decimal(5,4)  NOT NULL,
    -- Snapshot of WITHDRAWAL_FEE_PCT
  ref_share_rate_used   decimal(5,4)  NOT NULL,
    -- Snapshot of REFERRAL_FEE_SHARE_PCT
  status                text          NOT NULL DEFAULT 'paid',
  created_at            timestamp     NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_commissions_referrer
  ON referral_commissions(referrer_id, created_at DESC);
CREATE INDEX idx_referral_commissions_withdrawal
  ON referral_commissions(withdrawal_id);
```

### D.9 New Table — `captain_messages`

```sql
CREATE TABLE captain_messages (
  id          text      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guild_id    text      NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  from_user_id text     NOT NULL REFERENCES users(id),
  to_user_id  text      NOT NULL REFERENCES users(id),
    -- INVARIANT: one of (fromUserId, toUserId) must be the guild's captainId
  message     text      NOT NULL,
  is_read     boolean   NOT NULL DEFAULT false,
  created_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_captain_messages_thread
  ON captain_messages(guild_id, from_user_id, to_user_id, created_at ASC);
CREATE INDEX idx_captain_messages_unread
  ON captain_messages(to_user_id, is_read) WHERE is_read = false;
```

### D.10 New Table — `guild_weekly_snapshots`

```sql
CREATE TABLE guild_weekly_snapshots (
  id               text          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guild_id         text          NOT NULL REFERENCES guilds(id),
  week_start       date          NOT NULL,
  target_points    integer       NOT NULL,
  achieved_points  integer       NOT NULL,
  was_successful   boolean       NOT NULL,
  bonus_pool_pkr   decimal(12,4) NOT NULL,
  pool_disposition text          NOT NULL,
    -- 'distributed' | 'voided'
  captain_share    decimal(10,2) NOT NULL DEFAULT 0,
  members_share    decimal(10,2) NOT NULL DEFAULT 0,
  created_at       timestamp     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_guild_snapshots_unique
  ON guild_weekly_snapshots(guild_id, week_start);
```

### D.11 New Table — `activity_feed`

```sql
CREATE TABLE activity_feed (
  id              text      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type      text      NOT NULL,
    -- 'earn' | 'rank_up' | 'guild_target' | 'withdrawal' | 'registration' | 'guild_event'
  user_id         text      REFERENCES users(id) ON DELETE SET NULL,
  guild_id        text      REFERENCES guilds(id) ON DELETE SET NULL,
  display_message text      NOT NULL,
    -- Pre-formatted admin-readable string with full math
  data            jsonb     NOT NULL DEFAULT '{}',
    -- Raw event data for downstream processing
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_feed_created
  ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_type
  ON activity_feed(event_type, created_at DESC);
```

### D.12 Complete `system_config` Keys Reference

All keys stored in `system_config` table (`key` TEXT UNIQUE, `value` JSONB). See Part J for full values.

---

## PART E — BACKEND ARCHITECTURE

### E.1 New Module: `server/modules/thorx-card.ts`

**Purpose:** Generates Thorx Card values (random point display with exact PKR tracking).

```typescript
interface CardDrawParams {
  userPkrShare: number;       // e.g., 6.00 (already split from gross)
  conversionRate: number;     // from system_config CONVERSION_RATE
  userRankTier: string;       // affects variance bounds
  varianceMin: number;        // from CARD_VARIANCE_MIN (default 0.80)
  varianceMax: number;        // from CARD_VARIANCE_MAX (default 1.20)
}

interface CardResult {
  pointsCredited: number;     // random, shown to user
  realPkrValue: number;       // exact, NEVER changes
  cardVariance: number;       // logged for audit
  targetPoints: number;       // pre-variance baseline (internal reference)
}

export function drawThorxCard(params: CardDrawParams): CardResult {
  const { userPkrShare, conversionRate, userRankTier, varianceMin, varianceMax } = params;
  
  // Rank bonus adjustments to variance range
  let min = varianceMin;
  let max = varianceMax;
  if (userRankTier === 'A-Rank') { min -= 0.05; max += 0.05; }
  if (userRankTier === 'S-Rank') { min -= 0.10; max += 0.10; }
  
  const targetPoints = (userPkrShare / 10.0) * conversionRate;
  const cardVariance = min + Math.random() * (max - min);
  const pointsCredited = Math.round(targetPoints * cardVariance);
  
  return { pointsCredited, realPkrValue: userPkrShare, cardVariance, targetPoints };
}

// Admin simulation tool
export function simulateThorxCards(params: {
  grossPkr: number;
  engineType: 'A' | 'B' | 'C';
  userRankTier: string;
  iterations: number;
  config: CardConfig;
}): SimulationResult[]
```

### E.2 New Module: `server/modules/ps-engine.ts`

**Purpose:** All Performance Score logic — accrual, streak, inactivity penalty, rank evaluation.

```typescript
// Award PS after task completion (call from recordEarnEvent)
export async function awardTaskPS(userId: string, engineType: 'A' | 'B' | 'C'): Promise<void>

// Process daily streak (call after any task completion for that day)
export async function processStreak(userId: string): Promise<{ streakDays: number; psAwarded: number }> {
  // Logic:
  // 1. Read users.lastStreakDate
  // 2. If lastStreakDate = yesterday (PKT): increment streakDays, else reset to 1
  // 3. Update lastStreakDate = today
  // 4. PS: streakDays===1 → +5, streakDays===2 → +10, streakDays>=3 → +20
  // 5. Add to performanceScore; call checkAndUpdateRankTier
}

// Batch inactivity penalty (called by daily midnight cron)
export async function applyInactivityPenalties(): Promise<void> {
  // 1. Find: lastActiveAt < now - PS_INACTIVITY_HOURS (from system_config)
  // 2. For each: deduct PS_INACTIVITY_PENALTY, floor at 0
  // 3. Update inactivityPenaltyAt = now
  // 4. If PS changed rank threshold: call checkAndUpdateRankTier
  // 5. Emit feed event: "User @X inactivity penalty: -10 PS"
}

// Called after every PS change
export async function checkAndUpdateRankTier(userId: string): Promise<void> {
  // 1. Read current performanceScore
  // 2. Read rank thresholds from system_config (PS_RANK_*)
  // 3. Compute new rank
  // 4. If rank changed AND !users.rankLocked:
  //    a. UPDATE users SET userRankTier = newRank
  //    b. INSERT rank_logs
  //    c. assignRankAvatar(userId, newRank) [from existing rankAvatars.ts logic]
  //    d. createNotification(userId, ...)
  //    e. broadcastUserUpdated(userId) [existing WS function]
  //    f. emitFeedEvent('rank_up', ...)
}
```

### E.3 New Module: `server/modules/gps-engine.ts`

**Purpose:** Guild Performance Score logic — accrual, rank evaluation, capacity updates.

```typescript
// Called from recordEarnEvent when engineType = 'Engine_C'
export async function awardMemberGPS(guildId: string, pointsEarned: number): Promise<void> {
  const gpsPct = await getConfig('GPS_MEMBER_POINTS_PCT'); // default 10
  const gpsIncrement = Math.floor(pointsEarned * gpsPct / 100);
  // UPDATE guilds SET guildPerformanceScore += gpsIncrement
  await checkAndUpdateGuildRankTier(guildId);
}

// Called from guild resolution (Sunday reset) on success
export async function awardMilestoneGPS(guildId: string): Promise<void>
  // GPS_MILESTONE_BONUS (default 1000) added

// Called when captain sets MVP
export async function awardMVPGPS(guildId: string): Promise<void>
  // GPS_MVP_BONUS (default 200) added

// Called after every GPS change
export async function checkAndUpdateGuildRankTier(guildId: string): Promise<void> {
  // 1. Read guildPerformanceScore
  // 2. Read GPS thresholds from system_config (GPS_RANK_*)
  // 3. Compute new guildRankTier
  // 4. Compute new memberCapacity per GPS rank table
  // 5. If rank changed:
  //    a. UPDATE guilds SET guildRankTier, memberCapacity
  //    b. INSERT rank_logs (targetType='guild')
  //    c. Broadcast guild update via WS
  //    d. Emit feed event: "Guild 'X' upgraded to C-Rank!"
}
```

### E.4 New Module: `server/modules/live-feed.ts`

**Purpose:** Centralized event emission for the admin Live Activity Feed.

```typescript
type FeedEventType = 'earn' | 'rank_up' | 'guild_target' | 'withdrawal' | 'registration' | 'guild_event' | 'inactivity';

interface FeedEvent {
  type: FeedEventType;
  userId?: string;
  guildId?: string;
  displayMessage: string;  // pre-formatted for admin display
  data: Record<string, any>;
}

export async function emitFeedEvent(event: FeedEvent): Promise<void> {
  // 1. INSERT into activity_feed table
  // 2. Broadcast via WS to all admin connections: { type: 'admin.feed_event', payload: event }
}

// Example display messages:
// earn:      "User 'Ali99' – Engine A | Real: Rs.1.20 | Points: 82 | Thorx: Rs.0.48"
// rank_up:   "User 'Zain_Pro' reached C-Rank! Engine B now unlocked."
// guild_target: "Guild 'Alpha_Warriors' hit 100%! Bonus Pool: Rs.4,500 unlocking Sunday."
// withdrawal: "Payout approved: 'Sara22' → Rs.85.00 | Fee: Rs.15.00 | Ref: Rs.4.50"
// registration: "New user 'New_User7' registered via referral of 'Ali99'"
```

### E.5 New Middleware: `server/middleware/rankGate.ts`

```typescript
const RANK_ORDER: Record<string, number> = {
  'E-Rank': 0, 'D-Rank': 1, 'C-Rank': 2, 'B-Rank': 3, 'A-Rank': 4, 'S-Rank': 5
};

export function requireMinRank(minRank: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRank = req.session?.user?.userRankTier ?? 'E-Rank';
    if (RANK_ORDER[userRank] < RANK_ORDER[minRank]) {
      return res.status(403).json({
        error: 'RANK_GATE',
        requiredRank: minRank,
        currentRank: userRank,
        currentPS: req.session?.user?.performanceScore,
        message: `This action requires ${minRank} or higher.`
      });
    }
    next();
  };
}

export function requireGuildRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const guildRole = req.session?.user?.guildRole ?? 'simple';
    if (!roles.includes(guildRole)) {
      return res.status(403).json({ error: 'GUILD_ROLE_GATE', required: roles, current: guildRole });
    }
    next();
  };
}
```

### E.6 `recordEarnEvent()` — Complete Rewrite

**File:** `server/storage.ts`

```typescript
async function recordEarnEvent(params: {
  userId: string;
  engineType: 'Engine_A' | 'Engine_B' | 'Engine_C' | 'Indirect';
  grossPkr: number;       // from network/task config
  sourceId: string;       // ad_view.id or task_record.id
  sourceType: 'ad_view' | 'weekly_task' | 'daily_task';
  guildId?: string;       // required for Engine C
}): Promise<{ success: boolean; pointsCredited: number; realPkrValue: number }> {

  const config = await getSystemConfig();
  const user = await getUser(params.userId);

  // Step 1: Engine split
  let userPkrShare: number;
  let thorxProfitPkr: number;
  let guildPoolPkr = 0;

  if (params.engineType === 'Engine_A' || params.engineType === 'Engine_B') {
    const thorxCut = params.engineType === 'Engine_A'
      ? config.ENGINE_A_THORX_CUT_PCT : config.ENGINE_B_THORX_CUT_PCT;
    const userCut = 100 - thorxCut;
    thorxProfitPkr = params.grossPkr * thorxCut / 100;
    userPkrShare   = params.grossPkr * userCut / 100;

  } else if (params.engineType === 'Engine_C') {
    thorxProfitPkr = params.grossPkr * config.ENGINE_C_THORX_CUT_PCT / 100;
    guildPoolPkr   = params.grossPkr * config.ENGINE_C_GUILD_POOL_PCT / 100;
    userPkrShare   = params.grossPkr * config.ENGINE_C_USER_CUT_PCT / 100;
    // Accumulate to guild weekly bonus pool
    await db.update(guilds)
      .set({ weeklyBonusPool: sql`weekly_bonus_pool + ${guildPoolPkr}`,
             currentWeeklyPoints: sql`current_weekly_points + ${params.grossPkr * 100}` })
      .where(eq(guilds.id, params.guildId!));

  } else {
    // 'Indirect' — no PKR payout, only PS
    userPkrShare = 0; thorxProfitPkr = 0;
  }

  // Step 2: Thorx Card draw (if userPkrShare > 0)
  let cardResult = { pointsCredited: 0, realPkrValue: 0, cardVariance: 1.0, targetPoints: 0 };
  if (userPkrShare > 0) {
    cardResult = drawThorxCard({
      userPkrShare,
      conversionRate: config.CONVERSION_RATE,
      userRankTier: user.userRankTier,
      varianceMin: config.CARD_VARIANCE_MIN,
      varianceMax: config.CARD_VARIANCE_MAX,
    });
  }

  // Step 3: Persist user_transactions (source of truth)
  await db.insert(userTransactions).values({
    userId: params.userId,
    engineType: params.engineType,
    pointsCredited: cardResult.pointsCredited,
    realPkrValue: cardResult.realPkrValue,
    grossPkr: params.grossPkr,
    thorxProfitPkr,
    guildPoolPkr,
    conversionRate: config.CONVERSION_RATE,
    cardVariance: cardResult.cardVariance,
    sourceId: params.sourceId,
    sourceType: params.sourceType,
  });

  // Step 4: Update user-facing balances
  if (cardResult.pointsCredited > 0) {
    await db.update(users)
      .set({
        txPointsBalance: sql`tx_points_balance + ${cardResult.pointsCredited}`,
        totalEarnings: sql`total_earnings + ${cardResult.realPkrValue}`,
        lastActiveAt: new Date(),
      })
      .where(eq(users.id, params.userId));

    // Insert earnings record (user-facing history — unchanged)
    await db.insert(earnings).values({
      userId: params.userId,
      type: params.engineType,
      amount: cardResult.realPkrValue,
      description: `${params.engineType} task completion`,
      status: 'completed',
      metadata: { pointsCredited: cardResult.pointsCredited, sourceId: params.sourceId },
    });
  }

  // Step 5: Guild member contribution tracking (Engine C)
  if (params.engineType === 'Engine_C' && params.guildId) {
    await db.update(guildMembers)
      .set({ weeklyPointsContributed: sql`weekly_points_contributed + ${cardResult.pointsCredited}` })
      .where(and(eq(guildMembers.userId, params.userId), eq(guildMembers.guildId, params.guildId)));
    await awardMemberGPS(params.guildId, cardResult.pointsCredited);
  }

  // Step 6: PS award + streak + rank check
  if (params.engineType !== 'Indirect') {
    await awardTaskPS(params.userId, params.engineType.replace('Engine_', '') as 'A' | 'B' | 'C');
  }
  await processStreak(params.userId);
  await checkAndUpdateRankTier(params.userId);

  // Step 7: Live feed event
  await emitFeedEvent({
    type: 'earn',
    userId: params.userId,
    guildId: params.guildId,
    displayMessage: `User '${user.identity}' – ${params.engineType} | Real: Rs.${cardResult.realPkrValue.toFixed(2)} | Points: ${cardResult.pointsCredited} | Thorx: Rs.${thorxProfitPkr.toFixed(2)}`,
    data: { engineType: params.engineType, grossPkr: params.grossPkr, cardResult, thorxProfitPkr, guildPoolPkr },
  });

  return { success: true, pointsCredited: cardResult.pointsCredited, realPkrValue: cardResult.realPkrValue };
}
```

### E.7 `processWithdrawal()` — Overhaul

**File:** `server/storage.ts`

```typescript
async function calculateWithdrawalBreakdown(userId: string, pointsRequested: number): Promise<{
  exactPkr: number;
  platformFee: number;
  referralCommission: number;
  referrerId: string | null;
  referrerName: string | null;
  userNetPkr: number;
  consumedTransactionIds: string[];
}> {
  // FIFO walk through user_transactions WHERE withdrawn=false, ORDER BY created_at ASC
  // Accumulate pointsCredited until >= pointsRequested
  // Sum their realPkrValue → exactPkr
  
  const config = await getSystemConfig();
  const feeRate = config.WITHDRAWAL_FEE_PCT / 100;          // e.g., 0.15
  const platformFee = exactPkr * feeRate;                    // e.g., 15.00
  
  const referrer = await getReferrerOf(userId);
  let referralCommission = 0;
  if (referrer) {
    const refShare = config.REFERRAL_FEE_SHARE_PCT / 100;   // e.g., 0.30
    referralCommission = platformFee * refShare;             // e.g., 4.50
  }
  
  const userNetPkr = exactPkr - platformFee;                 // e.g., 85.00
  return { exactPkr, platformFee, referralCommission, referrerId: referrer?.id, referrerName: referrer?.identity, userNetPkr, consumedTransactionIds };
}

async function processWithdrawal(withdrawalId: string, adminId: string, txId: string): Promise<void> {
  const withdrawal = await getWithdrawal(withdrawalId);
  const breakdown = await calculateWithdrawalBreakdown(withdrawal.userId, withdrawal.amount);
  
  // 1. Finalize withdrawal record
  await db.update(withdrawals).set({
    status: 'completed',
    transactionId: txId,
    fee: breakdown.platformFee,
    netAmount: breakdown.userNetPkr,
    processedAt: new Date(),
  }).where(eq(withdrawals.id, withdrawalId));
  
  // 2. Deduct from user balance
  await db.update(users)
    .set({ txPointsBalance: sql`tx_points_balance - ${withdrawal.amount}`,
           totalWithdrawn: sql`total_withdrawn + ${breakdown.userNetPkr}` })
    .where(eq(users.id, withdrawal.userId));
  
  // 3. Mark transactions as withdrawn
  await db.update(userTransactions)
    .set({ withdrawn: true, withdrawalId })
    .where(inArray(userTransactions.id, breakdown.consumedTransactionIds));
  
  // 4. Referral commission (1-tier only)
  if (breakdown.referrerId && breakdown.referralCommission > 0) {
    await db.update(users)
      .set({ balanceCashPkr: sql`balance_cash_pkr + ${breakdown.referralCommission}` })
      .where(eq(users.id, breakdown.referrerId));
    
    await db.insert(referralCommissions).values({
      referrerId: breakdown.referrerId,
      inviteeId: withdrawal.userId,
      withdrawalId,
      commissionAmountPkr: breakdown.referralCommission,
      inviteeNetPkr: breakdown.userNetPkr,
      platformFeePkr: breakdown.platformFee,
      feeRateUsed: config.WITHDRAWAL_FEE_PCT / 100,
      refShareRateUsed: config.REFERRAL_FEE_SHARE_PCT / 100,
    });
    
    // DO NOT write to commission_logs (frozen/deprecated)
  }
  
  // 5. Audit log
  await db.insert(auditLogs).values({ adminId, action: 'WITHDRAWAL_APPROVED', targetType: 'withdrawal', targetId: withdrawalId, details: breakdown });
  
  // 6. Feed event
  await emitFeedEvent({ type: 'withdrawal', userId: withdrawal.userId, displayMessage: `...`, data: breakdown });
  
  // 7. Notification to user
  await createNotification(withdrawal.userId, 'Payout Processed', `Rs.${breakdown.userNetPkr.toFixed(2)} sent to your account. Transaction: ${txId}`);
}
```

### E.8 Sunday Guild Reset — Complete Implementation

**File:** `server/modules/guild-reset.ts`

```typescript
export async function runWeeklyGuildReset(): Promise<void> {
  const weekStart = getThisWeekStart(); // PKT Monday 00:00
  const guildsToProcess = await db.select().from(guilds)
    .where(and(eq(guilds.status, 'active')));

  for (const guild of guildsToProcess) {
    const cycle = await getOrCreateWeeklyCycle(guild.id, weekStart);
    const pool = guild.weeklyBonusPool;
    const achieved = guild.currentWeeklyPoints;
    const target = guild.weeklyTarget;
    const wasSuccessful = achieved >= target;

    if (wasSuccessful) {
      // Distribute 35% combined bonus pool
      const captainShare = pool * 0.30;
      const memberPool   = pool * 0.70;

      // Credit captain
      await db.update(users)
        .set({ availableBalance: sql`available_balance + ${captainShare}` })
        .where(eq(users.id, guild.captainId));
      await createNotification(guild.captainId, 'Sunday Guild Bonus!', `Your captain share: Rs.${captainShare.toFixed(2)}`);

      // Credit members proportionally by weeklyPointsContributed
      const members = await db.select().from(guildMembers)
        .where(and(eq(guildMembers.guildId, guild.id), eq(guildMembers.status, 'active')));
      const totalContrib = members.reduce((s, m) => s + m.weeklyPointsContributed, 0);

      for (const member of members.filter(m => m.weeklyPointsContributed > 0)) {
        const share = memberPool * (member.weeklyPointsContributed / totalContrib);
        await db.update(users)
          .set({ availableBalance: sql`available_balance + ${share}` })
          .where(eq(users.id, member.userId));
        await createNotification(member.userId, 'Sunday Guild Bonus!', `Your team bonus: Rs.${share.toFixed(2)}`);
      }

      // GPS milestone
      await awardMilestoneGPS(guild.id);

      // Feed event
      await emitFeedEvent({ type: 'guild_target', guildId: guild.id,
        displayMessage: `Guild '${guild.name}' hit 100%! Bonus Pool Rs.${pool.toFixed(2)} distributed.`,
        data: { wasSuccessful, pool, captainShare, memberPool } });

    } else {
      // Voided — pool absorbed to Thorx reserve (just zero it out)
      await emitFeedEvent({ type: 'guild_target', guildId: guild.id,
        displayMessage: `Guild '${guild.name}' missed target. Pool of Rs.${pool.toFixed(2)} voided.`,
        data: { wasSuccessful: false, pool } });
    }

    // Insert snapshot
    await db.insert(guildWeeklySnapshots).values({
      guildId: guild.id, weekStart: new Date(weekStart),
      targetPoints: target, achievedPoints: achieved,
      wasSuccessful, bonusPoolPkr: pool,
      poolDisposition: wasSuccessful ? 'distributed' : 'voided',
      captainShare: wasSuccessful ? pool * 0.30 : 0,
      membersShare: wasSuccessful ? pool * 0.70 : 0,
    });

    // Update guild_weekly_cycles record
    await db.update(guildWeeklyCycles)
      .set({ actualPoints: achieved, goalMet: wasSuccessful, resolved: true, resolvedAt: new Date(),
             bonusPoolPkr: pool, poolDisposition: wasSuccessful ? 'distributed' : 'voided' })
      .where(eq(guildWeeklyCycles.id, cycle.id));

    // RESET for new week
    await db.update(guilds)
      .set({ weeklyBonusPool: 0, currentWeeklyPoints: 0 })
      .where(eq(guilds.id, guild.id));
    await db.update(guildMembers)
      .set({ weeklyPointsContributed: 0, isMVP: false })
      .where(eq(guildMembers.guildId, guild.id));
  }
}
```

### E.9 Complete Route Specification — New + Modified

**New routes to add to `server/routes.ts`:**

```
# Guild - Discovery & Applications
GET  /api/guilds/discovery
     → GPS-sorted list with: GPS, rank, member count, capacity, TX-points earned (all-time),
       bonus history (count of distributions), minRankRequired, recruitmentOpen
     Auth: any authenticated user

GET  /api/guilds/:id/application-status
     → Returns pending application details for current user in this guild
     Auth: self

# Captain DM Channel
GET  /api/guilds/:id/dm/:memberId
     → captain_messages thread between current user and memberId
     Auth: one of them must be captain of this guild

POST /api/guilds/:id/dm/:memberId
     → Send message; body: { message: string }
     Auth: one of them must be captain; max 1000 chars
     WS broadcast: 'guild.dm_new_message' to recipient

# Guild Member Actions
GET  /api/guilds/:id/members
     → Roster with: weeklyPointsContributed, isMVP, joinedAt, userRankTier, lastActiveAt
     Auth: captain | admin

POST /api/guilds/:id/members/:userId/nudge
     → Rate-limited: 24h per member per captain
     → Creates notification to that user
     Auth: captain of this guild

POST /api/guilds/:id/members/:userId/mvp
     → Sets isMVP=true for one member; clears isMVP for all others
     → Only one MVP per week; disabled after set until Sunday reset
     → Awards GPS_MVP_BONUS
     Auth: captain of this guild

DELETE /api/guilds/:id/members/:userId
     → Remove member; set guildRole='simple', guildId=null on users
     Auth: captain of this guild | admin

# Join application with cover letter
POST /api/guilds/:id/apply
     → body: { coverLetter: string (min 50 chars) }
     → Rank gate: requireMinRank('D-Rank')
     → Validates: user.userRankTier >= guild.minRankRequired
     → Validates: guild.memberCount < guild.memberCapacity
     → Creates guild_members record with status='pending', cover_letter=body.coverLetter
     Auth: self; must be guildRole='simple'

PATCH /api/guilds/:id/applications/:applicationId
     → body: { action: 'accept' | 'reject', rejectionReason?: string }
     → accept: set guild_members.status='active', users.guildRole='member', users.guildId=id
     → reject: set guild_members.status='rejected'; notification with reason (min 10 chars required)
     Auth: captain of this guild

# Guild weekly history (captain portal chart)
GET  /api/guilds/:id/weekly-history
     → guild_weekly_snapshots last 8 weeks
     Auth: captain of this guild | admin

# Withdrawal preview
GET  /api/withdrawals/preview?points=N
     → Returns full ledger breakdown without creating withdrawal
     → { exactPkr, platformFee, feePercent, referralCommission, referrerName, userNetPkr, sRankFastTrack }
     Auth: self

# Referral cash balance
GET  /api/user/referral-balance
     → Returns { balanceCashPkr, totalEarnedAllTime, referralCount }
     Auth: self

POST /api/withdrawals/referral
     → Withdraw referral commission (balanceCashPkr)
     → Same method/account as regular withdrawal
     → No platform fee on referral cash withdrawal
     Auth: self; minimum Rs. 50

# Admin: Live Activity Feed
GET  /api/admin/live-feed?limit=50&type=all&since=<timestamp>
     → Returns recent activity_feed entries; supports SSE via Accept: text/event-stream
     Auth: admin | founder

# Admin: Thorx Card Simulator
POST /api/admin/simulate/thorx-card
     → body: { grossPkr, engineType, userRankTier, iterations, config? }
     → Returns array of SimulationResult with stats summary
     Auth: admin | founder

# Admin: Ledger Validator
GET  /api/admin/ledger/validate/:userId
     → Computes: sum(user_transactions.pointsCredited) vs. users.txPointsBalance
     →           sum(user_transactions.realPkrValue) vs. users.totalEarnings
     → Returns: { isMismatch, pointsMismatch, pkrMismatch, severity }
     Auth: admin | founder

GET  /api/admin/ledger/validate/scan?page=1&limit=50
     → Scans all users for mismatches (paginated); sorted by severity
     Auth: founder only

# Admin: GPS & PS Overrides
PATCH /api/admin/users/:userId/ps
     → body: { delta: number, reason: string (required) }
     → Adjusts performanceScore; calls checkAndUpdateRankTier; audit logged
     Auth: admin | founder

PATCH /api/admin/guilds/:id/gps
     → body: { delta: number, reason: string (required) }
     → Adjusts guildPerformanceScore; calls checkAndUpdateGuildRankTier; audit logged
     Auth: admin | founder

PATCH /api/admin/guilds/:id/captain
     → body: { newCaptainUserId: string }
     → New captain must be active member of guild
     → Updates: old captain → guildRole='member'; new captain → guildRole='captain'
     → Audit logged
     Auth: admin | founder

PATCH /api/admin/guilds/:id/weekly-target
     → body: { weeklyTarget: number }
     → Admin can override default target for specific guild
     Auth: admin | founder

# Admin: Inactive Captain Alerts
GET  /api/admin/guilds/inactive-captains?inactiveDays=7
     → Guilds where captain.lastActiveAt < now - N days
     → Returns: guildName, captainName, lastActive, memberCount, pendingApplications
     Auth: admin | founder

# Admin: Referral Analytics
GET  /api/admin/referrals/stats
     → Total commissions paid, this month, active pairs, avg commission
     Auth: admin | founder

GET  /api/admin/referrals/leaderboard?limit=20
     → Top referrers by total commission earned from referral_commissions
     Auth: admin | founder

# Admin: Weekly Target Bulk Assign
POST /api/admin/guilds/bulk-targets
     → body: { targets: { E-Rank: N, D-Rank: N, C-Rank: N, B-Rank: N, A-Rank: N, S-Rank: N }, scope: 'all' | 'new_only' }
     → Updates weeklyTarget on all guilds matching each rank tier
     → Updates system_config WEEKLY_TARGET_* keys
     Auth: founder only
```

### E.10 Cron Jobs — `server/index.ts`

```typescript
import cron from 'node-cron';

// Existing jobs (preserve unchanged):
// - leaderboard refresh
// - health snapshot
// - guild resolution job (now replaced by explicit cron below)

// NEW JOB 1: Daily at 12:00 AM PKT = 19:00 UTC previous day
cron.schedule('0 19 * * *', async () => {
  console.log('[CRON] Daily inactivity penalty run');
  try {
    await applyInactivityPenalties();
    console.log('[CRON] Inactivity penalties applied');
  } catch (err) {
    console.error('[CRON] Inactivity penalty failed:', err);
  }
}, { timezone: 'UTC' });

// NEW JOB 2: Sunday at 11:59 PM PKT = Sunday 18:59 UTC
cron.schedule('59 18 * * 0', async () => {
  console.log('[CRON] Sunday guild reset run');
  try {
    await runWeeklyGuildReset();
    console.log('[CRON] Guild reset complete');
  } catch (err) {
    console.error('[CRON] Guild reset failed:', err);
  }
}, { timezone: 'UTC' });

// Update lastActiveAt on every authenticated request
app.use((req, res, next) => {
  if (req.session?.user?.id && req.path.startsWith('/api/')) {
    setImmediate(() => {
      db.update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, req.session.user.id))
        .catch(() => {}); // fire-and-forget
    });
  }
  next();
});
```

### E.11 Health Engine Fix — `server/modules/health-engine.ts`

Every division in this module must be guarded against zero denominator:

```typescript
// Pattern to apply everywhere:
const safeDiv = (num: number, den: number) => den === 0 ? 0 : num / den;
const safeScore = (val: number) => isNaN(val) || !isFinite(val) ? 0 : Math.max(0, Math.min(100, val));

// Before any DB write:
const snapshotData = {
  overallScore: safeScore(overallScore),
  financialScore: safeScore(financialScore),
  operationalScore: safeScore(operationalScore),
  userHealthScore: safeScore(userHealthScore),
  riskHealthScore: safeScore(riskHealthScore),
  integrityScore: safeScore(integrityScore),
  // ...
};

// Frontend: display "–" instead of "NaN" or "Infinity"
```

---

## PART F — FRONTEND: USER PORTAL

### F.1 Engine C Tab Routing (`client/src/pages/UserPortal.tsx`)

```typescript
const EngineCTab = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Pending application state
  const { data: pendingApp } = useQuery(['guild-application', user.id], fetchPendingApplication);
  if (pendingApp) return <ApplicationPendingScreen guild={pendingApp.guild} />;
  
  switch (user.guildRole) {
    case 'captain': return <CaptainPortal />;
    case 'member':  return <GuildMemberPanel />;
    default:        return <GuildDiscoveryPanel />;
  }
};

// Engine C tab label
const engineCLabel = {
  captain: `⚔️ ${user.guildName}  👑`,
  member:  `⚔️ ${user.guildName}`,
  simple:  `⚔️ Guild — Join a Team`,
}[user.guildRole];
```

### F.2 Dashboard Summary Cards (Three Variants)

**File:** `client/src/components/DashboardCards.tsx` (NEW or integrate into UserPortal)

**SIMPLE USER — 5 cards:**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  TX-POINTS BALANCE  │  │   WITHDRAWAL VALUE  │  │  PERFORMANCE RANK   │
│   12,450 pts        │  │   Rs. 124.50        │  │   E-Rank            │
│   ≈ Rs. 124.50      │  │   (after 15% fee:   │  │   120 / 1,000 PS    │
│                     │  │    Rs. 105.83)       │  │   ██░░░░░░░░ 12%   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────────────────────────────┐
│  REFERRAL BALANCE   │  │   JOIN A GUILD — UNLOCK ENGINE C            │
│  Rs. 45.00 cash     │  │   Guild members earn 45% per task +         │
│  3 referrals        │  │   Sunday Bonus potential 🎁                 │
│  [Withdraw Cash]    │  │   [Browse Guilds →]                         │
└─────────────────────┘  └─────────────────────────────────────────────┘
```

**GUILD MEMBER — 5 cards:**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  TX-POINTS BALANCE  │  │  MY WEEKLY CONTRIB  │  │  GUILD PROGRESS     │
│   12,450 pts        │  │  2,500 pts this wk  │  │  32,000 / 50,000    │
│                     │  │  Rank #3 in guild   │  │  ███████░░░ 64%    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────────────────────────────┐
│  PERFORMANCE RANK   │  │   SUNDAY BONUS STATUS                       │
│  D-Rank             │  │   ⏳ In Progress — Keep going!              │
│  2,100 / 3,000 PS   │  │   Sunday 11:59 PM PKT — 3 days 12h left    │
│  ███████░░░ 70%     │  │   [Hit target: Sunday Bonus unlocks 🎁]     │
└─────────────────────┘  └─────────────────────────────────────────────┘
```

**GUILD CAPTAIN — 5 cards:**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  GUILD GPS RANK     │  │  TEAM ROSTER        │  │  PENDING REQUESTS   │
│  C-Rank             │  │  7 / 20 members     │  │  🔴 3 new requests  │
│  45,230 GPS         │  │  2 inactive (0 pts) │  │  [Review Queue →]   │
│  ████████░░ 45%     │  │                     │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────────────────────────────┐
│  WEEKLY PROGRESS    │  │  MY CAPTAIN EARNINGS                        │
│  32,000 / 100,000   │  │  TX-Points: 18,200 pts                      │
│  ███░░░░░░░░ 32%    │  │  Referral Cash: Rs. 120.00                  │
│  5 days left        │  │  [Withdraw →]                               │
└─────────────────────┘  └─────────────────────────────────────────────┘
```

### F.3 Thorx Card Component (`client/src/components/ThorxCard.tsx`)

Replaces `ScratchCardModal.tsx`. API earn responses include a `thorxCard` payload; component renders when this payload is present.

```typescript
interface ThorxCardPayload {
  pointsCredited: number;   // shown to user
  realPkrValue: number;     // "Saved Value" — shown subtly
  engineType: string;
}

// Render flow:
// 1. Card face-down: THORX logo, dark card, subtle shimmer
// 2. User taps "Reveal" button
// 3. Flip animation (CSS 3D transform, 0.6s)
// 4. Front face: animated count-up number (e.g., 0 → 648)
// 5. Sub-label: "TX-Points Earned" (large) + "Saved Value: Rs. 6.00" (small, muted)
// 6. Badge: Engine type pill (Engine A / Engine B / Engine C)
// 7. "Claim" button → dismisses, triggers balance refetch
// Note: NEVER use "Vault", "Locked", or "held" in this component
```

### F.4 Rank Badge Component (`client/src/components/RankBadge.tsx`)

Used everywhere a rank is displayed (profile, leaderboard, guild roster, application cards, admin tables):

```typescript
const RANK_CONFIG = {
  'E-Rank': { hex: '#71717a', bgHex: '#f4f4f5', label: 'E', icon: 'shield' },
  'D-Rank': { hex: '#16a34a', bgHex: '#f0fdf4', label: 'D', icon: 'shield' },
  'C-Rank': { hex: '#2563eb', bgHex: '#eff6ff', label: 'C', icon: 'shield' },
  'B-Rank': { hex: '#7c3aed', bgHex: '#f5f3ff', label: 'B', icon: 'shield-star' },
  'A-Rank': { hex: '#ea580c', bgHex: '#fff7ed', label: 'A', icon: 'crown' },
  'S-Rank': { hex: '#dc2626', bgHex: 'gold-gradient', label: 'S', icon: 'crown-star' },
};
// Props: rank, size ('sm'|'md'|'lg'), showLabel (boolean)
// Used on: profile page, dashboard cards, UserManager table, LeaderboardInsights, guild roster, application cards
```

### F.5 PS Progress Card (`client/src/components/PSProgressCard.tsx`)

```
┌──────────────────────────────────────────────────────────────────┐
│  🛡️ D-Rank        2,100 PS                                       │
│  ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■░░░░░░░░░░░  70%         │
│  900 more PS to reach C-Rank                                     │
│  🔥 Day 3 streak (+20 PS/day bonus active)                       │
│                                                                  │
│  [▾ What does C-Rank unlock?]                                   │
│    Engine B premium CPA offers (higher payouts)                  │
└──────────────────────────────────────────────────────────────────┘
```

### F.6 Guild Discovery Panel (`client/src/components/guild/GuildDiscoveryPanel.tsx`)

*Default Engine C view for simple users.*

**Layout: Leaderboard + Search + Guild Cards**

```
GPS GUILD LEADERBOARD
─────────────────────────────────────────────────────────────────────
[Search guilds...] [Rank filter: All ▼] [Slots available only ☑]

#1  [Avatar] ALPHA WARRIORS          S-Rank 🔴       350,420 GPS
             "We grind daily, no excuses"
             Members: 48/50    Min Rank: C-Rank    Slots: 2
             TX-Points Earned (all-time): 2,400,000
             Bonuses Distributed: 24 weeks
             [Apply to Join →]

#2  [Avatar] PRO TEAM                A-Rank 🟠       198,000 GPS
             "Fast earners, strong team"
             Members: 28/30    Min Rank: D-Rank    Slots: 2
             [Apply to Join →]

#3  [Avatar] NIGHT OWLS              C-Rank 🔵        41,200 GPS
             "Active 9 PM – 2 AM daily"
             Members: 15/20    Min Rank: E-Rank    Slots: 5
             [Apply to Join →]
```

**Apply flow:**
1. Click "Apply to Join" → checks user rank vs. guild minRankRequired
2. If below min rank: show lock message with PS needed
3. If eligible: open `ApplicationModal` with:
   - Guild info header
   - Textarea: "Write your application letter" (placeholder: "Tell the Captain what you'll contribute and why you'd be a great team member. Be specific about your availability and goals.")
   - Char count: min 50, max 500
   - [Submit Application] → POST /api/guilds/:id/apply
4. Success state: card shows "Application Sent — Captain will review soon"

**Guild card fields (all shown in TX-Points, never PKR):**
- All-time TX-Points earned by guild
- Total Weekly Bonuses distributed (shown as "24 weeks successful" — never PKR amount)

### F.7 Guild Member Panel (`client/src/components/guild/GuildMemberPanel.tsx`)

*Replaces GuildVaultPanel. Default Engine C view for guild members.*

**Tabs: Weekly Progress | Engine C Tasks | Guild Chat | Captain Channel**

**Tab 1 — Weekly Progress:**
```
GUILD WEEKLY TARGET
─────────────────────────────────────────────────────────────────────
Alpha Warriors                                    C-Rank | 7/20 members

████████████░░░░░░░░░░░░░░░░  32,000 / 100,000 pts    32%

Status: ⏳ In Progress — Keep pushing! Sunday bonus if you hit 100%.
Countdown: 3 days 11 hours 42 minutes

MY CONTRIBUTION THIS WEEK
You: 2,500 pts  (#3 in team)

TEAM LEADERBOARD (this week)
#1  Ali99        4,200 pts  ⭐ MVP
#2  Sara_K       3,100 pts
#3  You          2,500 pts
#4  Zain_Pro     1,800 pts
#5  NewGuy       500 pts
```

**Tab 2 — Engine C Tasks:**
```
GUILD TASKS
─────────────────────────────────────────────────────────────────────
CPA OFFERS (exclusive to guild members)
[Task card]  App Install — Earn Now      ~480-620 pts  [Complete]
[Task card]  Survey — 5 min              ~250-350 pts  [Complete]

TEAM TASKS (indirect — boost guild, no points)
[Task card]  Subscribe Thorx YouTube     +15 PS        [Complete]
[Task card]  Watch & enter code          +15 PS        [Complete]
[Task card]  Follow Thorx TikTok         +15 PS        [Complete]
```

**Tab 3 — Guild Chat (engine_c_messages):**
- WhatsApp-style group chat
- All active guild members can send/receive
- Existing `engine_c_messages` table + existing chat routes

**Tab 4 — Captain Channel (captain_messages):**
- 1-on-1 DM thread between this member and the captain
- Unread badge counts

### F.8 Captain Portal (`client/src/components/guild/CaptainPortal.tsx`)

*Default Engine C view for guild captains.*

**Tabs: Requests | Roster | DM Hub | Weekly Stats | Guild Settings**

**Tab 1 — Join Requests:**
```
PENDING APPLICATIONS (3)
─────────────────────────────────────────────────────────────────────
[Ahmed Khan]  D-Rank  1,420 PS  Joined Thorx: 45 days ago
  Engine A: 234 completed | Engine B: 12 completed | Fraud cases: 0
  "I am active every day from 6 PM to midnight. I consistently complete
   all available Engine A tasks and have recently unlocked Engine B. I
   want to join a team to access Engine C and grow together..."
  [✅ Accept]  [❌ Reject]

[Sara K.]  E-Rank  320 PS  Joined: 12 days ago
  Engine A: 45 completed | Engine B: 0 | Fraud cases: 0
  "New user, eager to learn and work hard..."
  [✅ Accept]  [❌ Reject — reason required]
```

Reject modal: required reason text (min 10 chars) → sends notification to applicant.

**Tab 2 — Roster:**
```
TEAM ROSTER (7/20)
─────────────────────────────────────────────────────────────────────
👑 You (Ali99)      C-Rank     4,200 pts    Captain
⭐ Sara_K           D-Rank     3,100 pts    [Nudge ✓used] [DM] [Kick]
   Zain_Pro         D-Rank     1,800 pts    [Nudge] [DM] [Kick] [MVP]
   NewGuy           E-Rank       500 pts    [Nudge] [DM] [Kick] [MVP]
   InactiveUser     E-Rank         0 pts    🔴 INACTIVE [Nudge] [DM] [Kick]
   ...
```

- Nudge: 24h cooldown per member; sends push notification
- MVP: one selection per week; grants GPS_MVP_BONUS; displays star badge
- Kick: confirmation dialog; removes from guild

**Tab 3 — DM Hub:**
- List of member threads with unread counts
- Opens captain_messages thread per member

**Tab 4 — Weekly Stats:**
```
GUILD PERFORMANCE HISTORY (last 8 weeks)
─────────────────────────────────────────────────────────────────────
[Bar chart: green=success, red=fail]
Week 8 (current):  32,000 / 100,000  32%  🟡 In progress
Week 7:            100,000 / 80,000  125% ✅ Bonus distributed
Week 6:            65,000 / 80,000   81%  ❌ Missed
...

Stats: 5/8 weeks successful (62.5%)  |  Avg achieved: 78,400 pts

WEEKLY GOAL SETTING
Target Level: [○ Low] [● Medium] [○ High]
  Low (50,000) | Medium (100,000) | High (150,000)
  (Limits set by admin based on guild rank)
```

**Tab 5 — Guild Settings:**
```
GUILD SETTINGS
─────────────────────────────────────────────────────────────────────
Guild Name:        [Alpha Warriors          ]  ← editable
Description:       [We grind daily...       ]  ← editable (max 200 chars)
Profile Photo:     [Upload]                    ← avatarUrl
Min Rank to Join:  [D-Rank ▼]                 ← dropdown E-Rank to S-Rank
Recruitment:       [● Open] [○ Closed]

DANGER ZONE
Transfer Captain Role → [Select member ▼] [Transfer]
  (You become a regular member; this cannot be undone easily)
```

### F.9 Profile Page Updates

- Replace old Urdu rank badge → new E-S `RankBadge` component
- Add `PSProgressCard` below rank
- Add streak counter: "🔥 5-day streak"
- Show guildRole + guild name (if applicable)
- Show MVP badge if `isMVP = true` this week: "⭐ MVP of the Week"
- Show `balanceCashPkr` as separate wallet: "Referral Wallet: Rs. 45.00 [Withdraw]"

### F.10 Engine B — Locked State for Below C-Rank

```
🔒 ENGINE B — UNLOCKS AT C-RANK
─────────────────────────────────────────────────────────────────────
Premium CPA Offers with higher payouts (+25 PS per completion).
You are E-Rank (120 PS). Need 2,880 more PS to unlock.

████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  12%

[Keep earning with Engine A to reach C-Rank]
```

### F.11 Withdrawal Flow — New Preview Screen

**File:** `client/src/components/WithdrawalModal.tsx`

Before confirmation, show full breakdown:
```
WITHDRAWAL PREVIEW
─────────────────────────────────────────────────────────────────────
Points Requested:     10,000 TX-Points
Real Value (ledger):  Rs. 100.00

Platform Fee (15%): − Rs.  15.00
                         ──────────
You Receive:          Rs.  85.00

Referral Bonus:
  Your referrer [Ahmad K.] earns Rs. 4.50
  (30% of platform fee — from Thorx's cut, not yours)

Payment Method: JazzCash  ●●●● 4567

[Confirm Withdrawal]  — minimum display time 2 seconds before button activates
```

S-Rank note: "✅ S-Rank Fast Track — will be processed within 2 hours"

---

## PART G — FRONTEND: ADMIN / TEAM PORTAL

### G.1 TeamPortal Shell (`client/src/pages/TeamPortal.tsx`)

**Preserve existing:** role-based section visibility, permission-based blocking for 'team' role.

**Add new navigation sections:**
```
Existing:
  Dashboard         → AdminDashboard [EXTENDED]
  Users             → UserManager [EXTENDED]
  Payouts           → PayoutControl [OVERHAULED]
  Guilds            → GuildManager [EXTENDED]
  Leaderboard       → LeaderboardInsights [EXTENDED]
  Risk              → RiskWatchlistPanel [UNCHANGED]
  Health            → HealthDashboard [FIXED]
  Tasks             → TaskManager [EXTENDED]
  HilltopAds        → HilltopAdsAdmin [UNCHANGED]
  Settings          → SystemSettingsManager → FinancialControlCenter

NEW sections:
  Live Feed         → LiveActivityFeed [NEW]
  Card Simulator    → ThorxCardSandbox [NEW]
  Ledger Validator  → LedgerValidator [NEW]
  Ranks & Rules     → RanksCustomizer [NEW]
  Referral Analytics → ReferralAnalytics [NEW]
```

### G.2 AdminDashboard — Extended (`client/src/components/admin/AdminDashboard.tsx`)

**Keep all existing sections and fields.**

**Remove:**
- L2 referral count (from Growth & Network section) — replace with single "Active Referral Pairs" count
- "Commissions Paid Out" relabel → "Referral Commissions (1-tier)" with note about change

**Add:**
- **Engine Revenue Breakdown card** (new card in Core Metrics):
  ```
  Engine A Revenue (24h/7d/30d):  Rs. 4,200
  Engine B Revenue:               Rs. 2,800
  Engine C Revenue:               Rs. 1,100
  Total Platform Profit:          Rs. 8,100
  ```
- **Fix NaN health score display:** All score fields default to "–" if null/NaN

### G.3 PayoutControl — Overhauled (`client/src/components/admin/PayoutControl.tsx`)

**Keep all existing features:** search, export, status filter, sort, bulk select, approve/reject, copy account, detail modal.

**Add — Double-Entry Audit per withdrawal:**

Each pending withdrawal card/row expands to show:
```
┌──────────────────────────────────────────────────────────────────┐
│  Ahmed Khan  @ahmed_k  |  C-Rank  |  JazzCash: 0300-1234567    │
│  Requested: 10,000 TX-Points                                     │
│                                                                  │
│  ┌── SYSTEM LEDGER CALCULATION ───────────────────────────────┐  │
│  │  Real PKR (from transaction ledger):   Rs. 100.00          │  │
│  │  Platform Fee (15%):                 − Rs.  15.00          │  │
│  │  Referral Commission (to @zaini):    − Rs.   4.50          │  │
│  │  ────────────────────────────────────────────────          │  │
│  │  USER RECEIVES:                        Rs.  85.00          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Account: JazzCash — 0300-1234567 — Ahmed Khan                  │
│  [📋 Copy Payment Details]                                       │
│                                                                  │
│  Ref/TxID: [________________]  [✅ Approve]  [❌ Reject]        │
└──────────────────────────────────────────────────────────────────┘
```

**Add — RED ALERT fraud banner:**

If `GET /api/admin/ledger/validate/:userId` returns `isMismatch: true`, show ABOVE the approval area:
```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ RED ALERT — LEDGER MISMATCH DETECTED                      │
│  Points on account:   12,500 TX-Points                        │
│  Points in ledger:    10,000 TX-Points                        │
│  Mismatch:            2,500 pts (possible exploit)            │
│  [🚩 Flag Case]  [🔒 Block Withdrawal]  [⚠️ Override & Approve] │
└────────────────────────────────────────────────────────────────┘
```

**Add — One-Click Copy:**

`[📋 Copy Payment Details]` button copies to clipboard:
`"0300-1234567 — Ahmed Khan — JazzCash"` — ready to paste into banking app.

### G.4 UserManager — Extended (`client/src/components/admin/UserManager.tsx`)

**Keep all existing:** search, export, bulk select, internal notes, referral network topology, balance adjust, terminate node, trust status.

**Column additions:**
- Add `Performance Score` column (sortable)
- Add `Rank` column → show `RankBadge` component (E-S, replaces old name)
- Add `Guild Role` column: simple/member/captain badge
- Add `Last Active` column (sortable, highlight red if > 48h)
- Add `Referral Cash (Rs.)` column

**Modal — Referral Network:**
- Remove L2 topology from visualization
- Show L1 referrals only as direct nodes
- Add: "Total Commission Generated: Rs. X.XX" from referral_commissions table

**Modal — Balance Adjustment (existing — keep all):**
- Add: "Adjust PS" tab alongside balance adjust
  - Input: `± PS value` + required reason
  - Calls: PATCH /api/admin/users/:userId/ps

**Modal — User Detail (extend existing):**
- Add: Ledger validation status (green checkmark or RED ALERT indicator)
- Add: user_transactions count, total realPkrValue, sum vs. balance sanity check

### G.5 GuildManager — Extended (`client/src/components/admin/GuildManager.tsx`)

**Keep all existing:** search, status filter, freeze/unfreeze, disband, add/clear strikes, weekly resolution.

**Add — Inactive Captain Alert Section (top of page):**
```
⚠️ INACTIVE CAPTAINS (2 guilds)
─────────────────────────────────────────────────────────────────────
Guild: "Alpha Warriors"   Captain: @ali_cap   Offline: 14 days
  Members: 8/10   Pending Applications: 3   Status: Active
  [⚠️ Send Warning Notification]  [👤 Replace Captain]  [🗑️ Dissolve Guild]

Guild: "Pro Team"   Captain: @zara_k   Offline: 9 days
  Members: 5/10   Pending Applications: 1   Status: Active
  [⚠️ Send Warning Notification]  [👤 Replace Captain]  [🗑️ Dissolve Guild]
```

Replace Captain flow: opens modal with dropdown of current active members → confirm → audit logged.

**Add — Weekly Target Assigner:**
```
WEEKLY TARGETS BY GUILD RANK
─────────────────────────────────────────────────────────────────────
E-Rank Guilds:   [    20,000] pts/week
D-Rank Guilds:   [    50,000] pts/week
C-Rank Guilds:   [   100,000] pts/week
B-Rank Guilds:   [   200,000] pts/week
A-Rank Guilds:   [   350,000] pts/week
S-Rank Guilds:   [   500,000] pts/week

[Apply to All Active Guilds]  [Apply to New Guilds Only]  [Save as Defaults]
```

**Add — GPS Manual Adjustment (per-guild action):**
- Existing guild rows: add [± GPS] button → opens modal: delta input + required reason
- PATCH /api/admin/guilds/:id/gps → audit logged

### G.6 SystemSettingsManager → FinancialControlCenter

**Preserve all existing SystemSettingsManager sections:**
- Economic Thresholds (Min Payout, Withdrawal Fee %, Referral Fee Share %, Conversion Rate)
- Core Integration
- Ad Network Waterfall (all fields preserved)
- CPA Network Waterfall (all fields preserved)
- Performance & Risk Scoring (score weights, risk thresholds, cohort discount days)

**Remove:**
- `Vault Hold %` single slider → replaced by per-engine config below

**Add — Engine Profit Sliders (new section at top):**
```
ENGINE PROFIT CONFIGURATION
─────────────────────────────────────────────────────────────────────
Engine A — Video Ads
  Thorx Cut:  [████░░░░░░] 40%  (range: 20–70)
  User Gets:  60%  ← read-only (auto-calculated)

Engine B — CPA Offers
  Thorx Cut:  [████░░░░░░] 40%  (range: 20–70)
  User Gets:  60%  ← read-only

Engine C — Guild Tasks
  Thorx Cut:  [██░░░░░░░░] 20%  (range: 10–40)
  Guild Pool: [███░░░░░░░] 35%  (range: 20–50)
  User Gets:  45%  ← read-only (100 - Thorx - Pool; validation: must = 100)
```

**Add — Thorx Card Variance Controls:**
```
THORX CARD RANDOMNESS
─────────────────────────────────────────────────────────────────────
Min Multiplier: [0.80×]  (range 0.50×–1.00×)
Max Multiplier: [1.20×]  (range 1.00×–1.50×)

Presets:
  [Stable (0.90×–1.10×)]  [Standard (0.80×–1.20×)]  [Jackpot (0.50×–1.50×)]

A-Rank Bonus: +[5]%  S-Rank Bonus: +[10]%  (expand both bounds by this amount)
```

**Add — Guild Rank Tiers section (was already partially there — complete it):**
```
GUILD RANK TIERS (GPS Thresholds)
─────────────────────────────────────────────────────────────────────
E-Rank: GPS 0 – [9,999]       Capacity: 10
D-Rank: GPS [10,000] – [29,999]  Capacity: 15
C-Rank: GPS [30,000] – [69,999]  Capacity: 20
B-Rank: GPS [70,000] – [149,999] Capacity: 25
A-Rank: GPS [150,000] – [299,999] Capacity: 30
S-Rank: GPS [300,000]+         Capacity: 50
[Save GPS Thresholds]
```

### G.7 NEW: RanksCustomizer (`client/src/components/admin/RanksCustomizer.tsx`)

```
USER RANK PS THRESHOLDS
─────────────────────────────────────────────────────────────────────
E-Rank:  0 – [999]      → Unlocks: Engine A only
D-Rank:  [1,000] – [2,999] → Unlocks: Guild applications
C-Rank:  [3,000] – [5,999] → Unlocks: Engine B (CPA offers)
B-Rank:  [6,000] – [9,999] → Unlocks: Guild creation (Captain)
A-Rank:  [10,000] – [19,999] → Unlocks: Wider card variance (±5%)
S-Rank:  [20,000]+       → Unlocks: Auto-approved withdrawals, wider variance (±10%)
[Save Rank Thresholds]

INACTIVITY PENALTY SETTINGS
─────────────────────────────────────────────────────────────────────
Trigger after: [48] hours without activity
Daily PS penalty: [10] PS
PS floor: 0 (fixed — always at least E-Rank capability)
[Save Inactivity Settings]
```

### G.8 NEW: LiveActivityFeed (`client/src/components/admin/LiveActivityFeed.tsx`)

```
🟢 LIVE ACTIVITY FEED                    [⏸ Pause]  [Filter ▼]  [📥 Export]
─────────────────────────────────────────────────────────────────────
14:32:01  ⚡  User 'Ali99' – Engine A | Real: Rs.1.20 | Points: 82 | Thorx: Rs.0.48
14:31:45  🏆  User 'Zain_Pro' reached C-Rank! Engine B now unlocked. PS: 3,021
14:30:22  💰  Payout approved: 'Sara22' → Rs.85.00 | Fee: Rs.15.00 | Ref: Rs.4.50
14:28:11  🎯  Guild 'Alpha_Warriors' hit 100% target! Pool Rs.4,500 distributing Sunday.
14:27:55  👤  New user 'User_7B' registered via referral of 'Ali99'
14:27:30  ⚡  User 'Maria_K' – Engine B | Real: Rs.25.00 | Points: 1,480 | Thorx: Rs.10.00
```

Filter options: All / Earn Events / Rank Changes / Guild Events / Withdrawals / Registrations / Inactivity

Implementation:
- Polls `GET /api/admin/live-feed?limit=50&since=<timestamp>` every 5 seconds (or SSE)
- Auto-scrolls unless paused
- Color-coded event types
- Click on event row → user/guild inspector modal

### G.9 NEW: ThorxCardSandbox (`client/src/components/admin/ThorxCardSandbox.tsx`)

```
THORX CARD SIMULATOR
─────────────────────────────────────────────────────────────────────
Network gross payout: Rs. [10.00]
Engine type: [Engine A ▼]
Simulated user rank: [E-Rank ▼]
Iterations: [100]

[▶ Run Simulation]

RESULTS:
Card 1:   520 TX-Points    (×0.867)    Real: Rs. 6.00
Card 2:   648 TX-Points    (×1.080)    Real: Rs. 6.00
Card 3:   591 TX-Points    (×0.985)    Real: Rs. 6.00
...

STATISTICS:
Min: 480 pts  |  Max: 720 pts  |  Avg: 601 pts  |  Median: 598 pts
Distribution: [histogram visualization]
Thorx profit per transaction: Rs. 4.00
If user withdraws avg output: User gets Rs. 5.10 (after 15% fee)
```

### G.10 NEW: LedgerValidator (`client/src/components/admin/LedgerValidator.tsx`)

```
LEDGER INTEGRITY VALIDATOR
─────────────────────────────────────────────────────────────────────
[Search user...] [🔍 Validate Single User]

SYSTEM SCAN (paginated by severity)
─────────────────────────────────────────────────────────────────────
🔴 CRITICAL  @ahmed_k    Balance: 12,500 pts  |  Ledger: 10,000 pts  |  Δ +2,500
🟡 WARNING   @sara_k     Balance: 5,200 pts   |  Ledger:  5,180 pts  |  Δ +20
✅ OK        @zain_pro   Balance: 8,400 pts   |  Ledger:  8,400 pts  |  Δ 0
```

### G.11 NEW: ReferralAnalytics (`client/src/components/admin/ReferralAnalytics.tsx`)

```
REFERRAL PROGRAM ANALYTICS
─────────────────────────────────────────────────────────────────────
Total Commissions Paid (all-time):   Rs. 12,450.00
This Month:                          Rs.  3,200.00
Active Referral Pairs:               847
Average Commission per Payout:       Rs.     4.20
Current Referral Share Rate:         30% of 15% fee

TOP PROMOTERS LEADERBOARD
# | Username      | Invitees | Total Commission Earned
1 | @ali_99       | 234      | Rs. 1,847.50
2 | @zain_pro     | 189      | Rs. 1,203.00
3 | @sara_k       | 156      | Rs.   980.25
[Export CSV]

REFERRAL RATE CONTROL
Current rate: [30%] of the 15% withdrawal fee
→ Preview: Rs.100 withdrawal → Rs.15 fee → referrer gets Rs.4.50
[Update Rate]  (also updates REFERRAL_FEE_SHARE_PCT in system_config)
```

### G.12 LeaderboardInsights — Extended

**Keep all existing tabs and features** (All Members, Top Recruiters, Risk Watchlist).

**Modify:**
- All Members table: replace `rank` column (old names) → `RankBadge` component
- Add `PS Score` as sortable column (from score_history or leaderboard_cache)
- Remove `level2Count` from "Team Size" column → show L1 only as "Referrals"
- Add "Guild" column: guild name + GPS rank badge

**Add new tab: Referral Program** → links to `ReferralAnalytics` component above.

---

## PART H — REAL-TIME & BACKGROUND SYSTEMS

### H.1 WebSocket Events — New + Existing

**File:** `server/ws.ts`

**Existing events (preserve unchanged):**
- `user.balance_updated` — balance refetch trigger
- `user.notification` — new notification
- `guild.chat_message` — group chat

**New events to add:**
```typescript
'user.ps_updated'           // { userId, newPS, delta, source }
'user.rank_changed'         // { userId, oldRank, newRank }
'guild.weekly_points'       // { guildId, currentPoints, target, pct }
'guild.pool_credited'       // { guildId, bonusPool, captainShare, memberShare } — Sunday only
'guild.nudge_received'      // { guildId, memberId } — push nudge to member
'guild.dm_new_message'      // { guildId, fromUserId, toUserId, preview }
'guild.mvp_selected'        // { guildId, mvpUserId }
'guild.rank_changed'        // { guildId, oldRank, newRank }
'guild.application_received' // { guildId } — to captain only
'guild.application_decided' // { applicationId, decision } — to applicant only
'admin.feed_event'          // { event } — to admin/founder sessions only
```

**Client listeners:**
- `GuildMemberPanel` → `guild.weekly_points` → update progress bar live
- `CaptainPortal` → `guild.application_received` → red badge on Requests tab
- `CaptainPortal` → `guild.weekly_points` → update captain progress card
- `UserPortal` → `user.rank_changed` → show rank-up celebration modal
- Admin `LiveActivityFeed` → `admin.feed_event` → prepend to feed

### H.2 HilltopAds Integration (Preserve Entirely)

**File:** `server/hilltopads-service.ts`

No changes. The HilltopAds pipeline feeds into Engine A through `POST /api/ad-view` and `POST /api/hilltopads/ad-completion`. The new `recordEarnEvent()` is called from these routes after the existing ad network verification.

**Integration point:** After HilltopAds confirms a valid ad completion, extract `earnedAmount` from `ad_views` record and pass as `grossPkr` to `recordEarnEvent()`.

### H.3 Risk Engine (Preserve Entirely)

**File:** `server/modules/risk-engine.ts`

No changes to the 5-signal risk scoring (velocity, bot network, device clustering, chain linearity, task speed). The risk_cases table, RiskWatchlistPanel, and case management workflow are all preserved exactly as-is.

**Integration note:** `emitFeedEvent` does NOT emit risk case events (privacy concern — risk data is admin-only, not live-fed).

### H.4 Chatbot (Preserve Entirely)

**File:** `server/chatbot/`

No changes. The NLP support assistant is preserved as-is.

### H.5 Leaderboard Job (Extend)

**File:** `server/jobs/` (existing leaderboard cleanup job)

Extend the leaderboard snapshot to include new fields:
- `userRankTier` (from users table)
- `guildRole` (from users table)
- Set `level2Count = 0` on all new snapshots (L2 removed)

---

## PART I — COMPLETE DATA FLOW SPECIFICATIONS

### I.1 Engine A Task Completion Flow

```
1. User watches HilltopAds video
2. POST /api/ad-view { adId, duration, adNetwork, adType }
3. Server: validate duration ≥ minimum (anti-cheat, existing)
4. hilltopads-service.ts reports earnedAmount (gross PKR from network)
5. INSERT ad_views { userId, adId, earnedAmount, completed=true, ... }
6. Call recordEarnEvent({ userId, engineType:'Engine_A', grossPkr: earnedAmount, sourceId: adView.id, sourceType:'ad_view' })
7. Engine split: thorxCut=40%, userPkrShare=60%
8. drawThorxCard() → { pointsCredited=648, realPkrValue=6.00, cardVariance=1.08 }
9. INSERT user_transactions { userId, Engine_A, 648, 6.00, 10.00, 4.00, 0, 1000, 1.08, adView.id }
10. UPDATE users SET txPointsBalance+=648, totalEarnings+=6.00, lastActiveAt=now
11. INSERT earnings { userId, Engine_A, 6.00, ... }
12. awardTaskPS(userId, 'A') → performanceScore+=5
13. processStreak(userId) → streak Day 3 → performanceScore+=20
14. checkAndUpdateRankTier(userId) → no change (still E-Rank)
15. emitFeedEvent('earn', ...) → INSERT activity_feed; WS broadcast to admins
16. Response: { success: true, thorxCard: { pointsCredited: 648, realPkrValue: 6.00, engineType: 'Engine_A' } }
17. Client: ThorxCard component renders; user sees "648 TX-Points"
18. Dashboard balance counters refetch via 'user.balance_updated' WS event
```

### I.2 Engine C Guild Task Completion Flow

```
1. Guild member clicks task in Engine C Task List
2. POST /api/guilds/weekly-tasks/:taskId/complete
3. Server: verify guildRole='member'|'captain'; verify not already completed (weekly_task_records unique)
4. GET weekly_task config → { grossPkrPerCompletion: 10.00, taskCategory: 'cpa_offer' }
5. INSERT weekly_task_records { userId, guildId, taskId, status='completed' }
6. Call recordEarnEvent({ userId, engineType:'Engine_C', grossPkr: 10.00, sourceId: taskRecord.id, sourceType:'weekly_task', guildId })
7. Engine C split: thorxCut=20% (Rs.2.00), guildPool=35% (Rs.3.50), userShare=45% (Rs.4.50)
8. UPDATE guilds SET weeklyBonusPool+=3.50, currentWeeklyPoints+=450 (points equivalent)
9. drawThorxCard() → { pointsCredited=430, realPkrValue=4.50, cardVariance=0.956 }
10. INSERT user_transactions { userId, Engine_C, 430, 4.50, 10.00, 2.00, 3.50, 1000, 0.956 }
11. UPDATE users SET txPointsBalance+=430, totalEarnings+=4.50, lastActiveAt=now
12. INSERT earnings record
13. UPDATE guild_members SET weeklyPointsContributed+=430
14. awardMemberGPS(guildId, 430) → gps+=43 (10% of 430)
15. checkAndUpdateGuildRankTier(guildId)
16. awardTaskPS(userId, 'C') → performanceScore+=15
17. processStreak; checkAndUpdateRankTier
18. emitFeedEvent
19. WS broadcast: 'guild.weekly_points' { guildId, currentPoints, target, pct }
20. Response: { thorxCard: { pointsCredited: 430, realPkrValue: 4.50, engineType: 'Engine_C' } }
```

### I.3 Withdrawal Request Flow

```
1. User opens WithdrawalModal; enters 10,000 TX-Points
2. GET /api/withdrawals/preview?points=10000
3. Server: calculateWithdrawalBreakdown(userId, 10000)
   a. FIFO walk user_transactions WHERE withdrawn=false ORDER BY created_at ASC
   b. Accumulate pointsCredited until >=10000; sum their realPkrValue → Rs.100.00
   c. platformFee = 100.00 × 0.15 = Rs.15.00
   d. getReferrerOf(userId) → Ahmad K.
   e. referralCommission = 15.00 × 0.30 = Rs.4.50
   f. userNetPkr = 100.00 - 15.00 = Rs.85.00
4. Client displays preview breakdown; user confirms
5. POST /api/withdrawals { amount: 10000, method: 'JazzCash', accountNumber, accountName }
6. Server: validate balance sufficient (txPointsBalance >= 10000)
7. INSERT withdrawals { userId, amount:10000, method:'JazzCash', status:'pending', fee:15.00, netAmount:85.00 }
8. If S-Rank: status='approved' immediately
9. Admin sees new withdrawal in PayoutControl queue with double-entry audit table
10. Admin validates ledger (automatic on page load), copies payment details, enters Ref ID, clicks Approve
11. PATCH /api/admin/withdrawals/:id { action:'approve', transactionId:'TXN123' }
12. processWithdrawal():
    a. UPDATE withdrawals SET status='completed', transactionId='TXN123', processedAt=now
    b. UPDATE users SET txPointsBalance-=10000, totalWithdrawn+=85.00
    c. Mark consumed user_transactions as withdrawn=true
    d. UPDATE users (Ahmad K.) SET balanceCashPkr+=4.50
    e. INSERT referral_commissions record
    f. INSERT audit_logs
    g. createNotification to user: "Rs.85.00 sent. Tx: TXN123"
    h. emitFeedEvent('withdrawal', ...)
```

### I.4 Sunday Guild Reset Flow

```
TRIGGER: cron at Sunday 23:59 PKT (18:59 UTC)

For each active guild:
1. Read: weeklyBonusPool (Rs.4,500), currentWeeklyPoints (98,000), weeklyTarget (100,000)
2. Check: 98,000 >= 100,000? NO → FAIL PATH
   - pool voided
   - INSERT guild_weekly_snapshots { wasSuccessful:false, poolDisposition:'voided' }
   - emitFeedEvent('guild_target', { message: "Guild 'X' missed target. Pool voided." })
   
OR: 105,000 >= 100,000? YES → SUCCESS PATH
   3. captainShare = 4,500 × 0.30 = Rs.1,350
   4. memberPool   = 4,500 × 0.70 = Rs.3,150
   5. Get members with weeklyPointsContributed: [Ali:4200, Sara:3100, Zain:1800, New:500]
   6. totalContrib = 9,600
   7. Ali share  = 3150 × (4200/9600) = Rs.1,378.13 → UPDATE users.availableBalance
   8. Sara share = 3150 × (3100/9600) = Rs.1,017.19
   9. Zain share = 3150 × (1800/9600) = Rs.590.63
   10. New share = 3150 × (500/9600)  = Rs.164.06
   11. createNotification to each (captain + members)
   12. awardMilestoneGPS(guildId, 1000)
   13. checkAndUpdateGuildRankTier(guildId)
   14. INSERT guild_weekly_snapshots { wasSuccessful:true, poolDisposition:'distributed' }
   15. emitFeedEvent('guild_target', { message: "Guild 'X' distributed Rs.4,500 bonus!" })
   
ALWAYS (success or fail):
   16. UPDATE guilds SET weeklyBonusPool=0, currentWeeklyPoints=0
   17. UPDATE guild_members SET weeklyPointsContributed=0, isMVP=false
   18. WS broadcast: 'guild.pool_credited' to all guild members
```

---

## PART J — CONFIGURATION REFERENCE (`system_config`)

*All keys, default values, and descriptions. Managed via SystemSettingsManager / FinancialControlCenter.*

```
Key                          Default   Type     Description
─────────────────────────────────────────────────────────────────────────────
# Conversion & Fee
CONVERSION_RATE              1000      integer  TX-Points per Rs.10 (1pt = Rs.0.01)
WITHDRAWAL_FEE_PCT           15        integer  % charged on withdrawal PKR value
REFERRAL_FEE_SHARE_PCT       30        integer  % of withdrawal fee going to referrer
MIN_PAYOUT                   1000      integer  Min TX-Points to withdraw

# Engine Splits (all in %)
ENGINE_A_THORX_CUT_PCT       40        integer  Engine A: Thorx profit cut
ENGINE_A_USER_CUT_PCT        60        integer  Engine A: user payout (auto: 100-cut)
ENGINE_B_THORX_CUT_PCT       40        integer  Engine B: Thorx profit cut
ENGINE_B_USER_CUT_PCT        60        integer  Engine B: user payout
ENGINE_C_THORX_CUT_PCT       20        integer  Engine C: Thorx profit cut
ENGINE_C_GUILD_POOL_PCT      35        integer  Engine C: combined bonus pool
ENGINE_C_USER_CUT_PCT        45        integer  Engine C: user payout

# Thorx Card
CARD_VARIANCE_MIN            0.80      decimal  Card random lower bound
CARD_VARIANCE_MAX            1.20      decimal  Card random upper bound
A_RANK_CARD_BONUS_PCT        5         integer  A-Rank: expand bounds by ±N%
S_RANK_CARD_BONUS_PCT        10        integer  S-Rank: expand bounds by ±N%

# PS System
PS_ENGINE_A_REWARD           5         integer  PS per Engine A task
PS_ENGINE_B_REWARD           25        integer  PS per Engine B task
PS_ENGINE_C_REWARD           15        integer  PS per Engine C task
PS_STREAK_DAY1               5         integer  Streak bonus Day 1
PS_STREAK_DAY2               10        integer  Streak bonus Day 2
PS_STREAK_DAY3_PLUS          20        integer  Streak bonus Day 3+
PS_INACTIVITY_PENALTY        10        integer  Daily PS deduction when inactive
PS_INACTIVITY_HOURS          48        integer  Hours before inactivity penalty starts

# User PS Rank Thresholds
PS_RANK_E_MAX                999       integer
PS_RANK_D_MIN                1000      integer
PS_RANK_D_MAX                2999      integer
PS_RANK_C_MIN                3000      integer
PS_RANK_C_MAX                5999      integer
PS_RANK_B_MIN                6000      integer
PS_RANK_B_MAX                9999      integer
PS_RANK_A_MIN                10000     integer
PS_RANK_A_MAX                19999     integer
PS_RANK_S_MIN                20000     integer

# GPS System
GPS_MEMBER_POINTS_PCT        10        integer  % of member earned points → GPS
GPS_MILESTONE_BONUS          1000      integer  GPS on weekly target success
GPS_MVP_BONUS                200       integer  GPS on MVP selection

# Guild GPS Rank Thresholds
GPS_RANK_E_MAX               9999      integer
GPS_RANK_D_MIN               10000     integer
GPS_RANK_D_MAX               29999     integer
GPS_RANK_C_MIN               30000     integer
GPS_RANK_C_MAX               69999     integer
GPS_RANK_B_MIN               70000     integer
GPS_RANK_B_MAX               149999    integer
GPS_RANK_A_MIN               150000    integer
GPS_RANK_A_MAX               299999    integer
GPS_RANK_S_MIN               300000    integer

# Guild Weekly Targets (by rank)
WEEKLY_TARGET_E_RANK         20000     integer  Default target for E-Rank guilds
WEEKLY_TARGET_D_RANK         50000     integer
WEEKLY_TARGET_C_RANK         100000    integer
WEEKLY_TARGET_B_RANK         200000    integer
WEEKLY_TARGET_A_RANK         350000    integer
WEEKLY_TARGET_S_RANK         500000    integer

# Guild Reset
GUILD_CAPTAIN_POOL_SHARE     30        integer  % of bonus pool to captain
GUILD_MEMBER_POOL_SHARE      70        integer  % of bonus pool to members (proportional)

# Risk (preserve existing)
RISK_VELOCITY_THRESHOLD      [existing]
RISK_BOT_EARNINGS_THRESHOLD  [existing]
RISK_TASK_SPEED_THRESHOLD    [existing]
COHORT_DISCOUNT_DAYS         [existing]

# Score Weights (preserve existing)
SCORE_WEIGHT_EARNINGS        [existing]
SCORE_WEIGHT_TEAM            [existing]
SCORE_WEIGHT_ACTIVE          [existing]
SCORE_WEIGHT_HEALTH          [existing]

# Activity Feed
FEED_RETENTION_DAYS          30        integer  Days to keep activity_feed records
```

---

## PART K — MIGRATION EXECUTION PLAN

### K.1 Pre-Migration Checklist

Before running any migration:
- [ ] Full database backup completed
- [ ] All active withdrawals processed or noted
- [ ] Admin team notified of maintenance window
- [ ] Application in maintenance mode (503 for users, admin accessible)

### K.2 Migration Script: `scripts/migrate-v3.ts`

Execute in this exact order:

```
STEP 1: Schema — New columns (all nullable or with defaults, zero downtime)
─────────────────────────────────────────────────────────────────────────────
1a. ALTER users: performance_score, user_rank_tier, guild_role, guild_id,
                 last_active_at, streak_days, last_streak_date,
                 inactivity_penalty_at, balance_cash_pkr
1b. ALTER guilds: guild_performance_score, guild_rank_tier, member_capacity,
                  weekly_bonus_pool, current_weekly_points, weekly_target,
                  target_difficulty, assistant_captain_id
                  DROP: last_rally_at
1c. ALTER guild_members: weekly_points_contributed, is_mvp, mvp_set_at,
                         last_nudged_at, cover_letter
1d. ALTER guild_weekly_cycles: bonus_pool_pkr, pool_disposition,
                               captain_share_pkr, members_share_pkr
1e. ALTER weekly_tasks: task_category, visibility, gross_pkr_per_completion
1f. ALTER score_history: user_rank_tier, guild_role, streak_days
1g. CREATE TABLE user_transactions (+ indexes)
1h. CREATE TABLE referral_commissions (+ indexes)
1i. CREATE TABLE captain_messages (+ indexes)
1j. CREATE TABLE guild_weekly_snapshots (+ unique index)
1k. CREATE TABLE activity_feed (+ indexes)

STEP 2: Data Backfill
─────────────────────────────────────────────────────────────────────────────
2a. Backfill users.user_rank_tier from users.rank:
    "Nawa Aya"       → 'E-Rank'
    "Chota Don"      → 'D-Rank'
    "Bawa Ji"        → 'C-Rank'
    "Haji Sab"       → 'B-Rank'
    "Chacha Supreme" → 'S-Rank'  (or 'A-Rank' if Chacha ≠ S)
    NULL             → 'E-Rank'

2b. Backfill users.guild_role + users.guild_id from guild_members:
    For each active guild_member: user.guildRole='member', user.guildId=guild_id
    For each guild.captainId: user.guildRole='captain'
    All others: guildRole='simple' (default covers this)

2c. Backfill users.last_active_at = users.updated_at (best estimate)
2d. Backfill users.streak_days = users.loginStreak (existing column)

2e. Backfill guilds.guild_rank_tier from guilds.guildRank (already E-S)
2f. Backfill guilds.member_capacity per guild_rank_tier table
2g. Backfill guilds.weekly_target from WEEKLY_TARGET_* config by guild rank

2h. Seed user_transactions from existing points_ledger:
    For each points_ledger record:
      engineType   = sourceType mapping (ad_view→Engine_A, weekly_task→Engine_C, daily_task→Engine_B)
      pointsCredited = pointsDisplayed
      realPkrValue   = lockedPkrValue
      conversionRate = conversionRateUsed
      cardVariance   = 1.0 (legacy, exact)
      sourceId       = sourceRefId
      withdrawn      = isConverted

2i. Seed system_config with all new keys from Part J
    (use bootstrapConfig() extended function; skip keys that already exist)

STEP 3: String Replacement (all codebases)
─────────────────────────────────────────────────────────────────────────────
3a. Global grep + replace (preserve case, check context):
    "Nawa Aya"       → "E-Rank"
    "Chota Don"      → "D-Rank"
    "Bawa Ji"        → "C-Rank"
    "Haji Sab"       → "B-Rank"
    "Chacha Supreme" → "S-Rank"

3b. User-facing string sweep:
    "Vault" (user-facing) → "Guild Weekly Bonus Pool" or omit
    "Locked Points"       → omit
    "locked_balance"      → "weeklyBonusPool" (backend variable rename)

3c. Remove:
    All "rally" references (route, handler, UI button, storage function)
    All L2 referral writes (commission_logs.level=2, referrals.tier=L2)
    Daily task withdrawal gate checks ("must complete daily task to withdraw")

STEP 4: Verification
─────────────────────────────────────────────────────────────────────────────
4a. Row count verification: user_transactions ≥ points_ledger (seeded rows)
4b. Sample check: 5 random users — verify user_rank_tier correct mapping
4c. Sample check: 5 guilds — verify guild_role/guild_id consistent
4d. system_config check: all new keys present with defaults
4e. Run ledger validator scan: expect 0 critical mismatches after backfill
```

### K.3 Code Implementation Order

```
Phase 1: Foundation (server-side, no frontend changes yet)
───────────────────────────────────────────────────────────
1. scripts/migrate-v3.ts           — Run migration
2. shared/schema.ts                — Add Drizzle definitions for all new tables/columns
3. server/modules/thorx-card.ts    — Card engine (needed by recordEarnEvent)
4. server/modules/ps-engine.ts     — PS logic (needed by recordEarnEvent)
5. server/modules/gps-engine.ts    — GPS logic (needed by recordEarnEvent)
6. server/modules/live-feed.ts     — Feed emitter (needed by recordEarnEvent)
7. server/middleware/rankGate.ts   — Rank gates (needed by routes)
8. server/modules/health-engine.ts — Fix NaN guards

Phase 2: Core Backend
───────────────────────────────────────────────────────────
9.  server/storage.ts (recordEarnEvent rewrite)
10. server/storage.ts (processWithdrawal overhaul)
11. server/storage.ts (createUser extension)
12. server/storage.ts (checkAndUpdateRankTier rewrite + alias)
13. server/modules/guild-reset.ts  — Sunday reset overhaul

Phase 3: Routes
───────────────────────────────────────────────────────────
14. server/routes.ts — Remove: rally route
15. server/routes.ts — Modify: POST /api/ad-view (call new recordEarnEvent)
16. server/routes.ts — Modify: POST /api/tasks/:id/verify (Engine B math + rank gate)
17. server/routes.ts — Modify: POST /api/guilds/weekly-tasks/:taskId/complete (Engine C)
18. server/routes.ts — Modify: POST /api/guilds (B-Rank gate)
19. server/routes.ts — Modify: POST /api/guilds/:id/join → :id/apply (new endpoint)
20. server/routes.ts — Add: all new routes from Part E.9
21. server/index.ts — Add: 2 cron jobs + lastActiveAt middleware

Phase 4: Frontend Components (new)
───────────────────────────────────────────────────────────
22. client/src/lib/rankAvatars.ts             — Update rank names E-S
23. client/src/components/RankBadge.tsx
24. client/src/components/ThorxCard.tsx       — Replaces ScratchCardModal
25. client/src/components/PSProgressCard.tsx
26. client/src/components/guild/GuildDiscoveryPanel.tsx
27. client/src/components/guild/GuildMemberPanel.tsx
28. client/src/components/guild/CaptainPortal.tsx
29. client/src/components/admin/LiveActivityFeed.tsx
30. client/src/components/admin/ThorxCardSandbox.tsx
31. client/src/components/admin/LedgerValidator.tsx
32. client/src/components/admin/RanksCustomizer.tsx
33. client/src/components/admin/ReferralAnalytics.tsx

Phase 5: Frontend Modifications (existing)
───────────────────────────────────────────────────────────
34. client/src/pages/UserPortal.tsx           — Three-context routing + new dashboard cards
35. client/src/components/WithdrawalModal.tsx — Preview screen
36. client/src/components/admin/AdminDashboard.tsx    — Engine breakdown + NaN fix
37. client/src/components/admin/PayoutControl.tsx     — Audit table + RED ALERT + copy
38. client/src/components/admin/UserManager.tsx       — New columns + PS adjust
39. client/src/components/admin/GuildManager.tsx      — Inactive alert + target assigner + GPS
40. client/src/components/admin/SystemSettingsManager.tsx → FinancialControlCenter
41. client/src/components/admin/LeaderboardInsights.tsx   — Remove L2, add PS, add guild col
42. client/src/pages/TeamPortal.tsx           — Register new sections

Phase 6: Cleanup
───────────────────────────────────────────────────────────
43. Remove: GuildVaultPanel functionality (keep file as re-export shim → GuildMemberPanel)
44. Remove: ScratchCardModal (keep file as re-export → ThorxCard)
45. Remove: All rally code paths
46. Remove: Daily task withdrawal gate
47. Remove: L2 commission writes
48. Verify: All "Vault" / "Locked Points" / old rank names purged from user-facing strings
```

---

## PART L — QUALITY ASSURANCE & TEST PROTOCOL

### L.1 Schema Integrity Tests

- [ ] All new columns exist with correct types and defaults
- [ ] `user_transactions.real_pkr_value` — no UPDATE path exists in codebase (grep: `UPDATE user_transactions SET real_pkr_value`)
- [ ] `balance_cash_pkr` — never goes negative (check constraint or application-level guard)
- [ ] `commission_logs` — no new INSERT statements (grep: `insert.*commission_logs`)
- [ ] `referrals.tier` — all new records = 'L1' only

### L.2 Engine A Tests

- [ ] Ad view completes → `user_transactions` created; engineType='Engine_A'
- [ ] `real_pkr_value` = earnedAmount × 0.60
- [ ] `thorx_profit_pkr` = earnedAmount × 0.40
- [ ] `points_credited` is within ±20% of targetPoints (E-Rank bounds)
- [ ] `points_credited` is within ±25% for A-Rank user
- [ ] `users.txPointsBalance` incremented by `points_credited`
- [ ] `users.totalEarnings` incremented by `real_pkr_value` (NOT points_credited)
- [ ] PS +5 awarded
- [ ] `last_active_at` updated

### L.3 Engine B Tests

- [ ] E-Rank user POST /api/tasks/:id/verify → 403 RANK_GATE response
- [ ] C-Rank user → succeeds; engineType='Engine_B'
- [ ] Same 40/60 split as Engine A
- [ ] PS +25 awarded
- [ ] Feed event emitted with correct math

### L.4 Engine C Tests

- [ ] Simple user (guildRole='simple') → 403 GUILD_ROLE_GATE
- [ ] Guild member → succeeds; engineType='Engine_C'
- [ ] Split: thorxProfit=20%, guildPool=35%, userShare=45%
- [ ] `guilds.weekly_bonus_pool` += (grossPkr × 0.35)
- [ ] `guild_members.weekly_points_contributed` += pointsCredited
- [ ] GPS += pointsCredited × 0.10
- [ ] Indirect task: no `user_transactions` PKR entry; PS +15 only
- [ ] `guild.current_weekly_points` increments on each completion

### L.5 PS & Rank Tests

- [ ] New user: performanceScore=0, userRankTier='E-Rank'
- [ ] E-Rank → D-Rank at PS=1,000: rank_logs entry; notification; WS broadcast
- [ ] D-Rank → C-Rank at PS=3,000: Engine B now accessible
- [ ] B-Rank at PS=6,000: guild creation route no longer returns 403
- [ ] A-Rank: card variance bounds = 0.75–1.25 (base ± 0.05)
- [ ] S-Rank: withdrawal auto-approved (status='approved' on creation)
- [ ] rankLocked=true: no rank change even if PS crosses threshold
- [ ] Streak Day 1: +5 PS; Day 2: +10 PS; Day 3: +20 PS; Day 4 (unbroken): +20 PS
- [ ] Broken streak: next task = Day 1 (+5 PS)
- [ ] Inactivity 48h: -10 PS; floor at 0 (never negative)
- [ ] PS threshold change via admin → next `checkAndUpdateRankTier` call respects new value

### L.6 GPS & Guild Rank Tests

- [ ] Engine C completion → GPS += pointsCredited × 0.10
- [ ] Sunday success → GPS += 1,000 (GPS_MILESTONE_BONUS)
- [ ] MVP set → GPS += 200 (GPS_MVP_BONUS)
- [ ] GPS = 10,000 → guildRankTier='D-Rank'; memberCapacity=15; WS broadcast; rank_logs
- [ ] Only one MVP per guild per week (previous MVP cleared on Sunday reset)

### L.7 Sunday Reset Tests

- [ ] Cron fires at correct UTC time (Sunday 18:59)
- [ ] Success path: captainShare = pool × 0.30; memberPool = pool × 0.70
- [ ] Members with weeklyPointsContributed=0 receive zero share
- [ ] Proportional distribution is mathematically correct (sum ≈ pool, rounding accepted)
- [ ] Fail path: pool voided; no credits; snapshot wasSuccessful=false
- [ ] After reset: weeklyBonusPool=0; currentWeeklyPoints=0; all weeklyPointsContributed=0; isMVP=false
- [ ] guild_weekly_snapshots record created in both cases
- [ ] Notification sent to captain and all members on success
- [ ] WS 'guild.pool_credited' broadcast

### L.8 Withdrawal Tests

- [ ] Preview endpoint returns correct values (FIFO ledger walk)
- [ ] `real_pkr_value` sum, not point-math conversion
- [ ] 15% fee applied to PKR value, not points
- [ ] Referral commission = 30% of fee → referrer.balanceCashPkr incremented
- [ ] `referral_commissions` table record created
- [ ] `commission_logs` NOT written for new commissions
- [ ] Consumed `user_transactions` marked withdrawn=true; withdrawal_id set
- [ ] S-Rank withdrawal: status='approved' immediately
- [ ] Minimum TX-Points check enforced (MIN_PAYOUT from config)
- [ ] Ledger mismatch → RED ALERT shown in PayoutControl

### L.9 Guild Application Tests

- [ ] E-Rank user → 403 on POST /api/guilds/:id/apply
- [ ] Cover letter < 50 chars → 400 validation error
- [ ] Guild capacity full → 400 error
- [ ] User rank below guild.minRankRequired → 400 error
- [ ] Valid apply → guild_members record with status='pending', cover_letter saved
- [ ] WS 'guild.application_received' → captain sees red badge
- [ ] Captain accepts → user.guildRole='member'; user.guildId set; WS update
- [ ] Captain reject → rejection reason required (min 10 chars); notification to applicant with reason
- [ ] Guild member cannot apply to another guild while guildRole≠'simple'

### L.10 Captain Portal Tests

- [ ] Captain nudge: notification sent to member; lastNudgedAt set; 24h cooldown enforced
- [ ] Nudge button hidden for 24h after use
- [ ] MVP: only one per guild; GPS +200; previous MVP cleared; isMVP badge shows
- [ ] DM thread: only captain and that specific member can read/write
- [ ] Captain transfer: old captain → guildRole='member'; new captain → guildRole='captain'; audit_logs entry
- [ ] Weekly history chart: shows last 8 guild_weekly_snapshots
- [ ] Target difficulty: captain can only choose within admin-defined limits for guild rank

### L.11 Admin Panel Tests

- [ ] Engine profit sliders: update system_config; next earn event uses new split
- [ ] Card variance change: next drawThorxCard uses new bounds
- [ ] Withdrawal fee change: next calculateWithdrawalBreakdown uses new rate
- [ ] Inactive Captain Alert: guilds where captain.lastActiveAt > 7 days ago appear
- [ ] Replace Captain: modal shows current members; selection updates guild + both users; audit_log
- [ ] Weekly Target Assigner: bulk apply updates all matching-rank guilds
- [ ] GPS manual adjust: delta applied; reason logged to audit_logs
- [ ] PS manual adjust: delta applied; checkAndUpdateRankTier called; audit_logs
- [ ] Ledger validator: critical mismatch detected on synthetic test case
- [ ] RED ALERT: shows on withdrawal card when mismatch found
- [ ] One-click copy: correct format pasted to clipboard
- [ ] Live Feed: earn event appears within 5 seconds of task completion
- [ ] Card Simulator: output counts match iterations; stats accurate

### L.12 Regression Tests (Existing Features)

- [ ] HilltopAds video player still delivers ads and calls ad-completion
- [ ] Risk engine still scores cases; signals still fire
- [ ] Case management workflow (Open→Investigating→Cleared) still works
- [ ] Health snapshots still record (NaN fixed, not broken)
- [ ] Leaderboard still refreshes on schedule
- [ ] Group guild chat (engine_c_messages) still works
- [ ] Internal notes on users still work
- [ ] Referral network topology still renders (L1 only now)
- [ ] Balance adjustment modal still works
- [ ] Trust status update still works
- [ ] Audit logs still capture all admin actions
- [ ] Team invitation / key minting still works
- [ ] Email verification still works
- [ ] Profile photo upload still works
- [ ] Chatbot support assistant still responds
- [ ] Guild freeze/unfreeze/disband/strike still work
- [ ] Admin-triggered manual weekly resolution still works

---

## APPENDIX A — IMMUTABLE INVARIANTS

*Rules that must never be violated by any code path.*

1. **`user_transactions.real_pkr_value` is write-once.** No `UPDATE user_transactions SET real_pkr_value` may exist anywhere in the codebase. Withdrawal math always reads from this column, never calculates from points.

2. **Withdrawal math uses `user_transactions`, never `txPointsBalance / CONVERSION_RATE`.** Points are random; PKR is exact. These are two different numbers.

3. **"Vault" and "Locked Points" never appear in any user-facing string.** Backend column names (`weeklyBonusPool`, `vaultBalancePkr`) are internal. Only "Guild Weekly Bonus Pool" or "Sunday Bonus" are user-visible terms.

4. **Referral is 1-tier only.** No code may create a `referral_commissions` record where the referrer is not the direct inviter. `commission_logs` is read-only historical data.

5. **`balance_cash_pkr` never goes negative and is never mixed with `txPointsBalance`.** Referral cash is a separate wallet. Withdrawal of referral cash is a separate endpoint.

6. **PS is the only input to `checkAndUpdateRankTier()`.** `totalEarnings` does not affect user rank. `rankLocked=true` bypasses all automatic rank changes.

7. **E-Rank is the PS floor.** `performanceScore` can reach 0 but `userRankTier` can never drop below 'E-Rank' as a result of inactivity penalty.

8. **Guild Weekly Bonus Pool amount is never shown to users until it is credited.** Users see "Sunday Bonus will arrive" but never the Rs. amount of the pool until `createNotification` fires after distribution.

9. **Admin config changes are live immediately.** All engine splits, fee rates, rank thresholds, and card variance settings are read from `system_config` on each request. No restart required. No in-memory caching beyond the request.

10. **Every admin balance/PS/GPS adjustment must be logged to `audit_logs` with a required reason.** No exceptions.

---

## APPENDIX B — FILE CHANGE MANIFEST

```
NEW FILES (create from scratch):
  server/modules/thorx-card.ts
  server/modules/ps-engine.ts
  server/modules/gps-engine.ts
  server/modules/live-feed.ts
  server/middleware/rankGate.ts
  scripts/migrate-v3.ts
  client/src/components/RankBadge.tsx
  client/src/components/ThorxCard.tsx
  client/src/components/PSProgressCard.tsx
  client/src/components/guild/GuildDiscoveryPanel.tsx
  client/src/components/guild/GuildMemberPanel.tsx
  client/src/components/guild/CaptainPortal.tsx
  client/src/components/admin/LiveActivityFeed.tsx
  client/src/components/admin/ThorxCardSandbox.tsx
  client/src/components/admin/LedgerValidator.tsx
  client/src/components/admin/RanksCustomizer.tsx
  client/src/components/admin/ReferralAnalytics.tsx

HEAVILY MODIFIED (overhaul):
  shared/schema.ts                                 ← 5 new tables, 25+ new columns
  server/storage.ts                                ← recordEarnEvent, processWithdrawal, createUser, checkAndUpdateRank
  server/routes.ts                                 ← 20+ route changes, rally removed
  server/modules/guild-reset.ts                    ← Sunday reset full rewrite
  server/modules/health-engine.ts                  ← NaN guards
  server/index.ts                                  ← 2 new cron jobs, lastActiveAt middleware
  client/src/pages/UserPortal.tsx                  ← 3-context routing, new dashboard card variants
  client/src/components/WithdrawalModal.tsx         ← preview screen
  client/src/components/admin/PayoutControl.tsx     ← audit table, RED ALERT, copy
  client/src/components/admin/SystemSettingsManager.tsx → FinancialControlCenter (engine sliders, card variance)

MODERATELY MODIFIED (extend):
  client/src/lib/rankAvatars.ts                    ← E-S rank config
  client/src/pages/TeamPortal.tsx                  ← new nav sections
  client/src/components/admin/AdminDashboard.tsx   ← engine breakdown card, NaN fix
  client/src/components/admin/UserManager.tsx      ← new columns, PS adjust, L1-only network
  client/src/components/admin/GuildManager.tsx     ← inactive alert, target assigner, GPS adjust
  client/src/components/admin/LeaderboardInsights.tsx ← PS column, remove L2, guild column

UNCHANGED (preserve completely):
  server/modules/risk-engine.ts
  server/chatbot/
  server/hilltopads-service.ts
  server/jobs/ (leaderboard + health)
  client/src/components/admin/RiskWatchlistPanel.tsx
  client/src/pages/HilltopAdsAdmin.tsx
  client/src/components/ads/HilltopAdsPlayer.tsx
  client/src/components/auth/ProtectedRoute.tsx
  client/src/hooks/useAuth.ts
  client/src/lib/queryClient.ts

SHIMS (keep file, re-export new component):
  client/src/components/guild/GuildVaultPanel.tsx  → re-exports GuildMemberPanel
  client/src/components/guild/ScratchCardModal.tsx → re-exports ThorxCard
```
