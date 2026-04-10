# THORX Production Go/No-Go

## Pre-release
- `npm run check` passes.
- `npm run build` passes.
- Core migration/parity scripts succeed for source and target.
- Domain routes are verified:
  - `https://thorx.pro`
  - `https://api.thorx.pro/api/user` (must not return frontend HTML)

## Functional Smoke
- Auth: login, logout, session persistence.
- User: dashboard loads, referral summary loads, withdrawal flow responds.
- Admin: team portal access, payouts list, action endpoint success.
- Storage: bucket access path validated.

## Security/Hardening
- Strong `SESSION_SECRET` in production.
- Cookie policy explicit (`secure=true`, `sameSite=none` for cross-site).
- CORS origins restricted to production domains.
- `/api/proxy` host restrictions configured with `PROXY_ALLOWED_HOSTS`.

## Rollback
- Previous stable deployment URL retained.
- Previous environment snapshot retained.
- Rollback smoke checks documented and executable.
