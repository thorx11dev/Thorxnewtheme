---
name: Dashboard Upgrade — Phase 1–5 Implementation
description: Full spec from THORX_Dashboard_Upgrade_Plan doc — new tables, health engine, founder ledger, reconciliation panel, 7-card dashboard layout.
---

## New Database Tables (created via raw SQL — TTY issue with db:push)
- `founder_withdrawals` — tracks founder personal transfers; used to compute Safe to Withdraw
- `health_snapshots` — hourly composite health score snapshots from 5-dimension engine
- `error_events` — 5xx errors captured by index.ts finish handler; feeds operational health signal

## New Server Files
- `server/modules/health-engine.ts` — 5-dimension scorer (Financial 25%, Operational 25%, User/Growth 20%, Risk 20%, Integrity 10%). 20 individual signals. Exports `computeHealthScore()` and `computeAndSaveHealthSnapshot()`.
- `server/jobs/health-snapshot.ts` — runs `computeAndSaveHealthSnapshot()` on boot + every 60 min in all environments.

## New API Endpoints (server/routes.ts)
- `GET /api/admin/founder/profit-summary` — founder only
- `POST /api/admin/founder/withdrawals` — founder only
- `GET /api/admin/founder/withdrawals` — founder only
- `GET /api/admin/system-health` — admin+ (returns latest snapshot, adds isStale flag if >90min old)
- `GET /api/admin/system-health/history` — admin+, supports `?hours=24`
- `POST /api/admin/system-health/recalculate` — triggers on-demand snapshot
- `GET /api/admin/reconciliation` — admin+ financial picture
- `POST /api/admin/earnings/:earningId/reclassify` — founder only, marks admin_credit as verified_deposit

## Extended /api/team/metrics Fields
Now returns 17 keys: pendingWithdrawalTotal, pendingWithdrawalCount, oldestPendingDays, unverifiedCreditTotal, unverifiedCreditCount, userGrowthThisWeek, userGrowthLastWeek, userGrowthRate, networkL1Total, networkL2Total, networkRatio, teamActivity24h, teamActivityAvg7d, mostActiveTeamMember, totalUsers (plus existing activeUsers, totalEarnings).

## Financial Integrity (Phase 1)
- `adjustUserBalance` now accepts optional `creditIntent: 'verified_deposit' | 'admin_credit'` (default: 'admin_credit')
- UserManager.tsx balance modal has a mandatory Credit Reason selector when adding credit
- The earnings record inserted by the credit operation uses the creditIntent type directly

## New Frontend Components
- `client/src/components/admin/FounderProfitCard.tsx` — founder-only card; shows Safe to Withdraw, log withdrawal modal, history modal
- `client/src/components/admin/SystemHealthCard.tsx` — health score card with delta vs 24h; opens HealthReportPanel
- `client/src/components/admin/HealthReportPanel.tsx` — full report: 24h chart, 5 dimension bars (click to expand signals), snapshot history, Recalculate Now button
- `client/src/components/admin/ReconciliationPanel.tsx` — 5-row financial reconciliation table + admin credit drill-down + Mark Verified button

## Updated Frontend
- `AdminDashboard.tsx` — full rewrite: 5 sections (Platform Health, Core Metrics, Growth & Activity, Financial Integrity, Analytics)
- `AdminLayout.tsx` — Finance nav item added for founder/admin roles
- `TeamPortal.tsx` — "finance" case routes to ReconciliationPanel

## Why: TTY issue with db:push
In non-TTY environments (Replit shell/CodeExecution), `drizzle-kit push` throws an interactive prompt error when it detects schema conflicts requiring user confirmation. Workaround: use `executeSql` with raw CREATE TABLE IF NOT EXISTS SQL directly.
