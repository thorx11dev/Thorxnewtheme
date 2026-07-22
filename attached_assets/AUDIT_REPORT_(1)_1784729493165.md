# THORX Platform — Million-Dollar Forensic Audit Report
**Date:** 2026-07-22  
**Auditor:** Replit Agent (forensic pass, read-only)  
**Scope:** Full codebase — `server/`, `client/src/`, `shared/schema.ts`  
**Coverage:** `server/routes.ts` (4686 lines), `server/storage.ts` (5379 lines), `shared/schema.ts` (1424 lines), key frontend components, all background modules

---

## Executive Summary

THORX is a well-architected platform with strong financial engineering in its core paths: `processWithdrawal` uses `SELECT … FOR UPDATE`, `Decimal` throughout, atomic transactions, and correct commission routing. The approval chain (`PATCH` → `updateWithdrawalStatus` → `processWithdrawal`) is properly wired. Bulk approvals also route through the safe path.

However, **15 bugs and integrity gaps** were found — including one point where a float enters the Decimal engine before containment, one persistent financial display bug serving $0 from a deprecated table, and several admin routes missing Zod validation. A further **9 enterprise standards gaps** and **7 UX/ecosystem disconnects** complete the picture.

---

## CATEGORY 1 — Bugs & Financial Integrity Gaps

### F-01 · `parseFloat()` at the ad-view earn boundary ⚠️ HIGH
**Location:** `server/routes.ts` ~line 1551  
**Finding:** `parseFloat(adConfig.reward)` converts the reward config string to an IEEE 754 float before passing it as `grossPkr` into `recordEarnEvent`. The Decimal boundary is crossed in the wrong direction — float contamination enters before Decimal can contain it. For sub-paisa reward values (e.g. `"0.25"`) this is benign, but any reward amount that cannot be exactly represented in binary float (e.g. `"0.10"`, `"0.30"`) will accumulate rounding error into every ad-view earning record.  
**Impact:** Systematic sub-paisa drift in every ad-view earning. Not visible per-user but accumulates across millions of records.

---

### F-02 · `GET /api/stats` — unauthenticated endpoint with float math · MEDIUM
**Location:** `server/routes.ts`, `GET /api/stats`  
**Finding:** This endpoint is publicly accessible with no `requireSessionAuth` guard. It exposes aggregate platform data (total paid, total users, etc.) to anonymous callers. Additionally, it uses `parseFloat()` on DB aggregate results for the displayed figures — not stored, but inconsistent with the Decimal discipline applied everywhere else.  
**Impact:** Information disclosure of platform financials (total payout volume visible to anyone on the internet). Float display error in admin stats views.

---

### F-03 · Ad-view response leaks raw PKR string · MEDIUM
**Location:** `server/routes.ts` ~line 1577  
**Finding:** The `POST /api/ad-view` success response returns: `"Authentication Successful: 0.25 PKR credited"` — a raw PKR amount embedded in a user-visible string. The spec and DashboardCards invariant #1-A explicitly state that Rs. amounts must only appear in the payout/withdrawal context. This string trains users to think of their earnings in PKR rather than TX-Points.  
**Impact:** Spec violation; user confusion about the TX-Points vs. PKR distinction; potential friction at withdrawal time when users see a different (correct) PKR value after the conversion rate is applied.

---

### F-04 · `GET /api/rank/history` missing `requireSessionAuth` · MEDIUM
**Location:** `server/routes.ts`, `GET /api/rank/history`  
**Finding:** This route uses a manual `getThorxPrincipalId(req)` check instead of the standard `requireSessionAuth` middleware. Unlike `requireSessionAuth`, the manual check does not enforce session validity, refresh `lastActiveAt`, or check team-key suspension status. Any session that passes the raw session lookup (including stale/partially-invalidated sessions) will receive rank history data.  
**Impact:** Weaker session enforcement; suspended team members may still read rank history; inconsistency with every other authenticated route.

---

### F-05 · Referral earnings dashboard always shows Rs. 0.00 · HIGH
**Location:** `server/storage.ts`, `getDashboardStats()`, lines 2597–2603  
**Finding:** `getDashboardStats` computes `referralEarnings` by querying the `commission_logs` table (`commissionLogs.beneficiaryId`, `commissionLogs.status = "paid"`). Per the platform's own memory and audit history, **`commission_logs` is write-frozen** — the function that writes to it exists but is never called in the current codebase. Actual referral commissions flow into the `referral_commissions` table (written in `processWithdrawal`). The dashboard stat reads from the wrong table and always returns `"0.00"`.  
**Impact:** Every user's dashboard shows Rs. 0.00 for referral earnings regardless of actual commissions earned. Financial display bug affecting all users who have received referral commissions.

---

### F-06 · `bootstrapConfig` N+1 queries on cold start · LOW
**Location:** `server/storage.ts`, `bootstrapConfig()`  
**Finding:** Seeds 57 `system_config` entries via 57 sequential `getSystemConfig()` (read) + conditional `insert` calls. On cold start or re-import, this executes up to 114 sequential DB round-trips synchronously on the hot path before the server can serve requests.  
**Impact:** Cold-start latency spike of several seconds; degrades perceived reliability on every re-deploy.

---

### F-07 · PayoutControl.tsx admin display uses `parseFloat()` arithmetic · LOW
**Location:** `client/src/components/admin/PayoutControl.tsx`, lines 592–594  
**Finding:**
```js
const gross = parseFloat(selectedWithdrawal.netAmount || "0") + parseFloat(selectedWithdrawal.fee || "0");
const fee   = parseFloat(selectedWithdrawal.fee || "0");
const net   = parseFloat(selectedWithdrawal.netAmount || "0");
```
The breakdown panel shown to an admin before approving a payout uses native float arithmetic to compute the displayed "Real PKR (ledger)" value. If `netAmount` and `fee` together cannot be exactly represented in binary float, the displayed gross will not match the stored ledger value.  
**Impact:** Admin may approve a withdrawal seeing a slightly different number from the one actually processed; creates audit-trail confusion.

---

### F-08 · UserManager.tsx admin table uses `parseFloat()` on financial fields · LOW
**Location:** `client/src/components/admin/UserManager.tsx`, lines 451, 454  
**Finding:** `parseFloat(user.availableBalance).toLocaleString()` and `parseFloat(user.totalEarnings).toLocaleString()` used in the admin user table display.  
**Impact:** Same float display drift; minor but inconsistent with the Decimal discipline applied server-side.

---

### F-09 · `checkAndUpdateRank` dynamic import of `broadcastUserUpdated` inside a transaction · LOW
**Location:** `server/storage.ts`, `checkAndUpdateRank()`, ~line 2524  
**Finding:** Inside an open `db.transaction()` context, after updating the user row, the code does `await import("./realtime")` and calls `broadcastUserUpdated(...)`. If the dynamic import throws or the broadcast call takes time, it holds the transaction open longer than necessary. More critically, if the transaction subsequently rolls back (e.g. due to the caller's outer transaction failing), the WebSocket broadcast will have already fired — notifying the client of a rank change that was never committed.  
**Impact:** Phantom rank-change notifications on transaction rollback; inflated perceived responsiveness that doesn't match DB state.

---

### F-10 · Hardcoded `AD_INVENTORY` — not runtime-configurable · LOW
**Location:** `server/routes.ts`, `AD_INVENTORY` object near the ad-view handler  
**Finding:** Ad reward amounts, durations, and names are hardcoded in the route handler rather than stored in `system_config`. Changing any ad reward requires a code deployment.  
**Impact:** Operational inflexibility; business cannot adjust ad economics without engineer involvement; violates the spirit of the `system_config` table which exists precisely for this purpose.

---

### F-11 · `POST /api/admin/weekly-tasks` missing Zod validation · MEDIUM
**Location:** `server/routes.ts`, `POST /api/admin/weekly-tasks`  
**Finding:** Route uses `requireTeamRole` (not `requirePermission`), has no Zod schema, and relies on manual field presence checks. `parseInt(pointReward)` without a prior numeric check will silently accept `NaN` and store it in the `pointReward` column. Any team member (not just those with `MANAGE_TASKS` or equivalent permission) can call this endpoint.  
**Impact:** Corrupt task reward values; privilege escalation for task management — any team member can create or modify weekly tasks regardless of their specific permissions.

---

### F-12 · `processWithdrawal` — `parseInt(withdrawal.amount, 10)` on a decimal-type column · LOW
**Location:** `server/storage.ts`, `processWithdrawal()`, line 2079  
**Finding:** `const pointsRequested = parseInt(withdrawal.amount, 10)` — `withdrawal.amount` is a string column that in practice stores an integer TX-Points count. `parseInt` silently truncates if the stored value ever contains a decimal separator (e.g. due to a migration, admin edit, or future schema change). No assertion or check validates that the parsed int equals the original string.  
**Impact:** Silent truncation of points requested; under-deduction from the user's TX-Points balance; financial integrity gap that is latent (not currently triggered) but fragile.

---

### F-13 · Engine-A player routes use `requireTeamRole` instead of granular permission · LOW
**Location:** `server/routes.ts`, `GET/POST/PATCH/DELETE /api/admin/engine-a/players`  
**Finding:** All ad-player CRUD routes are guarded by `requireTeamRole` — meaning any team or admin account can add, modify, or delete ad network players. This directly affects the PKR→TX-Points ratio applied to every ad view.  
**Impact:** Any compromised team account can silently alter ad economics; should be restricted to a specific permission (e.g. `MANAGE_ENGINE_CONFIG`).

---

### F-14 · `getDashboardStats` — `dailyGoal` hardcoded to 20 · LOW
**Location:** `server/storage.ts`, `getDashboardStats()`, line 2615  
**Finding:** `const dailyGoal = 20;` — the daily ad goal used to compute `dailyGoalProgress` is a magic number rather than reading from `system_config` (where `MAX_ADS_PER_DAY` or equivalent is stored).  
**Impact:** If the config value is updated by an admin, the progress bar on every user's dashboard will still calculate against 20 — misleading users about their daily completion status.

---

### F-15 · `getAllUsers(limit=500)` — monolithic fetch, not paginated · LOW
**Location:** `server/storage.ts`, `getAllUsers()`  
**Finding:** Default cap of 500 users loaded in one query. No cursor-based or page/offset pagination exposed. Called in analytics and leaderboard refresh paths. At 10K+ users, this becomes a multi-MB memory allocation on every call.  
**Impact:** Memory spike in the Node.js process on every leaderboard refresh; eventual OOM risk at scale.

---

## CATEGORY 2 — Enterprise Standards Gaps

### E-01 · Device fingerprint is client-supplied and trivially bypassed · HIGH
**Location:** `server/routes.ts`, `POST /api/register` and `POST /api/login`  
**Finding:** The device fingerprint used for the "max 1 account per device" rule is read from `req.body.deviceFingerprint`. A user creating a second account simply omits this field or sends a random UUID — the check passes because `if (deviceFingerprint && ...)` gates on truthiness. The check provides false assurance.  
**Impact:** Multi-account abuse prevention is ineffective against any user aware of the mechanism.

---

### E-02 · `DELETE /api/admin/users/:id` — semantic mismatch: "deactivated" vs. "deleted" · LOW
**Location:** `server/routes.ts`, ~line 2461  
**Finding:** The response body says `"User account deactivated successfully"` but the audit log writes `action: "USER_DELETED"` and the storage function is `deleteUser`. The endpoint's behavior (soft-delete vs. hard-delete) is ambiguous, and the response message is misleading.  
**Impact:** Admin confusion; audit-trail message inconsistency; potential compliance issue if the operation is actually a hard delete.

---

### E-03 · Bulk export loads up to 10,000 rows into memory · MEDIUM
**Location:** `server/routes.ts`, `GET /api/admin/withdrawals/export` and `GET /api/admin/users/export`  
**Finding:** Both export endpoints call `getUsersPaginated({ limit: 10000 })` / `getWithdrawalsPaginated({ limit: 10000 })`, serialize all rows to a CSV string in memory, then send the entire string. No streaming.  
**Impact:** At large user counts, a single export request can spike Node.js memory by hundreds of megabytes; concurrent export requests can cause OOM.

---

### E-04 · Password reset is a dead stub returning success · HIGH (UX + Trust)
**Location:** `server/routes.ts`, `POST /api/forgot-password` (line 2926) and `POST /api/reset-password` (line 2938)  
**Finding:** `POST /api/forgot-password` immediately returns `{ success: true, message: "If an account exists..." }` with no email sent and no token generated. `POST /api/reset-password` returns HTTP 410 Gone. Users who attempt a password reset believe an email was sent, wait indefinitely, and have no path to account recovery.  
**Impact:** User lockout with no recovery path; significant trust erosion; support burden.

---

### E-05 · `PATCH /api/admin/withdrawals/:id` — no Zod on `status` field · MEDIUM
**Location:** `server/routes.ts`, ~line 2469  
**Finding:** `const { status, transactionId, rejectionReason } = req.body;` — `status` is passed directly to `storage.updateWithdrawalStatus()` without validation. An admin (or compromised token) can send `status: "pending"` to un-pend a completed withdrawal, or send arbitrary strings. The underlying `updateWithdrawalStatus` function does validate internally, but the route-level defense is absent.  
**Impact:** Malformed admin requests may produce unexpected DB states or trigger unhandled code paths in the storage layer.

---

### E-06 · Founder-only routes use `requireTeamRole` + manual role check — not RBAC · LOW
**Location:** `server/routes.ts`, `GET /api/admin/profit-ledger`, `GET /api/admin/founder/profit-summary`, `POST /api/admin/founder/withdrawals`  
**Finding:** These routes use `requireTeamRole` as middleware, then manually check `req.userProfile!.role !== 'founder'` inside the handler. This pattern bypasses the `requirePermission` RBAC system, creating inconsistent access-control logic and making it harder to audit which roles have access to which capabilities.  
**Impact:** Any future addition of a new privileged role would require auditing all manual role checks, not just the permission middleware.

---

### E-07 · Registration dual-validation — manual check before Zod · LOW
**Location:** `server/routes.ts`, `POST /api/register`, ~line 2795–2812  
**Finding:** Manual `if (!firstName || !email || !identity || !password)` check fires before `registerSchema.safeParse(...)`. The Zod schema is the authoritative validator, but the manual check can reject valid inputs if Zod's schema ever relaxes a field. Previously caused production bugs (noted in memory).  
**Impact:** Maintenance trap; duplicate validation logic that can diverge.

---

### E-08 · `/api/contact` — no per-email rate limit, only per-IP · LOW
**Location:** `server/routes.ts`, `POST /api/contact`  
**Finding:** `contactRateLimiter` limits by IP only. From a proxy or rotating IP pool, the same email address can flood the team inbox without restriction.  
**Impact:** Contact-form spam; inbox flooding; storage growth in the `team_emails` table.

---

### E-09 · Dashboard earnings queries use server-local timezone · LOW
**Location:** `server/storage.ts`, `getDashboardStats()`, lines 2552–2564  
**Finding:** `today.setHours(0, 0, 0, 0)` uses the Node.js process timezone (UTC in production) to define "today". Users in Pakistan Standard Time (UTC+5) will see "today's earnings" cut off 5 hours into their local day, and the new day's bucket starts 5 hours before midnight local time.  
**Impact:** Dashboard daily earnings figure is incorrect for all users in non-UTC timezones; the PKT-standard platform's primary metric is timezone-misaligned.

---

## CATEGORY 3 — UX / Ecosystem Disconnects

### U-01 · Forgot-password flow silently does nothing · CRITICAL UX
**Location:** `POST /api/forgot-password`  
**Finding:** As noted in E-04, the endpoint returns success immediately. The frontend almost certainly shows "Check your email" messaging. Users believe a reset email is coming. This is a silent failure with no fallback.  
**User Impact:** Users locked out of their accounts have no path to recovery. This is the highest-impact UX failure in the platform.

---

### U-02 · Referral earnings always shows Rs. 0.00 on dashboard · HIGH UX
**Location:** Dashboard, `getDashboardStats` → `commissionLogs`  
**Finding:** As documented in F-05, the referral earnings metric reads from the deprecated `commission_logs` table. Every user who has earned referral commissions sees Rs. 0.00 on their dashboard stats card.  
**User Impact:** Users who have successfully referred others and generated commission income see incorrect financial data. Likely causes support tickets and loss of trust in the platform's financial reporting.

---

### U-03 · Admin payout breakdown display may show subtly wrong amounts · LOW UX
**Location:** `PayoutControl.tsx`, lines 592–599  
**Finding:** As noted in F-07, the admin approval UI recomputes `gross = net + fee` using `parseFloat`. The displayed "Real PKR (ledger)" value may differ by sub-paisa from the stored ledger value.  
**User Impact:** Admin confusion if they compare the displayed value to an external ledger; potential approval of wrong amounts if admins rely on the displayed gross figure.

---

### U-04 · Daily progress bar hardcoded against 20 ads, ignoring config · MEDIUM UX
**Location:** `getDashboardStats`, line 2615  
**Finding:** `dailyGoalProgress` computes against `dailyGoal = 20`. If `MAX_ADS_PER_DAY` in system_config differs, users see a progress bar that hits 100% at a different count from what the system enforces.  
**User Impact:** Users reach the system's actual ad cap before the progress bar shows completion, or the bar shows 100% while the system still allows more ads. Either case is confusing.

---

### U-05 · `POST /api/reset-password` returns raw technical error (410 Gone) · LOW UX
**Location:** `server/routes.ts`, line 2939  
**Finding:** `res.status(410).json({ message: "Self-service password reset is not available. Please contact support.", error: "NOT_AVAILABLE" })`. HTTP 410 is a developer-facing status code. If any UI reaches this endpoint, the user sees a generic error state rather than actionable guidance.  
**User Impact:** Confusing error experience; "NOT_AVAILABLE" is a developer error code not appropriate for end users.

---

### U-06 · Ad-view response exposes internal PKR value in success message · MEDIUM UX
**Location:** `server/routes.ts` ~line 1577  
**Finding:** As noted in F-03, the success message `"Authentication Successful: 0.25 PKR credited"` uses the word "Authentication" (confusing in an ad-view context) and leaks a raw PKR amount. Users should see TX-Points credited, not PKR.  
**User Impact:** Terminology confusion (authentication ≠ ad view); contradicts the platform's TX-Points abstraction layer; may lead users to calculate expected withdrawal amounts incorrectly.

---

### U-07 · Guild `isPublic` flag not surfaced to guild creators in the UI · LOW UX
**Location:** `server/storage.ts`, `listGuilds()`, line 2236  
**Finding:** `listGuilds` filters to `isPublic = true` guilds only. However, there is no clear indicator in the guild creation flow or guild management UI (visible in CaptainPortal) that confirms whether a guild is discoverable. Guild creators who set `isPublic = false` (or who receive a default value) have no visible confirmation of their guild's discoverability status.  
**User Impact:** Guild captains may be unaware their guild is hidden from discovery, leading to confusion about why no join requests arrive.

---

## Summary Table

| ID | Category | Severity | Finding |
|----|----------|----------|---------|
| F-01 | Financial | HIGH | `parseFloat()` at ad-view earn boundary |
| F-02 | Financial | MEDIUM | `GET /api/stats` unauthenticated + float math |
| F-03 | Financial | MEDIUM | Ad-view response leaks "X PKR credited" string |
| F-04 | Security | MEDIUM | `GET /api/rank/history` missing `requireSessionAuth` |
| F-05 | Financial | HIGH | Dashboard referral earnings reads deprecated `commissionLogs` → always $0 |
| F-06 | Performance | LOW | `bootstrapConfig` N+1 cold-start queries |
| F-07 | Financial | LOW | PayoutControl.tsx `parseFloat()` breakdown display math |
| F-08 | Financial | LOW | UserManager.tsx `parseFloat()` on financial fields |
| F-09 | Integrity | LOW | `checkAndUpdateRank` broadcasts inside transaction — phantom notifications on rollback |
| F-10 | Operations | LOW | AD_INVENTORY hardcoded — not runtime-configurable |
| F-11 | Security | MEDIUM | `POST /api/admin/weekly-tasks` — no Zod, `requireTeamRole` not `requirePermission` |
| F-12 | Financial | LOW | `processWithdrawal` `parseInt(amount)` silently truncates decimals |
| F-13 | Security | LOW | Engine-A player routes use `requireTeamRole` — any team member can alter ad economics |
| F-14 | UX | LOW | `dailyGoal = 20` hardcoded in `getDashboardStats` |
| F-15 | Performance | LOW | `getAllUsers(limit=500)` — monolithic, no pagination |
| E-01 | Security | HIGH | Device fingerprint is client-supplied — trivially bypassed |
| E-02 | Compliance | LOW | DELETE users endpoint: "deactivated" vs. "USER_DELETED" semantic mismatch |
| E-03 | Performance | MEDIUM | Bulk exports load 10K rows into memory — no streaming |
| E-04 | Product | HIGH | Password reset is a dead stub — always returns success, sends no email |
| E-05 | Security | MEDIUM | `PATCH /api/admin/withdrawals/:id` — no Zod on `status` field |
| E-06 | Security | LOW | Founder routes: `requireTeamRole` + manual role check bypasses RBAC |
| E-07 | Code Quality | LOW | Registration dual-validation — manual check before Zod |
| E-08 | Security | LOW | Contact form: per-IP rate limit only, no per-email limit |
| E-09 | Data | LOW | Dashboard earnings queries use server-local timezone (UTC), not PKT |
| U-01 | UX | CRITICAL | Forgot-password flow silently does nothing — users believe email was sent |
| U-02 | UX | HIGH | Referral earnings always shows Rs. 0.00 (reads deprecated table) |
| U-03 | UX | LOW | Admin payout display shows float-rounded amounts |
| U-04 | UX | MEDIUM | Daily progress bar hardcoded at 20 ads, ignores system_config |
| U-05 | UX | LOW | `/api/reset-password` returns technical 410 error to user |
| U-06 | UX | MEDIUM | Ad-view success message: "Authentication Successful" + raw PKR leak |
| U-07 | UX | LOW | Guild `isPublic` status not surfaced to captains in management UI |

---

## What Is Working Correctly (Positive Findings)

- **`processWithdrawal`** — FOR UPDATE row lock, full Decimal arithmetic, commission routing to `referral_commissions`, audit log, activity feed, post-transaction notification. Correctly wired from both `PATCH` endpoint and bulk approval.
- **`recordEarnEvent`** — Decimal throughout, transaction-wrapped, idempotent via unique index.
- **`createWithdrawal`** — Pending-state check inside transaction, DB-level unique index backup.
- **`adjustUserBalance`** — Decimal, audit-logged, permission-gated with `MANAGE_USERS`.
- **Session handling** — Session regeneration on login/register (fixation prevention), `requireSessionAuth` properly enforces team-key suspension.
- **Rate limiting** — All critical endpoints have appropriate rate limiters; bootstrap endpoint now has `bootstrapRateLimiter`.
- **Schema constraints** — `onDelete: "restrict"` on all financial FK tables; DB-level CHECK constraints on balances; `txPointsBalance` floor enforced.
- **PS/rank engine** — Idempotent, Decimal-safe, correct inactivity penalty floor.
- **Risk engine** — `upsertRiskCase` triggers correctly post-admin-credit.
- **CSRF** — Applied on all `/api/*` routes via Helmet.
- **Zod** — Used correctly on all high-sensitivity routes (guild settings, contact form, balance adjust, bulk withdrawal, bootstrap, founder withdrawal).

---

*End of Audit Report*
