---
name: Audit Fix Plan Complete
description: All 14 audit findings implemented; key patterns and gotchas for future financial / guild changes.
---

## Status
All 14 tasks completed 2026-07-16 — TypeScript compiles clean, server restarts without errors.

## Key Patterns Established

### Decimal-through-SQL boundary (Task 4)
- `thorxProfitPkrD` and `guildPoolPkrD` stay as `Decimal` objects all the way to `.toFixed(4)` in SQL params.
- Only `userPkrShare` is converted with `.toNumber()` because `drawThorxCard()` needs a JS number.
- **Why:** `.toNumber()` on a Decimal before SQL write causes IEEE 754 float drift in `NUMERIC` columns.
- **Watch for:** any new `parseFloat(...)` or `Math.abs(parseFloat(...))` on financial strings — replace with `new Decimal(x).abs().toFixed(4)`.

### TOCTOU lock in createWithdrawal (Task 5)
- All pre-flight checks (balance, minimum payout, S-Rank tier) now run INSIDE `db.transaction()` after a `SELECT ... FOR UPDATE` on the user row.
- **Why:** two concurrent requests both passing the balance check before either INSERT commits was the race vector.
- Pattern already used elsewhere in storage.ts at lines 2052, 2160, 2433, 3736 — keep consistent.

### createAdView atomicity (Task 3)
- `db.transaction(tx => { insert adView; recordEarnEvent(..., tx) })` replaces the old insert-then-manual-delete-on-error.
- `recordEarnEvent` accepts optional `tx` param — always pass it when calling inside a transaction.

### Rate limiter conventions (Task 6)
- `contactRateLimiter`: 5 req / 15 min by IP — for public-facing contact/feedback forms.
- `chatbotRateLimiter`: 20 req / min by IP — for the AI chatbot endpoint.
- Both exported from `server/middleware/auth-rate-limit.ts`; imported in `routes.ts` alongside other limiters.

### getAllUsers pagination (Task 12)
- Signature: `getAllUsers(limit = 500, offset = 0): Promise<User[]>`
- `passwordHash`, `verificationToken`, `verificationTokenExpiresAt` are NOT selected.
- IStorage interface uses optional params so MemStorage stub compiles without change.

### WS event handlers added to useRealtimeSync (Tasks 8, 13)
- `guild.announcement_posted` → invalidate guild queries + show toast.
- `engine_c:message` → invalidate guild chat cache.
- `guild.gps_updated` → invalidate guild query.

### Server pino logger (Task 14)
- `server/lib/logger.ts` exports `logger` (pino instance, dev=pino-pretty, prod=JSON).
- Redacts `passwordHash`, `password`, `verificationToken`, `sessionId`, cookie/auth headers.
- Import as `import { logger } from './lib/logger'` in any server file needing structured logging.

## Gotcha: IStorage interface must match implementation
- When changing `getAllUsers` signature, update BOTH `IStorage` (line ~237) AND `MemStorage` stub (line ~5132).
- The return type was kept as `Promise<User[]>` (not Omit) to satisfy the interface — sensitive columns are simply not selected in the SQL query, so the returned objects lack those fields at runtime.
