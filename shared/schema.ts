import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, index } from "drizzle-orm/pg-core";
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
  identity: text("identity").notNull(), // THORX identity number
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: varchar("referred_by"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_referral_code_idx").on(table.referralCode),
]);

// Earnings transactions table
export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'ad_view', 'referral', 'daily_task', 'bonus'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: text("status").default("completed"), // 'pending', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("earnings_user_id_idx").on(table.userId),
  index("earnings_type_idx").on(table.type),
  index("earnings_created_at_idx").on(table.createdAt),
]);

// Ad views tracking table
export const adViews = pgTable("ad_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  adId: text("ad_id").notNull(), // External ad identifier
  adType: text("ad_type").notNull(), // 'video', 'banner', 'interactive'
  duration: integer("duration"), // Duration watched in seconds
  completed: boolean("completed").default(false),
  earnedAmount: decimal("earned_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ad_views_user_id_idx").on(table.userId),
  index("ad_views_created_at_idx").on(table.createdAt),
]);

// Referrals tracking table
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredId: varchar("referred_id").notNull().references(() => users.id),
  status: text("status").default("active"), // 'active', 'inactive'
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("referrals_referrer_id_idx").on(table.referrerId),
  index("referrals_referred_id_idx").on(table.referredId),
]);

// Daily tasks table
export const dailyTasks = pgTable("daily_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskType: text("task_type").notNull(), // 'daily_login', 'watch_ads', 'refer_friend'
  completed: boolean("completed").default(false),
  earnedAmount: decimal("earned_amount", { precision: 10, scale: 2 }).default("0.00"),
  date: timestamp("date").defaultNow(),
}, (table) => [
  index("daily_tasks_user_id_idx").on(table.userId),
  index("daily_tasks_date_idx").on(table.date),
]);

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  earnings: many(earnings),
  adViews: many(adViews),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  dailyTasks: many(dailyTasks),
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

export const adViewsRelations = relations(adViews, ({ one }) => ({
  user: one(users, {
    fields: [adViews.userId],
    references: [users.id],
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

// Zod schemas for validation
export const insertRegistrationSchema = createInsertSchema(registrations).pick({
  phone: true,
  email: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  totalEarnings: true,
  availableBalance: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
  createdAt: true,
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

// Type exports
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type Earning = typeof earnings.$inferSelect;

export type InsertAdView = z.infer<typeof insertAdViewSchema>;
export type AdView = typeof adViews.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;
export type DailyTask = typeof dailyTasks.$inferSelect;
