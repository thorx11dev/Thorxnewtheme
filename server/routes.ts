import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { insertRegistrationSchema, insertUserSchema } from "@shared/schema";
import { createServerSupabaseClient } from "./supabase";
import { z } from "zod";
import { validateEmailServer, validatePhoneServer, normalizePhoneNumber } from "./validation";

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

// Extend Express Request to include Supabase user and anonymous user
declare global {
  namespace Express {
    interface Request {
      user?: any; // Supabase user object
      userProfile?: any; // Local user profile with role
      anonymousUser?: any; // Anonymous user object for iframe environments
    }
  }
}

// Supabase Authentication middleware
export const requireSupabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: "Authentication required",
        error: "UNAUTHORIZED"
      });
    }

    const token = authHeader.substring(7);
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        message: "Invalid or expired token",
        error: "UNAUTHORIZED"
      });
    }

    // Get user profile from local database including role
    const userProfile = await storage.getUserById(user.id);
    if (!userProfile) {
      return res.status(404).json({
        message: "User profile not found",
        error: "USER_NOT_FOUND"
      });
    }

    // Attach both Supabase user and local profile to request
    req.user = user;
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

// Team role enforcement middleware (requires Supabase auth)
export const requireTeamRole = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure Supabase authentication
  await requireSupabaseAuth(req, res, () => {
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

  // Configure session with proper cookie settings for iframe environments
  const sessionConfig = {
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
    }),
    secret: process.env.SESSION_SECRET || "thorx-secret-key-dev-only",
    resave: false,
    saveUninitialized: true, // Allow saving uninitialized sessions for anonymous users
    cookie: {
      httpOnly: true,
      // For iframe environments, we need secure cookies with sameSite none
      secure: isReplit || process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: isReplit ? "none" as const : (process.env.NODE_ENV === "production" ? "strict" as const : "lax" as const),
      // Ensure domain is not set for iframe compatibility
      domain: undefined,
    },
  };

  console.log("Session cookie config:", sessionConfig.cookie);

  app.use(session(sessionConfig));



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

      res.clearCookie("connect.sid");
      res.json({
        success: true,
        message: "Logout successful"
      });
    });
  });

  // Get current user endpoint (no auth required)
  app.get("/api/user", async (req, res) => {
    try {
      // Check if authenticated via anonymous token (iframe environment)
      if (req.anonymousUser) {
        return res.json(req.anonymousUser);
      }

      // Check if it's an anonymous user via session (regular browser)
      if (req.session.userId && req.session.userId.startsWith('anonymous_')) {
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

      // Regular authenticated user
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
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
      console.error("Get user error:", error);
      res.status(500).json({
        message: "Failed to fetch user data",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Get user earnings endpoint (no auth required)
  app.get("/api/earnings", async (req, res) => {
    try {
      // Check if it's an anonymous user
      if (req.session.userId!.startsWith('anonymous_')) {
        return res.json({
          earnings: [],
          total: "0.00"
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const earnings = await storage.getUserEarnings(req.session.userId!, limit);

      res.json({
        earnings,
        total: await storage.getUserTotalEarnings(req.session.userId!)
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
      // Check if it's an anonymous user
      if (req.session.userId!.startsWith('anonymous_')) {
        return res.json({
          referrals: [],
          stats: { count: 0, totalEarned: "0.00" }
        });
      }

      const referrals = await storage.getUserReferrals(req.session.userId!);
      const stats = await storage.getReferralStats(req.session.userId!);

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
      const adViewData = {
        userId: req.session.userId!,
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
      // Check if it's an anonymous user
      if (req.session.userId!.startsWith('anonymous_')) {
        return res.json({ count: 0 });
      }

      const count = await storage.getTodayAdViews(req.session.userId!);
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
      const teamMemberData = {
        firstName: memberName.split(' ')[0] || memberName,
        lastName: memberName.split(' ').slice(1).join(' ') || 'Member',
        identity: `TEAM_${Date.now()}`,
        phone: "+92 300 0000000", // Default team member phone
        email: email,
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
        identity: `FOUNDER_${Date.now()}`,
        phone: "+1 555 0000000",
        email,
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
      const { name, email, password, phone, identity, referralCode, role } = req.body;

      // Split name into first and last name for backward compatibility if needed
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

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
        passwordHash: validatedData.password // Password will be hashed in storage layer
      });

      // Set session
      req.session.userId = newUser.id;
      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
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

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "UNAUTHORIZED"
        });
      }

      // Verify password
      const isMatch = await storage.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "UNAUTHORIZED"
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
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
          ...req.session.user,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
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
      const { message } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          message: "Message is required",
          error: "INVALID_INPUT"
        });
      }

      // Try to get authenticated user, but don't require it
      let userId = null;
      let userName = 'User';
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const supabase = createServerSupabaseClient();
          const { data: { user } } = await supabase.auth.getUser(token);
          
          if (user) {
            userId = user.id;
            const userProfile = await storage.getUserById(user.id);
            if (userProfile) {
              userName = userProfile.firstName || 'User';
            }
          }
        } catch (authError) {
          // Continue without authentication
          console.log('Chatbot auth optional, continuing anonymously');
        }
      }

      const { chatbotService } = await import('./chatbot/chatbot-service');
      const botResponse = chatbotService.processMessage(message.trim(), userName);

      // Only save to database if user is authenticated
      if (userId) {
        try {
          await storage.createChatMessage({
            userId,
            message: message.trim(),
            sender: 'user',
            language: botResponse.language,
            intent: botResponse.intent
          });

          await storage.createChatMessage({
            userId,
            message: botResponse.response,
            sender: 'support',
            language: botResponse.language,
            intent: botResponse.intent
          });
        } catch (dbError) {
          console.error('Failed to save chat messages:', dbError);
          // Continue anyway, user still gets response
        }
      }

      res.json({
        response: botResponse.response,
        language: botResponse.language,
        intent: botResponse.intent
      });
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({
        message: "Failed to process message",
        error: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/chat/history", async (req, res) => {
    try {
      // Try to get authenticated user
      let userId = null;
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const supabase = createServerSupabaseClient();
          const { data: { user } } = await supabase.auth.getUser(token);
          
          if (user) {
            userId = user.id;
          }
        } catch (authError) {
          // Return empty history for unauthenticated users
          return res.json({ messages: [] });
        }
      }

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
  app.post("/api/hilltopads/ad-completion", requireSupabaseAuth, async (req, res) => {
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


  const httpServer = createServer(app);
  return httpServer;
}