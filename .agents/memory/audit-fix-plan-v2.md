---
name: Audit Fix Plan V2 Complete
description: All 15 audit findings from the session audit implemented 2026-07-22
---

## Status: ALL COMPLETE — 2026-07-22

### Phase 1 — Financial Integrity
- C1-04: `processWithdrawal` wraps all `breakdown.*` values in `new Decimal()` at top of tx block; Decimal arithmetic for `thorxShareD`; SQL writes use `.toFixed(4)`
- C1-05: `calculateWithdrawalBreakdown` FIFO query now has `.limit(5000)` safety cap
- C2-06: `getCommissionLogsByBeneficiary` → `.limit(500)`; `getUserCredentials` → `.limit(100)`
- C2-05: Added `idx_user_transactions_fifo` composite index on (userId, withdrawn, createdAt) in schema.ts; applied via drizzle-kit push

### Phase 2 — Security
- C2-03: `/api/admin/users/:id/action` permission `VIEW_ANALYTICS` → `MANAGE_USERS`
- C2-02: `adminActionRateLimiter` (30/15min, keyed by userId) on admin action route; `bootstrapRateLimiter` (3/hr, IP) on bootstrap-founder
- C1-03 / C2-04: bootstrap-founder now validates via Zod (email, password min 6, firstName/lastName min 1)
- C2-09: Startup WARN (not fatal) when CREDENTIAL_ENCRYPTION_KEY is absent
- Both new limiters exported from auth-rate-limit.ts and imported in routes.ts

### Phase 3 — Points-only UI (C1-01)
- trust-builder.tsx:160 — removed ₨ prefix; label "TX-PTS DISTRIBUTED"; subtitle "TX-Points earned collectively"
- notification-modal.tsx:200 — "$ X.XX" → "X TX-PTS" (Math.round, toLocaleString)
- referral-tree.tsx:287 — "+X.XX pts" → "+X TX-PTS" (Math.round)
- enhanced-video-player.tsx:102,330 — both formatCurrency fns: "$X.XX" → "+X TX-PTS"
- UserPortal.tsx:2897 — preview "Estimated Final Payout: ≈ Rs. X gross · Rs. Y net (after Z% fee)"
- UserPortal.tsx:2659 — toast "(Est. Rs. X net)" qualifier added

### Phase 4 — Indexes
- All audit-listed indexes already existed except idx_user_transactions_fifo — added

### Phase 5 — UX
- TaskManager.tsx — toggleStatusMutation has onSuccess toast (Activated/Deactivated/Updated) + onError
- AdminSidebar.tsx — SheetContent `w-[300px]` → `w-[85vw] max-w-[300px]`
- RiskWatchlistPanel.tsx — table wrapped in `<div className="overflow-x-auto">`
- TeamPortal.tsx — heading `text-3xl` → `text-xl sm:text-3xl`
- DashboardCards.tsx — isError for referralStats, guild, members; error fallback UI in GUILD MEMBER branch
- AdminDashboard.tsx — `isError: metricsError` added to metrics hook

### Not Changed (correct as-is or false positives)
- C3-07: window.location.href for exports — correct for auth'd file downloads; toasts already present
- C3-02: CaptainPortal.tsx, UserManager.tsx — mutations already had toasts
- C3-03: TermsAndConditions.tsx:167 — already had overflow-x-auto
- C2-01: /api/user response — manually constructed object, passwordHash NOT included
- C1-01: UserPortal payout modal PKR rows (3036,3046,3055,3082) — kept per Q1 answer
- C1-04: thorx-card.ts:56 .toNumber() — display-only integer, not stored balance
