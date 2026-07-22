---
name: Deep Investigation Final
description: Comprehensive post-audit investigation findings and fixes — 2026-07-22 session.
---

## Investigation Scope (2026-07-22)

Full parallel sweep across: routes, schema, security, frontend, DB indexes, console output, Zod coverage, risk engine.

## 5 New Findings Fixed

### F-1: PATCH /api/team/emails/:id — no Zod on status
- **Fix**: Added Zod schema with `status: z.enum(["sent","read","archived"])` and `isRead: z.boolean()`.
- **Verified**: Bad status → 400 "Invalid enum value. Expected 'sent' | 'read' | 'archived'".

### F-2: daily_tasks table — missing is_active and target_rank indexes
- **Fix**: Added `index("daily_tasks_is_active_idx")` and `index("daily_tasks_target_rank_idx")` to schema; applied via raw SQL (CREATE INDEX IF NOT EXISTS).
- **Why**: getDailyTasksForUser now filters is_active=true in SQL; index makes this a bitmap index scan instead of seq scan as tasks grow.

### F-3: getDailyTasksForUser — fetched ALL tasks including inactive ones
- **Fix**: Added `.where(eq(dailyTasks.isActive, true))` to the Drizzle query in storage.ts.
- **Why**: Without this, inactive tasks were loaded into memory then filtered in JS at routes.ts. Now filtered at SQL layer.

### F-4: Risk engine cash-out velocity — 1-hour window hardcoded
- **Fix**: Now reads `RISK_CASHOUT_WINDOW_HOURS` from system_config (default 1). Seeded as key 67 in bootstrapConfig.
- **Why**: Operators can tune the threshold at runtime without a deploy.

### F-5: hilltopads-scheduler.ts — console.log/console.error throughout
- **Fix**: Replaced all console.log/error with pino logger (same pattern as rest of server).
- **Why**: Consistent structured logging; log levels respected in production.

## Confirmed Non-Issues (False Positives Cleared)

- GET /api/admin/users (no trailing segment) → returns SPA HTML (Vite catch-all), not API data.
- GET /api/stats → intentionally public (landing page aggregate stats). No PII.
- dangerouslySetInnerHTML in chart.tsx → CSS color vars from developer-controlled ChartConfig. Shadcn/ui standard.
- console.error in hilltopads-service.ts, live-feed.ts, validation.ts → error-path only, no PII, acceptable.
- parseFloat in health-engine.ts → arithmetic-only health score ratios, not stored financial values.

## Final State
- tsc --noEmit: 0 errors
- system_config: 68 keys seeded
- DB indexes: 42 tables indexed; all critical unique indexes present
- All 12 core endpoint checks: ✓; All auth/CSRF checks: ✓; All Zod checks: ✓
