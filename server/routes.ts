import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import Decimal from "decimal.js";
import crypto from "crypto";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage, RANK_NAMES } from "./storage";
import { pool, db } from "./db";
import { initRealtime, broadcastUserUpdated, broadcastTeamRefresh, broadcastGuildMessage, broadcastGuildEvent, broadcastToUser } from "./realtime";
import { insertRegistrationSchema, insertUserSchema, insertWithdrawalSchema, users, teamKeys, insertDailyTaskSchema, insertTaskRecordSchema, taskRecords, adViews, dailyTasks, systemConfig, weeklyTasks, auditLogs, insertHilltopAdsConfigSchema, insertHilltopAdsZoneSchema } from "@shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { z } from "zod";
import { validateEmailServer, validatePhoneServer, normalizePhoneNumber } from "./validation";
import { hilltopAdsService } from "./hilltopads-service";
import { runtimeConfig } from "./config/runtime";
import { handleProxyRequest } from "./modules/proxy/proxy-handler";
import { processProfilePicture } from "./utils/local-profile-picture";
import { authRateLimiter, withdrawalRateLimiter, profileRateLimiter, earnRateLimiter, guildInteractionRateLimiter, contactRateLimiter, chatbotRateLimiter } from "./middleware/auth-rate-limit";
import { sanitizeUser } from "./utils/sanitize-user";
import { debugLog } from "./utils/debug-log";
import { simulateThorxCards } from "./modules/thorx-card";
import { runWeeklyGuildReset } from "./modules/guild-reset";
import { logger } from "./lib/logger";

/** Authenticated user id from session cookie. */
export function getThorxPrincipalId(req: Request): string | undefined {
  return req.session?.userId;
}

// Extend session data type
declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role?: string;
    };
    anonymousUserData?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      identity: string;
      profilePicture?: string;
      name?: string;
      avatar?: string;
      phone: string;
      referralCode: string;
      totalEarnings: string;
      availableBalance: string;
      isActive: boolean;
      createdAt: string;
    };
  }
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userProfile?: any;
      anonymousUser?: any;
    }
  }
}

// Simple session-based authentication middleware
export const requireSessionAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const principalId = getThorxPrincipalId(req);
    if (!principalId) {
      return res.status(401).json({
        message: "Authentication required",
        error: "UNAUTHORIZED"
      });
    }

    // Get user profile from database
    const userProfile = await storage.getUserById(principalId);
    if (!userProfile) {
      return res.status(404).json({
        message: "User profile not found",
        error: "USER_NOT_FOUND"
      });
    }

    // Attach granular permissions and enforce key status if they exist
    if (['team', 'admin', 'founder'].includes(userProfile.role || '')) {
      const keys = await storage.getTeamKeysByUser(userProfile.id);
      if (keys && keys.length > 0) {
        const activeKey = keys[0];
        
        if (!activeKey.isActive && userProfile.role !== 'founder') {
          // Hard Lockout: If the key is suspended, destroy their session entirely.
          return new Promise<void>((resolve) => {
            req.session.destroy((err) => {
              if (err) console.error("Error destroying session:", err);
              res.status(401).json({
                message: "Account suspended: Your cryptographic key has been revoked.",
                error: "UNAUTHORIZED"
              });
              resolve();
            });
          });
        } else {
          (userProfile as any).permissions = activeKey.permissions || [];
        }
      } else if (userProfile.role !== 'founder') {
        // Fallback: If someone is marked as team/admin but has no key, revert to user
        userProfile.role = 'user';
        (userProfile as any).permissions = [];
      } else {
        (userProfile as any).permissions = [];
      }
    }

    // Attach user profile to request
    req.userProfile = userProfile;

    // THORX v3 (spec E.10): keep lastActiveAt fresh on every authenticated
    // request (used by inactivity penalties, captain-activity alerts, health
    // engine). Fire-and-forget — must never block or fail the request.
    setImmediate(() => {
      db.update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, userProfile.id))
        .catch((err) => console.error("[lastActiveAt] update failed:", err));
    });

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      message: "Authentication failed",
      error: "UNAUTHORIZED"
    });
  }
};

// Team role enforcement middleware
export const requireTeamRole = async (req: Request, res: Response, next: NextFunction) => {
  await requireSessionAuth(req, res, () => {
    // Check if user has team, founder, or admin role
    const allowedRoles = ['team', 'founder', 'admin'];
    if (!allowedRoles.includes(req.userProfile?.role || '')) {
      return res.status(403).json({
        message: "Access denied. Team authority required.",
        error: "FORBIDDEN"
      });
    }
    next();
  });
};

// Granular Permission Enforcement Middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireSessionAuth(req, res, () => {
      const userPermissions = req.userProfile?.permissions || [];
      const userRole = req.userProfile?.role;

      // 'founder' and 'admin' roles have all permissions by default
      if (userRole === 'founder' || userRole === 'admin') {
        return next();
      }

      // 'team' role needs specific permissions or section-level mapping
      if (userRole === 'team') {
        const sectionMap: Record<string, string[]> = {
          'MANAGE_PAYOUTS': ['payouts'],
          'VIEW_PAYOUTS': ['payouts'],
          'VIEW_USERS': ['users'],
          'MANAGE_USERS': ['users'],
          'MANAGE_SYSTEM': ['dashboard'],
          'VIEW_STATS': ['dashboard'],
          'VIEW_ANALYTICS': ['dashboard'],
          'VIEW_AUDIT_LOGS': ['audit'],
          'VIEW_COMMUNICATIONS': ['inbox'],
          'MANAGE_COMMUNICATIONS': ['inbox'],
          'MANAGE_TEAM': ['team'],
        };

        const allowedSections = sectionMap[permission] || [];
        const hasSectionAccess = allowedSections.some(section => userPermissions.includes(section));

        if (userPermissions.includes(permission) || hasSectionAccess) {
          return next();
        }
      }

      return res.status(403).json({
        message: `Missing required permission: ${permission}`,
        error: "INSUFFICIENT_PERMISSIONS"
      });
    });
  };
};


// Registration/Login schemas for validation
const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  // Last name is optional — single-word names must not be cloned into it.
  lastName: z.string().optional().default(""),
  identity: z.string().min(1, "Identity is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128)
    .refine(
      (pwd) => pwd.length < 8 || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd),
      "For passwords of 8+ characters, include at least one uppercase letter, one lowercase letter, and one number.",
    ),
  referralCode: z.string().optional(),
  // Public registration always creates a regular user.
  // Team / admin / founder roles are assigned via bootstrap or invitations only.
  role: z.enum(["user"]).default("user"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["team", "admin"]).default("team"),
  permissions: z.array(z.string()).default([])
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure the session table exists before connect-pg-simple tries to use it.
  // createTableIfMissing has a race condition on first boot; we pre-create it.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
  } catch (err) {
    console.error("Failed to pre-create session table (non-fatal):", err);
  }

  // Setup session management
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const isProd = runtimeConfig.isProd;

  // Detect if we're running in Replit environment
  const isReplit = process.env.REPL_ID !== undefined || process.env.REPLIT_DB_URL !== undefined;
  const sessionSecret = runtimeConfig.sessionSecret;
  if (!sessionSecret && isProd) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  const rawSameSite = runtimeConfig.sessionCookieSameSite;
  const sameSite = (rawSameSite === "none" || rawSameSite === "strict" || rawSameSite === "lax")
    ? rawSameSite
    : "lax";

  // Cross-site cookies require secure=true. Keep secure by default in production only.
  const cookieSecure = runtimeConfig.sessionCookieSecure || isProd;

  if (!isProd) {
    debugLog("Environment detection:", {
      NODE_ENV: process.env.NODE_ENV,
      REPL_ID: !!process.env.REPL_ID,
      REPLIT_DB_URL: !!process.env.REPLIT_DB_URL,
      isReplit,
    });
  }

  const sessionConfig = {
    store: new pgStore({
      pool: pool,
      createTableIfMissing: true,
      ttl: sessionTtl,
      pruneSessionInterval: 60 * 60,
    }),
    secret: sessionSecret || "thorx-secret-key-dev-only",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      maxAge: sessionTtl,
      sameSite: sameSite as "lax" | "strict" | "none",
      domain: runtimeConfig.sessionCookieDomain,
      path: '/',
      // CHIPS: browsers are phasing out third-party cookies even when
      // SameSite=None; Secure is set (Replit's preview embeds the app in a
      // cross-site iframe, making this a third-party cookie from the
      // browser's point of view). "Partitioned" cookies are exempt from
      // that blocking because they're scoped per top-level site, so they
      // still round-trip correctly inside the preview iframe.
      ...(sameSite === "none" ? { partitioned: true } : {}),
    },
    name: 'thorx.sid',
  };

  if (!isProd) {
    debugLog("Session cookie config:", sessionConfig.cookie);
  }

  app.set('trust proxy', 1);
  app.use(session(sessionConfig));

  
  // Custom session debugger middleware for development only.
  if (!isProd) {
    app.use((req, res, next) => {
      debugLog("Session Debug:", {
        path: req.path,
        sessionID: req.sessionID,
        userId: getThorxPrincipalId(req),
      });
      next();
    });
  }

  // Explicit health check endpoint for Railway
  // ── Public config endpoint — no auth required (Spec §17.6) ──────────────────
  // Returns only the display parameters the frontend needs for TX-Points conversion.
  // NEVER exposes per-engine ratios, PKR values, or business secrets.
  app.get("/api/config/public", async (_req, res) => {
    try {
      const [conversionRate, withdrawalFeePct] = await Promise.all([
        storage.getSystemConfigValue<number>("CONVERSION_RATE", 1000),
        storage.getSystemConfigValue<number>("WITHDRAWAL_FEE_PCT", 15),
      ]);
      res.json({ conversionRate, platformName: "THORX", withdrawalFeePct });
    } catch (error) {
      res.json({ conversionRate: 1000, platformName: "THORX", withdrawalFeePct: 15 });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // --- Team Invitation Endpoints ---

  app.post("/api/team/invitations", requirePermission("MANAGE_TEAM"), async (req, res) => {
    try {
      const result = inviteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid invitation data", error: result.error.format() });
      }

      const { email, role, permissions } = result.data;
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour TTL

      const invitation = await storage.createTeamInvitation({
        email,
        role,
        permissions,
        token,
        expiresAt,
        createdBy: getThorxPrincipalId(req) as string
      });

      // In a real app, send mail here. For now, return the token for manual testing.
      res.status(201).json({ 
        message: "Invitation generated", 
        invitationId: invitation.id,
        inviteUrl: `${req.protocol}://${req.get('host')}/auth?invite=${token}`
      });
    } catch (error) {
      console.error("Invite error:", error);
      res.status(500).json({ message: "Failed to generate invitation" });
    }
  });

  app.get("/api/team/invitations/verify/:token", async (req, res) => {
    try {
      const invitation = await storage.getTeamInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation invalid, expired, or already consumed" });
      }
      res.json({ email: invitation.email, role: invitation.role });
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // --- System Configuration Endpoints ---

  app.get("/api/admin/config", requirePermission("MANAGE_SYSTEM"), async (req, res) => {
    try {
      const configs = await storage.getAllSystemConfigs();
      res.json({ configs });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system configuration" });
    }
  });

  app.get("/api/admin/config/:key", requirePermission("MANAGE_SYSTEM"), async (req, res) => {
    try {
      const config = await storage.getSystemConfig(req.params.key);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  app.patch("/api/admin/config/:key", requirePermission("MANAGE_SYSTEM"), async (req, res) => {
    try {
      const { value } = req.body;
      const config = await storage.updateSystemConfig(req.params.key, value, getThorxPrincipalId(req) as string);
      
      // Audit log for critical system change
      await storage.createAuditLog({
        adminId: getThorxPrincipalId(req) as string,
        action: "UPDATE_SYSTEM_CONFIG",
        targetType: "system_config",
        targetId: req.params.key,
        details: { value },
        ipAddress: req.ip || "unknown"
      });

      res.json({ success: true, config });
    } catch (error) {
      res.status(500).json({ message: "Failed to update system configuration" });
    }
  });



  app.get("/api/admin/leaderboard/insights", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const insights = await storage.getLeaderboardInsights(limit, offset, search);
      res.json(insights);
    } catch (error: any) {
      console.error("Leaderboard insights error:", error?.message || error);
      res.status(500).json({ message: "Failed to fetch leaderboard insights" });
    }
  });

  // Cooldown guard: prevents admins from triggering repeated full-table scans
  // within a short window (audit finding S — potential memory bomb at scale).
  let lastLeaderboardSync = 0;
  app.post("/api/admin/leaderboard/force-sync", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    const now = Date.now();
    if (now - lastLeaderboardSync < 60_000) {
      return res.status(429).json({ message: "Leaderboard sync is on cooldown. Please wait 60 seconds between syncs.", error: "RATE_LIMITED" });
    }
    lastLeaderboardSync = now;
    try {
      await storage.refreshLeaderboardCache();
      const { runFullRiskScan } = await import("./modules/risk-engine");
      await runFullRiskScan({ broadcastAlerts: true });
      const insights = await storage.getLeaderboardInsights(50, 0);
      res.json(insights);
    } catch (error: any) {
      console.error("Force sync error:", error?.message || error);
      res.status(500).json({ message: "Failed to force sync matrix" });
    }
  });

  app.post("/api/admin/users/:id/action", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const { id } = req.params;
      const { action, payload } = req.body;

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (action === "suspend") {
        await storage.updateUser(id, { isActive: false } as any);
      } else if (action === "adjust_balance" && payload && payload.amount) {
        // Use Decimal arithmetic to avoid IEEE-754 float drift on ledger values.
        const amount = new Decimal(String(payload.amount));
        const currentBalance = new Decimal(user.availableBalance || "0");
        await storage.updateUser(id, { availableBalance: currentBalance.plus(amount).toFixed(4) } as any);
      } else {
        return res.status(400).json({ message: "Invalid action or missing payload" });
      }

      const updatedUser = await storage.getUserById(id);
      broadcastUserUpdated(id, `admin_action_${action}`);
      res.json(updatedUser ? sanitizeUser(updatedUser) : null);
    } catch (error) {
      console.error("User admin action error:", error);
      res.status(500).json({ message: "Failed to execute user action" });
    }
  });

  // Legacy user logout endpoint (session-based)
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({
          message: "Logout failed",
          error: "INTERNAL_ERROR"
        });
      }

      res.clearCookie("thorx.sid");
      res.json({
        success: true,
        message: "Logout successful"
      });
    });
  });

  // Get current user endpoint (no auth required)
  app.get("/api/user", async (req, res) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    try {
      // Comprehensive session logging
      debugLog("Session check: {",
        "sessionExists:", !!req.session,
        ", userId:", req.session?.userId || 'undefined',
        ", sessionId:", req.session?.id || 'undefined',
        ", cookieHeader:", !!req.headers.cookie,
        ", user:", req.session?.user ? `{id: ${req.session.user.id}, email: ${req.session.user.email}}` : 'undefined',
        "}");

      // Check if authenticated via anonymous token (iframe environment)
      if (req.anonymousUser) {
        debugLog("Returning anonymous token user:", req.anonymousUser.id);
        return res.json(req.anonymousUser);
      }

      // Check if it's an anonymous user via session (regular browser)
      if (getThorxPrincipalId(req) && getThorxPrincipalId(req)?.startsWith('anonymous_')) {
        debugLog("Returning anonymous session user:", getThorxPrincipalId(req));
        // Return the anonymous user data from session
        const anonymousUser = req.session.anonymousUserData || {
          id: getThorxPrincipalId(req),
          firstName: req.session.user!.firstName,
          lastName: req.session.user!.lastName,
          email: req.session.user!.email,
          identity: `GUEST_USER_${Math.floor(Math.random() * 9999) + 1000}`,
          phone: "",
          referralCode: `GUEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          totalEarnings: "0.00",
          availableBalance: "0.00",
          isActive: true,
          avatar: (req.session as any).anonymousUserData?.avatar || 'default',
          name: (req.session as any).anonymousUserData?.name || `${req.session.user!.firstName} ${req.session.user!.lastName || ""}`.trim(),
          createdAt: new Date().toISOString(),
        };

        return res.json(anonymousUser);
      }

      // Check if userId exists in session
      const principalId = getThorxPrincipalId(req);
      if (!principalId) {
        debugLog("No userId in session, returning 401");
        return res.status(401).json({
          message: "Not authenticated",
          error: "NO_SESSION"
        });
      }

      // Regular authenticated user
      debugLog("Fetching user from database with userId:", principalId);
      const user = await storage.getUserById(principalId);

      if (!user) {
        debugLog("User not found in database for userId:", principalId);
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND"
        });
      }

      // If team/admin/founder, get permissions from teamKeys and check if active
      let permissions: string[] = [];
      if (['team', 'admin', 'founder'].includes(user.role || '')) {
        const keys = await storage.getTeamKeysByUser(user.id);
        if (keys && keys.length > 0) {
          const activeKey = keys[0];
          
          // HARD LOCKOUT if the key is suspended
          if (!activeKey.isActive && user.role !== 'founder') {
            return new Promise<void>((resolve) => {
              req.session.destroy((err) => {
                if (err) console.error("Error destroying session:", err);
                res.status(401).json({
                  message: "Account suspended: Your cryptographic key has been revoked or frozen.",
                  error: "UNAUTHORIZED"
                });
                resolve();
              });
            });
          }
          
          permissions = activeKey.permissions || [];
        } else if (user.role !== 'founder') {
          // If marked as team but has no key, kick them out
          return new Promise<void>((resolve) => {
            req.session.destroy((err) => {
              res.status(401).json({
                message: "Authentication failure: Missing required cryptographic key.",
                error: "UNAUTHORIZED"
              });
              resolve();
            });
          });
        }
      }

      debugLog("User found, returning user data for:", user.email, "Avatar:", user.avatar);
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        identity: user.identity,
        phone: user.phone,
        referralCode: user.referralCode,
        totalEarnings: user.totalEarnings,
        availableBalance: user.availableBalance,
        isActive: user.isActive,
        createdAt: user.createdAt,
        role: user.role || 'user',
        permissions: permissions,
        avatar: user.avatar || 'default',
        profilePicture: user.profilePicture,
        rank: user.rank || 'Nawa Aya',
        name: `${user.firstName} ${user.lastName || ""}`.trim(),
        // THORX v3 fields
        userRankTier: user.userRankTier || 'E-Rank',
        guildRole: user.guildRole || 'simple',
        guildId: user.guildId || null,
        performanceScore: user.performanceScore ?? 0,
        streakDays: user.streakDays ?? 0,
        txPointsBalance: user.txPointsBalance ?? 0,
        lastActiveAt: user.lastActiveAt,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        message: "Failed to fetch user data",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Update own user profile
  app.patch("/api/users/:id", profileRateLimiter, async (req, res) => {
    try {
      const principalId = getThorxPrincipalId(req);
      if (!principalId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (principalId !== req.params.id) {
        return res.status(403).json({ message: "Cannot update other users" });
      }

      const { name, avatar, profilePicture } = req.body;
      const updates: any = {};

      if (name) {
        // Table schema uses firstName and lastName columns
        const parts = name.trim().split(' ');
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(' ') || '';
      }

      debugLog(`[PATCH] Updating user ${req.params.id}. Payload:`, { name, avatarLength: avatar?.length, hasProfilePicture: !!profilePicture });

      if (avatar) updates.avatar = avatar;

      let resolvedProfilePicture: string | null | undefined = undefined;
      if (Object.prototype.hasOwnProperty.call(req.body, "profilePicture")) {
        try {
          const prevPic =
            principalId.startsWith("anonymous_")
              ? req.session.anonymousUserData?.profilePicture
              : (await storage.getUserById(req.params.id))?.profilePicture;
          resolvedProfilePicture = await processProfilePicture(
            profilePicture as string | null | undefined,
          );
        } catch (picErr: unknown) {
          const msg = picErr instanceof Error ? picErr.message : "Invalid profile image";
          return res.status(400).json({ message: msg });
        }
      }
      if (resolvedProfilePicture !== undefined) {
        updates.profilePicture = resolvedProfilePicture;
      }

      // Handle Anonymous User Session Updates
      if (principalId.startsWith('anonymous_')) {
        debugLog(`[PATCH] Updating anonymous session user.`);
        req.session.anonymousUserData = {
          ...req.session.anonymousUserData!,
          ...updates,
          avatar: avatar || req.session.anonymousUserData?.avatar,
          profilePicture:
            resolvedProfilePicture !== undefined
              ? resolvedProfilePicture
              : req.session.anonymousUserData?.profilePicture,
          // ensure name split is reflected if name was updated
          firstName: updates.firstName || req.session.anonymousUserData?.firstName,
          lastName: updates.lastName || req.session.anonymousUserData?.lastName,
          name: name || req.session.anonymousUserData?.name || `${updates.firstName || req.session.anonymousUserData?.firstName} ${updates.lastName || req.session.anonymousUserData?.lastName || ""}`.trim()
        };

        // Force session save
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        debugLog(`[PATCH] Anonymous user updated. New avatar:`, req.session.anonymousUserData?.avatar);
        return res.json(req.session.anonymousUserData);
      }

      debugLog(`[PATCH] Updating persistent DB user...`);
      
      // Elite Validation Layer (Enterprise Standard)
      const updateData: any = {
        avatar: avatar || undefined,
        updatedAt: new Date()
      };
      if (name) {
        const parts = name.trim().split(' ');
        updateData.firstName = parts[0];
        updateData.lastName = parts.slice(1).join(' ');
      }
      if (resolvedProfilePicture !== undefined) {
        updateData.profilePicture = resolvedProfilePicture;
      }

      const user = await storage.updateUser(req.params.id, updateData);
      
      if (user) {
        (user as any).name = `${user.firstName} ${user.lastName || ""}`.trim();
        
        // Audit log for profile change
        await storage.createAuditLog({
          adminId: principalId,
          action: "UPDATE_PROFILE",
          targetType: "user",
          targetId: user.id,
          details: { fields: Object.keys(updateData).filter(k => updateData[k] !== undefined) },
          ipAddress: req.ip || "unknown"
        });
      }
      
      debugLog(`[PATCH] DB Update Result:`, { id: user?.id, newAvatar: user?.avatar });
      res.json(user ? sanitizeUser(user) : null);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user notifications (financial alerts from admins)
  app.get("/api/notifications", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const userNotifications = await storage.getUserNotifications(thorxPid);
      res.json(userNotifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get user earnings endpoint
  app.get("/api/earnings", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const earnings = await storage.getUserEarnings(thorxPid, limit);

      res.json({
        earnings,
        total: await storage.getUserTotalEarnings(thorxPid)
      });
    } catch (error) {
      console.error("Get earnings error:", error);
      res.status(500).json({
        message: "Failed to fetch earnings",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get user referrals endpoint
  app.get("/api/referrals", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const referrals = await storage.getUserReferrals(thorxPid);
      const stats = await storage.getReferralStats(thorxPid);

      res.json({
        referrals,
        stats
      });
    } catch (error) {
      console.error("Get referrals error:", error);
      res.status(500).json({
        message: "Failed to fetch referrals",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get commissions endpoint
  app.get("/api/commissions", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const commissions = await storage.getCommissionLogsByBeneficiary(thorxPid);
      res.json({ commissions });
    } catch (error) {
      console.error("Get commissions error:", error);
      res.status(500).json({ message: "Failed to fetch commissions" });
    }
  });

  app.get("/api/team/users", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 8;
      const search = req.query.search as string;
      const sort = req.query.sort as string;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const role = 'user'; // Filter to only show Users, not founders/team members

      const result = await storage.getUsersPaginated({ page, limit, search, sort, sortOrder, role });
      res.json(result);
    } catch (error) {
      console.error("Fetch users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ── Withdrawal timeframe breakdown (Spec §4.1) ────────────────────────────────
  // Returns how many TX-Points (and equivalent PKR) the user has earned in each
  // time bucket — used by the withdrawal timeframe selector UI. Never exposes PKR
  // until the user reaches the summary screen.
  app.get("/api/withdrawals/timeframe-breakdown", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const breakdown = await storage.getWithdrawalTimeframeBreakdowns(userId);
      res.json(breakdown);
    } catch (error) {
      console.error("Timeframe breakdown error:", error);
      res.status(500).json({ message: "Failed to fetch timeframe breakdown" });
    }
  });

  // High-severity finding (2026-07-15 audit): these two routes used getThorxPrincipalId
  // directly, bypassing requireSessionAuth's team-key suspension enforcement — a suspended
  // account could still read/create withdrawals. requireSessionAuth + withdrawalRateLimiter
  // added to both.
  app.get("/api/withdrawals", requireSessionAuth, withdrawalRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      // Payout access always open — no task gate (Blueprint v2026)
      const userWithdrawals = await storage.getWithdrawalsByUserId(userId);
      res.json(userWithdrawals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  // Request Payout endpoint
  app.post("/api/withdrawals", requireSessionAuth, withdrawalRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Payout always open — minimum balance enforced in storage layer (Blueprint v2026)
      // Explicitly pick only the user-supplied fields — never spread req.body directly
      // so an attacker who adds `status: "approved"` or `fee: "0"` to the payload
      // cannot smuggle those fields past Zod (the schema already omits them, but
      // the explicit pick makes the intent clear and safe against future schema drift —
      // audit finding O).
      const withdrawalData = insertWithdrawalSchema.parse({
        amount:         req.body.amount,
        method:         req.body.method,
        accountName:    req.body.accountName,
        accountNumber:  req.body.accountNumber,
        accountDetails: req.body.accountDetails ?? {},
        userId,
      });

      const withdrawal = await storage.createWithdrawal(withdrawalData);

      res.status(201).json({
        success: true,
        withdrawal,
        message: "Withdrawal request submitted successfully"
      });
    } catch (error) {
      logger.error({ err: error }, "Create withdrawal error");
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      // Business logic errors from storage layer
      if (error instanceof Error && (
        error.message.includes("balance") || 
        error.message.includes("withdrawal amount") || 
        error.message.includes("already exists")
      )) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to submit withdrawal request" });
    }
  });

  // ── Guild Vault & Points Ledger: user-facing guild routes ──────────────────
  app.get("/api/guilds", requireSessionAuth, async (req, res) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const result = await storage.listGuilds({ search, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("List guilds error:", error);
      res.status(500).json({ message: "Failed to fetch guilds" });
    }
  });

  app.get("/api/guilds/mine", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.getUserGuildMembership(userId);
      res.json({ membership: membership ?? null });
    } catch (error) {
      console.error("Get my guild membership error:", error);
      res.status(500).json({ message: "Failed to fetch guild membership" });
    }
  });

  app.post("/api/guilds", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const { name, description } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Guild name is required." });
      }
      // THORX v3 (spec E.9): B-Rank gate for guild creation.
      const creator = await storage.getUserById(userId);
      const RANK_ORDER = ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank"];
      if (RANK_ORDER.indexOf(creator?.userRankTier || "E-Rank") < RANK_ORDER.indexOf("B-Rank")) {
        return res.status(403).json({ message: "B-Rank or higher required to create a guild.", error: "RANK_GATE" });
      }
      const guild = await storage.createGuild({ name: name.trim(), description, captainId: userId });
      res.status(201).json({ guild });
    } catch (error) {
      console.error("Create guild error:", error);
      const message = error instanceof Error ? error.message : "Failed to create guild";
      res.status(400).json({ message });
    }
  });

  // ── THORX v3 (spec E.9): Guild Discovery — must be defined BEFORE /api/guilds/:id ──
  app.get("/api/guilds/discovery", requireSessionAuth, async (req, res) => {
    try {
      const guilds = await storage.getGuildDiscoveryList();
      res.json({ guilds });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch guild discovery list" });
    }
  });

  app.get("/api/guilds/:id", requireSessionAuth, async (req, res) => {
    try {
      const guild = await storage.getGuildById(req.params.id);
      if (!guild) return res.status(404).json({ message: "Guild not found" });
      const members = await storage.getGuildMembers(req.params.id);
      res.json({ guild, members });
    } catch (error) {
      console.error("Get guild error:", error);
      res.status(500).json({ message: "Failed to fetch guild" });
    }
  });


  // THORX v3 (spec K.3 Phase 6): legacy join/approve/reject routes retired —
  // superseded by POST /api/guilds/:id/apply + PATCH /api/guilds/:id/applications/:applicationId.
  // No client code calls these anymore; kept as 410 stubs in case of stale clients.
  app.post("/api/guilds/:id/join", requireSessionAuth, async (_req, res) => {
    res.status(410).json({ message: "Use POST /api/guilds/:id/apply instead.", error: "ENDPOINT_RETIRED" });
  });

  app.post("/api/guilds/:id/members/:userId/approve", requireSessionAuth, async (_req, res) => {
    res.status(410).json({ message: "Use PATCH /api/guilds/:id/applications/:applicationId instead.", error: "ENDPOINT_RETIRED" });
  });

  app.post("/api/guilds/:id/members/:userId/reject", requireSessionAuth, async (_req, res) => {
    res.status(410).json({ message: "Use PATCH /api/guilds/:id/applications/:applicationId instead.", error: "ENDPOINT_RETIRED" });
  });

  app.post("/api/guilds/:id/leave", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      await storage.leaveGuild(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Leave guild error:", error);
      const message = error instanceof Error ? error.message : "Failed to leave guild";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/guilds/:id/members/:userId", requireSessionAuth, async (req, res) => {
    try {
      const captainId = getThorxPrincipalId(req) as string;
      await storage.removeGuildMember(req.params.id, req.params.userId, captainId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove guild member error:", error);
      const message = error instanceof Error ? error.message : "Failed to remove member";
      res.status(400).json({ message });
    }
  });

  // ── Engine C: Guild Chat ─────────────────────────────────────────────────────
  app.get("/api/guilds/:id/chat", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.getUserGuildMembership(userId);
      if (!membership || membership.guildId !== req.params.id || membership.status !== "active") {
        return res.status(403).json({ message: "You must be an active member of this guild to view chat." });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const before = req.query.before as string | undefined;
      const messages = await storage.getEngineCMessages(req.params.id, limit, before);
      res.json({ messages });
    } catch (error) {
      console.error("Get guild chat error:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/guilds/:id/chat", requireSessionAuth, guildInteractionRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.getUserGuildMembership(userId);
      if (!membership || membership.guildId !== req.params.id || membership.status !== "active") {
        return res.status(403).json({ message: "You must be an active member of this guild to send messages." });
      }
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim() || message.length > 500) {
        return res.status(400).json({ message: "Message must be 1–500 characters." });
      }
      const saved = await storage.createEngineCMessage({ guildId: req.params.id, senderId: userId, message: message.trim() });
      broadcastGuildMessage(req.params.id, { type: "engine_c:message", payload: saved });
      res.status(201).json({ message: saved });
    } catch (error) {
      console.error("Send guild chat error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ── Engine C: Weekly Tasks ────────────────────────────────────────────────────
  app.get("/api/guilds/weekly-tasks", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.getUserGuildMembership(userId);
      if (!membership || membership.status !== "active") {
        return res.status(403).json({ message: "Weekly tasks are only available to active guild members." });
      }
      const tasks = await storage.getActiveWeeklyTasks(userId, membership.guildId);

      // Strip `grossPkrPerCompletion` (raw PKR value) from the user-facing response —
      // it breaks the TX-Points-only illusion (audit finding B). Replace with a
      // pre-computed `txPointsReward` / `txPointsRewardMax` range so the frontend
      // never does PKR math client-side.
      const [conversionRate, userCutPct] = await Promise.all([
        storage.getSystemConfigValue<number>("CONVERSION_RATE", 100),
        storage.getSystemConfigValue<number>("ENGINE_C_USER_CUT_PCT", 45),
      ]);
      const userCutRate = userCutPct / 100;

      const safeTasks = (tasks as any[]).map((task) => {
        const { grossPkrPerCompletion, ...rest } = task;
        const grossPkr = parseFloat(grossPkrPerCompletion || "0");
        const isIndirect = task.taskCategory === "indirect" || !grossPkr;
        const txPointsReward = isIndirect ? 0 : Math.round(grossPkr * userCutRate * conversionRate);
        const txPointsRewardMax = txPointsReward ? Math.round(txPointsReward * 1.2) : 0;
        return { ...rest, txPointsReward, txPointsRewardMax };
      });

      res.json({ tasks: safeTasks });
    } catch (error) {
      console.error("Get weekly tasks error:", error);
      res.status(500).json({ message: "Failed to fetch weekly tasks" });
    }
  });

  // earnRateLimiter caps at 15 earn events/min per user — added per audit finding 1-E.
  // completeWeeklyTaskAtomic wraps the duplicate-check + insert + recordEarnEvent in a
  // single db.transaction() with a FOR UPDATE user lock (audit finding 1-D).
  app.post("/api/guilds/weekly-tasks/:taskId/complete", requireSessionAuth, earnRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.getUserGuildMembership(userId);
      if (!membership || membership.status !== "active") {
        return res.status(403).json({ message: "Only active guild members can complete weekly tasks." });
      }
      if (!["member", "captain"].includes(membership.role)) {
        return res.status(403).json({ message: "Only members and captains can complete weekly tasks." });
      }
      // Single atomic call: duplicate-check + insert + recordEarnEvent inside one transaction.
      const { record, task, earnResult } = await storage.completeWeeklyTaskAtomic(
        userId,
        membership.guildId,
        req.params.taskId,
      );
      broadcastGuildEvent(membership.guildId, 'guild.weekly_points', {
        userId, guildId: membership.guildId, pointsCredited: earnResult?.pointsCredited ?? 0
      });
      res.status(201).json({ record, earnResult });
    } catch (error) {
      console.error("Complete weekly task error:", error);
      const msg = error instanceof Error ? error.message : "Failed to complete task";
      res.status(400).json({ message: msg });
    }
  });

  // ── Engine C: Guild Settings (Captain only) ────────────────────────────────────
  const guildSettingsSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(60).optional(),
    description: z.string().max(500).optional().nullable(),
    minRankRequired: z.string().optional(),
    recruitmentOpen: z.boolean().optional(),
    memberCapacity: z.number().int().min(10).max(50).optional(),
    pinnedMemberId: z.string().optional().nullable(),
    avatarUrl: z.string().max(500).optional().nullable(),
    targetDifficulty: z.enum(["easy", "low", "medium", "hard"]).optional(),
  });

  app.patch("/api/guilds/:id/settings", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const parsed = guildSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid settings.", errors: parsed.error.flatten().fieldErrors });
      }
      const { name, description, minRankRequired, recruitmentOpen, pinnedMemberId, avatarUrl, targetDifficulty } = parsed.data;
      const guild = await storage.updateGuildSettings(req.params.id, userId, {
        name,
        description: description ?? undefined,
        minRankRequired,
        recruitmentOpen,
        pinnedMemberId: pinnedMemberId ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        targetDifficulty,
      });
      // Notify all guild members of settings change (Phase 6.3)
      broadcastGuildEvent(req.params.id, 'guild.settings_updated', { weeklyTarget: targetDifficulty, guildId: req.params.id });
      res.json({ guild });
    } catch (error) {
      console.error("Update guild settings error:", error);
      const msg = error instanceof Error ? error.message : "Failed to update guild settings";
      res.status(400).json({ message: msg });
    }
  });

  // ── Captain: Post / Clear Announcement ───────────────────────────────────────
  app.post("/api/guilds/:id/announcement", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const { text } = z.object({ text: z.string().min(1).max(500) }).parse(req.body);
      const guild = await storage.postGuildAnnouncement(req.params.id, userId, text);
      // Broadcast to all guild members so they see the announcement instantly
      // without a manual refresh (audit finding X — was previously missing).
      broadcastGuildEvent(req.params.id, 'guild.announcement_posted', {
        guildId: req.params.id,
        announcement: text,
        postedAt: new Date().toISOString(),
      });
      res.json({ guild });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to post announcement";
      res.status(400).json({ message: msg });
    }
  });

  app.delete("/api/guilds/:id/announcement", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const guild = await storage.clearGuildAnnouncement(req.params.id, userId);
      res.json({ guild });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to clear announcement";
      res.status(400).json({ message: msg });
    }
  });

  // ── Engine C: MVP Pin ─────────────────────────────────────────────────────────
  app.post("/api/guilds/:id/pin/:memberId", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const guild = await storage.updateGuildSettings(req.params.id, userId, {
        pinnedMemberId: req.params.memberId === "unpin" ? null : req.params.memberId,
      });
      res.json({ guild });
    } catch (error) {
      console.error("Pin member error:", error);
      const msg = error instanceof Error ? error.message : "Failed to pin member";
      res.status(400).json({ message: msg });
    }
  });

  // ── Admin: Weekly Task Manager ────────────────────────────────────────────────
  app.get("/api/admin/weekly-tasks", requireTeamRole, async (req, res) => {
    try {
      const tasks = await storage.getAllWeeklyTasks();
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly tasks" });
    }
  });

  app.post("/api/admin/weekly-tasks", requireTeamRole, async (req, res) => {
    try {
      const { title, description, pointReward, weekStart, weekEnd, targetGuildRank } = req.body;
      if (!title || !pointReward || !weekStart || !weekEnd) {
        return res.status(400).json({ message: "title, pointReward, weekStart, weekEnd are required." });
      }
      const task = await storage.createWeeklyTask({
        title, description, pointReward: parseInt(pointReward),
        weekStart: new Date(weekStart), weekEnd: new Date(weekEnd),
        targetGuildRank: targetGuildRank || "E",
        createdBy: getThorxPrincipalId(req) as string,
        isActive: true,
      });
      res.status(201).json({ task });
    } catch (error) {
      console.error("Create weekly task error:", error);
      res.status(500).json({ message: "Failed to create weekly task" });
    }
  });

  app.patch("/api/admin/weekly-tasks/:id", requireTeamRole, async (req, res) => {
    try {
      const task = await storage.updateWeeklyTask(req.params.id, req.body);
      res.json({ task });
    } catch (error) {
      res.status(500).json({ message: "Failed to update weekly task" });
    }
  });

  // ── Admin: Engine C Chat Moderation ───────────────────────────────────────────
  app.get("/api/admin/guilds/:id/chat", requireTeamRole, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const messages = await storage.getEngineCMessages(req.params.id, limit);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat logs" });
    }
  });

  app.delete("/api/admin/guilds/:id/chat/:messageId", requireTeamRole, async (req, res) => {
    try {
      await storage.deleteEngineCMessage(req.params.messageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Points ledger — user's own earn/release history (feeds Scratch Card + Ledger view)
  app.get("/api/points-ledger/me", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const result = await storage.getPointsLedgerForUser(userId, limit, offset);
      res.json(result);
    } catch (error) {
      console.error("Get points ledger error:", error);
      res.status(500).json({ message: "Failed to fetch points ledger" });
    }
  });

  // ── Admin/team guild moderation ─────────────────────────────────────────────
  app.get("/api/admin/guilds", requireTeamRole, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const result = await storage.listGuildsAdmin({ status, search, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Admin list guilds error:", error);
      res.status(500).json({ message: "Failed to fetch guilds" });
    }
  });

  // ── THORX v3 (spec E.9): Admin guild routes with literal paths — MUST be defined
  // BEFORE the parameterized /api/admin/guilds/:id/* routes to avoid Express conflicts.
  app.get("/api/admin/guilds/inactive-captains", requireTeamRole, async (req, res) => {
    try {
      const inactiveDays = req.query.days ? parseInt(req.query.days as string) : 3;
      const captains = await storage.adminGetInactiveCaptains(inactiveDays);
      res.json({ captains });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inactive captains" });
    }
  });

  app.post("/api/admin/guilds/bulk-targets", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const { weeklyTarget, scope, difficulty } = req.body;
      if (!Number.isFinite(weeklyTarget) || weeklyTarget <= 0) {
        return res.status(400).json({ message: "weeklyTarget must be a positive number." });
      }
      const count = await storage.adminBulkSetWeeklyTargets(weeklyTarget, scope ?? "all", difficulty, adminId);
      res.json({ updated: count });
    } catch (error) {
      console.error("Bulk set weekly targets error:", error);
      const msg = error instanceof Error ? error.message : "Failed to bulk set targets";
      res.status(400).json({ message: msg });
    }
  });

  // ── Admin: Ledger validation (scan before :userId to avoid Express conflict) ──
  app.get("/api/admin/ledger/validate/scan", requireTeamRole, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const result = await storage.adminValidateLedgerScan(limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Ledger scan failed" });
    }
  });

  app.get("/api/admin/ledger/validate/:userId", requireTeamRole, async (req, res) => {
    try {
      const result = await storage.adminValidateLedger(req.params.userId);
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Ledger validation failed";
      res.status(400).json({ message: msg });
    }
  });

  const adminGuildStatusSchema = z.object({
    status: z.enum(["active", "frozen", "disbanded"], {
      errorMap: () => ({ message: "status must be one of: active, frozen, disbanded" }),
    }),
  });

  app.post("/api/admin/guilds/:id/status", requireTeamRole, async (req, res) => {
    try {
      const parsed = adminGuildStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid status." });
      }
      const guild = await storage.setGuildStatus(req.params.id, parsed.data.status);
      res.json({ guild });
    } catch (error) {
      console.error("Admin set guild status error:", error);
      const message = error instanceof Error ? error.message : "Failed to update guild status";
      res.status(400).json({ message });
    }
  });

  const adminGuildStrikeSchema = z.object({
    reason: z.string().min(5, "Reason must be at least 5 characters.").max(1000),
  });

  app.post("/api/admin/guilds/:id/strikes", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const parsed = adminGuildStrikeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid request." });
      }
      const result = await storage.addManualGuildStrike(req.params.id, parsed.data.reason.trim(), adminId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Admin add guild strike error:", error);
      res.status(500).json({ message: "Failed to add guild strike" });
    }
  });

  app.post("/api/admin/guilds/:id/strikes/clear", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const guild = await storage.clearGuildStrikes(req.params.id, adminId);
      res.json({ guild });
    } catch (error) {
      console.error("Admin clear guild strikes error:", error);
      res.status(500).json({ message: "Failed to clear guild strikes" });
    }
  });

  app.post("/api/admin/guild-cycles/run-resolution", requireTeamRole, async (req, res) => {
    try {
      const result = await runWeeklyGuildReset();
      res.json(result);
    } catch (error) {
      console.error("Admin run guild resolution error:", error);
      res.status(500).json({ message: "Failed to run guild weekly resolution" });
    }
  });

  // Create ad view endpoint (no auth required)
  // POST /api/ad-view — requireSessionAuth ensures suspended accounts are blocked;
  // earnRateLimiter caps at 15/min per user.
  //
  // Race-condition fix: timing check + ad_view insert + earn event are all inside
  // a single db.transaction() with pg_advisory_xact_lock. Drizzle uses one DB
  // connection per transaction, so the xact-level advisory lock is guaranteed to be
  // on the same session as the INSERT — preventing concurrent submissions from the
  // same user from both passing the timing check before either row is committed.
  app.post("/api/ad-view", requireSessionAuth, earnRateLimiter, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;

      // 🏆 REAL-TIME AD REWARD REGISTRY (Server-Side Only)
      // This is the source of truth for all ad rewards.
      // Frontend only sends the ID.
      const AD_INVENTORY: Record<string, { reward: string, duration: number, type: string }> = {
        "ad_001": { reward: "0.25", duration: 30, type: "video" },
        "ad_002": { reward: "0.15", duration: 15, type: "banner" },
        "ad_003": { reward: "0.50", duration: 45, type: "video_premium" },
        "ad_004": { reward: "0.10", duration: 10, type: "pop_under" },
        "hilltop_fallback": { reward: "0.02", duration: 5, type: "network" }
      };

      const { adId } = req.body;
      const adConfig = AD_INVENTORY[adId] || AD_INVENTORY["hilltop_fallback"];

      let adViewRow: any;
      let thorxCard: { pointsCredited: number; engineType: string } | null = null;
      let timingFailed = false;

      try {
        await db.transaction(async (tx) => {
          // pg_advisory_xact_lock holds the lock on this connection for the entire
          // transaction — timing check, insert, and earn event are all protected.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${thorxPid})::bigint)`);

          // Verify the user actually waited long enough since their LAST ad view
          const lastViews = await tx
            .select({ createdAt: adViews.createdAt })
            .from(adViews)
            .where(eq(adViews.userId, thorxPid))
            .orderBy(desc(adViews.createdAt))
            .limit(1);

          if (lastViews.length > 0 && lastViews[0].createdAt) {
            const timeSinceLastAd = (Date.now() - new Date(lastViews[0].createdAt).getTime()) / 1000;
            // Enforce ad duration + 2 second buffer for network latency
            if (timeSinceLastAd < (adConfig.duration - 2)) {
              timingFailed = true;
              throw new Error("TIMING_FAIL");
            }
          }

          // Insert the ad_view row within the locked transaction
          const [inserted] = await tx.insert(adViews).values({
            userId: thorxPid,
            adId,
            adType: adConfig.type,
            duration: adConfig.duration,
            completed: true,
            earnedAmount: adConfig.reward,
          }).returning();
          adViewRow = inserted;

          // Record the Engine A earn event in the same transaction via tx passthrough.
          // uniq_user_transactions_source prevents a duplicate ledger row if this
          // same sourceId is ever submitted twice (defense-in-depth).
          const earnResult = await storage.recordEarnEvent({
            userId: thorxPid,
            engineType: 'Engine_A',
            grossPkr: parseFloat(adConfig.reward),
            sourceId: adViewRow.id,
            sourceType: 'ad_view',
            tx,
          });
          if (earnResult.pointsCredited > 0) {
            thorxCard = {
              pointsCredited: earnResult.pointsCredited,
              engineType: 'Engine_A',
            };
          }
        });
      } catch (err: any) {
        if (timingFailed) {
          return res.status(429).json({
            message: "Protocol Interruption: Ad watch duration insufficient.",
            error: "RATE_LIMITED"
          });
        }
        throw err;
      }

      res.status(201).json({
        success: true,
        adView: adViewRow,
        thorxCard,
        message: `Authentication Successful: ${adConfig.reward} PKR credited to pending.`
      });
    } catch (error) {
      logger.error({ err: error }, "Create ad view error");
      res.status(500).json({
        message: "Failed to record ad view",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get today's ad views count
  app.get("/api/ad-views/today", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const count = await storage.getTodayAdViews(thorxPid);
      res.json({ count });
    } catch (error) {
      console.error("Get today ad views error:", error);
      res.status(500).json({
        message: "Failed to fetch ad views",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // ============================================
  // REAL-TIME ANALYTICS & DASHBOARD ENDPOINTS
  // ============================================

  // Get comprehensive dashboard statistics
  app.get("/api/dashboard/stats", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const stats = await storage.getDashboardStats(thorxPid);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({
        message: "Failed to fetch dashboard statistics",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get earnings history for charts
  app.get("/api/earnings/history", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const period = (req.query.period as 'week' | 'month' | 'year') || 'week';
      const history = await storage.getEarningsHistory(thorxPid, period);
      res.json(history);
    } catch (error) {
      console.error("Get earnings history error:", error);
      res.status(500).json({
        message: "Failed to fetch earnings history",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get referral leaderboard
  app.get("/api/referrals/leaderboard", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const leaderboard = await storage.getReferralLeaderboard(thorxPid);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get referral leaderboard error:", error);
      res.status(500).json({
        message: "Failed to fetch referral leaderboard",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get detailed referral stats with L1/L2 breakdown
  app.get("/api/referrals/stats/detailed", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const stats = await storage.getReferralStatsDetailed(thorxPid);
      res.json(stats);
    } catch (error) {
      console.error("Get detailed referral stats error:", error);
      res.status(500).json({
        message: "Failed to fetch detailed referral statistics",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get transaction history
  app.get("/api/transactions/history", requireSessionAuth, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req) as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getTransactionHistory(thorxPid, limit);
      res.json(history);
    } catch (error) {
      console.error("Get transaction history error:", error);
      res.status(500).json({
        message: "Failed to fetch transaction history",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // ============================================
  // PROXY ENDPOINT FOR AD WEB PANEL
  // ============================================
  app.get("/api/proxy", async (req, res) => {
    try {
      await handleProxyRequest(req, res);

    } catch (error) {
      console.error("Proxy wrapper error:", error);
      res.status(500).send("Internal Proxy Error");
    }
  });

  // ============================================
  // RANKING SYSTEM ENDPOINTS
  // ============================================

  // Get rank history for current user
  app.get("/api/rank/history", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      if (thorxPid.startsWith('anonymous_')) {
        return res.json({
          rankLogs: [],
          currentRank: "Nawa Aya"
        });
      }

      const user = await storage.getUserById(thorxPid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const rankLogs = await storage.getRankHistory(thorxPid);

      res.json({
        rankLogs,
        currentRank: user.rank || "Nawa Aya"
      });
    } catch (error) {
      console.error("Get rank history error:", error);
      res.status(500).json({
        message: "Failed to fetch rank history",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Manually trigger rank recalculation
  app.post("/api/rank/refresh", profileRateLimiter, async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      if (thorxPid.startsWith('anonymous_')) {
        return res.json({
          oldRank: "Nawa Aya",
          newRank: "Nawa Aya",
          updated: false
        });
      }

      const userBefore = await storage.getUserById(thorxPid);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const oldRank = userBefore.rank || "Nawa Aya";
      const updatedUser = await storage.checkAndUpdateRank(thorxPid);
      const newRank = updatedUser.rank || "Nawa Aya";

      if (oldRank !== newRank) {
        broadcastUserUpdated(thorxPid, "rank_updated");
      }

      res.json({
        oldRank,
        newRank,
        updated: oldRank !== newRank,
        rank: newRank,
        message: oldRank !== newRank
          ? `Rank updated from ${oldRank} to ${newRank}!`
          : "Rank is current"
      });
    } catch (error) {
      console.error("Rank refresh error:", error);
      res.status(500).json({
        message: "Failed to refresh rank",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Legacy registration permanently disabled — creates accounts with guessable
  // password hashes and no rate limiting. Returns 410 Gone so old clients get
  // a clear deprecation error instead of a 404 (audit finding L).
  app.post("/api/legacy-register", authRateLimiter, async (_req, res) => {
    res.status(410).json({
      message: "Legacy registration is no longer supported. Please use /api/register.",
      error: "ENDPOINT_DEPRECATED",
    });
  });

  // Stats endpoint for live data
  app.get("/api/stats", async (req, res) => {
    try {
      // Get real total paid from withdrawals
      const { withdrawals } = await import("@shared/schema");
      const { sql, eq } = await import("drizzle-orm");

      const paidResult = await pool.query(`
        SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
        FROM withdrawals
        WHERE status = 'completed'
      `);

      // Get real active users count
      const activeUsers = await storage.getActiveUsersCount();

      res.json({
        totalPaid: parseFloat(paidResult.rows[0]?.total || "0"),
        activeUsers: activeUsers > 0 ? activeUsers : 45, // Fallback if no real users yet
        securityScore: 99
      });
    } catch (error) {
      console.error("Get live stats error:", error);
      // Fallback to static numbers if db fails
      res.json({
        totalPaid: 2.5,
        activeUsers: 45,
        securityScore: 99
      });
    }
  });


  // Team dashboard metrics endpoints (protected for team members only)
  app.get("/api/team/metrics", requireTeamRole, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const now = new Date();
      let since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      if (range === "24h") since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (range === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (range === "all") since = new Date(0);

      const [activeUsers, totalEarnings] = await Promise.all([
        storage.getUsersCountInRange(since),
        storage.getEarningsSumInRange(since)
      ]);

      const extended = await storage.getExtendedMetrics().catch(() => null);
      res.json({
        activeUsers,
        totalEarnings,
        ...(extended ?? {}),
      });
    } catch (error) {
      console.error("Get team metrics error:", error);
      res.status(500).json({
        message: "Failed to fetch team metrics",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Team email endpoints
  const teamEmailSchema = z.object({
    recipient: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required").max(500),
    message: z.string().min(1, "Message is required").max(5000),
  });

  // Send team email
  app.post("/api/team/emails", requireTeamRole, async (req, res) => {
    try {

      const { recipient, subject, message } = teamEmailSchema.parse(req.body);

      const emailData = {
        fromUserId: req.userProfile!.id,
        toEmail: recipient,
        fromEmail: req.userProfile!.email,
        subject,
        content: message,
        type: 'outbound' as const
      };

      const email = await storage.createTeamEmail(emailData);

      res.status(201).json({
        success: true,
        email,
        message: "Email sent successfully"
      });
    } catch (error) {
      console.error("Send team email error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid email data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Failed to send email",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get team emails (received messages)
  app.get("/api/team/emails", requirePermission("VIEW_COMMUNICATIONS"), async (req, res) => {
    try {
      const type = req.query.type as 'inbound' | 'outbound' | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const emails = await storage.getTeamEmails(type, limit);

      res.json({
        emails,
        total: emails.length
      });
    } catch (error) {
      console.error("Get team emails error:", error);
      res.status(500).json({
        message: "Failed to fetch team emails",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Update team email status (Read, Archived)
  app.patch("/api/team/emails/:id", requireTeamRole, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, isRead } = req.body;
      
      const updates: any = {};
      if (status) updates.status = status;
      if (typeof isRead === 'boolean') updates.isRead = isRead;

      const updated = await storage.updateTeamEmail(id, {
        status: status || undefined,
      });

      res.json({ success: true, email: updated });
    } catch (error) {
      console.error("Update team email error:", error);
      res.status(500).json({ message: "Failed to update email status" });
    }
  });
  
  // Delete team email (Hard-removal)
  app.delete("/api/team/emails/:id", requireTeamRole, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTeamEmail(id);
      res.json({ success: true, message: "Correspondence permanently removed" });
    } catch (error) {
      console.error("Delete team email error:", error);
      res.status(500).json({ message: "Failed to delete correspondence" });
    }
  });

  // Get user credentials (for team data management)
  app.get("/api/team/credentials", requireTeamRole, async (req, res) => {
    try {
      const { decryptCredential, isEncrypted } = await import("./utils/credential-crypto");

      const credentials = await storage.getAllUserCredentials();

      // Decrypt passwords for the team UI (only if encrypted at rest)
      const decrypted = credentials.map(c => ({
        ...c,
        encryptedPassword: c.encryptedPassword && isEncrypted(c.encryptedPassword)
          ? decryptCredential(c.encryptedPassword)
          : c.encryptedPassword,
      }));

      res.json({
        credentials: decrypted,
        total: decrypted.length
      });
    } catch (error) {
      console.error("Get user credentials error:", error);
      res.status(500).json({
        message: "Failed to fetch user credentials",
        error: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/admin/withdrawals", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 8;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await storage.getWithdrawalsPaginated({ page, limit, search, status });
      res.json(result);
    } catch (error) {
      logger.error({ err: error }, "Fetch withdrawals error");
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  // Per-withdrawal audit trail — spec Part G.2: "Audit table showing who approved/rejected,
  // when, and what transaction ID was provided." Queries audit_logs joined to the admin user.
  app.get("/api/admin/withdrawals/:id/audit-trail", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {
    try {
      const { id } = req.params;
      const trail = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
          adminFirstName: users.firstName,
          adminLastName: users.lastName,
          adminEmail: users.email,
        })
        .from(auditLogs)
        .innerJoin(users, eq(auditLogs.adminId, users.id))
        .where(
          and(
            eq(auditLogs.targetType, "withdrawal"),
            eq(auditLogs.targetId, id)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);
      res.json({ trail });
    } catch (error) {
      console.error("Fetch withdrawal audit trail error:", error);
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  app.get("/api/admin/withdrawals/export", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const ids = req.query.ids ? (req.query.ids as string).split(',') : undefined;

      // Get all matching withdrawals (large limit for export to avoid pagination)
      const { withdrawals: allWithdrawals } = await storage.getWithdrawalsPaginated({ 
        page: 1, 
        limit: 10000, 
        search, 
        status,
        ids
      });

      // Professional CSV generation with accurate and full data
      const headers = ["ID", "Beneficiary", "Email", "Phone", "Identity", "Rank", "Amount (PKR)", "Method", "Account Name", "Account Number", "Status", "Created At"];
      const rows = allWithdrawals.map(w => [
        w.id,
        `${w.user.firstName} ${w.user.lastName}`,
        w.user.email,
        w.user.phone,
        w.user.identity,
        w.user.rank,
        w.amount,
        w.method,
        w.accountName,
        w.accountNumber,
        w.status,
        new Date(w.createdAt ?? new Date()).toISOString().split('T')[0]
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      const filename = ids ? "THORX-Selected-Payouts" : "THORX-Full-Payout-Ledger";
      res.setHeader("Content-Disposition", `attachment; filename=${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error("Export withdrawals error:", error);
      res.status(500).json({ message: "Failed to export withdrawals" });
    }
  });

  app.post("/api/admin/withdrawals/bulk", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No withdrawal IDs provided" });
      }

      await storage.bulkUpdateWithdrawalStatus(ids, status, req.userProfile.id);
      broadcastTeamRefresh("withdrawals_bulk_updated");
      res.json({ message: `Successfully updated ${ids.length} withdrawals to ${status}` });
    } catch (error) {
      logger.error({ err: error }, "Bulk update withdrawals error");
      res.status(500).json({ message: "Failed to update withdrawals" });
    }
  });

  // Admin: Get referral network tree for any user
  app.get("/api/admin/users/:userId/network", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const { userId } = req.params;
      const referrals = await storage.getReferralLeaderboard(userId);
      const stats = await storage.getReferralStats(userId);
      res.json({ referrals, stats });
    } catch (error) {
      console.error("Get user network error:", error);
      res.status(500).json({ message: "Failed to fetch user network" });
    }
  });

  // User CRM Management Routes
  app.post("/api/admin/users/:userId/adjust-balance", requirePermission("MANAGE_USERS"), profileRateLimiter, async (req, res) => {
    try {
      const { userId } = req.params;
      const { realPkrDelta, txPointsDelta, amount, type, reason, creditIntent } = req.body;
      const adminId = req.userProfile.id;

      if (!reason || String(reason).trim().length < 5) {
        return res.status(400).json({ message: "reason (≥5 chars) required." });
      }

      let pkrAmount: string;
      let adjustType: 'add' | 'subtract';
      let pointsDelta: number | undefined;

      if (realPkrDelta !== undefined) {
        // New dual-field API (Spec §5.1): realPkrDelta + txPointsDelta both required
        const dualSchema = z.object({
          realPkrDelta: z.number().min(-10000).max(10000),
          txPointsDelta: z.number().int().min(-10000000).max(10000000),
          type: z.enum(["add", "deduct"]),
          reason: z.string().min(5).max(500),
        });
        const parsed = dualSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
        pkrAmount = Math.abs(realPkrDelta).toFixed(2);
        adjustType = req.body.type === 'deduct' ? 'subtract' : 'add';
        pointsDelta = txPointsDelta;
      } else {
        // Legacy single-field API (backward compat)
        pkrAmount = amount;
        adjustType = type as 'add' | 'subtract';
        if (adjustType === 'add' && creditIntent && !['verified_deposit', 'admin_credit'].includes(creditIntent)) {
          return res.status(400).json({ message: "Invalid creditIntent value" });
        }
      }

      const user = await storage.adjustUserBalance(userId, pkrAmount, adjustType, adminId, reason, creditIntent ?? 'admin_credit', pointsDelta);
      broadcastUserUpdated(userId, "balance_adjusted");
      res.json(sanitizeUser(user));

      // After crediting a user, immediately re-score their risk so large admin
      // credits surface in the Risk Watchlist without waiting for the next
      // full scan. Fire-and-forget — does not block the response.
      if (type === 'add') {
        import("./modules/risk-engine").then(async ({ scoreUser, upsertRiskCase }) => {
          try {
            const result = await scoreUser(userId);
            await upsertRiskCase(result);
            console.log(`[RiskEngine] Re-scored ${userId} after admin credit — score: ${result.riskScore}, severity: ${result.severity}`);
          } catch (e) {
            console.error(`[RiskEngine] Post-credit rescore failed for ${userId}:`, e);
          }
        });
      }
    } catch (error) {
      console.error("Adjust balance error:", error);
      res.status(500).json({ message: "Failed to adjust balance" });
    }
  });

  // ── Thorx Profit Ledger (Spec §19.1) ────────────────────────────────────────
  // Full profit breakdown: engine cuts + withdrawal fee revenue + 30-day chart.
  // Restricted to founder role.
  app.get("/api/admin/profit-ledger", requireTeamRole, async (req, res) => {
    try {
      if (req.userProfile!.role !== 'founder') {
        return res.status(403).json({ message: "Founder access required" });
      }
      const ledger = await storage.getProfitLedger();
      res.json(ledger);
    } catch (error) {
      console.error("Profit ledger error:", error);
      res.status(500).json({ message: "Failed to fetch profit ledger" });
    }
  });

  // ── Per-Ad-Player Config CRUD (Spec §16.3) ────────────────────────────────
  // Manages ENGINE_A_PLAYERS_JSON system_config key. Each player overrides
  // Engine A's default PKR→TX-Points ratio for their specific ad network.
  app.get("/api/admin/engine-a/players", requireTeamRole, async (req, res) => {
    try {
      const json = await storage.getSystemConfigValue<string>("ENGINE_A_PLAYERS_JSON", "[]");
      res.json({ players: JSON.parse(json) });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ad players" });
    }
  });

  app.post("/api/admin/engine-a/players", requireTeamRole, async (req, res) => {
    try {
      const schema = z.object({ name: z.string().min(1).max(100), pkrToPointsRatio: z.number().int().min(1), variancePct: z.number().min(0).max(100) });
      const parsed = schema.parse(req.body);
      const json = await storage.getSystemConfigValue<string>("ENGINE_A_PLAYERS_JSON", "[]");
      const players = JSON.parse(json) as any[];
      const newPlayer = { id: `player_${Date.now()}`, ...parsed };
      players.push(newPlayer);
      await storage.setSystemConfigValue("ENGINE_A_PLAYERS_JSON", JSON.stringify(players));
      res.json({ player: newPlayer });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to add player" });
    }
  });

  app.patch("/api/admin/engine-a/players/:id", requireTeamRole, async (req, res) => {
    try {
      const schema = z.object({ name: z.string().min(1).max(100).optional(), pkrToPointsRatio: z.number().int().min(1).optional(), variancePct: z.number().min(0).max(100).optional() });
      const updates = schema.parse(req.body);
      const json = await storage.getSystemConfigValue<string>("ENGINE_A_PLAYERS_JSON", "[]");
      const players = JSON.parse(json) as any[];
      const idx = players.findIndex((p: any) => p.id === req.params.id);
      if (idx === -1) return res.status(404).json({ message: "Player not found" });
      players[idx] = { ...players[idx], ...updates };
      await storage.setSystemConfigValue("ENGINE_A_PLAYERS_JSON", JSON.stringify(players));
      res.json({ player: players[idx] });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update player" });
    }
  });

  app.delete("/api/admin/engine-a/players/:id", requireTeamRole, async (req, res) => {
    try {
      const json = await storage.getSystemConfigValue<string>("ENGINE_A_PLAYERS_JSON", "[]");
      const players = (JSON.parse(json) as any[]).filter((p: any) => p.id !== req.params.id);
      await storage.setSystemConfigValue("ENGINE_A_PLAYERS_JSON", JSON.stringify(players));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  // ── Founder Profit Ledger (legacy endpoint kept for backward compat) ──────────

  app.get("/api/admin/founder/profit-summary", requireTeamRole, async (req, res) => {
    try {
      if (req.userProfile!.role !== 'founder') {
        return res.status(403).json({ message: "Founder access required" });
      }
      const summary = await storage.getFounderProfitSummary();
      res.json(summary);
    } catch (error) {
      console.error("Founder profit summary error:", error);
      res.status(500).json({ message: "Failed to fetch profit summary" });
    }
  });

  app.post("/api/admin/founder/withdrawals", requireTeamRole, async (req, res) => {
    try {
      if (req.userProfile!.role !== 'founder') {
        return res.status(403).json({ message: "Founder access required" });
      }
      const { amount, withdrawalDate, description } = req.body;
      if (!amount || !withdrawalDate) {
        return res.status(400).json({ message: "amount and withdrawalDate are required" });
      }
      const fw = await storage.createFounderWithdrawal({
        amount: String(amount),
        withdrawalDate: new Date(withdrawalDate),
        description: description ? String(description) : undefined,
        createdBy: req.userProfile!.id,
      });
      res.json(fw);
    } catch (error) {
      console.error("Create founder withdrawal error:", error);
      res.status(500).json({ message: "Failed to log withdrawal" });
    }
  });

  app.get("/api/admin/founder/withdrawals", requireTeamRole, async (req, res) => {
    try {
      if (req.userProfile!.role !== 'founder') {
        return res.status(403).json({ message: "Founder access required" });
      }
      const limit = Number(req.query.limit ?? 50);
      const offset = Number(req.query.offset ?? 0);
      const result = await storage.getFounderWithdrawals(limit, offset);
      res.json(result);
    } catch (error) {
      console.error("Get founder withdrawals error:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  // ── System Health ────────────────────────────────────────────────────────────

  app.get("/api/admin/system-health", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const snap = await storage.getLatestHealthSnapshot();
      if (!snap) {
        return res.json(null);
      }
      const ageMinutes = snap.recordedAt ? (Date.now() - new Date(snap.recordedAt).getTime()) / 60000 : 9999;
      res.json({ ...snap, isStale: ageMinutes > 90 });
    } catch (error) {
      console.error("System health error:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  app.get("/api/admin/system-health/history", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const hours = Number(req.query.hours ?? 24);
      const history = await storage.getHealthHistory(hours);
      res.json(history);
    } catch (error) {
      console.error("System health history error:", error);
      res.status(500).json({ message: "Failed to fetch health history" });
    }
  });

  app.post("/api/admin/system-health/recalculate", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { computeAndSaveHealthSnapshot } = await import("./modules/health-engine");
      await computeAndSaveHealthSnapshot();
      const snap = await storage.getLatestHealthSnapshot();
      const ageMinutes = snap?.recordedAt ? (Date.now() - new Date(snap.recordedAt).getTime()) / 60000 : 0;
      res.json({ ...snap, isStale: ageMinutes > 90 });
    } catch (error) {
      console.error("Recalculate health error:", error);
      res.status(500).json({ message: "Failed to recalculate health" });
    }
  });

  // ── Financial Reconciliation ─────────────────────────────────────────────────

  app.get("/api/admin/reconciliation", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const data = await storage.getReconciliationData();
      res.json(data);
    } catch (error) {
      console.error("Reconciliation error:", error);
      res.status(500).json({ message: "Failed to fetch reconciliation data" });
    }
  });

  app.post("/api/admin/earnings/:earningId/reclassify", requireTeamRole, async (req, res) => {
    try {
      if (req.userProfile!.role !== 'founder') {
        return res.status(403).json({ message: "Founder access required" });
      }
      const { earningId } = req.params;
      const { type } = req.body;
      if (!['verified_deposit', 'admin_credit'].includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }
      await storage.reclassifyEarning(earningId, type, req.userProfile!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Reclassify earning error:", error);
      res.status(500).json({ message: "Failed to reclassify earning" });
    }
  });

  app.get("/api/admin/notes/user/:id", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await storage.getInternalNotes("user", id);
      res.json({ notes });
    } catch (error) {
      console.error("Fetch notes error:", error);
      res.status(500).json({ message: "Failed to fetch internal notes" });
    }
  });

  app.post("/api/admin/notes", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { targetType, targetId, content } = req.body;
      const adminId = req.userProfile.id;

      const note = await storage.createInternalNote({
        adminId,
        targetType,
        targetId,
        content
      });
      res.json(note);
    } catch (error) {
      console.error("Create note error:", error);
      res.status(500).json({ message: "Failed to create internal note" });
    }
  });

  app.get("/api/admin/users/export", requirePermission("VIEW_USERS"), async (req, res) => {
    try {
      const search = req.query.search as string;
      const ids = req.query.ids ? (req.query.ids as string).split(',') : undefined;

      const { users: allUsers } = await storage.getUsersPaginated({ 
        page: 1, 
        limit: 10000, 
        search,
        ids
      });

      const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Identity", "Role", "Rank", "Available Balance", "Total Earnings", "Referral Code", "Created At"];
      const rows = allUsers.map(u => [
        u.id, u.firstName, u.lastName, u.email, u.phone, u.identity, u.role, u.rank, u.availableBalance, u.totalEarnings, u.referralCode, new Date(u.createdAt ?? new Date()).toISOString()
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      const filename = ids ? "THORX-Selected-Users" : "THORX-User-Directory";
      res.setHeader("Content-Disposition", `attachment; filename=${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Log Data Exfiltration
      await storage.createAuditLog({
        adminId: req.userProfile!.id,
        action: "LEDGER_EXPORTED",
        targetType: "system",
        targetId: "user_directory",
        details: { exportType: ids ? "selective" : "full", records: rows.length, search, ids },
        ipAddress: req.ip
      });

      res.send(csvContent);
    } catch (error) {
      console.error("Export users error:", error);
      res.status(500).json({ message: "Failed to export user directory" });
    }
  });

  app.delete("/api/admin/users/:id", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { id } = req.params;
      const targetUser = await storage.getUserById(id);
      await storage.deleteUser(id);

      // Log the destructive action for true zero-trust accountability
      if (req.userProfile && targetUser) {
        await storage.createAuditLog({
          adminId: req.userProfile.id,
          action: "USER_DELETED",
          targetType: "user",
          targetId: id,
          details: { email: targetUser.email, role: targetUser.role },
          ipAddress: req.ip
        });
      }

      broadcastUserUpdated(id, "account_deleted");
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Update withdrawal status (Admin Action)
  app.patch("/api/admin/withdrawals/:id", requirePermission("MANAGE_PAYOUTS"), async (req, res) => {
    try {
      const { status, transactionId, rejectionReason } = req.body;
      const withdrawalId = req.params.id;

      const updated = await storage.updateWithdrawalStatus(
        withdrawalId,
        status,
        req.userProfile.id,
        transactionId,
        rejectionReason
      );

      // Log the action with Full Financial Diff Tracking
      await storage.createAuditLog({
        adminId: req.userProfile.id,
        action: `WITHDRAWAL_${status.toUpperCase()}`,
        targetType: "withdrawal",
        targetId: withdrawalId,
        details: { status, amount: updated.amount, beneficiary: updated.userId, transactionId, rejectionReason },
        ipAddress: req.ip
      });

      // Broadcast generic user update (invalidates all OWN_DATA_QUERY_KEYS)
      broadcastUserUpdated(updated.userId, `withdrawal_${status}`);
      // Also broadcast specific event so frontend can show targeted toast (Phase 6.2)
      broadcastToUser(updated.userId, 'withdrawal_status_changed', { status, withdrawalId });
      res.json({ success: true, withdrawal: updated });
    } catch (error) {
      logger.error({ err: error }, "Update withdrawal error");
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update withdrawal" });
    }
  });

  app.get("/api/admin/audit-logs", requirePermission("VIEW_AUDIT_LOGS"), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const period = req.query.period as string;
      const ids = req.query.ids ? (req.query.ids as string).split(',') : undefined;

      const result = await storage.getAuditLogsPaginated({ page, limit, search, period, ids });
      res.json(result);
    } catch (error) {
      console.error("Fetch audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/audit-logs/export", requirePermission("VIEW_AUDIT_LOGS"), async (req, res) => {
    try {
      const search = req.query.search as string;
      const period = req.query.period as string;
      const ids = req.query.ids ? (req.query.ids as string).split(',') : undefined;

      const { logs } = await storage.getAuditLogsPaginated({ 
        page: 1, 
        limit: 10000, 
        search, 
        period, 
        ids 
      });

      const headers = ["ID", "Admin Name", "Admin ID", "Action", "Target Type", "Target ID", "Details", "IP Address", "Timestamp"];
      const rows = logs.map(l => [
        l.id,
        l.admin ? `${l.admin.firstName} ${l.admin.lastName}` : "Unknown",
        l.adminId,
        l.action,
        l.targetType,
        l.targetId,
        JSON.stringify(l.details),
        l.ipAddress || "Internal",
        new Date(l.createdAt).toISOString()
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      const filename = ids ? "THORX-Selected-Audit-Logs" : `THORX-Audit-Logs-${period || 'all'}`;
      res.setHeader("Content-Disposition", `attachment; filename=${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Log Data Exfiltration
      await storage.createAuditLog({
        adminId: req.userProfile!.id,
        action: "LEDGER_EXPORTED",
        targetType: "system",
        targetId: "audit_logs",
        details: { exportType: ids ? "selective" : "period", records: rows.length, search, period, ids },
        ipAddress: req.ip
      });

      res.send(csvContent);
    } catch (error) {
      console.error("Export audit logs error:", error);
      res.status(500).json({ message: "Failed to export audit report" });
    }
  });

  // Get internal notes
  app.get("/api/admin/notes/:targetType/:targetId", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const { targetType, targetId } = req.params;
      const notes = await storage.getInternalNotes(targetType, targetId);
      res.json({ notes });
    } catch (error) {
      console.error("Fetch notes error:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  // Create internal note
  app.post("/api/admin/notes", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { targetType, targetId, content } = req.body;
      const note = await storage.createInternalNote({
        adminId: req.userProfile.id,
        targetType,
        targetId,
        content
      });

      res.json({ success: true, note });
    } catch (error) {
      console.error("Create note error:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Analytics for Admin Dashboard
  app.get("/api/admin/analytics/engine-revenue", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const now = new Date();
      let since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (range === "24h") since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (range === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (range === "all") since = new Date(0);
      const revenue = await storage.getEngineRevenue(since);
      res.json(revenue);
    } catch (error) {
      console.error("Engine revenue error:", error);
      res.status(500).json({ message: "Failed to fetch engine revenue" });
    }
  });

  app.get("/api/admin/analytics", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const now = new Date();
      let since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      if (range === "24h") since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (range === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (range === "all") since = new Date(0);

      const data = await storage.getAnalyticsData(since);

      res.json(data);
    } catch (error) {
      console.error("Fetch analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // NOTE: the canonical "adjust balance" route is defined earlier as
  // POST /api/admin/users/:userId/adjust-balance (requirePermission("MANAGE_USERS"),
  // with broadcastUserUpdated wired in). Express matches routes in registration
  // order and both paths are structurally identical, so a second handler here
  // was always unreachable dead code — removed to eliminate the shadowing/drift
  // risk the duplicate created (it lacked the permission middleware and broadcast).

  // Contact form Zod schema — validates all fields with bounds before DB write
  // (audit findings M + P: previously raw req.body destructure, no length limits).
  const contactSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    description: z.string().min(10).max(2000),
  });

  // User contact message endpoint
  app.post("/api/contact", contactRateLimiter, async (req, res) => {
    try {
      const parsed = contactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.errors[0]?.message || "Invalid contact form data.",
          error: "VALIDATION_ERROR",
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      const { name, email, description } = parsed.data;

      // Create a team email entry for the contact message
      const contactEmailData = {
        fromUserId: null, // External user contact
        toEmail: "team@thorx.com", // Team email
        fromEmail: email,
        subject: `Contact Message from ${name}`,
        content: `Contact Form Submission\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${description}`,
        type: 'inbound' as const,
        status: 'sent' as const
      };

      const contactEmail = await storage.createTeamEmail(contactEmailData);

      res.status(201).json({
        success: true,
        message: "Contact message sent successfully",
        messageId: contactEmail.id
      });
    } catch (error) {
      console.error("Contact message error:", error);
      res.status(500).json({
        message: "Failed to send contact message",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Bootstrap founder endpoint — dev/first-boot only
  // Disabled in production. In dev, requires BOOTSTRAP_SECRET env var if set.
  app.post("/api/bootstrap-founder", async (req, res) => {
    // Hard-disable in production
    if (runtimeConfig.isProd) {
      return res.status(403).json({
        message: "Bootstrap is disabled in production. Use the seed script directly.",
        error: "FORBIDDEN"
      });
    }

    // If BOOTSTRAP_SECRET is configured, validate the caller knows it
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
    if (bootstrapSecret) {
      const provided =
        (req.headers['x-bootstrap-secret'] as string) ||
        req.body?.bootstrapSecret;
      if (!provided || provided !== bootstrapSecret) {
        return res.status(403).json({
          message: "Invalid or missing bootstrap secret.",
          error: "FORBIDDEN"
        });
      }
    }

    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          message: "Email, password, first name, and last name are required"
        });
      }

      // Check if any team members already exist
      const existingTeamMembers = await storage.getTeamMembers();
      if (existingTeamMembers && existingTeamMembers.length > 0) {
        return res.status(403).json({
          message: "Founder already exists. Use normal registration."
        });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered"
        });
      }

      // Create founder user
      const founderData = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        identity: `FOUNDER_${Date.now()}`,
        phone: "",
        email,
        password: password,
        passwordHash: password,
        referralCode: `FOUNDER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        role: 'founder'
      };

      const founder = await storage.createUser(founderData);

      // Create founder team key
      const teamKeyData = {
        userId: founder.id,
        keyName: `${firstName} ${lastName}`,
        accessLevel: 'founder' as const,
        permissions: ['all'],
        isActive: true
      };

      await storage.createTeamKey(teamKeyData);

      // Set session
      req.session.userId = founder.id;
      req.session.user = {
        id: founder.id,
        email: founder.email,
        firstName: founder.firstName,
        lastName: founder.lastName,
        role: founder.role || 'founder'
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        message: "Founder account created successfully",
        user: {
          id: founder.id,
          email: founder.email,
          firstName: founder.firstName,
          lastName: founder.lastName,
          role: founder.role
        }
      });
    } catch (error) {
      console.error("Bootstrap founder error:", error);
      res.status(500).json({
        message: "Failed to create founder account"
      });
    }
  });

  // Register new user
  app.post("/api/register", authRateLimiter, async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone, identity, referralCode, role, deviceFingerprint } = req.body;
      debugLog(`[POST /api/register] Attempt for ${email}. Role: ${role}`);

      if (!firstName || lastName === undefined || lastName === null || !email || !identity || !password) {
        return res.status(400).json({
          message: "First name, email, identity, and password are required",
          error: "MISSING_REQUIRED_FIELDS"
        });
      }

      // Validate using registerSchema
      const parsed = registerSchema.safeParse({ firstName, lastName, email, password, phone, identity, referralCode, role });
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.errors[0]?.message || "Validation failed",
          error: "VALIDATION_ERROR"
        });
      }

      // Check for existing user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered",
          error: "DUPLICATE_EMAIL"
        });
      }

      // Device fingerprint abuse check: max 1 user-role account per device.
      // team/founder/admin roles remain exempt (a person may hold one personal
      // account plus one team/founder/admin account on the same device).
      if (deviceFingerprint && typeof deviceFingerprint === "string" && !['team', 'founder', 'admin'].includes(role || 'user')) {
        const existingCount = await storage.getAccountCountByFingerprint(deviceFingerprint);
        if (existingCount >= 1) {
          return res.status(429).json({
            message: "Maximum number of accounts reached for this device. Contact support if you believe this is an error.",
            error: "DEVICE_LIMIT_EXCEEDED"
          });
        }
      }

      // Resolve referral code
      let referredBy = undefined;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        phone: (phone && phone.trim() !== '') ? normalizePhoneNumber(phone) : "",
        identity,
        referralCode: referralCode || '',
        role: 'user', // always "user" — elevated roles via bootstrap/invitations only
        passwordHash: password,
        password: password,
        name: `${firstName} ${lastName}`,
        referredBy,
      });
      debugLog(`[POST /api/register] User created: ${newUser.id}`);

      // Store device fingerprint if provided
      if (deviceFingerprint && typeof deviceFingerprint === "string") {
        try {
          await storage.createDeviceFingerprint({
            userId: newUser.id,
            fingerprintHash: deviceFingerprint,
            userAgent: req.headers["user-agent"] || null,
            ipAddress: req.ip || null,
          });
        } catch (fpErr) {
          console.error("Device fingerprint storage failed (non-blocking):", fpErr);
        }
      }

      // Mark email as verified immediately (no OTP required)
      await storage.markUserEmailVerified(newUser.id);

      // Regenerate session ID to prevent fixation before assigning identity
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set session data
      req.session.userId = newUser.id;
      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role || 'user'
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.status(201).json({
        success: true,
        message: "Registration successful",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error("Registration error details:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      res.status(500).json({
        message: "Registration failed",
        error: "INTERNAL_ERROR"
      });
    }
  });

  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address")
  });

  app.post("/api/forgot-password", authRateLimiter, async (req, res) => {
    res.json({
      success: true,
      message: "If an account exists with that email, please contact support to reset your password.",
    });
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters")
  });

  app.post("/api/reset-password", async (req, res) => {
    res.status(410).json({
      message: "Self-service password reset is not available. Please contact support.",
      error: "NOT_AVAILABLE"
    });
  });

  // Mark user email as verified (session-based — requires active session)
  // authRateLimiter added: high-severity audit finding — endpoint was unprotected.
  app.post("/api/auth/mark-verified", authRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required", error: "UNAUTHORIZED" });
      }
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found", error: "NOT_FOUND" });
      }
      await storage.markUserEmailVerified(user.id);
      res.json({ success: true, message: "Email verification confirmed" });
    } catch (error) {
      console.error("Mark verified error:", error);
      res.status(500).json({ message: "Failed to mark verification", error: "INTERNAL_ERROR" });
    }
  });

  // Login endpoint
  app.post("/api/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password, deviceFingerprint } = req.body;
      debugLog(`[POST /api/login] Attempt for ${email ?? "(no email)"}`);

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
          error: "BAD_REQUEST",
        });
      }

      const user = await storage.validateUserPassword(email, password);
      if (!user) {
        console.warn(`[POST /api/login] Password validation failed for ${email}`);
      }

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "UNAUTHORIZED"
        });
      }

      // Step 5: Email verification gate — only for regular users
      // Team, founder, and admin roles are exempt from OTP verification
      const isPrivilegedRole = ['team', 'admin', 'founder'].includes(user.role || '');
      if (!isPrivilegedRole && !user.emailVerifiedAt && !user.isVerified) {
        return res.status(403).json({
          message: "Email verification required. Please verify your email to continue.",
          error: "EMAIL_NOT_VERIFIED",
          requireVerification: true,
          email: user.email,
        });
      }

      // Hard Lockout Check on Login: Prevent team members with suspended keys from logging in
      if (isPrivilegedRole) {
        const teamKeys = await storage.getTeamKeysByUser(user.id);
        if (teamKeys && teamKeys.length > 0) {
          if (!teamKeys[0].isActive && user.role !== 'founder') {
            return res.status(401).json({
              message: "Account suspended: Your cryptographic key has been revoked or frozen.",
              error: "UNAUTHORIZED"
            });
          }
        }
      }

      // Store device fingerprint on login
      if (deviceFingerprint && typeof deviceFingerprint === "string") {
        try {
          await storage.createDeviceFingerprint({
            userId: user.id,
            fingerprintHash: deviceFingerprint,
            userAgent: req.headers["user-agent"] || null,
            ipAddress: req.ip || null,
          });
        } catch (fpErr) {
          console.error("Login fingerprint storage failed (non-blocking):", fpErr);
        }
      }

      // Regenerate session ID to prevent fixation before assigning identity
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set session data
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user'
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Implement Auth-Zero-Trust Reporting
      if (user.role === 'admin' || user.role === 'founder') {
        try {
          await storage.createAuditLog({
            adminId: user.id,
            action: "ADMIN_AUTH_SUCCESS",
            targetType: "system",
            targetId: user.id,
            details: {
              role: user.role,
              method: "password"
            },
            ipAddress: req.ip
          });
        } catch (e) {
          console.error("Failed to write access log", e);
        }
      }

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Endpoint to get user profile, requires authentication
  app.get("/api/profile", requireSessionAuth, async (req, res) => {
    try {
      // User is authenticated, fetch profile details
      const user = await storage.getUserById(getThorxPrincipalId(req)!);
      if (!user) {
        return res.status(404).json({
          message: "User profile not found",
          error: "USER_NOT_FOUND"
        });
      }

      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        identity: user.identity,
        phone: user.phone,
        referralCode: user.referralCode,
        totalEarnings: user.totalEarnings,
        availableBalance: user.availableBalance,
        isActive: user.isActive,
        createdAt: user.createdAt,
        role: user.role || 'user',
        rank: (user as any).rank,
        avatar: (user as any).avatar,
        profilePicture: (user as any).profilePicture,
        // THORX v3 fields (spec Part F — frontend relies on these via useAuth)
        userRankTier: user.userRankTier || 'E-Rank',
        guildRole: user.guildRole || 'simple',
        guildId: user.guildId || null,
        performanceScore: user.performanceScore ?? 0,
        streakDays: user.streakDays ?? 0,
        txPointsBalance: user.txPointsBalance ?? 0,
        lastActiveAt: user.lastActiveAt ?? null,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        message: "Failed to fetch profile data",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Update user profile endpoint
  app.patch("/api/profile", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req)!;

      // Validate and sanitize data
      const updateSchema = z.object({
        firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
        lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
        name: z.string().optional(),
        phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
        identity: z.string().min(1, "Identity is required").optional(),
        avatar: z.string().optional(),
        profilePicture: z
          .union([z.string().max(12_000_000), z.null()])
          .optional(), // data URL, https URL, or null to clear (max ~9MB base64)
      });

      const validatedData = updateSchema.parse(req.body);

      // Handle combined name if provided
      if (validatedData.name) {
        const parts = validatedData.name.trim().split(/\s+/);
        validatedData.firstName = parts[0];
        validatedData.lastName = parts.slice(1).join(" ") || parts[0];
        delete (validatedData as any).name;
      }

      const existingRow = await storage.getUserById(userId);
      if (!existingRow) {
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND",
        });
      }

      let resolvedProfilePicture: string | null | undefined = undefined;
      if (Object.prototype.hasOwnProperty.call(req.body, "profilePicture")) {
        try {
          resolvedProfilePicture = await processProfilePicture(
            validatedData.profilePicture as string | null | undefined,
          );
        } catch (picErr: unknown) {
          return res.status(400).json({
            message: picErr instanceof Error ? picErr.message : "Invalid profile image",
          });
        }
      }
      delete (validatedData as { profilePicture?: unknown }).profilePicture;

      const updatePayload = {
        ...validatedData,
        ...(resolvedProfilePicture !== undefined ? { profilePicture: resolvedProfilePicture } : {}),
      };

      // Update user in storage
      const updatedUser = await storage.updateUser(userId, updatePayload);

      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND"
        });
      }

      // Update session data if name changed
      if (validatedData.firstName || validatedData.lastName) {
        req.session.user = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role || 'user'
        };
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          email: updatedUser.email,
          identity: updatedUser.identity,
          phone: updatedUser.phone,
          referralCode: updatedUser.referralCode,
          totalEarnings: updatedUser.totalEarnings,
          availableBalance: updatedUser.availableBalance,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          role: updatedUser.role || 'user',
          rank: (updatedUser as any).rank,
          avatar: (updatedUser as any).avatar,
          profilePicture: (updatedUser as any).profilePicture,
          // THORX v3 fields
          userRankTier: updatedUser.userRankTier || 'E-Rank',
          guildRole: updatedUser.guildRole || 'simple',
          guildId: updatedUser.guildId || null,
          performanceScore: updatedUser.performanceScore ?? 0,
          streakDays: updatedUser.streakDays ?? 0,
          txPointsBalance: updatedUser.txPointsBalance ?? 0,
          lastActiveAt: updatedUser.lastActiveAt ?? null,
        }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid profile data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Failed to update profile",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Chatbot API routes - works with or without authentication
  app.post("/api/chat", chatbotRateLimiter, async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          message: "Message is required",
          error: "INVALID_INPUT"
        });
      }

      // Max length guard — prevents 1MB payloads from being processed/logged
      // (audit finding Q: previously only a trim check).
      if (message.length > 1000) {
        return res.status(400).json({ message: "Message too long. Maximum 1000 characters.", error: "INVALID_INPUT" });
      }

      let userId = 'anonymous';
      let userName = 'User';

      const chatPrincipalId = getThorxPrincipalId(req);
      if (chatPrincipalId) {
        userId = chatPrincipalId;
        const userProfile = await storage.getUserById(chatPrincipalId);
        if (userProfile) {
          userName = userProfile.firstName || 'User';
        }
      }

      const chatSessionId = sessionId || `session_${Date.now()}`;

      const { advancedChatbotService } = await import('./chatbot/advanced-chatbot-service');
      const botResponse = advancedChatbotService.processMessage(
        message.trim(),
        userName,
        userId,
        chatSessionId
      );

      if (userId !== 'anonymous') {
        try {
          await storage.createChatMessage({
            userId,
            message: message.trim(),
            sender: 'user',
            language: botResponse.language,
            intent: botResponse.intent,
            sentiment: botResponse.sentiment,
            metadata: { confidence: botResponse.confidence }
          });

          await storage.createChatMessage({
            userId,
            message: botResponse.response,
            sender: 'support',
            language: botResponse.language,
            intent: botResponse.intent,
            sentiment: 'neutral',
            metadata: {
              confidence: botResponse.confidence,
              suggestedActions: botResponse.suggestedActions,
              isEscalation: botResponse.isEscalation
            }
          });
        } catch (dbError) {
          console.error('Failed to save chat messages:', dbError);
        }
      }

      res.json({
        response: botResponse.response,
        language: botResponse.language,
        intent: botResponse.intent,
        confidence: botResponse.confidence,
        sentiment: botResponse.sentiment,
        suggestedActions: botResponse.suggestedActions,
        isEscalation: botResponse.isEscalation
      });
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({
        message: "Failed to process message",
        error: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/chat/stats", requireSessionAuth, async (req, res) => {
    try {
      const { advancedChatbotService } = await import('./chatbot/advanced-chatbot-service');
      const stats = advancedChatbotService.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Chat stats error:", error);
      res.status(500).json({
        message: "Failed to fetch chat stats",
        error: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/chat/history", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getUserChatHistory(userId, limit);

      res.json({
        messages: messages.reverse()
      });
    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({
        message: "Failed to fetch chat history",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // HilltopAds Configuration Routes (Team/Founder only)
  app.post("/api/hilltopads/config", requireTeamRole, async (req, res) => {
    try {
      const { apiKey, publisherId, settings } = req.body;

      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      const config = await storage.createHilltopAdsConfig({
        apiKey,
        publisherId,
        isActive: true,
        settings: settings || {}
      });

      res.json(config);
    } catch (error) {
      console.error("Create HilltopAds config error:", error);
      res.status(500).json({ message: "Failed to create config", error: "INTERNAL_ERROR" });
    }
  });

  app.get("/api/hilltopads/config", requireTeamRole, async (req, res) => {
    try {
      const config = await storage.getHilltopAdsConfig();
      res.json(config || null);
    } catch (error) {
      console.error("Get HilltopAds config error:", error);
      res.status(500).json({ message: "Failed to fetch config", error: "INTERNAL_ERROR" });
    }
  });

  // Public/Authenticated System Configuration Access
  app.get("/api/config/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const allowedKeys = [
        "AD_NETWORKS", "CPA_NETWORKS", "MIN_PAYOUT",
        "WITHDRAWAL_FEE_PCT", "REFERRAL_FEE_SHARE_PCT",
        "CONVERSION_RATE",
      ];
      
      if (!allowedKeys.includes(key)) {
        return res.status(403).json({ 
          message: "Access to this configuration key is restricted.",
          error: "RESTRICTED_ACCESS"
        });
      }

      const value = await storage.getSystemConfigValue(key, null);
      res.json({ key, value });
    } catch (error) {
      console.error(`Error fetching config ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  // Audit finding 2-A: The GET /api/admin/config and PATCH /api/admin/config/:key routes
  // below were dead code — Express matched the first-registered handlers at lines 399/418
  // (requirePermission("MANAGE_SYSTEM")) before ever reaching the requireTeamRole versions
  // here. The allowedKeys safety list in the dead PATCH was never enforced. Both removed.

  // --- Daily Tasks Management (Admin) ---
  app.get("/api/admin/tasks", requireTeamRole, async (req, res) => {
    try {
      const tasks = await storage.getDailyTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/admin/tasks", requireTeamRole, async (req, res) => {
    try {
      debugLog("[ADMIN_TASK_POST] Raw Payload:", req.body);
      const validatedData = insertDailyTaskSchema.parse(req.body);
      const task = await storage.createDailyTask(validatedData);
      res.status(201).json(task);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("[ADMIN_TASK_POST] Validation Error:", JSON.stringify(error.errors, null, 2));
      } else {
        console.error("[ADMIN_TASK_POST] Database/Internal Error:", error);
      }
      res.status(400).json({ 
        message: "Invalid task data", 
        error: error instanceof z.ZodError ? error.errors : (error.message || "GENERIC_ERROR") 
      });
    }
  });

  app.patch("/api/admin/tasks/:id", requireTeamRole, async (req, res) => {
    try {
      debugLog(`[ADMIN_TASK_PATCH] ID: ${req.params.id}. Payload:`, req.body);
      const task = await storage.updateDailyTask(req.params.id, req.body);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error) {
      console.error("[ADMIN_TASK_PATCH] Error:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/admin/tasks/:id", requireTeamRole, async (req, res) => {
    try {
      await storage.deleteDailyTask(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // --- User Tasks Endpoints ---
  app.get("/api/tasks", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const user = await storage.getUserById(userId);
      const userRankTier = (user?.userRankTier || "E-Rank").toLowerCase();

      const tasksWithRecords = await storage.getDailyTasksForUser(userId);

      // Filter by rank tier and active status (THORX v3: keyed off userRankTier,
      // the PS-driven rank — not the legacy, now-frozen `rank` field).
      const filteredTasks = tasksWithRecords.filter(({ task }) => {
          const targetRank = (task.targetRank || "e-rank").toLowerCase();
          const isTargeted = targetRank === "e-rank" || targetRank === userRankTier;
          return isTargeted && task.isActive;
      });

      res.json(filteredTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks/:id/click", requireSessionAuth, earnRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;

      const taskId = req.params.id;
      let record = await storage.getTaskRecord(userId, taskId);

      if (record) {
        if (record.status === 'completed') {
          return res.json({ message: "Task already completed", record });
        }
        // Update clickedAt for existing pending record
        record = await storage.updateTaskRecord(record.id, { clickedAt: new Date() });
      } else {
        // Create new record with clickedAt
        record = await storage.createTaskRecord({
          userId,
          taskId,
          status: 'pending',
          clickedAt: new Date()
        });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to record task click" });
    }
  });

  // POST /api/tasks/:id/verify — requireSessionAuth + earnRateLimiter.
  // Atomic: task completion record + earn event are wrapped in a single DB transaction
  // so a crash between the two can no longer leave the task "done" with no points credited.
  app.post("/api/tasks/:id/verify", requireSessionAuth, earnRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const taskId = req.params.id;
      const { code } = req.body;

      const task = await storage.getDailyTask(taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const record = await storage.getTaskRecord(userId, taskId);
      if (!record || !record.clickedAt) {
        return res.status(400).json({ message: "Task session not initialized. Click the link first." });
      }

      if (record.status === 'completed') {
        return res.json({ message: "Task already completed", record });
      }

      // Check anti-cheat timing (10-15 seconds minimum)
      const now = new Date();
      const clickTime = new Date(record.clickedAt);
      const diffSeconds = (now.getTime() - clickTime.getTime()) / 1000;

      if (diffSeconds < 10) {
        return res.status(400).json({ 
          message: "VERIFICATION_FAILED_TIME", 
          details: `Wait at least ${10 - Math.floor(diffSeconds)} more seconds to ensure content engagement.`
        });
      }

      // Verify Secret Code (case insensitive)
      if (task.secretCode && task.secretCode.toUpperCase() !== (code || "").toUpperCase()) {
        return res.status(400).json({ 
          message: "VERIFICATION_FAILED_CODE", 
          details: "The secret code entered is incorrect." 
        });
      }

      // THORX v3 (spec B.2, L.3): Engine B CPA tasks require C-Rank.
      // Gate check is BEFORE the transaction so a failed rank check does not
      // consume the task slot — spec invariant L.3: "E-Rank user → 403 RANK_GATE".
      const isCpaTask = task.taskCategory === 'cpa_offer' && task.grossPkrPerCompletion && parseFloat(task.grossPkrPerCompletion) > 0;

      if (isCpaTask) {
        const user = await storage.getUserById(userId);
        const RANK_ORDER = ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank"];
        const userTierIdx = RANK_ORDER.indexOf(user?.userRankTier || "E-Rank");
        if (userTierIdx < RANK_ORDER.indexOf("C-Rank")) {
          return res.status(403).json({
            error: "RANK_GATE",
            requiredRank: "C-Rank",
            currentRank: user?.userRankTier || "E-Rank",
            message: "Engine B CPA offers require C-Rank or higher.",
          });
        }
      }

      // ── Atomicity fix: wrap task completion + earn event in a single transaction.
      // Either both commit or neither does — no more "task done but no points" crash gap.
      let updatedRecord: any;
      let thorxCard: { pointsCredited: number; engineType: string } | null = null;
      try {
        await db.transaction(async (tx) => {
          // Mark as completed (only reached if rank gate passed)
          [updatedRecord] = await tx
            .update(taskRecords)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(taskRecords.id, record.id))
            .returning();

          // Fire earn event inside the same transaction via tx passthrough.
          const earnResult = await storage.recordEarnEvent({
            userId,
            engineType: isCpaTask ? 'Engine_B' : 'Indirect',
            grossPkr: isCpaTask ? parseFloat(task.grossPkrPerCompletion!) : 0,
            sourceId: updatedRecord?.id ?? taskId,
            sourceType: 'daily_task',
            tx, // ← threads the outer transaction through so both writes are atomic
          });
          if (isCpaTask && earnResult.pointsCredited > 0) {
            thorxCard = { pointsCredited: earnResult.pointsCredited, engineType: 'Engine_B' };
          }
        });
      } catch (err) {
        console.error("[tasks/verify] atomic transaction failed:", err);
        return res.status(500).json({ message: "Verification failed" });
      }

      res.json({ success: true, record: updatedRecord, thorxCard });
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });


  app.patch("/api/hilltopads/config/:id", requireTeamRole, async (req, res) => {
    try {
      const { id } = req.params;
      // Validate and strip unknown keys — prevents mass-assignment against the config table.
      const updates = insertHilltopAdsConfigSchema.partial().parse(req.body);

      const config = await storage.updateHilltopAdsConfig(id, updates);

      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }

      res.json(config);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid config fields", error: (error as any).errors });
      }
      console.error("Update HilltopAds config error:", error);
      res.status(500).json({ message: "Failed to update config", error: "INTERNAL_ERROR" });
    }
  });

  // HilltopAds Zones Routes (Team/Founder only)
  app.post("/api/hilltopads/zones", requireTeamRole, async (req, res) => {
    try {
      const { zoneId, siteName, zoneName, adFormat, settings } = req.body;

      if (!zoneId || !siteName || !zoneName || !adFormat) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const zone = await storage.createHilltopAdsZone({
        zoneId,
        siteName,
        zoneName,
        adFormat,
        status: "active",
        settings: settings || {}
      });

      res.json(zone);
    } catch (error) {
      console.error("Create HilltopAds zone error:", error);
      res.status(500).json({ message: "Failed to create zone", error: "INTERNAL_ERROR" });
    }
  });

  app.get("/api/hilltopads/zones", requireTeamRole, async (req, res) => {
    try {
      const zones = await storage.getHilltopAdsZones();
      res.json(zones);
    } catch (error) {
      console.error("Get HilltopAds zones error:", error);
      res.status(500).json({ message: "Failed to fetch zones", error: "INTERNAL_ERROR" });
    }
  });

  app.get("/api/hilltopads/zones/:zoneId", requireTeamRole, async (req, res) => {
    try {
      const { zoneId } = req.params;
      const zone = await storage.getHilltopAdsZoneById(zoneId);

      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }

      res.json(zone);
    } catch (error) {
      console.error("Get HilltopAds zone error:", error);
      res.status(500).json({ message: "Failed to fetch zone", error: "INTERNAL_ERROR" });
    }
  });

  app.patch("/api/hilltopads/zones/:id", requireTeamRole, async (req, res) => {
    try {
      const { id } = req.params;
      // Validate and strip unknown keys — prevents mass-assignment against the zones table.
      const updates = insertHilltopAdsZoneSchema.partial().parse(req.body);

      const zone = await storage.updateHilltopAdsZone(id, updates);

      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }

      res.json(zone);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid zone fields", error: (error as any).errors });
      }
      console.error("Update HilltopAds zone error:", error);
      res.status(500).json({ message: "Failed to update zone", error: "INTERNAL_ERROR" });
    }
  });

  // HilltopAds Statistics Routes (Team/Founder only)
  app.get("/api/hilltopads/stats", requireTeamRole, async (req, res) => {
    try {
      const { zoneId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await storage.getHilltopAdsStats(
        zoneId as string | undefined,
        start,
        end
      );

      res.json(stats);
    } catch (error) {
      console.error("Get HilltopAds stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats", error: "INTERNAL_ERROR" });
    }
  });

  app.get("/api/hilltopads/revenue", requireTeamRole, async (req, res) => {
    try {
      const totalRevenue = await storage.getTotalHilltopAdsRevenue();
      res.json({ totalRevenue });
    } catch (error) {
      console.error("Get HilltopAds revenue error:", error);
      res.status(500).json({ message: "Failed to fetch revenue", error: "INTERNAL_ERROR" });
    }
  });

  // HilltopAds Ad Completion Tracking (Authenticated users)
  app.post("/api/hilltopads/ad-completion", requireSessionAuth, async (req, res) => {
    try {
      const { zoneId, adType, duration } = req.body;
      const userId = req.userProfile.id;

      if (!zoneId || !adType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create ad view record
      let rewardAmount = "0.10"; // Default fallback

      try {
        const config = await storage.getHilltopAdsConfig();
        if (config && config.settings && (config.settings as any).rewardPerAd) {
          rewardAmount = (config.settings as any).rewardPerAd;
        }
      } catch (e) {
        console.error("Failed to fetch hilltop ads config for reward amount", e);
      }

      const adView = await storage.createAdView({
        userId,
        adType,
        adNetwork: "hilltopads",
        duration: duration || 0,
        completed: true,
        earnedAmount: rewardAmount
      });

      res.json({
        success: true,
        adView,
        message: "Ad completion recorded"
      });
    } catch (error) {
      console.error("HilltopAds ad completion error:", error);
      res.status(500).json({ message: "Failed to record ad completion", error: "INTERNAL_ERROR" });
    }
  });

  // HilltopAds Sync Endpoints (Team/Founder only)
  app.post("/api/hilltopads/sync/inventory", requireTeamRole, async (req, res) => {
    try {
      await hilltopAdsService.syncInventory();
      res.json({ success: true, message: "Inventory synced successfully" });
    } catch (error) {
      console.error("Sync inventory error:", error);
      res.status(500).json({ message: "Failed to sync inventory", error: "INTERNAL_ERROR" });
    }
  });

  app.post("/api/hilltopads/sync/stats", requireTeamRole, async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      await hilltopAdsService.syncStats(startDate, endDate);
      res.json({ success: true, message: "Stats synced successfully" });
    } catch (error) {
      console.error("Sync stats error:", error);
      res.status(500).json({ message: "Failed to sync stats", error: "INTERNAL_ERROR" });
    }
  });

  app.get("/api/hilltopads/balance", requireTeamRole, async (req, res) => {
    try {
      const balance = await hilltopAdsService.getBalance();
      res.json({ balance });
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({ message: "Failed to fetch balance", error: "INTERNAL_ERROR" });
    }
  });

  app.get("/api/hilltopads/anti-adblock/:zoneId", async (req, res) => {
    try {
      const { zoneId } = req.params;
      const code = await hilltopAdsService.getAntiAdBlockCode(zoneId);
      res.json({ code });
    } catch (error) {
      console.error("Get anti-adblock code error:", error);
      res.status(500).json({ message: "Failed to fetch anti-adblock code", error: "INTERNAL_ERROR" });
    }
  });

  // Zero-Trust Team Key Management (Admin/Founder only)
  app.get("/api/team/members", requireTeamRole, async (req, res) => {
    try {
      const records = await storage.getTeamMembers();
      const members = records.map(record => ({
        id: record.id,
        name: `${record.firstName} ${record.lastName}`.trim(),
        email: record.email,
        accessLevel: record.role, // 'founder', 'admin', 'team'
        permissions: (record as any).teamKey?.permissions || [],
        isActive: record.isActive,
        lastUsed: record.lastLoginDate?.toISOString() || null // Used for Activity Monitoring
      }));
      res.json({ members });
    } catch (e) {
      res.status(500).json({ message: "Failed to compile access matrix" });
    }
  });

  app.post("/api/team/members", requireTeamRole, async (req, res) => {
    try {
      if (!req.userProfile) return res.status(401).send();
      const { email, role } = req.body;
      const isAdminOrFounder = req.userProfile.role === 'founder' || req.userProfile.role === 'admin';
      
      if (!isAdminOrFounder) return res.status(403).json({ message: "Insufficient authorization level to issue keys." });

      // Find node securely using raw SQL mapping to the existing users table via drizzle
      // Targeted lookup by email — avoids loading the entire users table into memory.
      const targetUser = await storage.getUserByEmail(email.toLowerCase());

      if (!targetUser) {
        return res.status(404).json({ message: "Target email does not belong to any active ecosystem element." });
      }

      // Hardcoded Peer Governance rule (Open Question resolution: Peer deletion restriction)
      if (targetUser.role === 'founder' && req.userProfile.role !== 'founder') {
        return res.status(403).json({ message: "System override blocked: Cannot control Founder nodes." });
      }

      // Only founders can elevate a role to admin or founder level
      if (role && ['admin', 'founder'].includes(role) && req.userProfile.role !== 'founder') {
        return res.status(403).json({ message: "Only founders can assign admin or founder roles." });
      }

      // 1. Elevate Privilege Level
      await db.update(users).set({ role }).where(eq(users.id, targetUser.id));

      // 2. Issue Cryptographic Entry Key
      const existingKeys = await storage.getTeamKeysByUser(targetUser.id);
      
      const keyData = { 
        accessLevel: role,
        ...(role === 'team' && req.body.permissions ? { permissions: req.body.permissions } : {}) 
      };

      if (existingKeys.length === 0) {
        await storage.createTeamKey({
          userId: targetUser.id,
          keyName: `AUTH-TOKEN-${Date.now()}`,
          ...keyData
        });
      } else {
        await storage.updateTeamKey(existingKeys[0].id, keyData);
      }

      res.json({ success: true, message: "Cryptographic Key successfully minted." });
    } catch (error) {
       console.error("Team key creation error:", error);
       res.status(500).json({ message: "Failed to mint key." });
    }
  });

  app.patch("/api/team/members/:id", requireTeamRole, async (req, res) => {
    try {
      if (!req.userProfile) return res.status(401).send();
      const { id } = req.params;
      const { accessLevel, isActive } = req.body;

      // Only admin or founder can modify team member records
      const actorRole = req.userProfile.role;
      const isAdminOrFounder = actorRole === 'founder' || actorRole === 'admin';
      if (!isAdminOrFounder) {
        return res.status(403).json({ message: "Insufficient authorization to modify team members." });
      }

      // Only founders can elevate a role to admin or founder level
      if (accessLevel && ['admin', 'founder'].includes(accessLevel) && actorRole !== 'founder') {
        return res.status(403).json({ message: "Only founders can assign admin or founder roles." });
      }

      const targetUser = await storage.getUserById(id);

      if (!targetUser) return res.status(404).json({ message: "Target node detached." });

      // Founders are immutable by non-founders
      if (targetUser.role === 'founder' && actorRole !== 'founder') {
        return res.status(403).json({ message: "Founding nodes cannot be altered." });
      }

      const updates: any = {};
      if (accessLevel) updates.role = accessLevel;
      if (isActive !== undefined) updates.isActive = isActive;
      
      await db.update(users).set(updates).where(eq(users.id, id));

      // Synchronize associated key
      if (accessLevel || isActive !== undefined) {
        const existingKeys = await storage.getTeamKeysByUser(id);
        if (existingKeys.length > 0) {
          const keyUpdates: any = {};
          if (accessLevel) keyUpdates.accessLevel = accessLevel;
          if (isActive !== undefined) keyUpdates.isActive = isActive;
          await storage.updateTeamKey(existingKeys[0].id, keyUpdates);
        }
      }

      broadcastUserUpdated(id, "team_privileges_updated");
      broadcastTeamRefresh("team_member_updated");
      res.json({ success: true, message: "Matrix privileges updated." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Modification failed." });
    }
  });

  // Manually set (and optionally lock) a user's rank — bypasses the automatic
  // earnings/referral thresholds. Once locked, checkAndUpdateRank leaves the
  // rank untouched until an admin unlocks it; all other rank-linked benefits
  // (avatar unlocks, badges, etc.) continue to apply exactly as if the rank
  // had been earned normally — only future automatic *changes* are suppressed.
  app.patch("/api/admin/users/:id/rank", requirePermission("MANAGE_USERS"), profileRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { rank, locked } = req.body;

      if (typeof rank !== "string" || !RANK_NAMES.includes(rank)) {
        return res.status(400).json({ message: `Rank must be one of: ${RANK_NAMES.join(", ")}` });
      }

      const targetUser = await storage.getUserById(id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      const updatedUser = await storage.setUserRank(id, rank, !!locked, req.userProfile.id);

      await storage.createAuditLog({
        adminId: req.userProfile.id,
        action: "RANK_MANUALLY_SET",
        targetType: "user",
        targetId: id,
        details: { oldRank: targetUser.rank, newRank: rank, locked: !!locked },
        ipAddress: req.ip
      });

      broadcastUserUpdated(id, "rank_manually_set", { oldRank: targetUser.rank || "Nawa Aya", newRank: rank });
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Manual rank update error:", error);
      res.status(500).json({ message: "Failed to update rank" });
    }
  });

  const TRUST_STATUSES = ["Special", "Trusted", "Normal", "Dangerous"];

  // Set (or clear) a user's Trust Status — an admin-assigned account
  // classification surfaced on the Leaderboard. A reason is mandatory
  // whenever a status is being set (not required when clearing to null).
  app.patch("/api/admin/users/:id/trust-status", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (status !== null && (typeof status !== "string" || !TRUST_STATUSES.includes(status))) {
        return res.status(400).json({ message: `Status must be one of: ${TRUST_STATUSES.join(", ")}` });
      }
      if (status !== null && (typeof reason !== "string" || !reason.trim())) {
        return res.status(400).json({ message: "A reason is required when setting a trust status." });
      }

      const targetUser = await storage.getUserById(id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      const updatedUser = await storage.setUserTrustStatus(id, status, status === null ? "" : reason.trim(), req.userProfile.id);

      await storage.createAuditLog({
        adminId: req.userProfile.id,
        action: "TRUST_STATUS_SET",
        targetType: "user",
        targetId: id,
        details: { oldStatus: targetUser.trustStatus || null, newStatus: status, reason: status === null ? null : reason.trim() },
        ipAddress: req.ip
      });

      broadcastUserUpdated(id, "trust_status_updated");
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Trust status update error:", error);
      res.status(500).json({ message: "Failed to update trust status" });
    }
  });

  app.patch("/api/team/members/:id/permissions", requireTeamRole, async (req, res) => {
    try {
      if (!req.userProfile) return res.status(401).send();
      if (req.userProfile.role !== 'founder') {
        return res.status(403).json({ message: "Only Founders can modify granular access protocols." });
      }

      const { id } = req.params;
      let permissions: string[];
      try {
        ({ permissions } = z.object({ permissions: z.array(z.string()) }).parse(req.body));
      } catch (e: any) {
        return res.status(400).json({ message: e?.errors?.[0]?.message ?? "Permissions must be an array of structural identifiers." });
      }

      const targetUser = await storage.getUserById(id);
      if (!targetUser) return res.status(404).json({ message: "Target node detached." });

      const existingKeys = await storage.getTeamKeysByUser(id);
      if (existingKeys.length === 0) {
        return res.status(404).json({ message: "No active key found for this node. Issue a key first." });
      }

      await storage.updateTeamKey(existingKeys[0].id, { permissions });

      await storage.createAuditLog({
        adminId: req.userProfile.id,
        action: "TEAM_PERMISSIONS_UPDATED",
        targetType: "system",
        targetId: id,
        details: { email: targetUser.email, newPermissions: permissions },
        ipAddress: req.ip
      });

      broadcastUserUpdated(id, "team_permissions_updated");
      broadcastTeamRefresh("team_permissions_updated");
      res.json({ success: true, message: "Node access matrix reconfigured." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Matrix reconfiguration failed." });
    }
  });

  app.delete("/api/team/members/:id", requireTeamRole, async (req, res) => {
    try {
      if (!req.userProfile) return res.status(401).send();
      const { id } = req.params;

      // Only admin or founder can remove team members
      const actorRole = req.userProfile.role;
      if (actorRole !== 'founder' && actorRole !== 'admin') {
        return res.status(403).json({ message: "Insufficient authorization to remove team members." });
      }

      const targetUser = await storage.getUserById(id);

      if (!targetUser) return res.status(404).json({ message: "Node missing." });
      if (targetUser.role === 'founder' && actorRole !== 'founder') {
         return res.status(403).json({ message: "Founders are immutable." });
      }

      // Demote node and wipe session keys completely from the DB
      await db.update(users).set({ role: 'user' }).where(eq(users.id, id));
      await db.delete(teamKeys).where(eq(teamKeys.userId, id));

      await storage.createAuditLog({
        adminId: req.userProfile.id,
        action: "TEAM_KEY_REVOKED",
        targetType: "system",
        targetId: id,
        details: { email: targetUser.email, originalRole: targetUser.role },
        ipAddress: req.ip
      });

      res.json({ success: true, message: "Node detached and wiped." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Operation failed." });
    }
  });

  app.get("/api/tasks/completed/today/:type", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const count = await storage.getTodayCompletedTasksByType(userId, req.params.type);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task count" });
    }
  });

  // Authenticated system config read — only allow specific public keys without auth
  app.get("/api/system-config/:key", async (req, res) => {
    try {
      const PUBLIC_KEYS = ["MIN_PAYOUT"];
      const key = req.params.key;

      if (!PUBLIC_KEYS.includes(key)) {
        const principalId = getThorxPrincipalId(req);
        if (!principalId) {
          return res.status(401).json({ message: "Authentication required" });
        }
      }

      const config = await storage.getSystemConfig(key);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  app.post("/api/admin/system-config", requireTeamRole, async (req, res) => {
    try {
      const { key, value } = req.body;
      const config = await storage.updateSystemConfig(key, value, getThorxPrincipalId(req)!);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update config" });
    }
  });

  app.get("/api/admin/system-config/:key", requireTeamRole, async (req, res) => {
    try {
      const config = await storage.getSystemConfig(req.params.key);
      if (!config) return res.status(404).json({ message: "Config not found" });
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  // ─── Risk Case Management API ──────────────────────────────────────────────

  app.get("/api/admin/risk-cases", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const { severity, status, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
      const result = await storage.listRiskCases({
        severity: severity || undefined,
        status: status || undefined,
        search: search || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
      res.json(result);
    } catch (err) {
      console.error("[RiskCases] listRiskCases error:", err);
      res.status(500).json({ message: "Failed to load risk cases" });
    }
  });

  app.get("/api/admin/risk-cases/signal-stats", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const stats = await storage.getRiskSignalStats();
      res.json(stats);
    } catch (err) {
      console.error("[RiskCases] getRiskSignalStats error:", err);
      res.status(500).json({ message: "Failed to load signal stats" });
    }
  });

  app.get("/api/admin/risk-cases/:id", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const riskCase = await storage.getRiskCase(req.params.id);
      if (!riskCase) return res.status(404).json({ message: "Case not found" });
      res.json(riskCase);
    } catch (err) {
      console.error("[RiskCases] getRiskCase error:", err);
      res.status(500).json({ message: "Failed to load case" });
    }
  });

  app.patch("/api/admin/risk-cases/:id", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { status, assignedTo, notes, resolution, trustStatusOutcome } = req.body;
      const adminId = getThorxPrincipalId(req);

      // Stamp note attribution so team members can see who last wrote the notes and when
      const updates: any = {
        assignedTo: assignedTo !== undefined ? (assignedTo || null) : undefined,
      };
      if (notes !== undefined) {
        updates.notes = notes;
        updates.notesBy = adminId;
        updates.notesUpdatedAt = new Date();
      }
      if (status) {
        updates.status = status;
        if (status === "Cleared" || status === "Actioned") {
          updates.resolvedBy = adminId;
          updates.resolvedAt = new Date();
          updates.resolution = resolution || `${status} by admin`;
        }
      }
      const updated = await storage.updateRiskCase(req.params.id, updates);

      // Trust Status is the resolution of a risk case: an admin investigates
      // a case, then the outcome (Cleared/Actioned) can set the account's
      // Trust Status, logged with the case resolution as the "why".
      if (trustStatusOutcome && adminId && (status === "Cleared" || status === "Actioned")) {
        const TRUST_STATUSES = ["Special", "Trusted", "Normal", "Dangerous"];
        if (TRUST_STATUSES.includes(trustStatusOutcome)) {
          try {
            await storage.setUserTrustStatus(
              updated.userId,
              trustStatusOutcome,
              `Risk case ${status.toLowerCase()}: ${resolution || `${status} by admin`}`,
              adminId
            );
          } catch (trustErr) {
            console.error("[RiskCases] setUserTrustStatus error:", trustErr);
          }
        }
      }

      res.json(updated);
    } catch (err) {
      console.error("[RiskCases] updateRiskCase error:", err);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  app.post("/api/admin/risk-scan", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const { runFullRiskScan } = await import("./modules/risk-engine");
      const result = await runFullRiskScan({ broadcastAlerts: true });
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[RiskCases] runFullRiskScan error:", err);
      res.status(500).json({ message: "Risk scan failed" });
    }
  });

  app.get("/api/admin/risk-cases/user/:userId/score-history", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
    try {
      const history = await storage.getScoreHistory(req.params.userId, 30);
      res.json(history);
    } catch (err) {
      console.error("[RiskCases] getScoreHistory error:", err);
      res.status(500).json({ message: "Failed to load score history" });
    }
  });

  // ── THORX v3 (spec E.9): Guild application flow ────────────────────────────
  app.get("/api/guilds/:id/application-status", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const application = await storage.getGuildApplicationStatus(userId);
      res.json({ application: application ?? null });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application status" });
    }
  });

  app.post("/api/guilds/:id/apply", requireSessionAuth, guildInteractionRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const { coverLetter } = req.body;
      if (!coverLetter || typeof coverLetter !== "string" || coverLetter.trim().length < 50) {
        return res.status(400).json({ message: "Cover letter must be at least 50 characters." });
      }
      if (coverLetter.trim().length > 1000) {
        return res.status(400).json({ message: "Cover letter cannot exceed 1000 characters." });
      }
      const membership = await storage.applyToGuildWithCoverLetter(req.params.id, userId, coverLetter.trim());
      broadcastGuildEvent(req.params.id, 'guild.application_received', { userId, guildId: req.params.id });
      res.status(201).json({ membership });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to submit guild application";
      res.status(400).json({ message: msg });
    }
  });

  app.patch("/api/guilds/:id/applications/:applicationId", requireSessionAuth, async (req, res) => {
    try {
      const captainId = getThorxPrincipalId(req) as string;
      const { action, rejectionReason } = req.body;
      if (!["accept", "reject"].includes(action)) {
        return res.status(400).json({ message: "action must be 'accept' or 'reject'." });
      }
      if (rejectionReason && (typeof rejectionReason !== "string" || rejectionReason.length > 500)) {
        return res.status(400).json({ message: "Rejection reason cannot exceed 500 characters." });
      }
      const membership = await storage.decideGuildApplication(
        req.params.id, req.params.applicationId, captainId, action, rejectionReason
      );
      // Notify the applicant personally + entire guild of the decision
      if (membership?.userId) {
        broadcastToUser(membership.userId, 'guild.application_decided', { action, guildId: req.params.id });
      }
      broadcastGuildEvent(req.params.id, 'guild.application_decided_notify', { action, guildId: req.params.id });
      res.json({ membership });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to decide application";
      res.status(400).json({ message: msg });
    }
  });

  app.get("/api/guilds/:id/weekly-history", requireSessionAuth, async (req, res) => {
    try {
      const history = await storage.getGuildWeeklyHistory(req.params.id);
      res.json({ history });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly history" });
    }
  });

  // ── THORX v3 (spec E.9): Captain Portal — roster management ──────────────
  app.get("/api/guilds/:id/members", requireSessionAuth, async (req, res) => {
    try {
      const roster = await storage.getGuildRosterForCaptain(req.params.id);
      res.json({ members: roster });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch guild members" });
    }
  });

  app.post("/api/guilds/:id/members/:userId/nudge", requireSessionAuth, async (req, res) => {
    try {
      const captainId = getThorxPrincipalId(req) as string;
      await storage.nudgeGuildMember(req.params.id, captainId, req.params.userId);
      broadcastToUser(req.params.userId, 'guild.nudge_received', { guildId: req.params.id });
      res.json({ success: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to nudge member";
      res.status(400).json({ message: msg });
    }
  });

  app.post("/api/guilds/:id/members/:userId/mvp", requireSessionAuth, async (req, res) => {
    try {
      const captainId = getThorxPrincipalId(req) as string;
      await storage.setGuildMemberMvp(req.params.id, captainId, req.params.userId);
      broadcastGuildEvent(req.params.id, 'guild.mvp_selected', { userId: req.params.userId, guildId: req.params.id });
      res.json({ success: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to set MVP";
      res.status(400).json({ message: msg });
    }
  });

  // ── THORX v3 (spec E.9): Captain DM ──────────────────────────────────────
  // Access control: only the guild captain OR the addressed member may read/write
  // this thread. Thread is always captain↔memberId — callers are resolved to their
  // correct role so there is no self-self thread regardless of who calls.
  app.get("/api/guilds/:id/dm/:memberId", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const guildId = req.params.id;
      const memberId = req.params.memberId;

      const guild = await storage.getGuildById(guildId);
      if (!guild) return res.status(404).json({ message: "Guild not found" });

      const captainId = guild.captainId;
      const isCaptain = captainId === userId;
      const isMember = userId === memberId;
      if (!isCaptain && !isMember) {
        return res.status(403).json({ message: "Access denied: only the guild captain or the addressed member may view this thread." });
      }

      // Thread is always (captainId ↔ memberId) regardless of who is reading.
      const messages = await storage.getCaptainMessageThread(guildId, captainId, memberId);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/guilds/:id/dm/:memberId", requireSessionAuth, guildInteractionRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const guildId = req.params.id;
      const memberId = req.params.memberId;

      const guild = await storage.getGuildById(guildId);
      if (!guild) return res.status(404).json({ message: "Guild not found" });

      const captainId = guild.captainId;
      const isCaptain = captainId === userId;
      const isMember = userId === memberId;
      if (!isCaptain && !isMember) {
        return res.status(403).json({ message: "Access denied: only the guild captain or the addressed member may send messages in this thread." });
      }

      const { message } = req.body;
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty." });
      }
      if (message.trim().length > 1000) {
        return res.status(400).json({ message: "Message cannot exceed 1000 characters." });
      }

      // Resolve fromUserId/toUserId so the thread is always captain↔memberId.
      // A captain sends to the member; the member sends back to the captain.
      const toUserId = isCaptain ? memberId : captainId;
      const msg = await storage.sendCaptainMessage(guildId, userId, toUserId, message.trim());
      // Push DM notification to recipient so they don't need to poll (Phase 15.7)
      broadcastToUser(toUserId, 'guild.dm_received', { fromUserId: userId, guildId, messageId: msg.id });
      res.status(201).json({ message: msg });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to send message";
      res.status(400).json({ message: errMsg });
    }
  });

  // ── THORX v3 (spec E.9): Withdrawal preview & referral cash withdrawal ────
  app.get("/api/withdrawals/preview", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const points = parseInt(req.query.points as string);
      if (!Number.isFinite(points) || points <= 0) {
        return res.status(400).json({ message: "points must be a positive integer." });
      }
      const preview = await storage.previewWithdrawal(userId, points);
      res.json(preview);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to preview withdrawal";
      res.status(400).json({ message: msg });
    }
  });

  app.get("/api/user/referral-balance", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const balance = await storage.getReferralCashBalance(userId);
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral balance" });
    }
  });

  app.post("/api/withdrawals/referral", requireSessionAuth, withdrawalRateLimiter, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const { amount, method, accountName, accountNumber, accountDetails } = req.body;
      if (!Number.isFinite(amount) || amount < 50) {
        return res.status(400).json({ message: "Minimum referral cash withdrawal is Rs. 50." });
      }
      if (!method || !accountName || !accountNumber) {
        return res.status(400).json({ message: "method, accountName, and accountNumber are required." });
      }
      const withdrawal = await storage.createReferralCashWithdrawal(
        userId, amount, method, accountName, accountNumber, accountDetails ?? {}
      );
      res.status(201).json({ withdrawal });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to submit referral withdrawal";
      res.status(400).json({ message: msg });
    }
  });

  // ── THORX v3 (spec E.9): Admin — Live Activity Feed ──────────────────────
  app.get("/api/admin/live-feed", requireTeamRole, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const eventType = typeof req.query.type === "string" ? req.query.type : undefined;
      const events = await storage.getActivityFeedEvents(limit, eventType);
      res.json({ events });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity feed" });
    }
  });

  // ── THORX v3 (spec E.9): Admin — Thorx Card simulator ────────────────────
  app.post("/api/admin/simulate/thorx-card", requireTeamRole, async (req, res) => {
    try {
      const {
        iterations, grossPkr, engineType, userRankTier,
        conversionRate, varianceMin, varianceMax, thorxCutPct, userCutPct,
      } = req.body;
      const n = Math.min(Math.max(parseInt(String(iterations ?? "1000")), 1), 10000);
      const result = simulateThorxCards({
        grossPkr: parseFloat(String(grossPkr ?? "1.0")),
        engineType: (engineType ?? "A") as "A" | "B" | "C",
        userRankTier: String(userRankTier ?? "E-Rank"),
        iterations: n,
        config: {
          conversionRate: parseFloat(String(conversionRate ?? "1000")),
          varianceMin: parseFloat(String(varianceMin ?? "0.8")),
          varianceMax: parseFloat(String(varianceMax ?? "1.2")),
        },
        engineSplits: {
          thorxCutPct: parseFloat(String(thorxCutPct ?? "40")),
          userCutPct: parseFloat(String(userCutPct ?? "60")),
        },
      });
      // Bug found during 2026-07-15 production-readiness re-verification:
      // this used to wrap the array as { simulations, count }, but the client
      // (ThorxCardSandbox.tsx) treats the mutation response as a bare array
      // of SimulationResult (resultArray.reverse()/.length/[0], and each `r`
      // is destructured as { pointsCredited, realPkrValue, cardVariance }).
      // The wrapper object made every simulated "card" render as `undefined`,
      // throwing on `r.pointsCredited.toLocaleString()`. Spec G.9 also
      // describes the response as a flat "array of SimulationResult".
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Simulation failed";
      res.status(400).json({ message: msg });
    }
  });

  // ── THORX v3 (spec E.9): Admin — PS / GPS manual adjustments ─────────────
  app.patch("/api/admin/users/:userId/ps", requirePermission("MANAGE_USERS"), profileRateLimiter, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const { delta, reason } = req.body;
      if (!Number.isFinite(delta)) return res.status(400).json({ message: "delta must be a number." });
      // Cap delta to ±500 to prevent runaway rank manipulation via the admin panel.
      if (delta < -500 || delta > 500) {
        return res.status(400).json({ message: "delta must be in the range -500 to +500." });
      }
      if (!reason || String(reason).trim().length < 5) {
        return res.status(400).json({ message: "reason (≥5 chars) required." });
      }
      // Capture rank before the adjust so we can broadcast the right WS event type.
      const userBefore = await storage.getUserById(req.params.userId);
      const user = await storage.adminAdjustUserPS(req.params.userId, delta, String(reason).trim(), adminId);
      // Broadcast rank_updated when the rank actually changed, ps_updated otherwise.
      const eventType = user.rank !== userBefore?.rank ? 'rank_updated' : 'ps_updated';
      broadcastUserUpdated(req.params.userId, eventType, { delta, newPs: user.performanceScore, newRank: user.rank });
      res.json({ user });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to adjust PS";
      res.status(400).json({ message: msg });
    }
  });

  app.patch("/api/admin/guilds/:id/gps", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const { delta, reason } = req.body;
      if (!Number.isFinite(delta)) return res.status(400).json({ message: "delta must be a number." });
      if (!reason || String(reason).trim().length < 5) {
        return res.status(400).json({ message: "reason (≥5 chars) required." });
      }
      const guild = await storage.adminAdjustGuildGPS(req.params.id, delta, String(reason).trim(), adminId);
      broadcastGuildEvent(req.params.id, 'guild.gps_updated', { delta, guildId: req.params.id });
      res.json({ guild });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to adjust GPS";
      res.status(400).json({ message: msg });
    }
  });

  app.patch("/api/admin/guilds/:id/captain", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const { newCaptainUserId } = req.body;
      if (!newCaptainUserId) return res.status(400).json({ message: "newCaptainUserId is required." });
      const guild = await storage.adminReassignCaptain(req.params.id, newCaptainUserId, adminId);
      // Notify old captain (demoted) + new captain (promoted) + all guild members (Phase 6.1)
      if (guild.captainId) {
        broadcastToUser(guild.captainId, 'guild.captain_changed', { promoted: true, guildId: req.params.id });
      }
      broadcastGuildEvent(req.params.id, 'guild.captain_changed', { newCaptainId: guild.captainId });
      res.json({ guild });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to reassign captain";
      res.status(400).json({ message: msg });
    }
  });

  app.patch("/api/admin/guilds/:id/weekly-target", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const { weeklyTarget } = req.body;
      if (!Number.isFinite(weeklyTarget) || weeklyTarget <= 0) {
        return res.status(400).json({ message: "weeklyTarget must be a positive number." });
      }
      const guild = await storage.adminSetGuildWeeklyTarget(req.params.id, weeklyTarget, adminId);
      res.json({ guild });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to set weekly target";
      res.status(400).json({ message: msg });
    }
  });

  // ── THORX v3 (spec E.9): Admin — Referral analytics ─────────────────────
  app.get("/api/admin/referrals/stats", requireTeamRole, async (req, res) => {
    try {
      const stats = await storage.adminGetReferralStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  app.get("/api/admin/referrals/leaderboard", requireTeamRole, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const leaderboard = await storage.adminGetReferralLeaderboard(limit);
      res.json({ leaderboard });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral leaderboard" });
    }
  });

  const httpServer = createServer(app);
  initRealtime(httpServer, session(sessionConfig));
  return httpServer;
}