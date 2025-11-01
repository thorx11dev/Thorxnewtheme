import { 
  type Registration, 
  type InsertRegistration,
  type User,
  type InsertUser,
  type Earning,
  type InsertEarning,
  type AdView,
  type InsertAdView,
  type Referral,
  type InsertReferral,
  type DailyTask,
  type InsertDailyTask,
  type TeamEmail,
  type InsertTeamEmail,
  type TeamKey,
  type InsertTeamKey,
  type UserCredential,
  type InsertUserCredential,
  type ChatMessage,
  type InsertChatMessage,
  type HilltopAdsConfig,
  type InsertHilltopAdsConfig,
  type HilltopAdsZone,
  type InsertHilltopAdsZone,
  type HilltopAdsStat,
  type InsertHilltopAdsStat,
  users,
  earnings,
  adViews,
  referrals,
  dailyTasks,
  teamEmails,
  teamKeys,
  userCredentials,
  chatMessages,
  hilltopAdsConfig,
  hilltopAdsZones,
  hilltopAdsStats
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Legacy registration methods (keeping for backward compatibility)
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getRegistrationByEmail(email: string): Promise<Registration | undefined>;

  // User management methods
  createUser(user: InsertUser & { id?: string }): Promise<User>; // Allow external ID (from Supabase)
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  validateUserPassword(email: string, password: string): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined>;
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

  // Team functionality methods
  // Team emails for inbox functionality
  createTeamEmail(teamEmail: InsertTeamEmail): Promise<TeamEmail>;
  getTeamEmails(type?: 'inbound' | 'outbound', limit?: number): Promise<TeamEmail[]>;
  getTeamEmailsByUser(userId: string, limit?: number): Promise<TeamEmail[]>;

  // Team keys for managing team member access
  createTeamKey(teamKey: InsertTeamKey): Promise<TeamKey>;
  getTeamKeysByUser(userId: string): Promise<TeamKey[]>;
  updateTeamKey(keyId: string, updates: Partial<InsertTeamKey>): Promise<TeamKey | undefined>;
  getTeamMembers(): Promise<Array<User & { teamKey: TeamKey | null }>>;

  // User credentials storage for team data management
  createUserCredential(credential: InsertUserCredential): Promise<UserCredential>;
  getUserCredentials(userId: string): Promise<UserCredential[]>;
  getAllUserCredentials(): Promise<Array<UserCredential & { user: User }>>;
  updateUserCredential(credentialId: string, updates: Partial<InsertUserCredential>): Promise<UserCredential | undefined>;
  deleteUserCredential(credentialId: string): Promise<void>;

  // Team-specific user methods
  getUsersByRole(role: 'user' | 'team' | 'founder'): Promise<User[]>;
  getTotalUsersCount(): Promise<number>;
  getActiveUsersCount(): Promise<number>;
  getTotalEarningsSum(): Promise<string>;
  getAllUsers(): Promise<User[]>; // Added method to fetch all users

  // Chat messages methods
  createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage>;
  getUserChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;

  // HilltopAds configuration methods
  createHilltopAdsConfig(config: InsertHilltopAdsConfig): Promise<HilltopAdsConfig>;
  getHilltopAdsConfig(): Promise<HilltopAdsConfig | undefined>;
  updateHilltopAdsConfig(configId: string, updates: Partial<InsertHilltopAdsConfig>): Promise<HilltopAdsConfig | undefined>;

  // HilltopAds zones methods
  createHilltopAdsZone(zone: InsertHilltopAdsZone): Promise<HilltopAdsZone>;
  getHilltopAdsZones(): Promise<HilltopAdsZone[]>;
  getHilltopAdsZoneById(zoneId: string): Promise<HilltopAdsZone | undefined>;
  updateHilltopAdsZone(id: string, updates: Partial<InsertHilltopAdsZone>): Promise<HilltopAdsZone | undefined>;

  // HilltopAds statistics methods
  createHilltopAdsStat(stat: InsertHilltopAdsStat): Promise<HilltopAdsStat>;
  getHilltopAdsStats(zoneId?: string, startDate?: Date, endDate?: Date): Promise<HilltopAdsStat[]>;
  getTotalHilltopAdsRevenue(): Promise<string>;
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

  // User management methods
  async createUser(insertUser: InsertUser & { id?: string }): Promise<User> {
    const hashedPassword = insertUser.passwordHash === 'supabase_managed' 
      ? 'supabase_managed' // Don't hash if managed by Supabase
      : await bcrypt.hash(insertUser.passwordHash, 12);
    const referralCode = this.generateReferralCode();

    const userData = {
      ...insertUser,
      passwordHash: hashedPassword,
      referralCode,
    };

    // If external ID is provided (e.g., from Supabase), use it
    if (insertUser.id) {
      userData.id = insertUser.id;
    }

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

  async validateUserPassword(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : undefined;
  }

  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
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
        tier: referrals.tier,
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

  // Team functionality methods
  // Team emails for inbox functionality
  async createTeamEmail(insertTeamEmail: InsertTeamEmail): Promise<TeamEmail> {
    const [teamEmail] = await db.insert(teamEmails).values(insertTeamEmail).returning();
    return teamEmail;
  }

  async getTeamEmails(type?: 'inbound' | 'outbound', limit = 50): Promise<TeamEmail[]> {
    if (type) {
      return await db.select().from(teamEmails)
        .where(eq(teamEmails.type, type))
        .orderBy(desc(teamEmails.createdAt))
        .limit(limit);
    }
    return await db.select().from(teamEmails)
      .orderBy(desc(teamEmails.createdAt))
      .limit(limit);
  }

  async getTeamEmailsByUser(userId: string, limit = 50): Promise<TeamEmail[]> {
    return await db
      .select()
      .from(teamEmails)
      .where(eq(teamEmails.fromUserId, userId))
      .orderBy(desc(teamEmails.createdAt))
      .limit(limit);
  }

  // Team keys for managing team member access
  async createTeamKey(insertTeamKey: InsertTeamKey): Promise<TeamKey> {
    const [teamKey] = await db.insert(teamKeys).values(insertTeamKey).returning();
    return teamKey;
  }

  async getTeamKeysByUser(userId: string): Promise<TeamKey[]> {
    return await db
      .select()
      .from(teamKeys)
      .where(eq(teamKeys.userId, userId))
      .orderBy(desc(teamKeys.createdAt));
  }

  async updateTeamKey(keyId: string, updates: Partial<InsertTeamKey>): Promise<TeamKey | undefined> {
    const [updatedKey] = await db
      .update(teamKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamKeys.id, keyId))
      .returning();
    return updatedKey;
  }

  async getTeamMembers(): Promise<Array<User & { teamKey: TeamKey | null }>> {
    return await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        identity: users.identity,
        phone: users.phone,
        email: users.email,
        passwordHash: users.passwordHash,
        referralCode: users.referralCode,
        referredBy: users.referredBy,
        role: users.role,
        totalEarnings: users.totalEarnings,
        availableBalance: users.availableBalance,
        pendingBalance: users.pendingBalance,
        totalWithdrawn: users.totalWithdrawn,
        isActive: users.isActive,
        isVerified: users.isVerified,
        verificationToken: users.verificationToken,
        loginStreak: users.loginStreak,
        lastLoginDate: users.lastLoginDate,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        teamKey: teamKeys,
      })
      .from(users)
      .leftJoin(teamKeys, eq(users.id, teamKeys.userId))
      .where(eq(users.role, 'team'))
      .orderBy(desc(users.createdAt));
  }

  // User credentials storage for team data management
  async createUserCredential(insertCredential: InsertUserCredential): Promise<UserCredential> {
    const [credential] = await db.insert(userCredentials).values(insertCredential).returning();
    return credential;
  }

  async getUserCredentials(userId: string): Promise<UserCredential[]> {
    return await db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId))
      .orderBy(desc(userCredentials.createdAt));
  }

  async getAllUserCredentials(): Promise<Array<UserCredential & { user: User }>> {
    try {
      const result = await db
        .select({
          id: userCredentials.id,
          userId: userCredentials.userId,
          platform: userCredentials.platform,
          username: userCredentials.username,
          email: userCredentials.email,
          encryptedPassword: userCredentials.encryptedPassword,
          notes: userCredentials.notes,
          isActive: userCredentials.isActive,
          lastUpdated: userCredentials.lastUpdated,
          createdAt: userCredentials.createdAt,
          // Include user information
          user: users
        })
        .from(userCredentials)
        .leftJoin(users, eq(userCredentials.userId, users.id))
        .orderBy(desc(userCredentials.createdAt));

      return result as Array<UserCredential & { user: User }>;
    } catch (error) {
      console.error("Error fetching user credentials:", error);
      throw error;
    }
  }

  // Get all users for team data management
  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          identity: users.identity,
          phone: users.phone,
          passwordHash: users.passwordHash,
          referralCode: users.referralCode,
          referredBy: users.referredBy,
          totalEarnings: users.totalEarnings,
          availableBalance: users.availableBalance,
          pendingBalance: users.pendingBalance,
          totalWithdrawn: users.totalWithdrawn,
          isActive: users.isActive,
          isVerified: users.isVerified,
          verificationToken: users.verificationToken,
          loginStreak: users.loginStreak,
          lastLoginDate: users.lastLoginDate,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      return result;
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  }


  async updateUserCredential(credentialId: string, updates: Partial<InsertUserCredential>): Promise<UserCredential | undefined> {
    const [updatedCredential] = await db
      .update(userCredentials)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(userCredentials.id, credentialId))
      .returning();
    return updatedCredential;
  }

  async deleteUserCredential(credentialId: string): Promise<void> {
    await db
      .update(userCredentials)
      .set({ isActive: false, lastUpdated: new Date() })
      .where(eq(userCredentials.id, credentialId));
  }

  // Team-specific user methods
  async getUsersByRole(role: 'user' | 'team' | 'founder'): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(desc(users.createdAt));
  }

  async getTotalUsersCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(eq(users.role, 'user'));

    return result?.count || 0;
  }

  async getActiveUsersCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.role, 'user'), eq(users.isActive, true)));

    return result?.count || 0;
  }

  async getTotalEarningsSum(): Promise<string> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${users.totalEarnings}), '0.00')` })
      .from(users)
      .where(eq(users.role, 'user'));

    return result?.total || "0.00";
  }

  async createChatMessage(insertChatMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertChatMessage)
      .returning();
    return message;
  }

  async getUserChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createHilltopAdsConfig(insertConfig: InsertHilltopAdsConfig): Promise<HilltopAdsConfig> {
    const [config] = await db.insert(hilltopAdsConfig).values(insertConfig).returning();
    return config;
  }

  async getHilltopAdsConfig(): Promise<HilltopAdsConfig | undefined> {
    const configs = await db.select().from(hilltopAdsConfig).limit(1);
    return configs[0];
  }

  async updateHilltopAdsConfig(configId: string, updates: Partial<InsertHilltopAdsConfig>): Promise<HilltopAdsConfig | undefined> {
    const [updated] = await db
      .update(hilltopAdsConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hilltopAdsConfig.id, configId))
      .returning();
    return updated;
  }

  async createHilltopAdsZone(insertZone: InsertHilltopAdsZone): Promise<HilltopAdsZone> {
    const [zone] = await db.insert(hilltopAdsZones).values(insertZone).returning();
    return zone;
  }

  async getHilltopAdsZones(): Promise<HilltopAdsZone[]> {
    return await db.select().from(hilltopAdsZones).orderBy(desc(hilltopAdsZones.createdAt));
  }

  async getHilltopAdsZoneById(zoneId: string): Promise<HilltopAdsZone | undefined> {
    const [zone] = await db.select().from(hilltopAdsZones).where(eq(hilltopAdsZones.zoneId, zoneId)).limit(1);
    return zone;
  }

  async updateHilltopAdsZone(id: string, updates: Partial<InsertHilltopAdsZone>): Promise<HilltopAdsZone | undefined> {
    const [updated] = await db
      .update(hilltopAdsZones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hilltopAdsZones.id, id))
      .returning();
    return updated;
  }

  async createHilltopAdsStat(insertStat: InsertHilltopAdsStat): Promise<HilltopAdsStat> {
    const [stat] = await db.insert(hilltopAdsStats).values(insertStat).returning();
    return stat;
  }

  async getHilltopAdsStats(zoneId?: string, startDate?: Date, endDate?: Date): Promise<HilltopAdsStat[]> {
    let conditions: any[] = [];

    if (zoneId) {
      conditions.push(eq(hilltopAdsStats.zoneId, zoneId));
    }

    if (startDate && endDate) {
      conditions.push(sql`${hilltopAdsStats.date} >= ${startDate}`);
      conditions.push(sql`${hilltopAdsStats.date} <= ${endDate}`);
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(hilltopAdsStats)
        .where(and(...conditions))
        .orderBy(desc(hilltopAdsStats.date));
    }

    return await db
      .select()
      .from(hilltopAdsStats)
      .orderBy(desc(hilltopAdsStats.date));
  }

  async getTotalHilltopAdsRevenue(): Promise<string> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${hilltopAdsStats.revenue}), 0)` })
      .from(hilltopAdsStats);
    return result[0]?.total || "0";
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
  async createUser(user: InsertUser): Promise<User> { throw new Error("Not implemented in MemStorage"); }
  async getUserById(id: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getUserByEmail(email: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async validateUserPassword(email: string, password: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
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

  // Team functionality stub implementations
  async createTeamEmail(teamEmail: InsertTeamEmail): Promise<TeamEmail> { throw new Error("Not implemented in MemStorage"); }
  async getTeamEmails(type?: 'inbound' | 'outbound', limit?: number): Promise<TeamEmail[]> { throw new Error("Not implemented in MemStorage"); }
  async getTeamEmailsByUser(userId: string, limit?: number): Promise<TeamEmail[]> { throw new Error("Not implemented in MemStorage"); }
  async createTeamKey(teamKey: InsertTeamKey): Promise<TeamKey> { throw new Error("Not implemented in MemStorage"); }
  async getTeamKeysByUser(userId: string): Promise<TeamKey[]> { throw new Error("Not implemented in MemStorage"); }
  async updateTeamKey(keyId: string, updates: Partial<InsertTeamKey>): Promise<TeamKey | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getTeamMembers(): Promise<Array<User & { teamKey: TeamKey | null }>> { throw new Error("Not implemented in MemStorage"); }
  async createUserCredential(credential: InsertUserCredential): Promise<UserCredential> { throw new Error("Not implemented in MemStorage"); }
  async getUserCredentials(userId: string): Promise<UserCredential[]> { throw new Error("Not implemented in MemStorage"); }
  async getAllUserCredentials(): Promise<Array<UserCredential & { user: User }>> { throw new Error("Not implemented in MemStorage"); }
  async updateUserCredential(credentialId: string, updates: Partial<InsertUserCredential>): Promise<UserCredential | undefined> { throw new Error("Not implemented in MemStorage"); }
  async deleteUserCredential(credentialId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getUsersByRole(role: 'user' | 'team' | 'founder'): Promise<User[]> { throw new Error("Not implemented in MemStorage"); }
  async getTotalUsersCount(): Promise<number> { throw new Error("Not implemented in MemStorage"); }
  async getActiveUsersCount(): Promise<number> { throw new Error("Not implemented in MemStorage"); }
  async getTotalEarningsSum(): Promise<string> { throw new Error("Not implemented in MemStorage"); }
  async getAllUsers(): Promise<User[]> { throw new Error("Not implemented in MemStorage"); } // Added for MemStorage
  async createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage> { throw new Error("Not implemented in MemStorage"); }
  async getUserChatHistory(userId: string, limit?: number): Promise<ChatMessage[]> { throw new Error("Not implemented in MemStorage"); }

  async createHilltopAdsConfig(config: InsertHilltopAdsConfig): Promise<HilltopAdsConfig> { throw new Error("Not implemented in MemStorage"); }
  async getHilltopAdsConfig(): Promise<HilltopAdsConfig | undefined> { throw new Error("Not implemented in MemStorage"); }
  async updateHilltopAdsConfig(configId: string, updates: Partial<InsertHilltopAdsConfig>): Promise<HilltopAdsConfig | undefined> { throw new Error("Not implemented in MemStorage"); }
  async createHilltopAdsZone(zone: InsertHilltopAdsZone): Promise<HilltopAdsZone> { throw new Error("Not implemented in MemStorage"); }
  async getHilltopAdsZones(): Promise<HilltopAdsZone[]> { throw new Error("Not implemented in MemStorage"); }
  async getHilltopAdsZoneById(zoneId: string): Promise<HilltopAdsZone | undefined> { throw new Error("Not implemented in MemStorage"); }
  async updateHilltopAdsZone(id: string, updates: Partial<InsertHilltopAdsZone>): Promise<HilltopAdsZone | undefined> { throw new Error("Not implemented in MemStorage"); }
  async createHilltopAdsStat(stat: InsertHilltopAdsStat): Promise<HilltopAdsStat> { throw new Error("Not implemented in MemStorage"); }
  async getHilltopAdsStats(zoneId?: string, startDate?: Date, endDate?: Date): Promise<HilltopAdsStat[]> { throw new Error("Not implemented in MemStorage"); }
  async getTotalHilltopAdsRevenue(): Promise<string> { throw new Error("Not implemented in MemStorage"); }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}

// Use DatabaseStorage for production
export const storage = new DatabaseStorage();