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
  rankLogs,
  type AuditLog,
  type InsertAuditLog,
  auditLogs,
  internalNotes,
  type InternalNote,
  type InsertInternalNote,
  teamInvitations,
  type TeamInvitation,
  type InsertTeamInvitation,
  systemConfig,
  type SystemConfig,
  type InsertSystemConfig,
  notifications,
  type Notification,
  type InsertNotification,
  dailyTasks,
  type DailyTask,
  type InsertDailyTask,
  taskRecords,
  type TaskRecord,
  type InsertTaskRecord,
  leaderboardCache,
  type LeaderboardCache,
  type InsertLeaderboardCache,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, inArray, ilike, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Legacy registration methods (keeping for backward compatibility)
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getRegistrationByEmail(email: string): Promise<Registration | undefined>;

  // User management methods
  createUser(user: InsertUser & { id?: string }): Promise<User>; // Allow external ID (from Supabase)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  validateUserPassword(email: string, password: string): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserEarnings(userId: string, amount: string): Promise<void>;
  generatePasswordResetToken(email: string): Promise<string | undefined>;
  resetPasswordWithToken(token: string, newPassword: string): Promise<boolean>;

  // System config helper
  getSystemConfigValue<T>(key: string, defaultValue: T): Promise<T>;

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
  updateTeamEmail(id: string, updates: Partial<TeamEmail>): Promise<TeamEmail | undefined>;
  getTeamEmails(type?: 'inbound' | 'outbound', limit?: number): Promise<TeamEmail[]>;
  getTeamEmailsByUser(userId: string, limit?: number): Promise<TeamEmail[]>;
  deleteTeamEmail(id: string): Promise<boolean>;

  // Team keys for managing team member access
  createTeamKey(teamKey: InsertTeamKey): Promise<TeamKey>;
  getTeamKeysByUser(userId: string): Promise<TeamKey[]>;
  updateTeamKey(keyId: string, updates: Partial<InsertTeamKey>): Promise<TeamKey | undefined>;
  getTeamMembers(): Promise<Array<User & { teamKey: TeamKey | null }>>;
  
  // Team Invitations
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  consumeTeamInvitation(invitationId: string): Promise<void>;
  updateUserPermissions(userId: string, permissions: string[]): Promise<User | undefined>;

  // User credentials storage for team data management
  createUserCredential(credential: InsertUserCredential): Promise<UserCredential>;
  getUserCredentials(userId: string): Promise<UserCredential[]>;
  getAllUserCredentials(): Promise<Array<UserCredential & { user: User }>>;
  updateUserCredential(credentialId: string, updates: Partial<InsertUserCredential>): Promise<UserCredential | undefined>;
  deleteUserCredential(credentialId: string): Promise<void>;

  // Team-specific user methods
  getUsersByRole(role: 'user' | 'team' | 'founder'): Promise<User[]>;
  getAllUsers(): Promise<User[]>; // Added method to fetch all users
  getUsersCountInRange(since: Date): Promise<number>;
  getEarningsSumInRange(since: Date): Promise<string>;
  getAnalyticsData(since: Date): Promise<any[]>;
  
  // Scalable Data Architecture methods
  getUsersPaginated(params: { page: number, limit: number, search?: string, sort?: string, sortOrder?: 'asc' | 'desc', ids?: string[] }): Promise<{ users: User[], totalCount: number }>;
  getAuditLogsPaginated(params: { page: number, limit: number, search?: string, ids?: string[], period?: string }): Promise<{ logs: AuditLog[], totalCount: number }>;
  getWithdrawalsPaginated(params: { page: number, limit: number, search?: string, status?: string, ids?: string[] }): Promise<{ withdrawals: Array<Withdrawal & { user: User }>, totalCount: number }>;
  bulkUpdateWithdrawalStatus(ids: string[], status: string, adminId: string): Promise<void>;
  
  // System Config
  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  getAllSystemConfigs(): Promise<SystemConfig[]>;
  updateSystemConfig(key: string, value: any, adminId: string): Promise<SystemConfig | undefined>;
  createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;

  // Chat messages methods
  createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage>;
  getUserChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;

  // Daily Tasks & Completions
  getDailyTasks(): Promise<DailyTask[]>;
  getDailyTask(id: string): Promise<DailyTask | undefined>;
  createDailyTask(task: InsertDailyTask): Promise<DailyTask>;
  updateDailyTask(id: string, updates: Partial<InsertDailyTask>): Promise<DailyTask | undefined>;
  deleteDailyTask(id: string): Promise<void>;
  
  getDailyTasksForUser(userId: string): Promise<Array<{ task: DailyTask, record: TaskRecord | null }>>;
  getTodayCompletedTasksByType(userId: string, type: string): Promise<number>;
  getTaskRecord(userId: string, taskId: string): Promise<TaskRecord | undefined>;
  createTaskRecord(record: InsertTaskRecord): Promise<TaskRecord>;
  updateTaskRecord(id: string, updates: Partial<InsertTaskRecord> & { completedAt?: Date | null }): Promise<TaskRecord | undefined>;

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

  // Commission Logs (Referral System)
  createCommissionLog(log: InsertCommissionLog): Promise<CommissionLog>;
  getCommissionLogsByTriggerWithdrawal(withdrawalId: string): Promise<CommissionLog[]>;
  getCommissionLogsByBeneficiary(userId: string): Promise<CommissionLog[]>;

  // Withdrawals
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]>;
  getCheckPendingWithdrawal(userId: string): Promise<Withdrawal | undefined>;
  processWithdrawal(withdrawalId: string, adminId: string, transactionId?: string): Promise<Withdrawal>;
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

  // Admin Features (Platinum Suite)
  getLeaderboardInsights(limit?: number, offset?: number): Promise<{
    globalRanking: any[];
    topReferrers: any[];
    anomalies: any[];
    totalCount: number;
    lastUpdated: Date;
  }>;
  refreshLeaderboardCache(): Promise<void>;
  getAdminWithdrawals(): Promise<Array<Withdrawal & { user: User }>>;
  updateWithdrawalStatus(id: string, status: string, adminId: string, transactionId?: string, rejectionReason?: string): Promise<Withdrawal>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createInternalNote(note: InsertInternalNote): Promise<InternalNote>;
  getInternalNotes(targetType: string, targetId: string): Promise<Array<InternalNote & { admin: { firstName: string, lastName: string } }>>;
  adjustUserBalance(userId: string, amount: string, type: 'add' | 'subtract', adminId: string, reason: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
}

const RANKS = [
  { name: "Useless", minEarned: 0, minRefs: 0, priority: 5 },
  { name: "Worker", minEarned: 2500, minRefs: 5, priority: 4 },
  { name: "Soldier", minEarned: 5000, minRefs: 10, priority: 3 },
  { name: "Captain", minEarned: 10000, minRefs: 15, priority: 2 },
  { name: "General", minEarned: 25000, minRefs: 25, priority: 1 },
];

export class DatabaseStorage implements IStorage {
  constructor() {
    this.bootstrapConfig().catch(err => {
      console.error("Critical: Failed to bootstrap system configuration:", err);
    });
  }

  private async bootstrapConfig() {
    const defaults = [
      { key: "MIN_PAYOUT", value: 100, description: "Minimum PKR required for withdrawal" },
      { key: "SYSTEM_FEE", value: 10, description: "Platform percentage fee per payout" },
      { key: "L1_BONUS", value: 15, description: "Direct referral commission percentage" },
      { key: "L2_BONUS", value: 7.5, description: "Network (L2) referral commission percentage" },
      { 
        key: "AD_NETWORKS", 
        value: [
          { id: "hilltop-1", name: "HilltopAds", zoneId: "default", type: "video", priority: 1, isActive: true },
          { id: "adsterra-1", name: "Adsterra", zoneId: "default", type: "video", priority: 2, isActive: true }
        ], 
        description: "Waterfall priority list for Video Ad Providers" 
      },
      { 
        key: "CPA_NETWORKS", 
        value: [
          { id: "cpalead-1", name: "CPALead", apiKey: "default", type: "cpa", priority: 1, isActive: true }
        ], 
        description: "Waterfall priority list for CPA Task Providers" 
      }
    ];

    for (const def of defaults) {
      const existing = await this.getSystemConfig(def.key);
      if (!existing) {
        await db.insert(systemConfig).values({
          key: def.key,
          value: def.value,
          description: def.description,
          updatedAt: new Date()
        });
        console.log(`[Bootstrap] Initialized missing config key: ${def.key}`);
      }
    }
  }

  // System config helper implementation
  async getSystemConfigValue<T>(key: string, defaultValue: T): Promise<T> {
    const config = await this.getSystemConfig(key);
    if (!config) return defaultValue;
    return config.value as T;
  }

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
    const isManagedAuth =
      insertUser.passwordHash === "supabase_managed" ||
      insertUser.passwordHash === "firebase_managed" ||
      insertUser.passwordHash === "insforge_managed";
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

  async getUser(id: string): Promise<User | undefined> {
    return this.getUserById(id);
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

    try {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      return isValid ? user : undefined;
    } catch (error) {
      console.error(`Bcrypt comparison failed for ${email}:`, error);
      return undefined;
    }
  }

  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async generatePasswordResetToken(email: string): Promise<string | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;

    const token = randomUUID();

    await db
      .update(users)
      .set({
        verificationToken: token,
        verificationTokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour TTL
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return token;
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.verificationToken, token),
          // Only accept tokens that haven't expired (or have no expiry for legacy rows)
          or(
            sql`verification_token_expires_at IS NULL`,
            sql`verification_token_expires_at > NOW()`
          )
        )
      );

    if (!user) return false;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        verificationToken: null, // clear token after use
        verificationTokenExpiresAt: null, // clear expiry
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return true;
  }

  async updateUserEarnings(userId: string, amount: string, toPending: boolean = false): Promise<void> {
    const updateObj: Record<string, any> = {
      totalEarnings: sql`${users.totalEarnings} + ${amount}`,
      updatedAt: new Date(),
    };

    if (toPending) {
      updateObj.pendingBalance = sql`${users.pendingBalance} + ${amount}`;
    } else {
      updateObj.availableBalance = sql`${users.availableBalance} + ${amount}`;
    }

    await db
      .update(users)
      .set(updateObj)
      .where(eq(users.id, userId));

    // Check for rank update
    await this.checkAndUpdateRank(userId);
  }

  async releasePendingBalance(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({
        pendingBalance: sql`${users.pendingBalance} - ${amount}`,
        availableBalance: sql`${users.availableBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Earnings methods
  async createEarning(insertEarning: InsertEarning): Promise<Earning> {
    return await db.transaction(async (tx) => {
      const [earning] = await tx.insert(earnings).values(insertEarning).returning();

      const toPending = insertEarning.status === 'pending';
      const updateObj: Record<string, any> = {
        totalEarnings: sql`${users.totalEarnings} + ${insertEarning.amount}`,
        updatedAt: new Date(),
      };

      if (toPending) {
        updateObj.pendingBalance = sql`${users.pendingBalance} + ${insertEarning.amount}`;
      } else {
        updateObj.availableBalance = sql`${users.availableBalance} + ${insertEarning.amount}`;
      }

      await tx.update(users).set(updateObj).where(eq(users.id, insertEarning.userId));

      return earning;
    }).then(async (earning) => {
      await this.checkAndUpdateRank(insertEarning.userId);
      return earning;
    });
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
      // Ad views always go to pending first
      await this.createEarning({
        userId: insertAdView.userId,
        type: "ad_view",
        amount: insertAdView.earnedAmount,
        description: `Watched ${insertAdView.adType} ad`,
        status: "pending",
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

    // Cross-Portal Notification Sync: If this is an outbound reply to a user, create a notification
    if (insertTeamEmail.type === 'outbound') {
      try {
        const user = await this.getUserByEmail(insertTeamEmail.toEmail);
        if (user) {
          await this.createNotification({
            userId: user.id,
            title: "Support Response",
            message: `A team member has replied to your inquiry: "${insertTeamEmail.subject.substring(0, 50)}${insertTeamEmail.subject.length > 50 ? '...' : ''}"`,
            type: "system",
            isRead: false
          });
        }
      } catch (notifyError) {
        console.warn("Non-fatal: Failed to sync notification for outbound email.", notifyError);
      }
    }

    return teamEmail;
  }

  async updateTeamEmail(id: string, updates: Partial<TeamEmail>): Promise<TeamEmail | undefined> {
    const [updatedEmail] = await db
      .update(teamEmails)
      .set(updates)
      .where(eq(teamEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async deleteTeamEmail(id: string): Promise<boolean> {
    const result = await db.delete(teamEmails).where(eq(teamEmails.id, id));
    return true; // Drizzle return count for delete is driver-dependent
  }

  async getTeamEmails(type?: 'inbound' | 'outbound', limit = 50): Promise<(TeamEmail & { fromUserRank?: string | null })[]> {
    let query = db
      .select({
        id: teamEmails.id,
        fromUserId: teamEmails.fromUserId,
        toEmail: teamEmails.toEmail,
        fromEmail: teamEmails.fromEmail,
        subject: teamEmails.subject,
        content: teamEmails.content,
        status: teamEmails.status,
        type: teamEmails.type,
        attachments: teamEmails.attachments,
        createdAt: teamEmails.createdAt,
        fromUserRank: users.rank
      })
      .from(teamEmails)
      .leftJoin(users, sql`LOWER(${teamEmails.fromEmail}) = LOWER(${users.email})`);

    if (type) {
      query = query.where(eq(teamEmails.type, type)) as any;
    }

    return await query.orderBy(desc(teamEmails.createdAt)).limit(limit);
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
        verificationTokenExpiresAt: users.verificationTokenExpiresAt,
        loginStreak: users.loginStreak,
        lastLoginDate: users.lastLoginDate,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        avatar: users.avatar,
        rank: users.rank,
        profilePicture: users.profilePicture,
        permissions: users.permissions,
        teamKey: teamKeys,
      })
      .from(users)
      .leftJoin(teamKeys, eq(users.id, teamKeys.userId))
      .where(inArray(users.role, ['team', 'admin', 'founder']))
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
          verificationTokenExpiresAt: users.verificationTokenExpiresAt,
          loginStreak: users.loginStreak,
          lastLoginDate: users.lastLoginDate,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          avatar: users.avatar,
          rank: users.rank,
          profilePicture: users.profilePicture,
          permissions: users.permissions
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

  async getUsersCountInRange(since: Date): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        since.getTime() === 0
          ? eq(users.role, 'user')
          : and(eq(users.role, 'user'), gte(users.createdAt, since))
      );

    return result?.count || 0;
  }

  async getEarningsSumInRange(since: Date): Promise<string> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')` })
      .from(earnings)
      .where(
        since.getTime() === 0
          ? eq(earnings.status, 'completed')
          : and(eq(earnings.status, 'completed'), gte(earnings.createdAt, since))
      );

    return result?.total || "0.00";
  }

  async getAnalyticsData(since: Date): Promise<any[]> {
    const isToday = (Date.now() - since.getTime()) < 24 * 60 * 60 * 1000 + 1000;
    const format = isToday ? 'YYYY-MM-DD HH24:00' : 'YYYY-MM-DD';

    const formatStr = sql.raw(`'${format}'`);

    const registrations = await db
      .select({ 
        date: sql<string>`TO_CHAR(${users.createdAt}, ${formatStr})`, 
        count: sql<number>`COUNT(*)` 
      })
      .from(users)
      .where(
        since.getTime() === 0
          ? eq(users.role, 'user')
          : and(eq(users.role, 'user'), gte(users.createdAt, since))
      )
      .groupBy(sql`TO_CHAR(${users.createdAt}, ${formatStr})`)
      .orderBy(sql`TO_CHAR(${users.createdAt}, ${formatStr})`);

    const revenue = await db
      .select({ 
        date: sql<string>`TO_CHAR(${earnings.createdAt}, ${formatStr})`, 
        amount: sql<string>`SUM(${earnings.amount})` 
      })
      .from(earnings)
      .where(
        since.getTime() === 0
          ? eq(earnings.status, 'completed')
          : and(eq(earnings.status, 'completed'), gte(earnings.createdAt, since))
      )
      .groupBy(sql`TO_CHAR(${earnings.createdAt}, ${formatStr})`)
      .orderBy(sql`TO_CHAR(${earnings.createdAt}, ${formatStr})`);

    // Merge datasets into a unified timeline
    const mergedMap = new Map<string, any>();
    registrations.forEach(r => {
      mergedMap.set(r.date, { date: r.date, count: Number(r.count), amount: 0 });
    });
    
    revenue.forEach(rev => {
      if (mergedMap.has(rev.date)) {
        mergedMap.get(rev.date).amount = Number(rev.amount);
      } else {
        mergedMap.set(rev.date, { date: rev.date, count: 0, amount: Number(rev.amount) });
      }
    });

    return Array.from(mergedMap.values()).sort((a,b) => a.date.localeCompare(b.date));
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

  // --- Daily Tasks Methods ---
  async getDailyTasks(): Promise<DailyTask[]> {
    return await db.select().from(dailyTasks).orderBy(desc(dailyTasks.createdAt));
  }

  async getDailyTask(id: string): Promise<DailyTask | undefined> {
    const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id));
    return task;
  }

  async createDailyTask(insertTask: InsertDailyTask): Promise<DailyTask> {
    const [task] = await db.insert(dailyTasks).values(insertTask).returning();
    return task;
  }

  async updateDailyTask(id: string, updates: Partial<InsertDailyTask>): Promise<DailyTask | undefined> {
    const [task] = await db.update(dailyTasks).set(updates).where(eq(dailyTasks.id, id)).returning();
    return task;
  }

  async deleteDailyTask(id: string): Promise<void> {
    await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
  }

  // --- Task Records Methods ---
  async getDailyTasksForUser(userId: string): Promise<{ task: DailyTask, record: TaskRecord | null }[]> {
    // Return all daily tasks. Also left join to get the record for this specific user.
    const results = await db
      .select({
        task: dailyTasks,
        record: taskRecords
      })
      .from(dailyTasks)
      .leftJoin(taskRecords, and(eq(taskRecords.taskId, dailyTasks.id), eq(taskRecords.userId, userId)));
    return results;
  }

  async getTaskRecord(userId: string, taskId: string): Promise<TaskRecord | undefined> {
    const [record] = await db
      .select()
      .from(taskRecords)
      .where(and(eq(taskRecords.userId, userId), eq(taskRecords.taskId, taskId)));
    return record;
  }

  async createTaskRecord(insertRecord: InsertTaskRecord): Promise<TaskRecord> {
    const [record] = await db.insert(taskRecords).values(insertRecord).returning();
    return record;
  }

  async updateTaskRecord(id: string, updates: Partial<InsertTaskRecord> & { completedAt?: Date | null }): Promise<TaskRecord | undefined> {
    const [record] = await db.update(taskRecords).set(updates).where(eq(taskRecords.id, id)).returning();
    return record;
  }

  async getTodayCompletedTasksByType(userId: string, type: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(taskRecords)
      .innerJoin(dailyTasks, eq(taskRecords.taskId, dailyTasks.id))
      .where(and(
        eq(taskRecords.userId, userId),
        eq(dailyTasks.type, type),
        eq(taskRecords.status, 'completed'),
        gte(taskRecords.completedAt, todayStart)
      ));

    return Number(result[0]?.count || 0);
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
      .set({ status: updates.status, updatedAt: new Date() })
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

  async getCommissionLogsByBeneficiary(userId: string): Promise<any[]> {
    const results = await db
      .select({
        id: commissionLogs.id,
        beneficiaryId: commissionLogs.beneficiaryId,
        sourceUserId: commissionLogs.sourceUserId,
        triggerWithdrawalId: commissionLogs.triggerWithdrawalId,
        amount: commissionLogs.amount,
        rate: commissionLogs.rate,
        level: commissionLogs.level,
        status: commissionLogs.status,
        metadata: commissionLogs.metadata,
        createdAt: commissionLogs.createdAt,
        updatedAt: commissionLogs.updatedAt,
        sourceUser: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(commissionLogs)
      .innerJoin(users, eq(commissionLogs.sourceUserId, users.id))
      .where(eq(commissionLogs.beneficiaryId, userId))
      .orderBy(desc(commissionLogs.createdAt));

    return results;
  }

  // Withdrawals with Commission Logic
  async createWithdrawal(insertWithdrawal: InsertWithdrawal): Promise<Withdrawal> {
    // 0. Fetch Dynamic Configuration
    const minPayout = await this.getSystemConfigValue("MIN_PAYOUT", 100);
    const systemFeeRate = await this.getSystemConfigValue("SYSTEM_FEE", 10) / 100;
    const l1Rate = await this.getSystemConfigValue("L1_BONUS", 15) / 100;
    const l2Rate = await this.getSystemConfigValue("L2_BONUS", 7.5) / 100;

    // Validate minimum withdrawal amount
    const amount = parseFloat(insertWithdrawal.amount);
    if (amount < minPayout) {
      throw new Error(`Minimum payout requirement not met. Threshold: ${minPayout} PKR`);
    }
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }

    // Start a transaction to ensure integrity
    return await db.transaction(async (tx) => {
      // 1. Fetch user state inside transaction for atomic verification
      const [user] = await tx.select().from(users).where(eq(users.id, insertWithdrawal.userId));
      if (!user) {
        throw new Error("User not found in registry.");
      }

      // 2. Atomic Balance Verification
      const currentBalance = parseFloat(user.availableBalance || "0");
      if (currentBalance < amount) {
        throw new Error(`Insufficient balance. Current treasury: ${currentBalance} PKR.`);
      }

      // 3. Atomic Pending Check
      const [pending] = await tx
        .select()
        .from(withdrawals)
        .where(and(eq(withdrawals.userId, insertWithdrawal.userId), eq(withdrawals.status, "pending")))
        .limit(1);
      
      if (pending) {
        throw new Error("Synchronization Error: A pending payout request already exists for this node.");
      }

      // 4. Calculate Fee and Net Amount
      // Net = Total - SystemFee - L1Bonus - L2Bonus (Referral bonuses are carved out of the requested amount)
      const feeAmount = (amount * systemFeeRate).toFixed(2);
      const l1BonusAmount = user.referredBy ? (amount * l1Rate) : 0;
      
      // Determine L2 beneficiary
      let l2BeneficiaryId: string | null = null;
      if (user.referredBy) {
        const [referrerL1] = await tx.select().from(users).where(eq(users.id, user.referredBy));
        if (referrerL1 && referrerL1.referredBy) {
          l2BeneficiaryId = referrerL1.referredBy;
        }
      }
      const l2BonusAmount = l2BeneficiaryId ? (amount * l2Rate) : 0;

      const netAmount = (amount - parseFloat(feeAmount) - l1BonusAmount - l2BonusAmount).toFixed(2);

      // 5. Create Withdrawal Record
      const [withdrawal] = await tx.insert(withdrawals).values({
        ...insertWithdrawal,
        fee: feeAmount,
        netAmount: netAmount,
        status: "pending"
      }).returning();

      // 6. Securely deduct balance inside transaction
      await tx.update(users).set({
        availableBalance: sql`${users.availableBalance} - ${insertWithdrawal.amount}`,
        updatedAt: new Date()
      }).where(eq(users.id, insertWithdrawal.userId));

      // 7. Determine Commissions
      if (user.referredBy) {
        // Level 1 Referrer
        if (l1BonusAmount > 0) {
          await tx.insert(commissionLogs).values({
            beneficiaryId: user.referredBy,
            sourceUserId: user.id,
            triggerWithdrawalId: withdrawal.id,
            amount: l1BonusAmount.toFixed(2),
            rate: l1Rate.toFixed(4),
            level: 1,
            status: "pending", 
            metadata: {
              withdrawalAmount: insertWithdrawal.amount,
              calculatedAt: new Date().toISOString(),
              configUsed: { l1Rate, systemFeeRate }
            }
          });
        }

        // Level 2 Referrer
        if (l2BeneficiaryId && l2BonusAmount > 0) {
          await tx.insert(commissionLogs).values({
            beneficiaryId: l2BeneficiaryId,
            sourceUserId: user.id,
            triggerWithdrawalId: withdrawal.id,
            amount: l2BonusAmount.toFixed(2),
            rate: l2Rate.toFixed(4),
            level: 2,
            status: "pending",
            metadata: {
              withdrawalAmount: insertWithdrawal.amount,
              calculatedAt: new Date().toISOString(),
              configUsed: { l2Rate, systemFeeRate }
            }
          });
        }
      }

      return withdrawal;
    });
  }

  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> {
    return await db.select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
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
  async processWithdrawal(withdrawalId: string, adminId: string, transactionId?: string): Promise<Withdrawal> {
    return await db.transaction(async (tx) => {
      // 1. Update withdrawal status
      const [withdrawal] = await tx
        .update(withdrawals)
        .set({
          status: "completed",
          transactionId: transactionId || null,
          processedAt: new Date(),
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
          rejectionReason: reason,
          processedAt: new Date(),
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

      // Count direct active referrals
      const [{ count: refCount }] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.referredBy, user.id));

      const activeRefs = Number(refCount) || 0;

      let newRank = "Useless";

      // Evaluate Rank based on BOTH earnings and referrals thresholds
      for (const rank of RANKS) {
        if (totalEarnings >= rank.minEarned && activeRefs >= rank.minRefs) {
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
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        groupByFormat = 'YYYY-MM-DD';
        break;
    }

    const sqlFormat = sql.raw(`'${groupByFormat}'`);

    const results = await db
      .select({
        date: sql<string>`TO_CHAR(${earnings.createdAt}, ${sqlFormat})`,
        amount: sql<string>`COALESCE(SUM(${earnings.amount}), '0.00')`
      })
      .from(earnings)
      .where(and(
        eq(earnings.userId, userId),
        sql`${earnings.createdAt} >= ${startDate}`
      ))
      .groupBy(sql`TO_CHAR(${earnings.createdAt}, ${sqlFormat})`)
      .orderBy(sql`TO_CHAR(${earnings.createdAt}, ${sqlFormat})`);

    return results;
  }

  async getReferralLeaderboard(userId: string) {
    try {
      console.log(`[ReferralTree] Fetching network for user: ${userId}`);

      // 1. Get Top Level 1 Referees (Directly referred by userId)
      const level1Users = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatar: users.avatar,
          rank: users.rank,
          createdAt: users.createdAt,
          referredBy: users.referredBy,
          totalEarnings: users.totalEarnings,
          profilePicture: users.profilePicture
        })
        .from(users)
        .where(eq(users.referredBy, userId))
        .orderBy(desc(users.totalEarnings))
        .limit(100);

      console.log(`[ReferralTree] Found ${level1Users.length} L1 users (capped at 100)`);

      // 2. Get Top Level 2 Referees (Referred by Level 1 users)
      const level1Ids = level1Users.map(u => u.id);
      let level2Users: any[] = [];

      if (level1Ids.length > 0) {
        level2Users = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            avatar: users.avatar,
            rank: users.rank,
            createdAt: users.createdAt,
            referredBy: users.referredBy,
            totalEarnings: users.totalEarnings,
          profilePicture: users.profilePicture
          })
          .from(users)
          .where(inArray(users.referredBy, level1Ids))
          .orderBy(desc(users.totalEarnings))
          .limit(200);

        console.log(`[ReferralTree] Found ${level2Users.length} L2 users (capped at 200)`);
      }

      // 3. Format into a flat list for the frontend to reconstruct
      const combined = [
        ...level1Users.map((u) => ({
          ...u,
          earningsFromUser: '0.00',
          level: 1,
          referredBy: userId
        })),
        ...level2Users.map((u) => ({
          ...u,
          earningsFromUser: '0.00',
          level: 2,
          referredBy: u.referredBy // This will be one of the L1 IDs
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

    // Combine and format — null-coalesce all dates to satisfy IStorage interface
    const transactions = [
      ...earningsData.map(e => ({
        id: e.id,
        type: 'earning' as const,
        amount: e.amount,
        status: e.status ?? 'completed',
        date: e.createdAt ?? new Date(),
        description: e.description || 'Ad viewing'
      })),
      ...withdrawalsData.map(w => ({
        id: w.id,
        type: 'withdrawal' as const,
        amount: w.amount,
        status: w.status ?? 'pending',
        date: w.createdAt ?? new Date(),
        description: `Withdrawal via ${w.method}`
      })),
      ...commissionsData.map(c => ({
        id: c.id,
        type: 'commission' as const,
        amount: c.amount,
        status: c.status ?? 'pending',
        date: c.createdAt ?? new Date(),
        description: `Level ${c.level} referral commission`
      }))
    ];

    // Sort by date and limit
    return transactions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  // Admin Features Implementation
  async getLeaderboardInsights(limit: number = 50, offset: number = 0): Promise<{ 
    globalRanking: any[]; 
    topReferrers: any[]; 
    anomalies: any[]; 
    totalCount: number;
    lastUpdated: Date;
  }> {
    // Check for existing cache to determine if refresh is needed
    const lastCacheEntry = await db.select({ recordedAt: leaderboardCache.recordedAt })
      .from(leaderboardCache)
      .orderBy(desc(leaderboardCache.recordedAt))
      .limit(1);
    
    const now = new Date();
    const isStale = !lastCacheEntry.length || (now.getTime() - new Date(lastCacheEntry[0].recordedAt!).getTime() > 3600000);

    if (isStale) {
      await this.refreshLeaderboardCache();
    }

    // 1. Get Global Ranking (with pagination)
    const globalRanking = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      rank: users.rank,
      totalEarnings: users.totalEarnings,
      isVerified: users.isVerified,
      avatar: users.avatar,
      globalRank: leaderboardCache.globalRank,
      performanceScore: leaderboardCache.performanceScore,
      earningsScore: leaderboardCache.earningsScore,
      teamScore: leaderboardCache.teamScore,
      activeScore: leaderboardCache.activeScore,
      healthScore: leaderboardCache.healthScore,
      level1Count: leaderboardCache.level1Count,
      level2Count: leaderboardCache.level2Count
    })
    .from(leaderboardCache)
    .innerJoin(users, eq(leaderboardCache.userId, users.id))
    .orderBy(leaderboardCache.globalRank)
    .limit(limit)
    .offset(offset);

    // 2. Get Top Referrers (from users table directly for real-time leader switch if needed, or from cache)
    // For Enterprise, we'll use a slightly different aggregation for referrers here
    const topReferrers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      rank: users.rank,
      avatar: users.avatar,
      totalEarnings: users.totalEarnings,
      level1Count: leaderboardCache.level1Count,
      level2Count: leaderboardCache.level2Count,
      referralCount: leaderboardCache.level1Count
    })
    .from(users)
    .innerJoin(leaderboardCache, eq(leaderboardCache.userId, users.id))
    .orderBy(desc(leaderboardCache.level1Count))
    .limit(limit);

    // 3. Detect Anomalies (Risk Triage) - This remains real-time for security
    const anomalies = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      rank: users.rank,
      avatar: users.avatar,
      totalEarnings: users.totalEarnings,
      createdAt: users.createdAt,
      referralCount: sql<number>`CAST(COALESCE((SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id), 0) AS INTEGER)`
    })
    .from(users)
    .where(or(
      and(
        gte(users.createdAt, new Date(now.getTime() - 86400000)),
        gte(users.totalEarnings, "5000")
      ),
      and(
        gte(sql<number>`CAST(COALESCE((SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id), 0) AS INTEGER)`, 50),
        lte(users.totalEarnings, "100")
      )
    ))
    .limit(50);

    const mappedAnomalies = anomalies.map(u => {
      const userCreatedDate = u.createdAt ? new Date(u.createdAt).getTime() : now.getTime();
      const daysActive = Math.max(1, (now.getTime() - userCreatedDate) / (1000 * 60 * 60 * 24));
      const earnings = parseFloat(u.totalEarnings as string || "0");
      let reason = "Unknown anomaly";
      if (daysActive <= 1 && earnings > 5000) reason = "Explosive Earnings Velocity";
      else if (u.referralCount > 50 && earnings < 100) reason = "Suspicious Bot Network (High Refs, Low Earner)";
      
      return { ...u, daysActive: Math.round(daysActive), reason };
    });

    const totalCountResult = await db.select({ count: sql<number>`count(*)` }).from(leaderboardCache);

    return { 
      globalRanking, 
      topReferrers, 
      anomalies: mappedAnomalies, 
      totalCount: totalCountResult[0]?.count || 0,
      lastUpdated: lastCacheEntry[0]?.recordedAt || now
    };
  }

  async refreshLeaderboardCache(): Promise<void> {
    const now = new Date();
    
    // Clear existing cache for current period
    await db.delete(leaderboardCache);

    // Fetch all qualified users and calculate scores
    // Note: In extremely large environments, this would be a single SQL insert statement
    // For this implementation, we recompute in-memory with SQL-helper logic
    const allQualifiedUsers = await db.select({
      id: users.id,
      totalEarnings: users.totalEarnings,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
      lastLoginDate: users.lastLoginDate,
      referralCount: sql<number>`CAST(COALESCE((SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id), 0) AS INTEGER)`,
      level2Count: sql<number>`CAST(COALESCE((SELECT COUNT(*) FROM users u2 JOIN users u3 ON u3.referred_by = u2.id WHERE u2.referred_by = users.id), 0) AS INTEGER)`
    })
    .from(users)
    .where(eq(users.isActive, true));

    if (!allQualifiedUsers.length) return;

    const maxEarnings = Math.max(...allQualifiedUsers.map(u => parseFloat(u.totalEarnings || "0")), 1);
    const maxReferrals = Math.max(...allQualifiedUsers.map(u => u.referralCount), 1);

    const scoredUsers = allQualifiedUsers.map(u => {
      const accountAgeDays = Math.max(1, (now.getTime() - new Date(u.createdAt!).getTime()) / 86400000);
      
      // 1. Earnings Score (0-100) - Normalized platform revenue contribution
      const earningsScore = (parseFloat(u.totalEarnings || "0") / maxEarnings) * 100;
      
      // 2. Team Score (0-100) - Referral network depth contribution
      const teamScore = (u.referralCount / maxReferrals) * 100;
      
      // 3. Active Score (0-100) - Consistency (%)
      const daysSinceLogin = Math.max(0, (now.getTime() - new Date(u.lastLoginDate || u.createdAt!).getTime()) / 86400000);
      const activeScore = Math.max(0, 100 - (daysSinceLogin * 5)); // Decays every day inactive
      
      // 4. Health Score (0-100) - Identity Verification & Account Integrity
      const healthScore = (u.isVerified ? 60 : 20) + (accountAgeDays > 30 ? 40 : (accountAgeDays / 30) * 40);

      // Composite Weighted Performance (Earnings 40, Team 30, Active 15, Health 15)
      const performanceScore = (earningsScore * 0.4) + (teamScore * 0.3) + (activeScore * 0.15) + (healthScore * 0.15);

      return {
        userId: u.id,
        performanceScore: performanceScore.toFixed(2),
        earningsScore: earningsScore.toFixed(2),
        teamScore: teamScore.toFixed(2),
        activeScore: activeScore.toFixed(2),
        healthScore: healthScore.toFixed(2),
        level1Count: u.referralCount,
        level2Count: u.level2Count
      };
    });

    // Sort by performance and insert into cache
    scoredUsers.sort((a, b) => parseFloat(b.performanceScore) - parseFloat(a.performanceScore));

    const cacheEnries = scoredUsers.map((u, index) => ({
      ...u,
      globalRank: index + 1,
      recordedAt: now
    }));

    // Batch insert into cache (drizzle doesn't support massive batching sometimes, so we slice if needed)
    // Limit to top 10,000 for enterprise performance
    const topEntries = cacheEnries.slice(0, 10000);
    
    // Perform insertions in chunks of 500
    for(let i = 0; i < topEntries.length; i += 500) {
      const chunk = topEntries.slice(i, i + 500);
      await db.insert(leaderboardCache).values(chunk);
    }
  }

  async getActiveUsersCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));
    return Number(result[0]?.count || 0);
  }

  async getAdminWithdrawals(): Promise<Array<Withdrawal & { user: User }>> {
    const results = await db
      .select({
        withdrawal: withdrawals,
        user: users
      })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .orderBy(desc(withdrawals.createdAt));

    return results.map(r => ({
      ...r.withdrawal,
      user: r.user
    }));
  }

  async updateWithdrawalStatus(
    id: string,
    status: string,
    adminId: string,
    transactionId?: string,
    rejectionReason?: string
  ): Promise<Withdrawal> {
    if (status === 'completed') {
      return await this.processWithdrawal(id, adminId, transactionId);
    } else if (status === 'rejected') {
      return await this.rejectWithdrawal(id, adminId, rejectionReason || 'Rejected by administrator');
    }

    // Default status update if not process/reject (e.g., 'processing')
    const [updated] = await db
      .update(withdrawals)
      .set({
        status: status as any,
        transactionId: transactionId || null,
        rejectionReason: rejectionReason || null,
        processedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(withdrawals.id, id))
      .returning();

    if (!updated) throw new Error("Withdrawal not found");
    return updated;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Team Invitations
  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const [newInvitation] = await db
      .insert(teamInvitations)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.token, token),
        sql`${teamInvitations.expiresAt} > now()`,
        sql`${teamInvitations.consumedAt} IS NULL`
      ));
    return invitation;
  }

  async consumeTeamInvitation(invitationId: string): Promise<void> {
    await db
      .update(teamInvitations)
      .set({ consumedAt: new Date() })
      .where(eq(teamInvitations.id, invitationId));
  }

  async updateUserPermissions(userId: string, permissions: string[]): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ permissions })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async createInternalNote(note: InsertInternalNote): Promise<InternalNote> {
    const [newNote] = await db
      .insert(internalNotes)
      .values(note)
      .returning();
    return newNote;
  }

  async getInternalNotes(targetType: string, targetId: string): Promise<Array<InternalNote & { admin: { firstName: string, lastName: string } }>> {
    const results = await db
      .select({
        note: internalNotes,
        admin: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(internalNotes)
      .innerJoin(users, eq(internalNotes.adminId, users.id))
      .where(and(
        eq(internalNotes.targetType, targetType),
        eq(internalNotes.targetId, targetId)
      ))
      .orderBy(desc(internalNotes.createdAt));

    return results.map(r => ({
      ...r.note,
      admin: r.admin
    }));
  }

  async adjustUserBalance(userId: string, amount: string, type: 'add' | 'subtract', adminId: string, reason: string): Promise<User> {
    return await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      if (!user) throw new Error("User not found");

      const [admin] = await tx.select().from(users).where(eq(users.id, adminId));
      if (!admin) throw new Error("Admin not found");

      const adjustment = type === 'add' ? amount : `-${amount}`;
      const [updatedUser] = await tx
        .update(users)
        .set({
          availableBalance: sql`${users.availableBalance} + ${adjustment}`,
          // totalEarnings is a lifetime gross figure — only credits increase it.
          // Admin debits only reduce availableBalance, not the historical record.
          totalEarnings: type === 'add'
            ? sql`${users.totalEarnings} + ${amount}`
            : users.totalEarnings,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      await tx.insert(auditLogs).values({
        adminId,
        action: `BALANCE_ADJUST_${type.toUpperCase()}`,
        targetType: "user",
        targetId: userId,
        details: {
          previous_balance: user.availableBalance,
          new_balance: updatedUser.availableBalance,
          variance: type === 'add' ? `+${amount}` : `-${amount}`,
          reason: reason
        }
      });

      // Role formatting logic
      let roleTag = admin.role?.toUpperCase() || "REGULAR";
      if (roleTag === "FOUNDER") roleTag = "FOUNDER/CEO";
      if (roleTag === "TEAM") roleTag = "REGULAR";

      // Create Automated Notification
      await tx.insert(notifications).values({
        userId,
        title: `Ledger ${type === 'add' ? 'Credit' : 'Debit'} Success`,
        message: reason,
        type: "financial",
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: roleTag,
        amount: amount,
        adjustmentType: type === 'add' ? 'credit' : 'debit'
      });

      return updatedUser;
    });

    // After transaction: re-evaluate rank if credit increased totalEarnings.
    if (type === 'add') {
      await this.checkAndUpdateRank(userId);
    }

    // Return the latest user state after rank check
    const finalUser = await this.getUserById(userId);
    return finalUser!;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async deleteUser(userId: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user && user.role === 'founder') {
      throw new Error("Protected Node Error: Founder accounts cannot be terminated from the directory.");
    }
    await db.delete(users).where(eq(users.id, userId));
  }

  async getUsersPaginated(params: { page: number, limit: number, search?: string, sort?: string, sortOrder?: 'asc' | 'desc', role?: string, ids?: string[] }): Promise<{ users: User[], totalCount: number }> {
    const offset = (params.page - 1) * params.limit;
    const conditions = [];
    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(or(
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.email, searchPattern)
      ));
    }
    if (params.role) {
      conditions.push(eq(users.role, params.role));
    }
    if (params.ids && params.ids.length > 0) {
      conditions.push(inArray(users.id, params.ids));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(whereClause);
    const results = await db.select().from(users).where(whereClause).limit(params.limit).offset(offset).orderBy(desc(users.createdAt));
    return { users: results, totalCount: Number(countResult?.count || 0) };
  }

  async getAuditLogsPaginated(params: { page: number, limit: number, search?: string, ids?: string[], period?: string }): Promise<{ logs: any[], totalCount: number }> {
    const offset = (params.page - 1) * params.limit;
    const conditions = [];

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(or(
        ilike(auditLogs.action, searchPattern),
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern)
      ));
    }

    if (params.ids && params.ids.length > 0) {
      conditions.push(inArray(auditLogs.id, params.ids));
    }

    if (params.period && params.period !== 'all_time') {
      const startDate = new Date();
      switch (params.period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          conditions.push(gte(auditLogs.createdAt, startDate));
          break;
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          conditions.push(and(gte(auditLogs.createdAt, startDate), lte(auditLogs.createdAt, endDate)));
          break;
        case 'this_week':
          startDate.setDate(startDate.getDate() - 7);
          conditions.push(gte(auditLogs.createdAt, startDate));
          break;
        case 'this_month':
          startDate.setMonth(startDate.getMonth() - 1);
          conditions.push(gte(auditLogs.createdAt, startDate));
          break;
        case 'this_year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          conditions.push(gte(auditLogs.createdAt, startDate));
          break;
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.adminId, users.id))
      .where(whereClause);
    
    const results = await db.select({
      log: auditLogs,
      admin: {
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.adminId, users.id))
    .where(whereClause)
    .limit(params.limit)
    .offset(offset)
    .orderBy(desc(auditLogs.createdAt));

    return { 
      logs: results.map(r => ({ ...r.log, admin: r.admin })), 
      totalCount: Number(countResult?.count || 0) 
    };
  }

  async getWithdrawalsPaginated(params: { page: number, limit: number, search?: string, status?: string, ids?: string[] }): Promise<{ withdrawals: Array<Withdrawal & { user: User }>, totalCount: number }> {
    const offset = (params.page - 1) * params.limit;
    const conditions = [];
    
    if (params.status && params.status !== 'all') {
      conditions.push(eq(withdrawals.status, params.status as any));
    }

    if (params.ids && params.ids.length > 0) {
      conditions.push(inArray(withdrawals.id, params.ids));
    }
    
    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(or(
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.email, searchPattern),
        ilike(withdrawals.accountNumber, searchPattern)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .where(whereClause);

    const results = await db
      .select({
        withdrawal: withdrawals,
        user: users
      })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .where(whereClause)
      .limit(params.limit)
      .offset(offset)
      .orderBy(desc(withdrawals.createdAt));

    return {
      withdrawals: results.map(r => ({ ...r.withdrawal, user: r.user })),
      totalCount: Number(countResult?.count || 0)
    };
  }

  async bulkUpdateWithdrawalStatus(ids: string[], status: string, adminId: string): Promise<void> {
    await db.transaction(async (tx) => {
      for (const id of ids) {
        await tx
          .update(withdrawals)
          .set({ 
            status: status as any, 
            processedAt: status === 'completed' ? new Date() : null,
            updatedAt: new Date()
          })
          .where(eq(withdrawals.id, id));
        
        await tx.insert(auditLogs).values({
          adminId,
          action: `BULK_WITHDRAWAL_${status.toUpperCase()}`,
          targetType: "withdrawal",
          targetId: id,
          details: `Bulk status update to ${status}`
        });
      }
    });
  }

  // System Config
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key));
    return config;
  }

  async getAllSystemConfigs(): Promise<SystemConfig[]> {
    return await db.select().from(systemConfig);
  }

  async updateSystemConfig(key: string, value: any, adminId: string): Promise<SystemConfig | undefined> {
    return await db.transaction(async (tx) => {
      // Upsert: Try to update first
      const [updated] = await tx
        .update(systemConfig)
        .set({ 
          value, 
          updatedAt: new Date() 
        })
        .where(eq(systemConfig.key, key))
        .returning();

      if (updated) {
        // Log the change
        await tx.insert(auditLogs).values({
          adminId,
          action: "SYSTEM_CONFIG_UPDATED",
          targetType: "system",
          targetId: key,
          details: { key, value }
        });
        return updated;
      }

      // If no update occurred, create it
      const [created] = await tx
        .insert(systemConfig)
        .values({
          key,
          value,
          updatedAt: new Date()
        })
        .returning();

      // Log creation
      await tx.insert(auditLogs).values({
        adminId,
        action: "SYSTEM_CONFIG_CREATED",
        targetType: "system",
        targetId: key,
        details: { key, value }
      });

      return created;
    });
  }

  async createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    const [newConfig] = await db.insert(systemConfig).values(config).returning();
    return newConfig;
  }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}

export class MemStorage {
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
  async getUser(id: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getUserByEmail(email: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async validateUserPassword(email: string, password: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async updateUserEarnings(userId: string, amount: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async generatePasswordResetToken(email: string): Promise<string | undefined> { throw new Error("Not implemented in MemStorage"); }
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> { throw new Error("Not implemented in MemStorage"); }
  async createEarning(earning: InsertEarning): Promise<Earning> { throw new Error("Not implemented in MemStorage"); }

  // Daily Task Stubs
  async createDailyTask(task: InsertDailyTask): Promise<DailyTask> { throw new Error("Not implemented in MemStorage"); }
  async getDailyTasks(): Promise<DailyTask[]> { return []; }
  async getDailyTask(id: string): Promise<DailyTask | undefined> { return undefined; }
  async updateDailyTask(id: string, updates: Partial<InsertDailyTask>): Promise<DailyTask | undefined> { throw new Error("Not implemented in MemStorage"); }
  async deleteDailyTask(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getDailyTasksForUser(userId: string): Promise<Array<{ task: DailyTask; record: TaskRecord | null }>> { return []; }
  async getTodayCompletedTasksByType(userId: string, type: string): Promise<number> { return 0; }
  async getTaskRecord(userId: string, taskId: string): Promise<TaskRecord | undefined> { return undefined; }
  async createTaskRecord(record: InsertTaskRecord): Promise<TaskRecord> { throw new Error("Not implemented in MemStorage"); }
  async updateTaskRecord(id: string, updates: Partial<InsertTaskRecord> & { completedAt?: Date | null }): Promise<TaskRecord | undefined> { throw new Error("Not implemented in MemStorage"); }

  // System Config Stubs
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> { return undefined; }
  async getAllSystemConfigs(): Promise<SystemConfig[]> { return []; }
  async updateSystemConfig(key: string, value: any, adminId: string): Promise<SystemConfig | undefined> { return undefined; }
  async createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> { throw new Error("Not implemented in MemStorage"); }
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
  async getUsersPaginated(params: { page: number, limit: number, search?: string, sort?: string, sortOrder?: 'asc' | 'desc' }): Promise<{ users: User[], totalCount: number }> { throw new Error("Not implemented in MemStorage"); }
  async getAuditLogsPaginated(params: { page: number, limit: number, search?: string }): Promise<{ logs: AuditLog[], totalCount: number }> { throw new Error("Not implemented in MemStorage"); }
  async getWithdrawalsPaginated(params: { page: number, limit: number, search?: string, status?: string }): Promise<{ withdrawals: Array<Withdrawal & { user: User }>, totalCount: number }> { throw new Error("Not implemented in MemStorage"); }
  async bulkUpdateWithdrawalStatus(ids: string[], status: string, adminId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getUsersByRole(role: 'user' | 'team' | 'founder'): Promise<User[]> { throw new Error("Not implemented in MemStorage"); }
  async getUsersCountInRange(since: Date): Promise<number> { throw new Error("Not implemented in MemStorage"); }
  async getEarningsSumInRange(since: Date): Promise<string> { throw new Error("Not implemented in MemStorage"); }
  async getAnalyticsData(since: Date): Promise<any[]> { throw new Error("Not implemented in MemStorage"); }
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
  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> { throw new Error("Not implemented in MemStorage"); }
  async getCheckPendingWithdrawal(userId: string): Promise<Withdrawal | undefined> { throw new Error("Not implemented in MemStorage"); }
  async processWithdrawal(withdrawalId: string, adminId: string, transactionId?: string): Promise<Withdrawal> { throw new Error("Not implemented in MemStorage"); }
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<Withdrawal> { throw new Error("Not implemented in MemStorage"); }
  async checkAndUpdateRank(userId: string): Promise<User> { throw new Error("Not implemented in MemStorage"); }
  async getRankHistory(userId: string): Promise<RankLog[]> { throw new Error("Not implemented in MemStorage"); }

  // Admin Features Stubs
  async getLeaderboardInsights(): Promise<{ topEarners: any[]; topReferrers: any[]; anomalies: any[] }> { throw new Error("Not implemented in MemStorage"); }
  async getAdminWithdrawals(): Promise<Array<Withdrawal & { user: User }>> { throw new Error("Not implemented in MemStorage"); }
  async getActiveUsersCount(): Promise<number> { throw new Error("Not implemented in MemStorage"); }
  async updateWithdrawalStatus(id: string, status: string, adminId: string, transactionId?: string, rejectionReason?: string): Promise<Withdrawal> { throw new Error("Not implemented in MemStorage"); }
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> { throw new Error("Not implemented in MemStorage"); }
  async getAuditLogs(limit?: number): Promise<AuditLog[]> { throw new Error("Not implemented in MemStorage"); }
  async createInternalNote(note: InsertInternalNote): Promise<InternalNote> { throw new Error("Not implemented in MemStorage"); }
  async getInternalNotes(targetType: string, targetId: string): Promise<Array<InternalNote & { admin: { firstName: string, lastName: string } }>> { throw new Error("Not implemented in MemStorage"); }
  async adjustUserBalance(userId: string, amount: string, type: 'add' | 'subtract', adminId: string, reason: string): Promise<User> { throw new Error("Not implemented in MemStorage"); }
  async deleteUser(userId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }

  private generateReferralCode(): string {
    const prefix = "THORX";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}

/**
 * THORX domain data always uses Drizzle + PostgreSQL (`DATABASE_URL`).
 * On Insforge Cloud, set `DATABASE_URL` to the Postgres connection string from the same
 * Insforge project as `INSFORGE_API_URL` / `VITE_INSFORGE_URL`. There is no alternate
 * "Insforge DB driver" in code — the stack is explicitly Postgres + Insforge Auth + Insforge Storage API.
 */
export const storage = new DatabaseStorage();