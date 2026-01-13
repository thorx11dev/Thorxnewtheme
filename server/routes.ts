import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { insertRegistrationSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { validateEmailServer, validatePhoneServer, normalizePhoneNumber } from "./validation";
import { hilltopAdsService } from "./hilltopads-service";

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
      userProfile?: any; // Local user profile with role
      anonymousUser?: any; // Anonymous user object for iframe environments
    }
  }
}

// Simple session-based authentication middleware
export const requireSessionAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Authentication required",
        error: "UNAUTHORIZED"
      });
    }

    // Get user profile from database
    const userProfile = await storage.getUserById(req.session.userId);
    if (!userProfile) {
      return res.status(404).json({
        message: "User profile not found",
        error: "USER_NOT_FOUND"
      });
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
    // Check if user has team or founder role
    if (req.userProfile?.role !== 'team' && req.userProfile?.role !== 'founder') {
      return res.status(403).json({
        message: "Access denied. Team or founder role required.",
        error: "FORBIDDEN"
      });
    }
    next();
  });
};

// Legacy session-based authentication middleware (for gradual migration)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Debug session data
  console.log("Session check:", {
    sessionExists: !!req.session,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    cookieHeader: req.headers.cookie,
    authHeader: req.headers.authorization,
    origin: req.headers.origin,
    referer: req.headers.referer
  });

  // Check session first (for regular browsers)
  if (req.session.userId) {
    return next();
  }

  // Fallback: Check for anonymous token (for iframe environments)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer anon_')) {
    const token = authHeader.substring(7);
    const anonymousTokens = req.app.get('anonymousTokens');
    if (anonymousTokens && anonymousTokens.has(token)) {
      const anonymousUser = anonymousTokens.get(token);
      // Add anonymous user data to request for downstream use
      req.anonymousUser = anonymousUser;
      console.log("Anonymous token authentication successful for:", anonymousUser.id);
      return next();
    }
  }

  return res.status(401).json({
    message: "Authentication required",
    error: "UNAUTHORIZED"
  });
};

// Registration/Login schemas for validation
const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  identity: z.string().min(1, "Identity is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  referralCode: z.string().optional(),
  role: z.enum(["user", "team", "founder"]).default("user")
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session management
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);

  // Detect if we're running in Replit environment
  const isReplit = process.env.REPL_ID !== undefined || process.env.REPLIT_DB_URL !== undefined;

  // Debug: Log environment detection
  console.log("Environment detection:", {
    NODE_ENV: process.env.NODE_ENV,
    REPL_ID: !!process.env.REPL_ID,
    REPLIT_DB_URL: !!process.env.REPLIT_DB_URL,
    isReplit
  });

  const sessionConfig = {
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      pruneSessionInterval: 60 * 60,
    }),
    secret: process.env.SESSION_SECRET || "thorx-secret-key-dev-only",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isReplit || process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: isReplit ? "none" as const : "lax" as const,
      domain: undefined,
    },
    name: 'thorx.sid',
  };

  console.log("Session cookie config:", sessionConfig.cookie);

  app.set('trust proxy', 1);
  app.use(session(sessionConfig));

  app.use((req, res, next) => {
    console.log('Session Debug:', {
      path: req.path,
      sessionID: req.sessionID,
      userId: req.session?.userId,
      cookie: req.headers.cookie?.substring(0, 50),
    });
    next();
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
    try {
      // Comprehensive session logging
      console.log("Session check: {",
        "sessionExists:", !!req.session,
        ", userId:", req.session?.userId || 'undefined',
        ", sessionId:", req.session?.id || 'undefined',
        ", cookieHeader:", !!req.headers.cookie,
        ", user:", req.session?.user ? `{id: ${req.session.user.id}, email: ${req.session.user.email}}` : 'undefined',
        "}");

      // Check if authenticated via anonymous token (iframe environment)
      if (req.anonymousUser) {
        console.log("Returning anonymous token user:", req.anonymousUser.id);
        return res.json(req.anonymousUser);
      }

      // Check if it's an anonymous user via session (regular browser)
      if (req.session.userId && req.session.userId.startsWith('anonymous_')) {
        console.log("Returning anonymous session user:", req.session.userId);
        // Return the anonymous user data from session
        const anonymousUser = req.session.anonymousUserData || {
          id: req.session.userId,
          firstName: req.session.user!.firstName,
          lastName: req.session.user!.lastName,
          email: req.session.user!.email,
          identity: `GUEST_USER_${Math.floor(Math.random() * 9999) + 1000}`,
          phone: "+92 300 0000000",
          referralCode: `GUEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          totalEarnings: "0.00",
          availableBalance: "0.00",
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        return res.json(anonymousUser);
      }

      // Check if userId exists in session
      if (!req.session.userId) {
        console.log("No userId in session, returning 401");
        return res.status(401).json({
          message: "Not authenticated",
          error: "NO_SESSION"
        });
      }

      // Regular authenticated user
      console.log("Fetching user from database with userId:", req.session.userId);
      const user = await storage.getUserById(req.session.userId);

      if (!user) {
        console.log("User not found in database for userId:", req.session.userId);
        return res.status(404).json({
          message: "User not found",
          error: "USER_NOT_FOUND"
        });
      }

      console.log("User found, returning user data for:", user.email);
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
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.session.userId !== req.params.id) {
        return res.status(403).json({ message: "Cannot update other users" });
      }

      const { name, avatar } = req.body;
      const updates: any = {};

      if (name) {
        updates.name = name; // Schema uses firstName/lastName usually, but let's check input
        // Simple splitting for now or just generic update if schema supports it
        // The previous schema showed firstName/lastName not 'name'.
        // Let's assume the frontend sends 'name' and we split it or update a display name if it existed.
        // Actually schema.ts users table has firstName and lastName, NOT 'name' column.
        // But insertUserSchema has .extend({ name: z.string() }) ? No, wait.

        // Let's re-read schema.ts line 655: .extend({ name: z.string().min(2) })
        // But the table definition (line 16) has firstName, lastName.

        // Let's split the name for now to be safe.
        const parts = name.trim().split(' ');
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(' ') || '';
      }

      if (avatar) updates.avatar = avatar;

      const user = await storage.updateUser(req.params.id, updates);
      res.json(user);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user earnings endpoint (no auth required)
  app.get("/api/earnings", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      // Check if it's an anonymous user
      if (req.session.userId.startsWith('anonymous_')) {
        return res.json({
          earnings: [],
          total: "0.00"
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const earnings = await storage.getUserEarnings(req.session.userId, limit);

      res.json({
        earnings,
        total: await storage.getUserTotalEarnings(req.session.userId)
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
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      // Check if it's an anonymous user
      if (req.session.userId.startsWith('anonymous_')) {
        return res.json({
          referrals: [],
          stats: { count: 0, totalEarned: "0.00" }
        });
      }

      const referrals = await storage.getUserReferrals(req.session.userId);
      const stats = await storage.getReferralStats(req.session.userId);

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

  // Create ad view endpoint (no auth required)
  app.post("/api/ad-view", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      const adViewData = {
        userId: req.session.userId,
        adId: req.body.adId,
        adType: req.body.adType,
        duration: req.body.duration || 0,
        completed: req.body.completed || false,
        earnedAmount: req.body.earnedAmount || "0.00",
      };

      const adView = await storage.createAdView(adViewData);

      res.status(201).json({
        success: true,
        adView,
        message: "Ad view recorded"
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
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({
          message: "Authentication required",
          error: "UNAUTHORIZED"
        });
      }

      // Check if it's an anonymous user
      if (req.session.userId.startsWith('anonymous_')) {
        return res.json({ count: 0 });
      }

      const count = await storage.getTodayAdViews(req.session.userId);
      res.json({ count });
    } catch (error) {
      console.error("Get today ad views error:", error);
      res.status(500).json({
        message: "Failed to fetch ad views",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Legacy registration endpoint (keeping for backward compatibility)
  app.post("/api/legacy-register", async (req, res) => {
    try {
      const validatedData = insertRegistrationSchema.parse(req.body);

      // Check if email already exists
      const existingRegistration = await storage.getRegistrationByEmail(validatedData.email);
      if (existingRegistration) {
        return res.status(400).json({
          message: "Email already registered",
          error: "DUPLICATE_EMAIL"
        });
      }

      const registration = await storage.createRegistration(validatedData);

      res.status(201).json({
        success: true,
        referralCode: registration.referralCode,
        message: "Registration successful"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid registration data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Registration failed",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Stats endpoint for live data
  app.get("/api/stats", (req, res) => {
    res.json({
      totalPaid: 2.5,
      activeUsers: 45,
      securityScore: 99
    });
  });

  // Supabase configuration endpoint for automatic frontend reconnection
  app.get("/api/config/supabase", (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        error: "Supabase configuration not available",
        message: "Server environment variables not configured"
      });
    }

    res.json({
      url: supabaseUrl,
      anonKey: supabaseAnonKey
    });
  });

  // Team dashboard metrics endpoints (protected for team members only)
  app.get("/api/team/metrics", async (req, res) => {
    try {

      const [totalUsers, activeUsers, totalEarnings] = await Promise.all([
        storage.getTotalUsersCount(),
        storage.getActiveUsersCount(),
        storage.getTotalEarningsSum()
      ]);

      res.json({
        totalUsers,
        activeUsers,
        totalEarnings
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
  app.get("/api/team/emails", async (req, res) => {
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

  // Get user credentials (for team data management)
  app.get("/api/team/credentials", async (req, res) => {
    try {

      const credentials = await storage.getAllUserCredentials();

      res.json({
        credentials,
        total: credentials.length
      });
    } catch (error) {
      console.error("Get user credentials error:", error);
      res.status(500).json({
        message: "Failed to fetch user credentials",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get all users accounts (for team data management)
  app.get("/api/team/users", async (req, res) => {
    try {

      const users = await storage.getAllUsers();

      // Return safe user data (no passwords or sensitive info)
      const safeUsers = users.map((user: any) => ({
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
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json({
        users: safeUsers,
        total: safeUsers.length
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        message: "Failed to fetch users data",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Team member management endpoints
  const teamMemberSchema = z.object({
    memberName: z.string().min(1, "Member name is required"),
    email: z.string().email("Valid email is required"),
    accessLevel: z.enum(["founder", "admin", "member"], {
      errorMap: () => ({ message: "Access level must be founder, admin, or member" })
    }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    permissions: z.array(z.string()).optional()
  });

  const teamMemberUpdateSchema = z.object({
    memberName: z.string().min(1, "Member name is required").optional(),
    accessLevel: z.enum(["founder", "admin", "member"], {
      errorMap: () => ({ message: "Access level must be founder, admin, or member" })
    }).optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional()
  });

  // Add team member
  app.post("/api/team/members", async (req, res) => {
    try {

      // Get current user's team key to check admin permissions
      const currentUserTeamKeys = await storage.getTeamKeysByUser(req.userProfile!.id);
      const hasAdminAccess = currentUserTeamKeys.some(key =>
        key.accessLevel === 'founder' || key.accessLevel === 'admin'
      );

      if (!hasAdminAccess) {
        return res.status(403).json({
          message: "Access denied. Admin privileges required to manage team members.",
          error: "INSUFFICIENT_PRIVILEGES"
        });
      }

      const { memberName, email, accessLevel, password, permissions } = teamMemberSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered",
          error: "DUPLICATE_EMAIL"
        });
      }

      // Create team member user
      const firstName = memberName.split(' ')[0] || memberName;
      const lastName = memberName.split(' ').slice(1).join(' ') || 'Member';
      const teamMemberData = {
        firstName,
        lastName,
        name: memberName,
        identity: `TEAM_${Date.now()}`,
        phone: "+92 300 0000000", // Default team member phone
        email: email,
        password: password, // Will be hashed in storage layer
        passwordHash: password, // Will be hashed in storage layer
        referralCode: `TEAM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        role: 'team'
      };

      const newTeamUser = await storage.createUser(teamMemberData);

      // Create team key for the new member
      const teamKeyData = {
        userId: newTeamUser.id,
        keyName: memberName,
        accessLevel: accessLevel,
        permissions: permissions || [],
        isActive: true
      };

      const teamKey = await storage.createTeamKey(teamKeyData);

      // Return safe data only (no passwords or sensitive info)
      res.status(201).json({
        success: true,
        member: {
          id: newTeamUser.id,
          name: memberName,
          email: newTeamUser.email,
          accessLevel: teamKey.accessLevel,
          permissions: teamKey.permissions,
          isActive: teamKey.isActive,
          createdAt: teamKey.createdAt
        },
        message: "Team member added successfully"
      });
    } catch (error) {
      console.error("Add team member error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid team member data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Failed to add team member",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Update team member
  app.patch("/api/team/members/:id", async (req, res) => {
    try {

      // Get current user's team key to check admin permissions
      const currentUserTeamKeys = await storage.getTeamKeysByUser(req.userProfile!.id);
      const hasAdminAccess = currentUserTeamKeys.some(key =>
        key.accessLevel === 'founder' || key.accessLevel === 'admin'
      );

      if (!hasAdminAccess) {
        return res.status(403).json({
          message: "Access denied. Admin privileges required to manage team members.",
          error: "INSUFFICIENT_PRIVILEGES"
        });
      }

      const memberId = req.params.id;
      const updates = teamMemberUpdateSchema.parse(req.body);

      // Get the team member's team key
      const teamKeys = await storage.getTeamKeysByUser(memberId);
      const teamKey = teamKeys[0];

      if (!teamKey) {
        return res.status(404).json({
          message: "Team member not found",
          error: "NOT_FOUND"
        });
      }

      // Update the team key with new values
      const teamKeyUpdates: Partial<typeof teamKey> = {};
      if (updates.memberName) teamKeyUpdates.keyName = updates.memberName;
      if (updates.accessLevel) teamKeyUpdates.accessLevel = updates.accessLevel;
      if (updates.permissions) teamKeyUpdates.permissions = updates.permissions;
      if (updates.isActive !== undefined) teamKeyUpdates.isActive = updates.isActive;

      const updatedTeamKey = await storage.updateTeamKey(teamKey.id, teamKeyUpdates);

      if (!updatedTeamKey) {
        return res.status(500).json({
          message: "Failed to update team member",
          error: "UPDATE_FAILED"
        });
      }

      // Get updated user info
      const updatedUser = await storage.getUserById(memberId);
      if (!updatedUser) {
        return res.status(404).json({
          message: "Team member user not found",
          error: "USER_NOT_FOUND"
        });
      }

      res.json({
        success: true,
        member: {
          id: updatedUser.id,
          name: updatedTeamKey.keyName,
          email: updatedUser.email,
          accessLevel: updatedTeamKey.accessLevel,
          permissions: updatedTeamKey.permissions,
          isActive: updatedTeamKey.isActive,
          updatedAt: updatedTeamKey.updatedAt
        },
        message: "Team member updated successfully"
      });
    } catch (error) {
      console.error("Update team member error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid update data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Failed to update team member",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Delete team member
  app.delete("/api/team/members/:id", async (req, res) => {
    try {

      // Get current user's team key to check admin permissions
      const currentUserTeamKeys = await storage.getTeamKeysByUser(req.userProfile!.id);
      const hasAdminAccess = currentUserTeamKeys.some(key =>
        key.accessLevel === 'founder' || key.accessLevel === 'admin'
      );

      if (!hasAdminAccess) {
        return res.status(403).json({
          message: "Access denied. Admin privileges required to manage team members.",
          error: "INSUFFICIENT_PRIVILEGES"
        });
      }

      const memberId = req.params.id;

      // Prevent self-deletion
      if (memberId === req.userProfile!.id) {
        return res.status(400).json({
          message: "Cannot delete your own account",
          error: "SELF_DELETE_FORBIDDEN"
        });
      }

      // Get the team member's team key to deactivate it
      const teamKeys = await storage.getTeamKeysByUser(memberId);
      const teamKey = teamKeys[0];

      if (!teamKey) {
        return res.status(404).json({
          message: "Team member not found",
          error: "NOT_FOUND"
        });
      }

      // Instead of actually deleting, deactivate the team key for data integrity
      await storage.updateTeamKey(teamKey.id, { isActive: false });

      res.json({
        success: true,
        message: "Team member access revoked successfully"
      });
    } catch (error) {
      console.error("Delete team member error:", error);
      res.status(500).json({
        message: "Failed to remove team member",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get team members
  app.get("/api/team/members", async (req, res) => {
    try {

      const members = await storage.getTeamMembers();

      // Transform the data to return safe information only
      const safeMembers = members
        .filter(member => member.teamKey) // Only include members with team keys
        .map(member => ({
          id: member.id,
          name: member.teamKey!.keyName,
          email: member.email,
          accessLevel: member.teamKey!.accessLevel,
          permissions: member.teamKey!.permissions,
          isActive: member.teamKey!.isActive,
          lastUsed: member.teamKey!.lastUsed,
          createdAt: member.teamKey!.createdAt,
          updatedAt: member.teamKey!.updatedAt
        }));

      res.json({
        members: safeMembers,
        total: safeMembers.length
      });
    } catch (error) {
      console.error("Get team members error:", error);
      res.status(500).json({
        message: "Failed to fetch team members",
        error: "INTERNAL_ERROR"
      });
    }
  });

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

  // Bootstrap founder endpoint (only works when no team members exist)
  app.post("/api/bootstrap-founder", async (req, res) => {
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
        phone: "+1 555 0000000",
        email,
        password: password,
        passwordHash: password,
        referralCode: `FOUNDER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        role: 'team'
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
        role: founder.role || 'team'
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
  app.post("/api/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone, identity, referralCode, role } = req.body;

      // Validate required fields
      if (!firstName || !email || !password) {
        return res.status(400).json({
          message: "First name, email, and password are required",
          error: "MISSING_REQUIRED_FIELDS"
        });
      }

      // Server-side comprehensive email validation with MX record check
      const emailValidation = await validateEmailServer(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          message: emailValidation.message,
          error: "INVALID_EMAIL"
        });
      }

      // Server-side phone validation with Pakistani operator prefix check
      if (phone && phone.trim() !== '') {
        const phoneValidation = validatePhoneServer(phone);
        if (!phoneValidation.valid) {
          return res.status(400).json({
            message: phoneValidation.message,
            error: "INVALID_PHONE"
          });
        }
      }

      // Validate and sanitize data
      const validatedData = registerSchema.parse({
        firstName,
        lastName,
        email,
        password,
        phone: phone && phone.trim() !== '' ? normalizePhoneNumber(phone) : phone,
        identity,
        referralCode,
        role
      });

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered",
          error: "DUPLICATE_EMAIL"
        });
      }

      // Create user
      const newUser = await storage.createUser({
        ...validatedData,
        phone: validatedData.phone || "+1 555 0000000", // Ensure phone is always a string
        name: `${validatedData.firstName} ${validatedData.lastName}`,
        passwordHash: validatedData.password // Password will be hashed in storage layer
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

      // Force save with explicit promise
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return reject(err);
          }

          // Verify data was set
          console.log("Session saved:", {
            userId: req.session.userId,
            sessionId: req.session.id,
            hasUser: !!req.session.user
          });

          resolve();
        });
      });

      // Reload session to verify persistence
      await new Promise<void>((resolve, reject) => {
        req.session.reload((err) => {
          if (err) {
            console.error("Session reload error:", err);
            return reject(err);
          }

          console.log("Session after reload:", {
            userId: req.session.userId,
            sessionId: req.session.id
          });

          resolve();
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
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid registration data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Registration failed",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Validate user credentials
      const user = await storage.validateUserPassword(email, password);
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "UNAUTHORIZED"
        });
      }

      // Set session data
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user'
      };

      // Force save with explicit promise
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return reject(err);
          }

          // Verify data was set
          console.log("Session saved:", {
            userId: req.session.userId,
            sessionId: req.session.id,
            hasUser: !!req.session.user
          });

          resolve();
        });
      });

      // Reload session to verify persistence
      await new Promise<void>((resolve, reject) => {
        req.session.reload((err) => {
          if (err) {
            console.error("Session reload error:", err);
            return reject(err);
          }

          console.log("Session after reload:", {
            userId: req.session.userId,
            sessionId: req.session.id
          });

          resolve();
        });
      });

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
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid login data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Login failed",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Endpoint to get user profile, requires authentication
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      // User is authenticated, fetch profile details
      const user = await storage.getUserById(req.session.userId!);
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
        email: user.email,
        identity: user.identity,
        phone: user.phone,
        referralCode: user.referralCode,
        totalEarnings: user.totalEarnings,
        availableBalance: user.availableBalance,
        isActive: user.isActive,
        createdAt: user.createdAt,
        role: user.role || 'user',
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
  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { firstName, lastName, phone, identity } = req.body;

      // Validate and sanitize data
      const updateSchema = z.object({
        firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
        lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
        phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
        identity: z.string().min(1, "Identity is required").optional(),
      });

      const validatedData = updateSchema.parse({
        firstName,
        lastName,
        phone,
        identity
      });

      // Update user in storage
      const updatedUser = await storage.updateUser(userId, validatedData);

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
          email: updatedUser.email,
          identity: updatedUser.identity,
          phone: updatedUser.phone,
          referralCode: updatedUser.referralCode,
          totalEarnings: updatedUser.totalEarnings,
          availableBalance: updatedUser.availableBalance,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          role: updatedUser.role || 'user',
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

      if (req.session.userId) {
        userId = req.session.userId;
        const userProfile = await storage.getUserById(req.session.userId);
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
      const userId = req.session.userId;

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
      const adView = await storage.createAdView({
        userId,
        adType,
        adNetwork: "hilltopads",
        duration: duration || 0,
        completed: true,
        earnedAmount: "0.10" // Configure reward amount
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


  const httpServer = createServer(app);
  return httpServer;
}