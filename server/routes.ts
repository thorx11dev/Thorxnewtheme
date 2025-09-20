import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { insertRegistrationSchema, insertUserSchema } from "@shared/schema";
import { createServerSupabaseClient } from "./supabase";
import { z } from "zod";

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

// Extend Express Request to include Supabase user
declare global {
  namespace Express {
    interface Request {
      user?: any; // Supabase user object
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

    // Attach user to request for downstream use
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      message: "Authentication failed",
      error: "UNAUTHORIZED"
    });
  }
};

// Legacy session-based authentication middleware (for gradual migration)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED"
    });
  }
  next();
};

// Registration/Login schemas for validation
const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  identity: z.string().min(1, "Identity is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  referralCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session management
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);

  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
    }),
    secret: process.env.SESSION_SECRET || "thorx-secret-key-dev-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  }));

  // Supabase user registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const supabase = createServerSupabaseClient();

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        user_metadata: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          identity: validatedData.identity,
          phone: validatedData.phone,
          referralCode: validatedData.referralCode
        }
      });

      if (authError || !authData.user) {
        console.error('Supabase auth registration error:', authError);
        return res.status(400).json({
          message: authError?.message || "Registration failed",
          error: "REGISTRATION_FAILED"
        });
      }

      // Find referrer if referral code provided
      let referredBy: string | undefined;
      if (validatedData.referralCode) {
        const referrer = await storage.getUserByReferralCode(validatedData.referralCode);
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      // Create user data for local database
      const userData = {
        id: authData.user.id, // Use Supabase user ID
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        identity: validatedData.identity,
        phone: validatedData.phone,
        email: validatedData.email,
        passwordHash: 'supabase_managed', // Password managed by Supabase
        referralCode: "", // Will be generated in storage layer
        referredBy,
      };

      const user = await storage.createUser(userData);

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          referralCode: user.referralCode,
        },
        message: "Registration successful"
      });
    } catch (error) {
      console.error("Supabase registration error:", error);
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

  // Note: Client handles login directly via Supabase client
  // This endpoint is removed to avoid exposing session tokens through backend

  // Supabase user logout endpoint
  app.post("/api/auth/logout", requireSupabaseAuth, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7);
      
      if (token) {
        const supabase = createServerSupabaseClient();
        await supabase.auth.admin.signOut(token);
      }

      res.json({
        success: true,
        message: "Logout successful"
      });
    } catch (error) {
      console.error("Supabase logout error:", error);
      res.status(500).json({
        message: "Logout failed",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Supabase get current user endpoint
  app.get("/api/auth/user", requireSupabaseAuth, async (req, res) => {
    try {
      const supabaseUser = req.user;
      const user = await storage.getUserById(supabaseUser.id);
      
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
      console.error("Get Supabase user error:", error);
      res.status(500).json({
        message: "Failed to fetch user data",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Legacy user registration endpoint (session-based)
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered",
          error: "DUPLICATE_EMAIL"
        });
      }

      // Find referrer if referral code provided
      let referredBy: string | undefined;
      if (validatedData.referralCode) {
        const referrer = await storage.getUserByReferralCode(validatedData.referralCode);
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      // Create user data for insertion (referralCode will be generated in storage layer)
      const userData = {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        identity: validatedData.identity,
        phone: validatedData.phone,
        email: validatedData.email,
        passwordHash: validatedData.password, // Will be hashed in storage layer
        referralCode: "", // Placeholder - will be generated in storage layer
        referredBy,
      };

      const user = await storage.createUser(userData);

      // Set session and save it explicitly
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
      };

      // Explicitly save the session before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          referralCode: user.referralCode,
        },
        message: "Registration successful"
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

  // Anonymous login endpoint (no authentication required)
  app.post("/api/anonymous-login", async (req, res) => {
    try {
      // Create anonymous user session with default values
      const anonymousUserId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const anonymousUser = {
        id: anonymousUserId,
        email: "guest@thorx.com",
        firstName: "Guest",
        lastName: "User",
        identity: `GUEST_USER_${Math.floor(Math.random() * 9999) + 1000}`,
        phone: "+92 300 0000000",
        referralCode: `GUEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        totalEarnings: "0.00",
        availableBalance: "0.00",
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Set session data
      req.session.userId = anonymousUserId;
      req.session.user = {
        id: anonymousUserId,
        email: anonymousUser.email,
        firstName: anonymousUser.firstName,
        lastName: anonymousUser.lastName,
      };

      // Store anonymous user data in session for retrieval
      req.session.anonymousUserData = anonymousUser;

      // Force session save and wait for it to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("Anonymous session saved successfully for user:", anonymousUserId);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        user: anonymousUser,
        message: "Anonymous login successful"
      });
    } catch (error) {
      console.error("Anonymous login error:", error);
      res.status(500).json({
        message: "Anonymous login failed",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Legacy user login endpoint (session-based)
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.validateUserPassword(email, password);

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "INVALID_CREDENTIALS"
        });
      }

      // Set session and save it explicitly
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
      };

      // Force session save and wait for it to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          referralCode: user.referralCode,
          totalEarnings: user.totalEarnings,
          availableBalance: user.availableBalance,
        },
        message: "Login successful"
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

  // Legacy get current user endpoint (session-based)
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      // Check if it's an anonymous user
      if (req.session.userId!.startsWith('anonymous_')) {
        // Return the anonymous user data from session
        const anonymousUser = req.session.anonymousUserData || {
          id: req.session.userId!,
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

  // Get user earnings endpoint
  app.get("/api/earnings", requireAuth, async (req, res) => {
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

  // Get user referrals endpoint
  app.get("/api/referrals", requireAuth, async (req, res) => {
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

  // Create ad view endpoint
  app.post("/api/ad-view", requireAuth, async (req, res) => {
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

  // Get today's ad views count
  app.get("/api/ad-views/today", requireAuth, async (req, res) => {
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
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
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
  app.get("/api/team/metrics", requireAuth, async (req, res) => {
    try {
      // Check if user has team role
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

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
  app.post("/api/team/emails", requireAuth, async (req, res) => {
    try {
      // Check if user has team role
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

      const { recipient, subject, message } = teamEmailSchema.parse(req.body);

      const emailData = {
        fromUserId: req.session.userId!,
        toEmail: recipient,
        fromEmail: req.session.user!.email,
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
  app.get("/api/team/emails", requireAuth, async (req, res) => {
    try {
      // Check if user has team role
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

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
  app.get("/api/team/credentials", requireAuth, async (req, res) => {
    try {
      // Check if user has team role
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

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
  app.post("/api/team/members", requireAuth, async (req, res) => {
    try {
      // Check if user has team role AND admin access level
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

      // Get current user's team key to check admin permissions
      const currentUserTeamKeys = await storage.getTeamKeysByUser(req.session.userId!);
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
  app.patch("/api/team/members/:id", requireAuth, async (req, res) => {
    try {
      // Check if user has team role AND admin access level
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

      // Get current user's team key to check admin permissions
      const currentUserTeamKeys = await storage.getTeamKeysByUser(req.session.userId!);
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
  app.delete("/api/team/members/:id", requireAuth, async (req, res) => {
    try {
      // Check if user has team role AND admin access level
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

      // Get current user's team key to check admin permissions
      const currentUserTeamKeys = await storage.getTeamKeysByUser(req.session.userId!);
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
      if (memberId === req.session.userId) {
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
  app.get("/api/team/members", requireAuth, async (req, res) => {
    try {
      // Check if user has team role
      if (req.session.user?.role !== 'team') {
        return res.status(403).json({
          message: "Access denied. Team role required.",
          error: "FORBIDDEN"
        });
      }

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

  const httpServer = createServer(app);
  return httpServer;
}