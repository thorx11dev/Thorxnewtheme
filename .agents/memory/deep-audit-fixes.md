---
name: Deep Audit 10-Task Fix Plan
description: Status of all 10 tasks from the 2026-07-20 THORX deep audit (29 findings); all complete
---
# Deep Audit 10-Task Fix Status

## ALL 10 TASKS COMPLETE as of 2026-07-20

Task 1 (F-01,F-02) Guild Decimal.js — pre-done
Task 2 (S-01,S-02) Zod on admin routes — pre-done for tasks route; this session added Zod to: POST /api/admin/withdrawals/bulk, POST /api/admin/founder/withdrawals, POST /api/admin/notes (×2), PATCH /api/admin/risk-cases/:id, POST /api/withdrawals/referral
Task 3 (S-03,S-04) Proxy auth + rate limiters — pre-done
Task 4 (F-04) Pagination — impl had limit/offset; IStorage interface updated (both signatures now have optional limit/offset)
Task 5 (F-05) TS errors — this session: added referralsLeaderboard+dashboardStats to queryKeys.ts; fixed readonly type in useRealtimeSync.ts; tsc --noEmit = 0 errors
Task 6 (U-01) Captain announcements — pre-done (GuildMemberPanel in client/src/components/guild/ already renders latestAnnouncement)
Task 7 (U-02,U-03) Query key registry — pre-done + extended this session
Task 8 (S-05,S-06) DB indexes — pre-done
Task 9 (S-07) Root ErrorBoundary — pre-done
Task 10 (U-07,U-08,U-09) Mobile/polish — U-07/08 pre-done; U-09 this session: Loader2 in PayoutControl (Finalize+Decline), Skeleton in SystemHealthCard, Loader2 in CaptainPortal (nudge/mvp/settings/announcement buttons)

**Why:** Zero TS errors + Zod on all financial routes = production-grade security hardening.
