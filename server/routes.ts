import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage, RANK_NAMES } from "./storage";
import { pool, db } from "./db";
import { initRealtime, broadcastUserUpdated, broadcastTeamRefresh } from "./realtime";
import { insertRegistrationSchema, insertUserSchema, insertWithdrawalSchema, users, teamKeys, insertDailyTaskSchema, insertTaskRecordSchema, dailyTasks, systemConfig } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { validateEmailServer, validatePhoneServer, normalizePhoneNumber } from "./validation";
import { hilltopAdsService } from "./hilltopads-service";
import { runtimeConfig } from "./config/runtime";
import { handleProxyRequest } from "./modules/proxy/proxy-handler";
import { processProfilePicture } from "./utils/local-profile-picture";
import { authRateLimiter } from "./middleware/auth-rate-limit";
import { sanitizeUser } from "./utils/sanitize-user";
import { debugLog } from "./utils/debug-log";

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

  app.post("/api/admin/leaderboard/force-sync", requirePermission("VIEW_ANALYTICS"), async (req, res) => {
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
        const amount = parseFloat(payload.amount);
        const currentBalance = parseFloat(user.availableBalance || "0");
        await storage.updateUser(id, { availableBalance: (currentBalance + amount).toString() } as any);
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
  app.patch("/api/users/:id", async (req, res) => {
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
  app.get("/api/notifications", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (thorxPid.startsWith('anonymous_')) {
        return res.json([]);
      }
      const userNotifications = await storage.getUserNotifications(thorxPid);
      res.json(userNotifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get user earnings endpoint (no auth required)
  app.get("/api/earnings", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      // Check if it's an anonymous user
      if (thorxPid.startsWith('anonymous_')) {
        return res.json({
          earnings: [],
          total: "0.00"
        });
      }

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

  // Get user referrals endpoint (no auth required)
  app.get("/api/referrals", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      // Check if it's an anonymous user
      if (thorxPid.startsWith('anonymous_')) {
        return res.json({
          referrals: [],
          stats: { count: 0, totalEarned: "0.00" }
        });
      }

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
  app.get("/api/commissions", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (thorxPid.startsWith('anonymous_')) {
        return res.json({ commissions: [] });
      }

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

  app.get("/api/withdrawals", async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      // --- PAYOUT LOCK LOGIC ---
      // Check if user has completed all mandatory tasks
      const tasksWithRecords = await storage.getDailyTasksForUser(userId);
      const user = await storage.getUserById(userId);
      const userRank = (user?.rank || "Nawa Aya").toLowerCase();

      // 1. Check Mandatory Individual Tasks (status must be 'completed')
      const incompleteMandatory = tasksWithRecords.filter(({ task, record }) => {
        const isTargeted = (task.targetRank || "nawa aya").toLowerCase() === "nawa aya" || (task.targetRank || "nawa aya").toLowerCase() === userRank;
        const isCompleted = record?.status === 'completed';
        return task.isActive && task.isMandatory && isTargeted && !isCompleted;
      });

      // 2. Check Rank-Based Numeric Requirements (Ads & CPA Tasks)
      const configRes = await storage.getSystemConfig("rank_payout_requirements");
      const requirementsMap = configRes?.value as any || {
        "nawa aya": { minAds: 5, minTasks: 0 },
        "munna": { minAds: 10, minTasks: 1 },
        "bawa ji": { minAds: 15, minTasks: 2 },
        "haji saab": { minAds: 20, minTasks: 3 },
        "chacha supreme": { minAds: 30, minTasks: 5 }
      };

      const rankReqs = (requirementsMap[userRank] || requirementsMap["nawa aya"]) as { minAds: number, minTasks: number };
      
      const adsWatchedToday = await storage.getTodayAdViews(userId);
      const cpaTasksCompletedToday = await storage.getTodayCompletedTasksByType(userId, "internal");

      const adsRequirementMet = adsWatchedToday >= rankReqs.minAds;
      const cpaRequirementMet = cpaTasksCompletedToday >= rankReqs.minTasks;

      if (incompleteMandatory.length > 0 || !adsRequirementMet || !cpaRequirementMet) {
        return res.status(403).json({
          message: "PAYOUT_LOCKED",
          details: "Financial Protocol Violation: Mandatory daily requirements not met.",
          requirements: {
            mandatoryTasks: {
              completed: incompleteMandatory.length === 0,
              pending: incompleteMandatory.map(t => t.task.title)
            },
            ads: {
              required: rankReqs.minAds,
              completed: adsWatchedToday,
              met: adsRequirementMet
            },
            cpa: {
              required: rankReqs.minTasks,
              completed: cpaTasksCompletedToday,
              met: cpaRequirementMet
            }
          }
        });
      }

      const userWithdrawals = await storage.getWithdrawalsByUserId(userId);
      res.json(userWithdrawals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  // Request Payout endpoint
  app.post("/api/withdrawals", async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // --- PAYOUT LOCK LOGIC (Repeated for POST to ensure security) ---
      const tasksWithRecords = await storage.getDailyTasksForUser(userId);
      const user = await storage.getUserById(userId);
      const userRank = (user?.rank || "Nawa Aya").toLowerCase();

      const incompleteMandatory = tasksWithRecords.filter(({ task, record }) => {
        const isTargeted = (task.targetRank || "nawa aya").toLowerCase() === "nawa aya" || (task.targetRank || "nawa aya").toLowerCase() === userRank;
        const isCompleted = record?.status === 'completed';
        return task.isActive && task.isMandatory && isTargeted && !isCompleted;
      });

      const configRes = await storage.getSystemConfig("rank_payout_requirements");
      const requirementsMap = configRes?.value as any || {
        "nawa aya": { minAds: 5, minTasks: 0 },
        "munna": { minAds: 10, minTasks: 1 },
        "bawa ji": { minAds: 15, minTasks: 2 },
        "haji saab": { minAds: 20, minTasks: 3 },
        "chacha supreme": { minAds: 30, minTasks: 5 }
      };
      const rankReqs = (requirementsMap[userRank] || requirementsMap["nawa aya"]) as { minAds: number; minTasks: number };
      
      const adsWatchedToday = await storage.getTodayAdViews(userId);
      const cpaTasksCompletedToday = await storage.getTodayCompletedTasksByType(userId, "internal");

      if (incompleteMandatory.length > 0 || adsWatchedToday < rankReqs.minAds || cpaTasksCompletedToday < rankReqs.minTasks) {
        return res.status(403).json({ message: "PAYOUT_LOCKED" });
      }

      const withdrawalData = insertWithdrawalSchema.parse({
        ...req.body,
        userId
      });

      const withdrawal = await storage.createWithdrawal(withdrawalData);

      res.status(201).json({
        success: true,
        withdrawal,
        message: "Withdrawal request submitted successfully"
      });
    } catch (error) {
      console.error("Create withdrawal error:", error);
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
      const guild = await storage.createGuild({ name: name.trim(), description, captainId: userId });
      res.status(201).json({ guild });
    } catch (error) {
      console.error("Create guild error:", error);
      const message = error instanceof Error ? error.message : "Failed to create guild";
      res.status(400).json({ message });
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

  app.get("/api/guilds/:id/vault", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.getUserGuildMembership(userId);
      if (!membership || membership.guildId !== req.params.id || membership.status !== "active") {
        return res.status(403).json({ message: "You must be an active member of this guild to view its vault." });
      }
      const status = await storage.getGuildVaultStatus(req.params.id);
      res.json(status);
    } catch (error) {
      console.error("Get guild vault error:", error);
      res.status(500).json({ message: "Failed to fetch guild vault" });
    }
  });

  app.post("/api/guilds/:id/join", requireSessionAuth, async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req) as string;
      const membership = await storage.requestToJoinGuild(req.params.id, userId);
      res.status(201).json({ membership });
    } catch (error) {
      console.error("Join guild error:", error);
      const message = error instanceof Error ? error.message : "Failed to request guild join";
      res.status(400).json({ message });
    }
  });

  app.post("/api/guilds/:id/members/:userId/approve", requireSessionAuth, async (req, res) => {
    try {
      const captainId = getThorxPrincipalId(req) as string;
      const membership = await storage.decideGuildJoinRequest(req.params.id, req.params.userId, captainId, true);
      res.json({ membership });
    } catch (error) {
      console.error("Approve guild join error:", error);
      const message = error instanceof Error ? error.message : "Failed to approve join request";
      res.status(400).json({ message });
    }
  });

  app.post("/api/guilds/:id/members/:userId/reject", requireSessionAuth, async (req, res) => {
    try {
      const captainId = getThorxPrincipalId(req) as string;
      const membership = await storage.decideGuildJoinRequest(req.params.id, req.params.userId, captainId, false);
      res.json({ membership });
    } catch (error) {
      console.error("Reject guild join error:", error);
      const message = error instanceof Error ? error.message : "Failed to reject join request";
      res.status(400).json({ message });
    }
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

  app.post("/api/admin/guilds/:id/status", requireTeamRole, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["active", "frozen", "disbanded"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be active, frozen, or disbanded." });
      }
      const guild = await storage.setGuildStatus(req.params.id, status);
      res.json({ guild });
    } catch (error) {
      console.error("Admin set guild status error:", error);
      const message = error instanceof Error ? error.message : "Failed to update guild status";
      res.status(400).json({ message });
    }
  });

  app.post("/api/admin/guilds/:id/strikes", requireTeamRole, async (req, res) => {
    try {
      const adminId = getThorxPrincipalId(req) as string;
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ message: "A reason is required to add a strike." });
      }
      const result = await storage.addManualGuildStrike(req.params.id, reason.trim(), adminId);
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
      const result = await storage.runGuildWeeklyResolution();
      res.json(result);
    } catch (error) {
      console.error("Admin run guild resolution error:", error);
      res.status(500).json({ message: "Failed to run guild weekly resolution" });
    }
  });

  // Create ad view endpoint (no auth required)
  app.post("/api/ad-view", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

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

      // Verify the user actually waited long enough since their LAST ad view
      const lastViews = await storage.getUserAdViews(thorxPid, 1);
      if (lastViews.length > 0 && lastViews[0].createdAt) {
          const lastViewTime = new Date(lastViews[0].createdAt).getTime();
          const timeSinceLastAd = (Date.now() - lastViewTime) / 1000;

          // Enforce ad duration + 2 second buffer for network latency
          if (timeSinceLastAd < (adConfig.duration - 2)) {
            return res.status(429).json({
              message: "Protocol Interruption: Ad watch duration insufficient.",
              error: "RATE_LIMITED"
            });
          }
      }

      const adViewData = {
        userId: thorxPid,
        adId: adId,
        adType: adConfig.type,
        duration: adConfig.duration,
        completed: true, // Only rewards on completion
        earnedAmount: adConfig.reward,
      };

      const adView = await storage.createAdView(adViewData);

      res.status(201).json({
        success: true,
        adView,
        message: `Authentication Successful: ${adConfig.reward} PKR credited to pending.`
      });
    } catch (error) {
      console.error("Create ad view error:", error);
      res.status(500).json({
        message: "Failed to record ad view",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get today's ad views count (no auth required)
  app.get("/api/ad-views/today", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      // Check if it's an anonymous user
      if (thorxPid.startsWith('anonymous_')) {
        return res.json({ count: 0 });
      }

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
  app.get("/api/dashboard/stats", async (req, res) => {
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
          totalEarnings: "0.00",
          availableBalance: "0.00",
          pendingBalance: "0.00",
          todayEarnings: "0.00",
          weeklyEarnings: "0.00",
          monthlyEarnings: "0.00",
          referralCount: 0,
          referralEarnings: "0.00",
          adsWatchedToday: 0,
          adsWatchedTotal: 0,
          dailyGoalProgress: 0
        });
      }

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
  app.get("/api/earnings/history", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      if (thorxPid.startsWith('anonymous_')) {
        return res.json([]);
      }

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
  app.get("/api/referrals/leaderboard", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      if (thorxPid.startsWith('anonymous_')) {
        return res.json([]);
      }

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
  app.get("/api/referrals/stats/detailed", async (req, res) => {
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
          totalReferrals: 0,
          level1Count: 0,
          level2Count: 0,
          totalCommissionEarnings: "0.00",
          level1Earnings: "0.00",
          level2Earnings: "0.00",
          pendingCommissions: "0.00",
          paidCommissions: "0.00"
        });
      }

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
  app.get("/api/transactions/history", async (req, res) => {
    try {
      const thorxPid = getThorxPrincipalId(req);
      if (!thorxPid) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      if (thorxPid.startsWith('anonymous_')) {
        return res.json([]);
      }

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
  app.post("/api/rank/refresh", async (req, res) => {
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

  // Legacy registration endpoint (keeping for backward compatibility)
  app.post("/api/legacy-register", async (req, res) => {
    try {
      const validatedData = insertRegistrationSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered",
          error: "DUPLICATE_EMAIL"
        });
      }

      // Convert registration data to user data format
      const { email, phone } = validatedData;
      const emailPrefix = email.split("@")[0] || "legacy";
      const firstName = emailPrefix.slice(0, 20);
      const lastName = "User";
      const passwordHash = `legacy_${Date.now()}`;
      const identity = `LEGACY_${Date.now()}`;
      const role = "user";

      const user = await storage.createUser({
        firstName,
        lastName,
        email,
        phone: phone || "",
        passwordHash,
        password: passwordHash || "legacy",
        identity: identity || `LEGACY_${Date.now()}`,
        role: role || 'user',
        name: `${firstName} ${lastName}`
      });

      res.status(201).json({
        success: true,
        referralCode: user.referralCode,
        message: "Registration successful"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid registration data",
          errors: error.errors
        });
      }

      console.error("Legacy registration error:", error);
      res.status(500).json({
        message: "Registration failed",
        error: "INTERNAL_ERROR"
      });
    }
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
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required")
  });

  // Send team email
  app.post("/api/team/emails", async (req, res) => {
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
      console.error("Fetch withdrawals error:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
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
      console.error("Bulk update withdrawals error:", error);
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
  app.post("/api/admin/users/:userId/adjust-balance", requirePermission("MANAGE_USERS"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, type, reason, creditIntent } = req.body;
      const adminId = req.userProfile.id;

      // When adding credit, a creditIntent is required to distinguish verified deposits from manual adjustments
      if (type === 'add' && creditIntent && !['verified_deposit', 'admin_credit'].includes(creditIntent)) {
        return res.status(400).json({ message: "Invalid creditIntent value" });
      }

      const user = await storage.adjustUserBalance(userId, amount, type, adminId, reason, creditIntent ?? 'admin_credit');
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

  // ── Founder Profit Ledger ────────────────────────────────────────────────────

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

      broadcastUserUpdated(updated.userId, `withdrawal_${status}`);
      res.json({ success: true, withdrawal: updated });
    } catch (error) {
      console.error("Update withdrawal error:", error);
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
  app.get("/api/admin/notes/:targetType/:targetId", async (req, res) => {
    try {
      if (!req.userProfile) return res.status(401).json({ message: "Authentication required" });

      const adminKeys = await storage.getTeamKeysByUser(req.userProfile.id);
      const isAdmin = adminKeys.some(k => k.accessLevel === 'admin' || k.accessLevel === 'founder');

      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

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

  // User contact message endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, description } = req.body;

      if (!name || !email || !description) {
        return res.status(400).json({
          message: "Name, email, and description are required",
          error: "MISSING_FIELDS"
        });
      }

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
  app.post("/api/auth/mark-verified", async (req, res) => {
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
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          message: "Message is required",
          error: "INVALID_INPUT"
        });
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

  app.get("/api/chat/stats", async (req, res) => {
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

  app.get("/api/chat/history", async (req, res) => {
    try {
      // Try to get authenticated user from session
      const userId = getThorxPrincipalId(req);

      if (!userId) {
        return res.json({ messages: [] });
      }

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
        "CONVERSION_RATE", "VAULT_HOLD_PCT", "WEEKLY_GOAL_TARGETS_BY_RANK", "VAULT_RELEASE_MULTIPLIER_BY_RANK",
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

  // --- Admin System Configuration Management ---
  app.get("/api/admin/config", requireTeamRole, async (req, res) => {
    try {
      const configs = await db.select().from(systemConfig).orderBy(systemConfig.key);
      res.json({ configs });
    } catch (error) {
      console.error("Error fetching admin configs:", error);
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  app.patch("/api/admin/config/:key", requireTeamRole, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const allowedKeys = [
        "AD_NETWORKS", "CPA_NETWORKS", "MIN_PAYOUT",
        "WITHDRAWAL_FEE_PCT", "REFERRAL_FEE_SHARE_PCT",
        "CONVERSION_RATE", "VAULT_HOLD_PCT", "WEEKLY_GOAL_TARGETS_BY_RANK", "VAULT_RELEASE_MULTIPLIER_BY_RANK",
      ];

      if (!allowedKeys.includes(key)) {
        return res.status(403).json({ message: "Access to this configuration key is restricted." });
      }
      if (value === undefined || value === null) {
        return res.status(400).json({ message: "Value is required." });
      }

      // Upsert: update if exists, insert if not
      const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(systemConfig).set({ value, updatedAt: new Date() }).where(eq(systemConfig.key, key));
      } else {
        await db.insert(systemConfig).values({ key, value, updatedAt: new Date() });
      }

      // Audit log the configuration change
      if (req.userProfile) {
        await storage.createAuditLog({
          adminId: req.userProfile.id,
          action: `CONFIG_UPDATE_${key}`,
          targetType: "system_config",
          targetId: key,
          details: { key, newValue: value },
          ipAddress: req.ip
        });
      }

      res.json({ key, value, message: "Configuration synchronized successfully" });
    } catch (error) {
      console.error(`Error updating config ${req.params.key}:`, error);
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

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
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const user = await storage.getUserById(userId);
      const userRank = (user?.rank || "Nawa Aya").toLowerCase();

      const tasksWithRecords = await storage.getDailyTasksForUser(userId);
      
      // Filter by rank and active status
      const filteredTasks = tasksWithRecords.filter(({ task }) => {
          const isTargeted = (task.targetRank || "nawa aya").toLowerCase() === "nawa aya" || (task.targetRank || "nawa aya").toLowerCase() === userRank;
          return isTargeted && task.isActive;
      });

      res.json(filteredTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks/:id/click", async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

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

  app.post("/api/tasks/:id/verify", async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

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

      // Mark as completed
      const updatedRecord = await storage.updateTaskRecord(record.id, {
        status: 'completed',
        completedAt: new Date()
      } as any);

      res.json({ success: true, record: updatedRecord });
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });


  app.patch("/api/hilltopads/config/:id", requireTeamRole, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const config = await storage.updateHilltopAdsConfig(id, updates);

      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }

      res.json(config);
    } catch (error) {
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
      const updates = req.body;

      const zone = await storage.updateHilltopAdsZone(id, updates);

      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }

      res.json(zone);
    } catch (error) {
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
      const allUsers = await storage.getAllUsers();
      const targetUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

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
  app.patch("/api/admin/users/:id/rank", requirePermission("MANAGE_USERS"), async (req, res) => {
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
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array of structural identifiers." });
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

  app.get("/api/tasks/completed/today/:type", async (req, res) => {
    try {
      const userId = getThorxPrincipalId(req);
      if (!userId || userId.startsWith('anonymous_')) return res.status(401).json({ message: "Not authenticated" });
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

  const httpServer = createServer(app);
  initRealtime(httpServer, session(sessionConfig));
  return httpServer;
}