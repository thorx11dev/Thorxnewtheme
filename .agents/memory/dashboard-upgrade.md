---
name: Dashboard Upgrade
description: 5-phase dashboard build and subsequent UI/UX redesign — tables, health engine, founder ledger, reconciliation panel, and 7-card AdminDashboard.
---

## What Was Built

### Phase 1 — Database tables (via drizzle-kit push)
- `founderWithdrawals` — tracks personal withdrawals by the founder
- `healthSnapshots` — hourly system health records (5 dimensions)
- `errorEvents` — placeholder for future error tracking

### Phase 2 — Health Engine
- `server/modules/health-engine.ts` — 5 dimensions × 4 signals each; fully DB-backed
- `server/jobs/health-snapshot.ts` — runs on startup + every 60 min

### Phase 3 — Founder Ledger
- `POST/GET /api/admin/founder/withdrawals`
- `GET /api/admin/founder/profit-summary`
- `storage.getFounderProfitSummary()` returns safeToWithdrawNow, isOverWithdrawn, etc.

### Phase 4 — Reconciliation
- `GET /api/admin/reconciliation`
- `POST /api/admin/earnings/:earningId/reclassify`

### Phase 5 — Frontend
- `AdminDashboard.tsx` — "Platform Overview", clean rounded cards, sections: System Health, Core Metrics, Growth & Network, Financial Integrity, Analytics
- `SystemHealthCard.tsx` — tap-to-open HealthReportPanel dialog
- `HealthReportPanel.tsx` — "Health Breakdown" / "Score History" / "What's Affecting the Score"
- `FounderProfitCard.tsx` — clean rounded style, log withdrawal + history modals
- `ReconciliationPanel.tsx` — "Money Overview" / "Money Breakdown" / "Manual Credits"

## Security Fix Applied
Four founder-only routes that had inline `role !== 'founder'` checks but NO `requireTeamRole` middleware were fixed:
- `GET /api/admin/founder/profit-summary`
- `POST /api/admin/founder/withdrawals`
- `GET /api/admin/founder/withdrawals`
- `POST /api/admin/earnings/:earningId/reclassify`

**Why:** Without `requireTeamRole`, unauthenticated requests bypassed session loading entirely — `req.userProfile` would be undefined and the role check would always throw.

## Design System Applied
**Clean style** (NOT neo-brutalist):
- `border-[1.5px] border-zinc-200 rounded-[2rem]`
- `hover:shadow-lg hover:-translate-y-0.5`
- Pill buttons: `rounded-full`
- No heavy `shadow-[4px_4px_0_0_#000]` offsets
- No `split-card` class

## Terminology Simplified
- "Command Center" → "Platform Overview"
- "DIMENSION BREAKDOWN — CLICK TO EXPAND SIGNALS" → "Health Breakdown (tap a row to expand)"
- "RECENT SNAPSHOTS" → "Score History"
- "ROOT CAUSE ANALYSIS" → "What's Affecting the Score"
- "PLATFORM FINANCIAL RECONCILIATION" → "Money Overview"
- "UNVERIFIED ADMIN CREDITS" → "Manual Credits"
