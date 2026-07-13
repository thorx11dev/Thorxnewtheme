---
name: Testing session auth locally
description: Why curl against 127.0.0.1/localhost appears to break login (session never persists) even though the app is fine.
---

## Symptom
`POST /api/login` (or `/api/register`) returns 200 with the correct user, but a
follow-up `GET /api/user` (or `/api/profile`) on the same cookie jar returns
401 / "Not authenticated", and the workflow log shows a **different**
`sessionID` on every single request even though a cookie jar was reused.

## Root cause
Not an app bug. THORX's session cookie is configured `secure: true` +
`sameSite: "none"` (required for Replit's cross-site preview iframe). Inside
`express-session`, the cookie-setting hook explicitly skips sending
`Set-Cookie` when `cookie.secure` is true but the request itself isn't secure
(`issecure(req, trustProxy)` is false) — see `shouldSetCookie`/`onHeaders` in
`express-session/index.js`. A direct `curl http://127.0.0.1:5000/...` or
`http://localhost:5000/...` is plain HTTP with no `X-Forwarded-Proto` header,
so the session cookie (`thorx.sid`) is silently never issued — only the
non-secure-adjacent CSRF cookie (`thorx.csrf.v2`) round-trips.

**How to apply:** always test authenticated flows (login/register/logout,
anything needing `req.session`) against the real HTTPS dev URL
(`https://$REPLIT_DEV_DOMAIN/...`), not `127.0.0.1`/`localhost`. Over the real
domain, Replit's proxy sets `X-Forwarded-Proto: https` and `trust proxy` is
already set to `1` in `server/index.ts`, so `req.secure` resolves true and the
cookie round-trips exactly like it will for real browser users.
