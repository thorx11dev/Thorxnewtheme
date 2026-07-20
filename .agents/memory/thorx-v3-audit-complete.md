---
name: THORX v3 audit complete
description: All 10 V3 audit tasks shipped — data integrity, auth, observability, UX
---

## Completed Tasks
- **Task 1**: createUser() wraps user + referral inserts in db.transaction(); tier is integer(1) not "L1"
- **Task 2**: users.identity has .unique(); partial unique indexes via raw SQL for identity and phone (exclude empty string); drizzle-kit needs raw SQL workaround in non-TTY
- **Task 3**: onDelete:"restrict" on ad_views, task_records, risk_cases, points_ledger via DROP/ADD FK raw SQL
- **Task 4**: adjust_balance uses storage.adjustUserBalance(id, amount.abs().toFixed(4), type, adminId, reason) — type is 'add'|'subtract'
- **Task 5**: PATCH /api/users/:id uses requireSessionAuth middleware; manual principalId null check removed
- **Task 6**: GET /api/health runs db.execute(sql`SELECT 1`) and returns 503 on failure
- **Task 7A**: health-engine.ts was missing logger import; added import { logger } from "../lib/logger"
- **Task 7B**: closeUserSockets(userId, code, reason) exported from realtime.ts; called after suspend
- **Task 8A**: parseFloat → new Decimal(...).toNumber() in risk-engine.ts; Decimal must be imported
- **Task 8B**: Composite index notifications_user_id_is_read_idx on (user_id, is_read) added + applied via raw SQL
- **Task 9**: ProtectedRoute.tsx already returned ThorxLoadingScreen (not null) — already resolved in prior work
- **Task 10**: useRealtimeSync returns { wsConnected }; WsStatusBanner takes wsConnected as prop; gated on isAuthenticated in App.tsx (wsConnected starts false for unauthenticated users — must gate or banner shows on landing page)
