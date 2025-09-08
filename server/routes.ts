import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { insertRegistrationSchema, insertUserSchema } from "@shared/schema";
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
    };
  }
}

// Authentication middleware
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

  // User registration endpoint
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
      
      // Create session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

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

  // User login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.validateUserPassword(validatedData.email, validatedData.password);
      if (!user) {
        return res.status(401).json({ 
          message: "Invalid email or password",
          error: "INVALID_CREDENTIALS"
        });
      }

      // Create session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

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

  // User logout endpoint
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

  // Get current user endpoint
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
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

  const httpServer = createServer(app);
  return httpServer;
}
