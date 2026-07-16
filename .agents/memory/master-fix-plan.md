---
name: Master Fix Plan Progress
description: Phase-by-phase status of THORX_MASTER_FIX_PLAN_1784228696589 implementation as of 2026-07-16.
---

## Completed in this session (2026-07-16)

**Phase 3 — Per-Engine TX-Points Ratios**
- DEFAULT_CONVERSION_RATE updated to 1000 in storage.ts constant
- bootstrapConfig seeds: ENGINE_A/B/C_PKR_TO_POINTS_RATIO (1000), ENGINE_A/B/C_ILLUSION_VARIANCE_PCT (10), ENGINE_A_PLAYERS_JSON ("[]")
- recordEarnEvent now reads per-engine ratio + variance, falls through: per-player override → per-engine key → global CONVERSION_RATE

**Phase 4 — Withdrawal Backend**
- GET /api/withdrawals/timeframe-breakdown added (uses getWithdrawalTimeframeBreakdowns storage method)

**Phase 5 — Dual-Field Balance Adjust**
- adjustUserBalance signature extended with `txPointsDelta?: number`; inserts user_transactions row when provided
- Route updated to accept `realPkrDelta + txPointsDelta + type` (new API) OR legacy `amount + type`
- Storage interface updated

**Phase 6 — Realtime Broadcasts**
- 6.1: PATCH /api/admin/guilds/:id/captain now broadcasts `guild.captain_changed` to new captain + guild members
- 6.2: PATCH /api/admin/withdrawals/:id now broadcasts `withdrawal_status_changed` with specific event type
- 6.3: PATCH /api/guilds/:id/settings now broadcasts `guild.settings_updated`

**Phase 8 — MVP Week Lock**
- setGuildMemberMvp now checks `mvpSetWeek` for the current ISO week; rejects reassignment if any member already set this week
- guild-reset.ts clears mvpSetWeek (set to null) alongside isMvp=false on Sunday reset

**Phase 9 — Withdrawal UI Timeframe Selector**
- UserPortal step 1 replaced keypad with timeframe selector cards (today/thisWeek/thisMonth/last3Months/allTime)
- Calls /api/withdrawals/timeframe-breakdown to populate TX-Point counts per bucket
- Selecting a timeframe auto-fills withdrawAmount → existing canProceed() logic unchanged

**Phase 10 — Dual-Field Balance Modal (Admin)**
- UserManager balance modal now has two inputs: PKR amount + TX-Points delta
- Mutation sends new dual-field API (realPkrDelta + txPointsDelta)

**Phase 11 — Per-Engine Config Cards (Admin)**
- SystemSettingsManager now has a "TX-Points Illusion Engine" section with sliders for ENGINE_A/B/C_PKR_TO_POINTS_RATIO and ENGINE_A/B/C_ILLUSION_VARIANCE_PCT

**Phase 15 — Realtime Sync Handlers**
- useRealtimeSync: added handlers for withdrawal_status_changed, guild.captain_changed, guild.pool_credited, guild.dm_received, guild.settings_updated
- CaptainPortal DM polling reduced from 5s to 60s (WS push as primary)

**Phase 16 — Per-Ad-Player CRUD**
- GET/POST/PATCH/DELETE /api/admin/engine-a/players endpoints added (reads/writes ENGINE_A_PLAYERS_JSON config key)
- setSystemConfigValue storage method added

**Phase 17.6 — Public Config Endpoint**
- GET /api/config/public added (returns conversionRate, platformName, withdrawalFeePct — no PKR secrets)

**Phase 18.2 — Withdrawal Fee Split**
- processWithdrawal now sets `thorxFeeShare` and `referralCommissionPaid` on the withdrawal record

**Phase 19 — Profit Ledger**
- GET /api/admin/profit-ledger added (engine cuts by type + withdrawal fee revenue + 30-day chart)
- getProfitLedger storage method implemented
- FounderProfitCard: adds engine cuts breakdown toggle panel + /api/admin/profit-ledger query

**Phase 20 — Captain Guild Chat Tab**
- CaptainPortal: new "Guild Chat" tab added (uses /api/guilds/:id/chat endpoint members already have)
- Optimistic message updates + 15s background poll

## Remaining / Not yet implemented

- Phase 17.1–17.5: PKR leak audit in earnings/referral/transaction API responses — need verification
- Phase 16 frontend: ENGINE_A_PLAYERS_JSON admin UI in SystemSettingsManager (per-ad-player CRUD UI, not just the endpoints)

**Why:** CONVERSION_RATE seeded as 1000 from this session; the prior session's "verification" note saying 100 is intentional is now superseded by the business decision to use 1000.
