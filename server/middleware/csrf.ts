import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { runtimeConfig } from "../config/runtime";

/**
 * Double-Submit Cookie CSRF protection.
 *
 * On safe methods (GET/HEAD/OPTIONS) a random token is set as a non-httpOnly
 * cookie so the SPA can read it and attach it as an `x-csrf-token` header on
 * every state-changing request.
 *
 * On unsafe methods (POST/PUT/PATCH/DELETE) the middleware verifies that the
 * header value matches the cookie value. Because a cross-origin attacker
 * cannot read cookies from `.thorx.pro`, they cannot forge the header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

  // Mirror the session cookie's SameSite/Secure policy so the CSRF
  // double-submit cookie round-trips in the same contexts the session
  // cookie does (see runtimeConfig for why Replit needs SameSite=None).
  const secure = runtimeConfig.sessionCookieSecure;
  const sameSite = runtimeConfig.sessionCookieSameSite;

  if (SAFE_METHODS.includes(req.method)) {
    // Always (re)issue the cookie on safe methods rather than only when
    // missing. A browser that already cached a cookie from before a
    // SameSite/Secure policy change would otherwise keep the stale
    // attributes forever, since the server has no way to inspect the
    // attributes of a cookie it receives back — only its value.
    const token = req.cookies?.["thorx.csrf.v2"] || crypto.randomBytes(32).toString("hex");
    res.cookie("thorx.csrf.v2", token, {
      httpOnly: false, // JS must read it to set the header
      secure,
      sameSite,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week (matches session TTL)
      // CHIPS: exempt this cookie from third-party-cookie blocking inside
      // Replit's cross-site preview iframe (see session cookie config for
      // the full explanation). Only valid alongside SameSite=None.
      ...(sameSite === "none" ? { partitioned: true } : {}),
    });
    return next();
  }

  // Skip CSRF for Bearer-authenticated requests (API tokens are already CSRF-proof)
  const authz = req.headers.authorization;
  if (authz?.startsWith("Bearer ") && !authz.startsWith("Bearer anon_")) {
    return next();
  }

  const cookieToken = req.cookies?.["thorx.csrf.v2"];
  const headerToken = req.headers["x-csrf-token"] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "CSRF validation failed", error: "CSRF_ERROR" });
  }

  next();
}
