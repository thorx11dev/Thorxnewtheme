import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Legacy registrations table (keeping for backward compatibility)
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  referralCode: text("referral_code").notNull().unique(),
});

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
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_referral_code_idx").on(table.referralCode),
  index("users_role_idx").on(table.role),
  index("users_is_active_idx").on(table.isActive),
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

// Daily tasks table
export const dailyTasks = pgTable("daily_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskType: text("task_type").notNull(),
  completed: boolean("completed").default(false),
  earnedAmount: decimal("earned_amount", { precision: 10, scale: 2 }).default("0.00"),
  date: timestamp("date").defaultNow(),
}, (table) => [
  index("daily_tasks_user_id_idx").on(table.userId),
  index("daily_tasks_task_type_idx").on(table.taskType),
  index("daily_tasks_date_idx").on(table.date),
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
]);

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name"),
  iban: text("iban"),
  isDefault: boolean("is_default").default(false),
  isVerified: boolean("is_verified").default(false),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payment_methods_user_id_idx").on(table.userId),
  index("payment_methods_type_idx").on(table.type),
]);

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"),
  status: text("status").default("completed"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("transactions_user_id_idx").on(table.userId),
  index("transactions_type_idx").on(table.type),
  index("transactions_category_idx").on(table.category),
  index("transactions_created_at_idx").on(table.createdAt),
]);

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  priority: text("priority").default("normal"),
  isRead: boolean("is_read").default(false),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead),
  index("notifications_type_idx").on(table.type),
  index("notifications_created_at_idx").on(table.createdAt),
]);

// Achievements table
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  reward: decimal("reward", { precision: 10, scale: 2 }).default("0.00"),
  progress: integer("progress").default(0),
  target: integer("target").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("achievements_user_id_idx").on(table.userId),
  index("achievements_type_idx").on(table.achievementType),
  index("achievements_is_completed_idx").on(table.isCompleted),
]);

// Login streaks table
export const loginStreaks = pgTable("login_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastLoginDate: timestamp("last_login_date").notNull(),
  totalLogins: integer("total_logins").default(1),
  streakBonus: decimal("streak_bonus", { precision: 10, scale: 2 }).default("0.00"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("login_streaks_user_id_idx").on(table.userId),
  index("login_streaks_last_login_idx").on(table.lastLoginDate),
]);

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull(),
  priority: text("priority").default("normal"),
  status: text("status").default("open"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("support_tickets_user_id_idx").on(table.userId),
  index("support_tickets_status_idx").on(table.status),
  index("support_tickets_priority_idx").on(table.priority),
  index("support_tickets_created_at_idx").on(table.createdAt),
]);

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  changes: jsonb("changes").notNull().default(sql`'{}'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  severity: text("severity").default("info"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_entity_type_idx").on(table.entityType),
  index("audit_logs_created_at_idx").on(table.createdAt),
]);

// User sessions table
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  location: text("location"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_session_token_idx").on(table.sessionToken),
  index("user_sessions_is_active_idx").on(table.isActive),
]);

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("system_settings_key_idx").on(table.key),
  index("system_settings_category_idx").on(table.category),
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

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  earnings: many(earnings),
  adViews: many(adViews),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  dailyTasks: many(dailyTasks),
  withdrawals: many(withdrawals),
  paymentMethods: many(paymentMethods),
  transactions: many(transactions),
  notifications: many(notifications),
  achievements: many(achievements),
  loginStreaks: many(loginStreaks),
  supportTickets: many(supportTickets),
  auditLogs: many(auditLogs),
  userSessions: many(userSessions),
  teamEmailsSent: many(teamEmails),
  teamKeys: many(teamKeys),
  userCredentials: many(userCredentials),
  chatMessages: many(chatMessages),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
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

export const dailyTasksRelations = relations(dailyTasks, ({ one }) => ({
  user: one(users, {
    fields: [dailyTasks.userId],
    references: [users.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

export const loginStreaksRelations = relations(loginStreaks, ({ one }) => ({
  user: one(users, {
    fields: [loginStreaks.userId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updater: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
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

// Zod schemas for validation
export const insertRegistrationSchema = createInsertSchema(registrations).pick({
  phone: true,
  email: true,
});

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

export const insertDailyTaskSchema = createInsertSchema(dailyTasks).omit({
  id: true,
  date: true,
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

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  progress: true,
  isCompleted: true,
  completedAt: true,
  createdAt: true,
});

export const insertLoginStreakSchema = createInsertSchema(loginStreaks).omit({
  id: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  status: true,
  assignedTo: true,
  resolution: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  isActive: true,
  lastActivityAt: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
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
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

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

export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;
export type DailyTask = typeof dailyTasks.$inferSelect;

export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertLoginStreak = z.infer<typeof insertLoginStreakSchema>;
export type LoginStreak = typeof loginStreaks.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

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

export type InsertHilltopAdsStat = z.infer<typeof insertHilltopAdsStatSchema>;
export type HilltopAdsStat = typeof hilltopAdsStats.$inferSelect;
