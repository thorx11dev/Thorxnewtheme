import { 
  type Registration, 
  type InsertRegistration,
  type User,
  type InsertUser,
  type UpsertUser,
  type Earning,
  type InsertEarning,
  type AdView,
  type InsertAdView,
  type Referral,
  type InsertReferral,
  type DailyTask,
  type InsertDailyTask,
  users,
  earnings,
  adViews,
  referrals,
  dailyTasks
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Legacy registration methods (keeping for backward compatibility)
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getRegistrationByEmail(email: string): Promise<Registration | undefined>;
  
  // User management methods (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Legacy user methods (keeping for backward compatibility)
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  updateUserEarnings(userId: string, amount: string): Promise<void>;
  
  // Earnings methods
  createEarning(earning: InsertEarning): Promise<Earning>;
  getUserEarnings(userId: string, limit?: number): Promise<Earning[]>;
  getUserTotalEarnings(userId: string): Promise<string>;
  
  // Ad views methods
  createAdView(adView: InsertAdView): Promise<AdView>;
  getUserAdViews(userId: string, limit?: number): Promise<AdView[]>;
  getTodayAdViews(userId: string): Promise<number>;
  
  // Referrals methods
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Array<Referral & { referred: User }>>;
  getReferralStats(userId: string): Promise<{ count: number; totalEarned: string }>;
  
  // Daily tasks methods
  createDailyTask(task: InsertDailyTask): Promise<DailyTask>;
  getUserTodayTasks(userId: string): Promise<DailyTask[]>;
  markTaskComplete(taskId: string, earnedAmount: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Legacy registration methods
  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    // This method is kept for backward compatibility but not used in new system
    const id = randomUUID();
    const referralCode = this.generateReferralCode();
    const registration: Registration = { 
      ...insertRegistration, 
      id,
      referralCode
    };
    return registration;
  }

  async getRegistrationByEmail(email: string): Promise<Registration | undefined> {
    // This method is kept for backward compatibility but not used in new system
    return undefined;
  }

  // User management methods (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Legacy user methods
  async createUser(insertUser: InsertUser): Promise<User> {
    const referralCode = this.generateReferralCode();
    
    const userData = {
      ...insertUser,
      referralCode,
    };

    const [user] = await db.insert(users).values(userData).returning();
    
    // If user was referred, create referral record
    if (insertUser.referredBy) {
      await this.createReferral({
        referrerId: insertUser.referredBy,
        referredId: user.id,
      });
    }
    
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user;
  }


  async updateUserEarnings(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({
        totalEarnings: sql`${users.totalEarnings} + ${amount}`,
        availableBalance: sql`${users.availableBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Earnings methods
  async createEarning(insertEarning: InsertEarning): Promise<Earning> {
    const [earning] = await db.insert(earnings).values(insertEarning).returning();
    
    // Update user's total earnings
    await this.updateUserEarnings(insertEarning.userId, insertEarning.amount);
    
    return earning;
  }

  async getUserEarnings(userId: string, limit = 50): Promise<Earning[]> {
    return await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(desc(earnings.createdAt))
      .limit(limit);
  }

  async getUserTotalEarnings(userId: string): Promise<string> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')` })
      .from(earnings)
      .where(eq(earnings.userId, userId));
    
    return result?.total || "0.00";
  }

  // Ad views methods
  async createAdView(insertAdView: InsertAdView): Promise<AdView> {
    const [adView] = await db.insert(adViews).values(insertAdView).returning();
    
    // Create corresponding earning record
    if (insertAdView.completed && insertAdView.earnedAmount) {
      await this.createEarning({
        userId: insertAdView.userId,
        type: "ad_view",
        amount: insertAdView.earnedAmount,
        description: `Watched ${insertAdView.adType} ad`,
        status: "completed",
      });
    }
    
    return adView;
  }

  async getUserAdViews(userId: string, limit = 50): Promise<AdView[]> {
    return await db
      .select()
      .from(adViews)
      .where(eq(adViews.userId, userId))
      .orderBy(desc(adViews.createdAt))
      .limit(limit);
  }

  async getTodayAdViews(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(adViews)
      .where(
        and(
          eq(adViews.userId, userId),
          sql`${adViews.createdAt} >= ${today}`,
          eq(adViews.completed, true)
        )
      );
    
    return result?.count || 0;
  }

  // Referrals methods
  async createReferral(insertReferral: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(insertReferral).returning();
    return referral;
  }

  async getUserReferrals(userId: string): Promise<Array<Referral & { referred: User }>> {
    return await db
      .select({
        id: referrals.id,
        referrerId: referrals.referrerId,
        referredId: referrals.referredId,
        status: referrals.status,
        totalEarned: referrals.totalEarned,
        createdAt: referrals.createdAt,
        referred: users,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referredId, users.id))
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralStats(userId: string): Promise<{ count: number; totalEarned: string }> {
    const [result] = await db
      .select({ 
        count: sql<number>`COUNT(*)`,
        totalEarned: sql<string>`COALESCE(SUM(${referrals.totalEarned}), '0.00')`
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    
    return {
      count: result?.count || 0,
      totalEarned: result?.totalEarned || "0.00",
    };
  }

  // Daily tasks methods
  async createDailyTask(insertTask: InsertDailyTask): Promise<DailyTask> {
    const [task] = await db.insert(dailyTasks).values(insertTask).returning();
    return task;
  }

  async getUserTodayTasks(userId: string): Promise<DailyTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db
      .select()
      .from(dailyTasks)
      .where(
        and(
          eq(dailyTasks.userId, userId),
          sql`${dailyTasks.date} >= ${today}`
        )
      )
      .orderBy(desc(dailyTasks.date));
  }

  async markTaskComplete(taskId: string, earnedAmount: string): Promise<void> {
    const [task] = await db
      .update(dailyTasks)
      .set({ 
        completed: true, 
        earnedAmount 
      })
      .where(eq(dailyTasks.id, taskId))
      .returning();

    if (task) {
      // Create earning record
      await this.createEarning({
        userId: task.userId,
        type: "daily_task",
        amount: earnedAmount,
        description: `Completed daily task: ${task.taskType}`,
        status: "completed",
      });
    }
  }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}

export class MemStorage implements IStorage {
  private registrations: Map<string, Registration>;

  constructor() {
    this.registrations = new Map();
  }

  // Legacy registration methods
  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const id = randomUUID();
    const referralCode = this.generateReferralCode();
    const registration: Registration = { 
      ...insertRegistration, 
      id,
      referralCode
    };
    this.registrations.set(id, registration);
    return registration;
  }

  async getRegistrationByEmail(email: string): Promise<Registration | undefined> {
    return Array.from(this.registrations.values()).find(
      (registration) => registration.email === email,
    );
  }

  // Stub implementations for new methods (not used in production)
  async getUser(id: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async upsertUser(user: UpsertUser): Promise<User> { throw new Error("Not implemented in MemStorage"); }
  async createUser(user: InsertUser): Promise<User> { throw new Error("Not implemented in MemStorage"); }
  async getUserById(id: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getUserByEmail(email: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async updateUserEarnings(userId: string, amount: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async createEarning(earning: InsertEarning): Promise<Earning> { throw new Error("Not implemented in MemStorage"); }
  async getUserEarnings(userId: string, limit?: number): Promise<Earning[]> { throw new Error("Not implemented in MemStorage"); }
  async getUserTotalEarnings(userId: string): Promise<string> { throw new Error("Not implemented in MemStorage"); }
  async createAdView(adView: InsertAdView): Promise<AdView> { throw new Error("Not implemented in MemStorage"); }
  async getUserAdViews(userId: string, limit?: number): Promise<AdView[]> { throw new Error("Not implemented in MemStorage"); }
  async getTodayAdViews(userId: string): Promise<number> { throw new Error("Not implemented in MemStorage"); }
  async createReferral(referral: InsertReferral): Promise<Referral> { throw new Error("Not implemented in MemStorage"); }
  async getUserReferrals(userId: string): Promise<Array<Referral & { referred: User }>> { throw new Error("Not implemented in MemStorage"); }
  async getReferralStats(userId: string): Promise<{ count: number; totalEarned: string }> { throw new Error("Not implemented in MemStorage"); }
  async createDailyTask(task: InsertDailyTask): Promise<DailyTask> { throw new Error("Not implemented in MemStorage"); }
  async getUserTodayTasks(userId: string): Promise<DailyTask[]> { throw new Error("Not implemented in MemStorage"); }
  async markTaskComplete(taskId: string, earnedAmount: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}

// Use DatabaseStorage for production
export const storage = new DatabaseStorage();
