---
name: Dashboard Upgrade
description: 5-phase dashboard build plus full data accuracy audit — tables, health engine, founder ledger, reconciliation panel, AdminDashboard with 5 sections.
---

## Architecture

### Database tables
- `founderWithdrawals` — tracks personal profit withdrawals by the founder
- `healthSnapshots` — hourly system health records (5 dimensions × 4 signals each)
- `errorEvents` — operational error event log for health engine

### Backend modules
- `server/modules/health-engine.ts` — 5 dimensions × 4 signals; fully DB-backed; stores `signalsJson` (JSONB) per snapshot
- `server/jobs/health-snapshot.ts` — runs on startup + every 60 min
- `storage.getExtendedMetrics()` — aggregated dashboard metrics (see accuracy notes below)
- `storage.getReconciliationData()` — financial reconciliation including admin credit details
- `storage.getFounderProfitSummary()` — profit = SUM(fee) from processed withdrawals

### Frontend components
- `AdminDashboard.tsx` — 5 sections: System Health, Core Metrics, Growth & Network, Financial Integrity, Analytics
- `SystemHealthCard.tsx` — tap-to-open HealthReportPanel; shows 1h + 24h delta badges; 5 dimension mini-bars
- `HealthReportPanel.tsx` — "Health Breakdown" / "Score History" / "What's Affecting the Score"
- `FounderProfitCard.tsx` — log withdrawal + history modals; clean rounded style
- `ReconciliationPanel.tsx` — "Money Overview" / "Money Breakdown" / "Manual Credits" with expand/collapse

---

## Security Fixes Applied
Three routes were missing `requireTeamRole` middleware (unauthenticated bypass):
- `GET /api/team/metrics` — now protected with `requireTeamRole`
- `GET/POST /api/admin/founder/*` — protected with `requireTeamRole` (done in previous session)
- `POST /api/admin/earnings/:id/reclassify` — protected with `requireTeamRole`

**Why:** Without `requireTeamRole`, unauthenticated requests bypassed session loading entirely; `req.userProfile` would be undefined and all inline role checks would throw or produce wrong behavior.

---

## Data Accuracy Fixes

### `getExtendedMetrics` fixes
- **Growth queries**: Added `role='user'` filter — previously counted admin/team/founder registrations too
- **totalUsers**: Added `role='user' AND isActive=true` — previously counted all active accounts
- **totalReferrals** (new): `COUNT(*) FROM users WHERE referredBy IS NOT NULL AND role='user'` — true referral count
- **totalCommissionsPaid** (new): `SUM(amount) FROM commissionLogs WHERE status='paid'` — total L1+L2 commissions ever paid
- **L1/L2 labels**: `networkL1Total` = distinct beneficiaries of paid L1 commissions = "L1 Earners" (active direct referrers). `networkL2Total` = "L2 Earners" (network earners). These are labeled correctly in the UI now.

### `getReconciliationData` fix
- `adminName` was hardcoded as `'Admin'`. Now resolves the real admin name by reading `earnings.metadata.adminId` (stored by `adjustUserBalance`) and batch-fetching admin users to avoid N+1 queries.

### AdminDashboard label fix
- `activeUsers` from `getUsersCountInRange` counts users by `createdAt >= since` — it is **new registrations in window**, NOT truly active users. Label changed to "New Registrations" with accurate subtitle.

---

## Design System
**Clean style** (NOT neo-brutalist):
- `border-[1.5px] border-zinc-200 rounded-[2rem]`
- `hover:shadow-lg hover:-translate-y-0.5`
- Pill buttons: `rounded-full`
- No heavy `shadow-[4px_4px_0_0_#000]` offsets

## Terminology
- "Command Center" → "Platform Overview"
- "DIMENSION BREAKDOWN..." → "Health Breakdown (tap to expand)"
- "RECENT SNAPSHOTS" → "Score History"
- "ROOT CAUSE ANALYSIS" → "What's Affecting the Score"
- "PLATFORM FINANCIAL RECONCILIATION" → "Money Overview"

---

## Known Platform Behaviors
- `getExtendedMetrics` is always all-time (not range-scoped); only `activeUsers`/`totalEarnings` from `getUsersCountInRange`/`getEarningsSumInRange` respect the date range selector.
- Health snapshots run hourly; `isStale` = true if snapshot > 90 minutes old. Manual recalculate available.
- `earnings.metadata` always contains `{ source, adminId, creditIntent }` for admin credit rows — reliable for resolving admin names.
- `signalsJson` is stored in `healthSnapshots` and returned by `getLatestHealthSnapshot()` — the HealthReportPanel dimension expand relies on this being populated.
