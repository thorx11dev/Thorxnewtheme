import {
  users,
  earnings,
  adViews,
  referrals,
  teamEmails,
  teamKeys,
  userCredentials,
  chatMessages,
  hilltopAdsConfig,
  hilltopAdsZones,
  hilltopAdsStats,
  commissionLogs,
  withdrawals,
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
  type CommissionLog,
  type InsertCommissionLog,
  type Withdrawal,
  type InsertWithdrawal,
  type RankLog,
  type InsertRankLog,
  rankLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
  getReferralStatsDetailed(userId: string): Promise<{
    totalReferrals: number;
    level1Count: number;
    level2Count: number;
    totalCommissionEarnings: string;
    level1Earnings: string;
    level2Earnings: string;
    pendingCommissions: string;
    paidCommissions: string;
  }>;


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
  getTotalHilltopAdsRevenue(): Promise<string>;

  // Commission Logs (Referral System)
  createCommissionLog(log: InsertCommissionLog): Promise<CommissionLog>;
  getCommissionLogsByTriggerWithdrawal(withdrawalId: string): Promise<CommissionLog[]>;
  getCommissionLogsByBeneficiary(userId: string): Promise<CommissionLog[]>;

  // Withdrawals
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getCheckPendingWithdrawal(userId: string): Promise<Withdrawal | undefined>;
  processWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal>;
  rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<Withdrawal>;

  // Ranking System
  checkAndUpdateRank(userId: string): Promise<User>;
  getRankHistory(userId: string): Promise<RankLog[]>;

  // Real-time Dashboard & Analytics
  getDashboardStats(userId: string): Promise<{
    totalEarnings: string;
    availableBalance: string;
    pendingBalance: string;
    todayEarnings: string;
    weeklyEarnings: string;
    monthlyEarnings: string;
    referralCount: number;
    referralEarnings: string;
    adsWatchedToday: number;
    adsWatchedTotal: number;
    dailyGoalProgress: number;
  }>;
  getEarningsHistory(userId: string, period: 'week' | 'month' | 'year'): Promise<Array<{ date: string; amount: string }>>;
  getReferralLeaderboard(userId: string): Promise<Array<{
    user: User;
    referralCount: number;
    totalEarnings: string;
    level: number;
    rank: number;
  }>>;
  getTransactionHistory(userId: string, limit?: number): Promise<Array<{
    id: string;
    type: 'earning' | 'withdrawal' | 'commission';
    amount: string;
    status: string;
    date: Date;
    description: string;
  }>>;
}

const RANKS = [
  { name: "Useless", min: 0, max: 25000 },
  { name: "Worker", min: 25000, max: 50000 },
  { name: "Soldier", min: 50000, max: 75000 },
  { name: "Captain", min: 75000, max: 100000 },
  { name: "General", min: 100000, max: Infinity },
];

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
    const isManagedAuth = insertUser.passwordHash === 'supabase_managed' || insertUser.passwordHash === 'firebase_managed';
    const hashedPassword = isManagedAuth
      ? 'managed_auth' // Don't hash if managed by external provider
      : await bcrypt.hash(insertUser.passwordHash, 10); // Changed salt rounds to 10
    const referralCode = this.generateReferralCode();

    // Validate referredBy if provided
    if (insertUser.referredBy) {
      // Check if referrer exists
      const referrer = await this.getUserById(insertUser.referredBy);
      if (!referrer) {
        throw new Error("Invalid referral code: referrer does not exist");
      }

      // Prevent circular referrals (check if referrer is referred by this user's ID)
      // This check is only relevant if insertUser.id is already known (e.g., from Supabase)
      if (insertUser.id && referrer.referredBy === insertUser.id) {
        throw new Error("Circular referral detected");
      }
    }

    // Sanitize input to remove 'name' which exists in schema type but not in DB
    const { name, ...safeUserFields } = insertUser;

    const userData = {
      ...safeUserFields,
      passwordHash: hashedPassword,
      referralCode,
    };

    // If external ID is provided (e.g., from Supabase/Firebase), use it
    if (insertUser.id) {
      userData.id = insertUser.id;
    }

    const [user] = await db.insert(users).values(userData).returning();

    // Sync to Firestore immediately
    await this.syncUserToFirestore(user.id);

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

    // Check for rank update
    await this.checkAndUpdateRank(userId);

    // Sync to Firestore for real-time UI updates
    await this.syncUserToFirestore(userId);
  }

  // Earnings methods
  async createEarning(insertEarning: InsertEarning): Promise<Earning> {
    const [earning] = await db.insert(earnings).values(insertEarning).returning();

    // Update user's total earnings (which also checks rank)
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

  // Enhanced referral stats with L1/L2 breakdown
  async getReferralStatsDetailed(userId: string): Promise<{
    totalReferrals: number;
    level1Count: number;
    level2Count: number;
    totalCommissionEarnings: string;
    level1Earnings: string;
    level2Earnings: string;
    pendingCommissions: string;
    paidCommissions: string;
  }> {
    // Get L1 referrals count
    const [l1Result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        eq(referrals.tier, 1)
      ));

    // Get L2 referrals count (referrals of referrals)
    const [l2Result] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${referrals.referredId})` })
      .from(referrals)
      .innerJoin(
        sql`${referrals} as r2`,
        sql`${referrals}.referred_id = r2.referrer_id`
      )
      .where(eq(referrals.referrerId, userId));

    // Get L1 commission earnings
    const [l1Earnings] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLogs.amount}), '0.00')` })
      .from(commissionLogs)
      .where(and(
        eq(commissionLogs.beneficiaryId, userId),
        eq(commissionLogs.level, 1)
      ));

    // Get L2 commission earnings
    const [l2Earnings] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLogs.amount}), '0.00')` })
      .from(commissionLogs)
      .where(and(
        eq(commissionLogs.beneficiaryId, userId),
        eq(commissionLogs.level, 2)
      ));

    // Get pending commissions
    const [pendingResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLogs.amount}), '0.00')` })
      .from(commissionLogs)
      .where(and(
        eq(commissionLogs.beneficiaryId, userId),
        eq(commissionLogs.status, "pending")
      ));

    // Get paid commissions
    const [paidResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLogs.amount}), '0.00')` })
      .from(commissionLogs)
      .where(and(
        eq(commissionLogs.beneficiaryId, userId),
        eq(commissionLogs.status, "paid")
      ));

    const level1Count = l1Result?.count || 0;
    const level2Count = l2Result?.count || 0;
    const level1EarningsAmount = l1Earnings?.total || "0.00";
    const level2EarningsAmount = l2Earnings?.total || "0.00";
    const totalCommission = (parseFloat(level1EarningsAmount) + parseFloat(level2EarningsAmount)).toFixed(2);

    return {
      totalReferrals: level1Count + level2Count,
      level1Count,
      level2Count,
      totalCommissionEarnings: totalCommission,
      level1Earnings: level1EarningsAmount,
      level2Earnings: level2EarningsAmount,
      pendingCommissions: pendingResult?.total || "0.00",
      paidCommissions: paidResult?.total || "0.00",
    };
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
        avatar: users.avatar,
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
          updatedAt: users.updatedAt,
          avatar: users.avatar
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

  // Commission Logs
  async createCommissionLog(log: InsertCommissionLog): Promise<CommissionLog> {
    const [entry] = await db.insert(commissionLogs).values(log).returning();
    return entry;
  }

  async getCommissionLogsByTriggerWithdrawal(withdrawalId: string): Promise<CommissionLog[]> {
    return await db
      .select()
      .from(commissionLogs)
      .where(eq(commissionLogs.triggerWithdrawalId, withdrawalId));
  }

  async getCommissionLogsByBeneficiary(userId: string): Promise<CommissionLog[]> {
    return await db
      .select()
      .from(commissionLogs)
      .where(eq(commissionLogs.beneficiaryId, userId))
      .orderBy(desc(commissionLogs.createdAt));
  }

  // Withdrawals with Commission Logic
  async createWithdrawal(insertWithdrawal: InsertWithdrawal): Promise<Withdrawal> {
    // Validate minimum withdrawal amount
    const amount = parseFloat(insertWithdrawal.amount);
    if (amount < 100) {
      throw new Error("Minimum withdrawal amount is 100 PKR");
    }
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }

    // Start a transaction to ensure integrity
    return await db.transaction(async (tx) => {
      // 1. Create Withdrawal Record
      const [withdrawal] = await tx.insert(withdrawals).values(insertWithdrawal).returning();

      // 2. Determine Commissions (15% L1, 7.5% L2)
      // Get the user to find their upline
      const [user] = await tx.select().from(users).where(eq(users.id, insertWithdrawal.userId));

      if (!user) {
        throw new Error("User not found");
      }

      if (user && user.referredBy) {
        // Level 1 Referrer
        const amountL1 = (amount * 0.15).toFixed(2);

        // Validate commission amount
        if (parseFloat(amountL1) > 0) {
          await tx.insert(commissionLogs).values({
            beneficiaryId: user.referredBy,
            sourceUserId: user.id,
            triggerWithdrawalId: withdrawal.id,
            amount: amountL1,
            rate: "0.1500",
            level: 1,
            status: "pending", // Only released when withdrawal is completed
            metadata: {
              withdrawalAmount: insertWithdrawal.amount,
              calculatedAt: new Date().toISOString()
            }
          });
        }

        // Check for Level 2
        const [referrerL1] = await tx.select().from(users).where(eq(users.id, user.referredBy));
        if (referrerL1 && referrerL1.referredBy) {
          // Level 2 Referrer
          const amountL2 = (amount * 0.075).toFixed(2);

          // Validate commission amount
          if (parseFloat(amountL2) > 0) {
            await tx.insert(commissionLogs).values({
              beneficiaryId: referrerL1.referredBy,
              sourceUserId: user.id,
              triggerWithdrawalId: withdrawal.id,
              amount: amountL2,
              rate: "0.0750",
              level: 2,
              status: "pending",
              metadata: {
                withdrawalAmount: insertWithdrawal.amount,
                calculatedAt: new Date().toISOString()
              }
            });
          }
        }
      }

      return withdrawal;
    });
  }

  async getCheckPendingWithdrawal(userId: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(and(eq(withdrawals.userId, userId), eq(withdrawals.status, "pending")))
      .limit(1);
    return withdrawal;
  }

  // Process (approve) withdrawal and release commissions
  async processWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal> {
    return await db.transaction(async (tx) => {
      // 1. Update withdrawal status
      const [withdrawal] = await tx
        .update(withdrawals)
        .set({
          status: "completed",
          updatedAt: new Date()
        })
        .where(eq(withdrawals.id, withdrawalId))
        .returning();

      if (!withdrawal) {
        throw new Error("Withdrawal not found");
      }

      // 2. Find all pending commissions for this withdrawal
      const pendingCommissions = await tx
        .select()
        .from(commissionLogs)
        .where(and(
          eq(commissionLogs.triggerWithdrawalId, withdrawalId),
          eq(commissionLogs.status, "pending")
        ));

      // 3. Release commissions - update status and credit beneficiaries
      for (const commission of pendingCommissions) {
        // Update commission status
        await tx
          .update(commissionLogs)
          .set({
            status: "paid",
            updatedAt: new Date()
          })
          .where(eq(commissionLogs.id, commission.id));

        // Credit the beneficiary's balance
        await tx
          .update(users)
          .set({
            totalEarnings: sql`${users.totalEarnings} + ${commission.amount}`,
            availableBalance: sql`${users.availableBalance} + ${commission.amount}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, commission.beneficiaryId));

        // Check if beneficiary's rank should be updated
        await this.checkAndUpdateRank(commission.beneficiaryId);
      }

      return withdrawal;
    });
  }

  // Reject withdrawal and void commissions
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<Withdrawal> {
    return await db.transaction(async (tx) => {
      // 1. Get the withdrawal
      const [withdrawal] = await tx
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.id, withdrawalId));

      if (!withdrawal) {
        throw new Error("Withdrawal not found");
      }

      // 2. Update withdrawal status
      const [updatedWithdrawal] = await tx
        .update(withdrawals)
        .set({
          status: "rejected",
          updatedAt: new Date()
        })
        .where(eq(withdrawals.id, withdrawalId))
        .returning();

      // 3. Void all pending commissions
      await tx
        .update(commissionLogs)
        .set({
          status: "voided",
          updatedAt: new Date(),
          metadata: sql`jsonb_set(metadata, '{rejectionReason}', ${JSON.stringify(reason)}::jsonb)`
        })
        .where(and(
          eq(commissionLogs.triggerWithdrawalId, withdrawalId),
          eq(commissionLogs.status, "pending")
        ));

      // 4. Refund the withdrawal amount to user's available balance
      await tx
        .update(users)
        .set({
          availableBalance: sql`${users.availableBalance} + ${withdrawal.amount}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, withdrawal.userId));

      return updatedWithdrawal;
    });
  }

  // Rank System Logic
  async checkAndUpdateRank(userId: string): Promise<User> {
    // Use transaction to prevent race conditions
    return await db.transaction(async (tx) => {
      // Get user with row-level lock to prevent concurrent updates
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update'); // Row-level lock

      if (!user) throw new Error("User not found");

      const totalEarnings = parseFloat(user.totalEarnings || "0");
      let newRank = "Useless";

      for (const rank of RANKS) {
        if (totalEarnings >= rank.min) {
          newRank = rank.name;
        }
      }

      if (newRank !== user.rank) {
        // Log the change
        await tx.insert(rankLogs).values({
          userId: user.id,
          oldRank: user.rank || "Useless",
          newRank: newRank,
          triggerSource: "earning_update_or_refresh"
        });

        // Update user
        const [updatedUser] = await tx
          .update(users)
          .set({ rank: newRank, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning();

        return updatedUser;
      }

      return user;
    });
  }

  // Get rank history for a user
  async getRankHistory(userId: string): Promise<RankLog[]> {
    return await db
      .select()
      .from(rankLogs)
      .where(eq(rankLogs.userId, userId))
      .orderBy(desc(rankLogs.createdAt));
  }

  // Real-time Dashboard & Analytics Methods
  async getDashboardStats(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this week's date range
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // Get this month's date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's earnings
    const [todayEarningsResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')` })
      .from(earnings)
      .where(and(
        eq(earnings.userId, userId),
        sql`${earnings.createdAt} >= ${today}`,
        sql`${earnings.createdAt} < ${tomorrow}`
      ));

    // Weekly earnings
    const [weeklyEarningsResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')` })
      .from(earnings)
      .where(and(
        eq(earnings.userId, userId),
        sql`${earnings.createdAt} >= ${weekStart}`
      ));

    // Monthly earnings
    const [monthlyEarningsResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')` })
      .from(earnings)
      .where(and(
        eq(earnings.userId, userId),
        sql`${earnings.createdAt} >= ${monthStart}`
      ));

    // Referral stats
    const referralStats = await this.getReferralStats(userId);

    // Referral earnings (commissions)
    const [referralEarningsResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLogs.amount}), '0.00')` })
      .from(commissionLogs)
      .where(and(
        eq(commissionLogs.beneficiaryId, userId),
        eq(commissionLogs.status, "paid")
      ));

    // Today's ad views
    const adsWatchedToday = await this.getTodayAdViews(userId);

    // Total ad views
    const [totalAdViewsResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(adViews)
      .where(eq(adViews.userId, userId));

    // Daily goal progress (assuming 20 ads per day as goal)
    const dailyGoal = 20;
    const dailyGoalProgress = Math.min((adsWatchedToday / dailyGoal) * 100, 100);

    return {
      totalEarnings: user.totalEarnings || "0.00",
      availableBalance: user.availableBalance || "0.00",
      pendingBalance: user.pendingBalance || "0.00",
      todayEarnings: todayEarningsResult?.total || "0.00",
      weeklyEarnings: weeklyEarningsResult?.total || "0.00",
      monthlyEarnings: monthlyEarningsResult?.total || "0.00",
      referralCount: referralStats.count,
      referralEarnings: referralEarningsResult?.total || "0.00",
      adsWatchedToday,
      adsWatchedTotal: totalAdViewsResult?.count || 0,
      dailyGoalProgress
    };
  }

  async getEarningsHistory(userId: string, period: 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;
    let groupByFormat: string;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12);
        groupByFormat = 'YYYY-MM';
        break;
    }

    const results = await db
      .select({
        date: sql<string>`TO_CHAR(${earnings.createdAt}, ${groupByFormat})`,
        amount: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')`
      })
      .from(earnings)
      .where(and(
        eq(earnings.userId, userId),
        sql`${earnings.createdAt} >= ${startDate}`
      ))
      .groupBy(sql`TO_CHAR(${earnings.createdAt}, ${groupByFormat})`)
      .orderBy(sql`TO_CHAR(${earnings.createdAt}, ${groupByFormat})`);
    return results;
  }

  async getReferralLeaderboard(userId: string) {
    try {
      console.log(`[ReferralTree] Fetching network for user: ${userId}`);

      // 1. Get all Level 1 Referees (Directly referred by userId)
      const level1Users = await db
        .select({
          user: users,
          totalEarnings: sql<string>`'0.00'` // Simplified for debugging
        })
        .from(users)
        .where(eq(users.referredBy, userId));

      console.log(`[ReferralTree] Found ${level1Users.length} L1 users`);

      // 2. Get all Level 2 Referees (Referred by Level 1 users)
      const level1Ids = level1Users.map(r => r.user.id);
      let level2Users: any[] = [];

      if (level1Ids.length > 0) {
        level2Users = await db
          .select({
            user: users,
            totalEarnings: sql<string>`'0.00'` // Simplified for debugging
          })
          .from(users)
          .where(inArray(users.referredBy, level1Ids));

        console.log(`[ReferralTree] Found ${level2Users.length} L2 users`);
      }

      // 3. Format into a flat list for the frontend to reconstruct
      const combined = [
        ...level1Users.map((r) => ({
          ...r.user,
          earningsFromUser: '0.00',
          level: 1,
          referredBy: userId
        })),
        ...level2Users.map((r) => ({
          ...r.user,
          earningsFromUser: '0.00',
          level: 2,
          referredBy: r.user.referredBy // This will be one of the L1 IDs
        }))
      ];

      return combined;
    } catch (error) {
      console.error("[ReferralTree] Error fetching leaderboard:", error);
      // Return empty array instead of throwing to prevent loading loop
      return [];
    }
  }

  async getTransactionHistory(userId: string, limit: number = 50) {
    // Get earnings
    const earningsData = await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(desc(earnings.createdAt))
      .limit(limit);

    // Get withdrawals
    const withdrawalsData = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt))
      .limit(limit);

    // Get commissions
    const commissionsData = await db
      .select()
      .from(commissionLogs)
      .where(eq(commissionLogs.beneficiaryId, userId))
      .orderBy(desc(commissionLogs.createdAt))
      .limit(limit);

    // Combine and format
    const transactions = [
      ...earningsData.map(e => ({
        id: e.id,
        type: 'earning' as const,
        amount: e.amount,
        status: 'completed',
        date: e.createdAt,
        description: e.source || 'Ad viewing'
      })),
      ...withdrawalsData.map(w => ({
        id: w.id,
        type: 'withdrawal' as const,
        amount: w.amount,
        status: w.status,
        date: w.createdAt,
        description: `Withdrawal via ${w.method}`
      })),
      ...commissionsData.map(c => ({
        id: c.id,
        type: 'commission' as const,
        amount: c.amount,
        status: c.status,
        date: c.createdAt,
        description: `Level ${c.level} referral commission`
      }))
    ];

    // Sort by date and limit
    return transactions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  // Sync helper to keep Firestore in sync with Postgres
  private async syncUserToFirestore(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (user) {
        await adminDb.collection("users").doc(userId).set({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          identity: user.identity,
          phone: user.phone || '',
          referralCode: user.referralCode || '',
          role: user.role || 'user',
          availableBalance: user.availableBalance,
          totalEarnings: user.totalEarnings,
          rank: user.rank || 'Useless',
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Synced user ${userId} to Firestore`);
      }
    } catch (error) {
      console.error(`Failed to sync user ${userId} to Firestore:`, error);
    }
  }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
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
  async getReferralStatsDetailed(userId: string): Promise<{
    totalReferrals: number;
    level1Count: number;
    level2Count: number;
    totalCommissionEarnings: string;
    level1Earnings: string;
    level2Earnings: string;
    pendingCommissions: string;
    paidCommissions: string;
  }> { throw new Error("Not implemented in MemStorage"); }

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

  async createCommissionLog(log: InsertCommissionLog): Promise<CommissionLog> { throw new Error("Not implemented in MemStorage"); }
  async getCommissionLogsByTriggerWithdrawal(withdrawalId: string): Promise<CommissionLog[]> { throw new Error("Not implemented in MemStorage"); }
  async getCommissionLogsByBeneficiary(userId: string): Promise<CommissionLog[]> { throw new Error("Not implemented in MemStorage"); }
  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> { throw new Error("Not implemented in MemStorage"); }
  async getCheckPendingWithdrawal(userId: string): Promise<Withdrawal | undefined> { throw new Error("Not implemented in MemStorage"); }
  async processWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal> { throw new Error("Not implemented in MemStorage"); }
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<Withdrawal> { throw new Error("Not implemented in MemStorage"); }
  async checkAndUpdateRank(userId: string): Promise<User> { throw new Error("Not implemented in MemStorage"); }
  async getRankHistory(userId: string): Promise<RankLog[]> { throw new Error("Not implemented in MemStorage"); }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}

// Use DatabaseStorage for production
export const storage = new DatabaseStorage();