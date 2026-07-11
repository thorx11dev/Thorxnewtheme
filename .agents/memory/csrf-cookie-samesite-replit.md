---
name: csrf-cookie-samesite-replit
description: Why login/registration failed with CSRF_ERROR in Replit preview, and the double-submit cookie caveat that caused the fix to not take effect immediately.
---

Replit's preview pane embeds the app in a cross-site iframe (top-level document is a different site than the app's own domain). Browsers refuse to send `SameSite=Lax`/`Strict` cookies on subresource (fetch/XHR) requests in that context — only on top-level navigation. Any session/CSRF double-submit cookie set with `SameSite=Lax` will get set once but never sent back, breaking auth/CSRF silently inside the Replit preview (works fine in a normal top-level browser tab).

**Fix:** use `SameSite=None; Secure` for cookies that must round-trip through the preview iframe. Replit's proxy always terminates HTTPS, so `Secure` is safe even in dev.

**Critical gotcha:** if a CSRF/double-submit cookie middleware only issues the cookie when `!req.cookies[name]` (i.e. "set once, skip if already present"), a browser that already cached the *old* cookie (issued before the SameSite/Secure fix) will keep that stale cookie forever — the server has no way to inspect a stored cookie's attributes, only its value, so it thinks the client is already fine. Bumping env vars alone is not enough.

**How to apply:** when changing SameSite/Secure/attributes on an existing cookie, either (a) always reissue the cookie on every safe request regardless of whether one already exists, or (b) rename the cookie (version-bump the name, e.g. `foo.v2`) to force every client to pick up a fresh cookie with corrected attributes. Also check for explicit env vars (e.g. `SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE`) that may override code-level defaults — check `viewEnvVars` before assuming a code fix alone will take effect.
