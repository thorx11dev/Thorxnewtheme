import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

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

  if (SAFE_METHODS.includes(req.method)) {
    if (!req.cookies?.["thorx.csrf"]) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie("thorx.csrf", token, {
        httpOnly: false, // JS must read it to set the header
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week (matches session TTL)
      });
    }
    return next();
  }

  // Skip CSRF for Bearer-authenticated requests (API tokens are already CSRF-proof)
  const authz = req.headers.authorization;
  if (authz?.startsWith("Bearer ") && !authz.startsWith("Bearer anon_")) {
    return next();
  }

  const cookieToken = req.cookies?.["thorx.csrf"];
  const headerToken = req.headers["x-csrf-token"] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "CSRF validation failed", error: "CSRF_ERROR" });
  }

  next();
}
