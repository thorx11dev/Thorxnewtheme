// THORX v3 — Rank/guild-role gating middleware (Part E.5 of the v3 spec).
// Must run AFTER requireSessionAuth (relies on req.userProfile being set).

import type { Request, Response, NextFunction } from "express";

const RANK_ORDER: Record<string, number> = {
  "E-Rank": 0,
  "D-Rank": 1,
  "C-Rank": 2,
  "B-Rank": 3,
  "A-Rank": 4,
  "S-Rank": 5,
};

const GUILD_ROLE_ORDER: Record<string, number> = {
  simple: 0,
  member: 1,
  captain: 2,
};

/** Blocks access unless req.userProfile.userRankTier >= minRank (e.g. Engine B requires C-Rank). */
export function requireMinRank(minRank: keyof typeof RANK_ORDER) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userProfile = (req as any).userProfile;
    if (!userProfile) {
      return res.status(401).json({ message: "Authentication required", error: "UNAUTHORIZED" });
    }
    const userTier: string = userProfile.userRankTier || "E-Rank";
    if ((RANK_ORDER[userTier] ?? 0) < (RANK_ORDER[minRank] ?? 0)) {
      return res.status(403).json({
        message: `This feature requires ${minRank} or higher. Your current rank is ${userTier}.`,
        error: "RANK_LOCKED",
        requiredRank: minRank,
        currentRank: userTier,
      });
    }
    next();
  };
}

/** Blocks access unless req.userProfile.guildRole >= minRole (e.g. captain-only actions). */
export function requireGuildRole(minRole: keyof typeof GUILD_ROLE_ORDER) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userProfile = (req as any).userProfile;
    if (!userProfile) {
      return res.status(401).json({ message: "Authentication required", error: "UNAUTHORIZED" });
    }
    const userRole: string = userProfile.guildRole || "simple";
    if ((GUILD_ROLE_ORDER[userRole] ?? 0) < (GUILD_ROLE_ORDER[minRole] ?? 0)) {
      return res.status(403).json({
        message: `This action requires guild role '${minRole}' or higher.`,
        error: "GUILD_ROLE_INSUFFICIENT",
        requiredRole: minRole,
        currentRole: userRole,
      });
    }
    next();
  };
}
