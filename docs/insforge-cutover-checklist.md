# THORX Insforge Cutover Checklist

## Pre-cutover
- Confirm `npm run check` is green on release branch.
- Set production env values:
  - `VITE_API_URL=https://api.insforge.dev`
  - `VITE_AUTH_PROVIDER=insforge`
  - `FRONTEND_ORIGINS=https://app.insforge.dev,https://insforge.dev`
  - `SESSION_SECRET` strong random value
  - `SESSION_COOKIE_SECURE=true`
  - `SESSION_COOKIE_SAME_SITE=none`
- Dry-run core migration:
  - `node scripts/insforge/migrate-core-data.js`
  - `node scripts/insforge/parity-check.js`

## Canary
- Route a small percentage of traffic to `api.insforge.dev`.
- Verify:
  - register/login/logout
  - session persistence after refresh
  - payout request and admin approval path
  - profile media read/write
- Monitor:
  - 401/403 rates
  - payout failures
  - latency and 5xx

## Full cutover
- Switch all frontend production API traffic to `api.insforge.dev`.
- Keep rollback variables ready for at least 7 days.

## Rollback
- Revert `VITE_API_URL` to previous backend.
- Revert `VITE_AUTH_PROVIDER` if required.
- Restore previous traffic target.
- Keep data migration logs for reconciliation.
