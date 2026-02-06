import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// registrations table removed
export const insertRegistrationSchema = z.object({
  phone: z.string(),
  email: z.string().email(),
});
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = {
  id: string;
  phone: string;
  email: string;
  referralCode: string;
};

// Main users table with full authentication and profile data
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  identity: text("identity").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: varchar("referred_by"),
  role: text("role").default("user"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0.00"),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  verificationToken: text("verification_token"),
  loginStreak: integer("login_streak").default(0),
  lastLoginDate: timestamp("last_login_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  avatar: text("avatar").default("default"),
  rank: text("rank").default("Useless"),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_referral_code_idx").on(table.referralCode),
  index("users_role_idx").on(table.role),
  index("users_is_active_idx").on(table.isActive),
  // Financial integrity constraints
  sql`CONSTRAINT check_positive_earnings CHECK (total_earnings >= 0)`,
  sql`CONSTRAINT check_positive_balance CHECK (available_balance >= 0)`,
  sql`CONSTRAINT check_positive_pending CHECK (pending_balance >= 0)`,
  // Prevent self-referral
  sql`CONSTRAINT check_no_self_referral CHECK (id != referred_by)`,
]);

// Earnings transactions table
export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: text("status").default("completed"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("earnings_user_id_idx").on(table.userId),
  index("earnings_type_idx").on(table.type),
  index("earnings_status_idx").on(table.status),
  index("earnings_created_at_idx").on(table.createdAt),
]);

// Advertisements catalog table
export const advertisements = pgTable("advertisements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").default("easy"),
  duration: integer("duration").notNull(),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  targetUrl: text("target_url"),
  dailyLimit: integer("daily_limit").default(10),
  totalViews: integer("total_views").default(0),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("advertisements_type_idx").on(table.type),
  index("advertisements_category_idx").on(table.category),
  index("advertisements_is_active_idx").on(table.isActive),
]);

// Ad views tracking table
export const adViews = pgTable("ad_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  adId: varchar("ad_id").references(() => advertisements.id, { onDelete: "set null" }),
  adType: text("ad_type").notNull(),
  adNetwork: text("ad_network").default("internal"),
  duration: integer("duration"),
  completed: boolean("completed").default(false),
  earnedAmount: decimal("earned_amount", { precision: 10, scale: 2 }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ad_views_user_id_idx").on(table.userId),
  index("ad_views_ad_id_idx").on(table.adId),
  index("ad_views_completed_idx").on(table.completed),
  index("ad_views_network_idx").on(table.adNetwork),
  index("ad_views_created_at_idx").on(table.createdAt),
]);

// Referrals tracking table
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredId: varchar("referred_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("active"),
  tier: integer("tier").default(1),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("referrals_referrer_id_idx").on(table.referrerId),
  index("referrals_referred_id_idx").on(table.referredId),
  index("referrals_status_idx").on(table.status),
]);



// Withdrawals/Payouts table
export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountDetails: jsonb("account_details").notNull().default(sql`'{}'::jsonb`),
  status: text("status").default("pending"),
  transactionId: text("transaction_id"),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("withdrawals_user_id_idx").on(table.userId),
  index("withdrawals_status_idx").on(table.status),
  index("withdrawals_method_idx").on(table.method),
  index("withdrawals_created_at_idx").on(table.createdAt),
  // Minimum withdrawal amount (e.g., 100 PKR minimum)
  sql`CONSTRAINT check_min_withdrawal CHECK (CAST(amount AS DECIMAL) >= 100)`,
  sql`CONSTRAINT check_positive_amount CHECK (CAST(amount AS DECIMAL) > 0)`,
]);



















// Team emails for inbox functionality
export const teamEmails = pgTable("team_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").references(() => users.id, { onDelete: "set null" }),
  toEmail: text("to_email").notNull(),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").default("sent"),
  type: text("type").default("outbound"),
  attachments: jsonb("attachments").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("team_emails_from_user_id_idx").on(table.fromUserId),
  index("team_emails_to_email_idx").on(table.toEmail),
  index("team_emails_type_idx").on(table.type),
  index("team_emails_created_at_idx").on(table.createdAt),
]);

// Team keys for managing team member access
export const teamKeys = pgTable("team_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyName: text("key_name").notNull(),
  accessLevel: text("access_level").default("member"),
  permissions: text("permissions").array(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("team_keys_user_id_idx").on(table.userId),
  index("team_keys_access_level_idx").on(table.accessLevel),
  index("team_keys_is_active_idx").on(table.isActive),
]);

// User credentials storage for team data management
export const userCredentials = pgTable("user_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  username: text("username"),
  email: text("email"),
  encryptedPassword: text("encrypted_password"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_credentials_user_id_idx").on(table.userId),
  index("user_credentials_platform_idx").on(table.platform),
  index("user_credentials_email_idx").on(table.email),
]);

// Chat messages for support chatbot
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  sender: text("sender").notNull(),
  language: text("language").default("en"),
  intent: text("intent"),
  sentiment: text("sentiment"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("chat_messages_user_id_idx").on(table.userId),
  index("chat_messages_sender_idx").on(table.sender),
  index("chat_messages_created_at_idx").on(table.createdAt),
]);

// HilltopAds configuration table
export const hilltopAdsConfig = pgTable("hilltop_ads_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key").notNull(),
  publisherId: text("publisher_id"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// HilltopAds zones table
export const hilltopAdsZones = pgTable("hilltop_ads_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: text("zone_id").notNull().unique(),
  siteName: text("site_name").notNull(),
  zoneName: text("zone_name").notNull(),
  adFormat: text("ad_format").notNull(),
  status: text("status").default("active"),
  settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
  totalImpressions: integer("total_impressions").default(0),
  totalClicks: integer("total_clicks").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hilltop_ads_zones_zone_id_idx").on(table.zoneId),
  index("hilltop_ads_zones_status_idx").on(table.status),
  index("hilltop_ads_zones_ad_format_idx").on(table.adFormat),
]);

// HilltopAds statistics table
export const hilltopAdsStats = pgTable("hilltop_ads_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").references(() => hilltopAdsZones.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  cpm: decimal("cpm", { precision: 10, scale: 4 }).default("0.0000"),
  revenue: decimal("revenue", { precision: 10, scale: 4 }).default("0.0000"),
  ctr: decimal("ctr", { precision: 5, scale: 2 }).default("0.00"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hilltop_ads_stats_zone_id_idx").on(table.zoneId),
  index("hilltop_ads_stats_date_idx").on(table.date),
]);

// Commission Logs table for Multi-Level Referral System
export const commissionLogs = pgTable("commission_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  beneficiaryId: varchar("beneficiary_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User receiving the commission
  sourceUserId: varchar("source_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // User who requested payout
  triggerWithdrawalId: varchar("trigger_withdrawal_id").references(() => withdrawals.id, { onDelete: "set null" }), // Link to the payout request
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 4 }).notNull(), // 0.1500 or 0.0750
  level: integer("level").notNull(), // 1 or 2
  status: text("status").default("pending"), // pending, paid, voided
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("commission_logs_beneficiary_idx").on(table.beneficiaryId),
  index("commission_logs_source_user_idx").on(table.sourceUserId),
  index("commission_logs_withdrawal_idx").on(table.triggerWithdrawalId),
  index("commission_logs_status_idx").on(table.status),
]);

// Rank Logs table for User Ranking System
export const rankLogs = pgTable("rank_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  oldRank: text("old_rank").notNull(),
  newRank: text("new_rank").notNull(),
  triggerSource: text("trigger_source").notNull(), // e.g., 'earning_update', 'payout', 'admin'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("rank_logs_user_idx").on(table.userId),
]);

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  earnings: many(earnings),
  adViews: many(adViews),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  withdrawals: many(withdrawals),
  teamEmailsSent: many(teamEmails),
  teamKeys: many(teamKeys),
  userCredentials: many(userCredentials),
  chatMessages: many(chatMessages),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
  commissionsReceived: many(commissionLogs, { relationName: "beneficiary" }),
  commissionsGenerated: many(commissionLogs, { relationName: "sourceUser" }),
}));

export const earningsRelations = relations(earnings, ({ one }) => ({
  user: one(users, {
    fields: [earnings.userId],
    references: [users.id],
  }),
}));

export const advertisementsRelations = relations(advertisements, ({ many }) => ({
  adViews: many(adViews),
}));

export const adViewsRelations = relations(adViews, ({ one }) => ({
  user: one(users, {
    fields: [adViews.userId],
    references: [users.id],
  }),
  advertisement: one(advertisements, {
    fields: [adViews.adId],
    references: [advertisements.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referred: one(users, {
    fields: [referrals.referredId],
    references: [users.id],
    relationName: "referred",
  }),
}));



export const withdrawalsRelations = relations(withdrawals, ({ one, many }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
  commissionLogs: many(commissionLogs),
}));



















export const teamEmailsRelations = relations(teamEmails, ({ one }) => ({
  fromUser: one(users, {
    fields: [teamEmails.fromUserId],
    references: [users.id],
  }),
}));

export const teamKeysRelations = relations(teamKeys, ({ one }) => ({
  user: one(users, {
    fields: [teamKeys.userId],
    references: [users.id],
  }),
}));

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(users, {
    fields: [userCredentials.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const hilltopAdsZonesRelations = relations(hilltopAdsZones, ({ many }) => ({
  stats: many(hilltopAdsStats),
}));

export const hilltopAdsStatsRelations = relations(hilltopAdsStats, ({ one }) => ({
  zone: one(hilltopAdsZones, {
    fields: [hilltopAdsStats.zoneId],
    references: [hilltopAdsZones.id],
  }),
}));

export const commissionLogsRelations = relations(commissionLogs, ({ one }) => ({
  beneficiary: one(users, {
    fields: [commissionLogs.beneficiaryId],
    references: [users.id],
    relationName: "beneficiary",
  }),
  sourceUser: one(users, {
    fields: [commissionLogs.sourceUserId],
    references: [users.id],
    relationName: "sourceUser",
  }),
  withdrawal: one(withdrawals, {
    fields: [commissionLogs.triggerWithdrawalId],
    references: [withdrawals.id],
  }),
}));

export const rankLogsRelations = relations(rankLogs, ({ one }) => ({
  user: one(users, {
    fields: [rankLogs.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation


export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  totalEarnings: true,
  availableBalance: true,
  pendingBalance: true,
  totalWithdrawn: true,
  isActive: true,
  isVerified: true,
  verificationToken: true,
  loginStreak: true,
  lastLoginDate: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10),
  identity: z.string().min(1),
  referralCode: z.string().optional()
});

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
  createdAt: true,
});

export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  totalViews: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdViewSchema = createInsertSchema(adViews).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  totalEarned: true,
  createdAt: true,
});



export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  status: true,
  transactionId: true,
  processedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});



















export const insertTeamEmailSchema = createInsertSchema(teamEmails).omit({
  id: true,
  createdAt: true,
});

export const insertTeamKeySchema = createInsertSchema(teamKeys).omit({
  id: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserCredentialSchema = createInsertSchema(userCredentials).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertHilltopAdsConfigSchema = createInsertSchema(hilltopAdsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHilltopAdsZoneSchema = createInsertSchema(hilltopAdsZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHilltopAdsStatSchema = createInsertSchema(hilltopAdsStats).omit({
  id: true,
  createdAt: true,
});

// Type exports
// Legacy registration type
// export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
// export type Registration = typeof registrations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type Earning = typeof earnings.$inferSelect;

export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;
export type Advertisement = typeof advertisements.$inferSelect;

export type InsertAdView = z.infer<typeof insertAdViewSchema>;
export type AdView = typeof adViews.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;



export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;



















export type InsertTeamEmail = z.infer<typeof insertTeamEmailSchema>;
export type TeamEmail = typeof teamEmails.$inferSelect;

export type InsertTeamKey = z.infer<typeof insertTeamKeySchema>;
export type TeamKey = typeof teamKeys.$inferSelect;

export type InsertUserCredential = z.infer<typeof insertUserCredentialSchema>;
export type UserCredential = typeof userCredentials.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertHilltopAdsConfig = z.infer<typeof insertHilltopAdsConfigSchema>;
export type HilltopAdsConfig = typeof hilltopAdsConfig.$inferSelect;

export type InsertHilltopAdsZone = z.infer<typeof insertHilltopAdsZoneSchema>;
export type HilltopAdsZone = typeof hilltopAdsZones.$inferSelect;

export const insertCommissionLogSchema = createInsertSchema(commissionLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommissionLog = z.infer<typeof insertCommissionLogSchema>;
export type CommissionLog = typeof commissionLogs.$inferSelect;

export const insertRankLogSchema = createInsertSchema(rankLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertRankLog = z.infer<typeof insertRankLogSchema>;
export type RankLog = typeof rankLogs.$inferSelect;
