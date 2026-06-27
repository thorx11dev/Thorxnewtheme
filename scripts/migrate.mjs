import pg from "pg";
const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

const statements = [
  // Ensure pgcrypto is available for gen_random_uuid()
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,

  // team_invitations
  `CREATE TABLE IF NOT EXISTS "team_invitations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" text NOT NULL,
    "role" text NOT NULL DEFAULT 'team',
    "permissions" jsonb NOT NULL DEFAULT '[]',
    "token" text NOT NULL UNIQUE,
    "expires_at" timestamp NOT NULL,
    "created_by" varchar NOT NULL REFERENCES "users"("id"),
    "consumed_at" timestamp,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "invitations_email_idx" ON "team_invitations"("email")`,
  `CREATE INDEX IF NOT EXISTS "invitations_token_idx" ON "team_invitations"("token")`,
  `CREATE INDEX IF NOT EXISTS "invitations_expires_at_idx" ON "team_invitations"("expires_at")`,

  // device_fingerprints
  `CREATE TABLE IF NOT EXISTS "device_fingerprints" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "fingerprint_hash" text NOT NULL,
    "user_agent" text,
    "ip_address" text,
    "created_at" timestamp DEFAULT now(),
    "last_seen_at" timestamp DEFAULT now(),
    CONSTRAINT "uq_device_fp_user_hash" UNIQUE ("user_id", "fingerprint_hash")
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_device_fp_hash" ON "device_fingerprints"("fingerprint_hash")`,
  `CREATE INDEX IF NOT EXISTS "idx_device_fp_user" ON "device_fingerprints"("user_id")`,

  // system_config
  `CREATE TABLE IF NOT EXISTS "system_config" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "key" text NOT NULL UNIQUE,
    "value" jsonb NOT NULL,
    "description" text,
    "updated_by" varchar REFERENCES "users"("id"),
    "updated_at" timestamp DEFAULT now()
  )`,

  // earnings
  `CREATE TABLE IF NOT EXISTS "earnings" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" text NOT NULL,
    "amount" decimal(10,2) NOT NULL,
    "description" text NOT NULL,
    "status" text DEFAULT 'completed',
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "earnings_user_id_idx" ON "earnings"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "earnings_type_idx" ON "earnings"("type")`,
  `CREATE INDEX IF NOT EXISTS "earnings_status_idx" ON "earnings"("status")`,
  `CREATE INDEX IF NOT EXISTS "earnings_created_at_idx" ON "earnings"("created_at")`,

  // leaderboard_cache
  `CREATE TABLE IF NOT EXISTS "leaderboard_cache" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "global_rank" integer NOT NULL,
    "performance_score" decimal(10,2) NOT NULL,
    "earnings_score" decimal(10,2) NOT NULL,
    "team_score" decimal(10,2) NOT NULL,
    "active_score" decimal(10,2) NOT NULL,
    "health_score" decimal(10,2) NOT NULL,
    "level1_count" integer DEFAULT 0,
    "level2_count" integer DEFAULT 0,
    "recorded_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "leaderboard_rank_idx" ON "leaderboard_cache"("global_rank")`,
  `CREATE INDEX IF NOT EXISTS "leaderboard_user_id_idx" ON "leaderboard_cache"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "leaderboard_recorded_at_idx" ON "leaderboard_cache"("recorded_at")`,

  // ad_views
  `CREATE TABLE IF NOT EXISTS "ad_views" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "ad_id" varchar,
    "ad_type" text NOT NULL,
    "ad_network" text DEFAULT 'internal',
    "duration" integer,
    "completed" boolean DEFAULT false,
    "earned_amount" decimal(10,2) NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "ad_views_user_id_idx" ON "ad_views"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "ad_views_ad_id_idx" ON "ad_views"("ad_id")`,
  `CREATE INDEX IF NOT EXISTS "ad_views_completed_idx" ON "ad_views"("completed")`,
  `CREATE INDEX IF NOT EXISTS "ad_views_network_idx" ON "ad_views"("ad_network")`,
  `CREATE INDEX IF NOT EXISTS "ad_views_created_at_idx" ON "ad_views"("created_at")`,

  // referrals
  `CREATE TABLE IF NOT EXISTS "referrals" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "referrer_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "referred_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "status" text DEFAULT 'active',
    "tier" integer DEFAULT 1,
    "total_earned" decimal(10,2) DEFAULT '0.00',
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "referrals_referrer_id_idx" ON "referrals"("referrer_id")`,
  `CREATE INDEX IF NOT EXISTS "referrals_referred_id_idx" ON "referrals"("referred_id")`,
  `CREATE INDEX IF NOT EXISTS "referrals_status_idx" ON "referrals"("status")`,
  `CREATE INDEX IF NOT EXISTS "idx_referrals_referrer_tier" ON "referrals"("referrer_id", "tier")`,

  // withdrawals
  `CREATE TABLE IF NOT EXISTS "withdrawals" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "amount" decimal(10,2) NOT NULL,
    "method" text NOT NULL,
    "account_name" text NOT NULL,
    "account_number" text NOT NULL,
    "account_details" jsonb NOT NULL DEFAULT '{}',
    "status" text DEFAULT 'pending',
    "transaction_id" text,
    "processed_at" timestamp,
    "rejection_reason" text,
    "fee" decimal(10,2) DEFAULT '0.00',
    "net_amount" decimal(10,2) NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "check_min_withdrawal" CHECK (CAST(amount AS DECIMAL) >= 100),
    CONSTRAINT "check_positive_amount" CHECK (CAST(amount AS DECIMAL) > 0)
  )`,
  `CREATE INDEX IF NOT EXISTS "withdrawals_user_id_idx" ON "withdrawals"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "withdrawals_status_idx" ON "withdrawals"("status")`,
  `CREATE INDEX IF NOT EXISTS "withdrawals_method_idx" ON "withdrawals"("method")`,
  `CREATE INDEX IF NOT EXISTS "withdrawals_created_at_idx" ON "withdrawals"("created_at")`,

  // team_emails
  `CREATE TABLE IF NOT EXISTS "team_emails" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "from_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "to_email" text NOT NULL,
    "from_email" text NOT NULL,
    "subject" text NOT NULL,
    "content" text NOT NULL,
    "status" text DEFAULT 'sent',
    "type" text DEFAULT 'outbound',
    "attachments" jsonb NOT NULL DEFAULT '[]',
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "team_emails_from_user_id_idx" ON "team_emails"("from_user_id")`,
  `CREATE INDEX IF NOT EXISTS "team_emails_to_email_idx" ON "team_emails"("to_email")`,
  `CREATE INDEX IF NOT EXISTS "team_emails_type_idx" ON "team_emails"("type")`,
  `CREATE INDEX IF NOT EXISTS "team_emails_created_at_idx" ON "team_emails"("created_at")`,

  // team_keys
  `CREATE TABLE IF NOT EXISTS "team_keys" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "key_name" text NOT NULL,
    "access_level" text DEFAULT 'member',
    "permissions" text[],
    "is_active" boolean DEFAULT true,
    "last_used" timestamp,
    "expires_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "team_keys_user_id_idx" ON "team_keys"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "team_keys_access_level_idx" ON "team_keys"("access_level")`,
  `CREATE INDEX IF NOT EXISTS "team_keys_is_active_idx" ON "team_keys"("is_active")`,

  // user_credentials
  `CREATE TABLE IF NOT EXISTS "user_credentials" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "platform" text NOT NULL,
    "username" text,
    "email" text,
    "encrypted_password" text,
    "notes" text,
    "is_active" boolean DEFAULT true,
    "last_updated" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "user_credentials_user_id_idx" ON "user_credentials"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "user_credentials_platform_idx" ON "user_credentials"("platform")`,
  `CREATE INDEX IF NOT EXISTS "user_credentials_email_idx" ON "user_credentials"("email")`,

  // daily_tasks
  `CREATE TABLE IF NOT EXISTS "daily_tasks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "type" text NOT NULL,
    "action_url" text,
    "secret_code" text,
    "instructions" text,
    "target_rank" text DEFAULT 'Nawa Aya',
    "is_active" boolean DEFAULT true,
    "is_mandatory" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // task_records
  `CREATE TABLE IF NOT EXISTS "task_records" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "task_id" varchar NOT NULL REFERENCES "daily_tasks"("id") ON DELETE CASCADE,
    "status" text DEFAULT 'completed',
    "clicked_at" timestamp,
    "completed_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "task_records_user_id_idx" ON "task_records"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "task_records_task_id_idx" ON "task_records"("task_id")`,

  // chat_messages
  `CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "message" text NOT NULL,
    "sender" text NOT NULL,
    "language" text DEFAULT 'en',
    "intent" text,
    "sentiment" text,
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "chat_messages_user_id_idx" ON "chat_messages"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "chat_messages_sender_idx" ON "chat_messages"("sender")`,
  `CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages"("created_at")`,

  // hilltop_ads_config
  `CREATE TABLE IF NOT EXISTS "hilltop_ads_config" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "api_key" text NOT NULL,
    "publisher_id" text,
    "is_active" boolean DEFAULT true,
    "settings" jsonb NOT NULL DEFAULT '{}',
    "last_synced_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // hilltop_ads_zones
  `CREATE TABLE IF NOT EXISTS "hilltop_ads_zones" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "zone_id" text NOT NULL UNIQUE,
    "site_name" text NOT NULL,
    "zone_name" text NOT NULL,
    "ad_format" text NOT NULL,
    "status" text DEFAULT 'active',
    "settings" jsonb NOT NULL DEFAULT '{}',
    "total_impressions" integer DEFAULT 0,
    "total_clicks" integer DEFAULT 0,
    "total_revenue" decimal(10,2) DEFAULT '0.00',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "hilltop_ads_zones_zone_id_idx" ON "hilltop_ads_zones"("zone_id")`,
  `CREATE INDEX IF NOT EXISTS "hilltop_ads_zones_status_idx" ON "hilltop_ads_zones"("status")`,
  `CREATE INDEX IF NOT EXISTS "hilltop_ads_zones_ad_format_idx" ON "hilltop_ads_zones"("ad_format")`,

  // audit_logs
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "admin_id" varchar NOT NULL REFERENCES "users"("id"),
    "action" text NOT NULL,
    "target_type" text NOT NULL,
    "target_id" varchar NOT NULL,
    "details" jsonb NOT NULL DEFAULT '{}',
    "ip_address" text,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_admin_id_idx" ON "audit_logs"("admin_id")`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action")`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_target_type_idx" ON "audit_logs"("target_type")`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_target_id_idx" ON "audit_logs"("target_id")`,
  `CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at")`,

  // internal_notes
  `CREATE TABLE IF NOT EXISTS "internal_notes" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "admin_id" varchar NOT NULL REFERENCES "users"("id"),
    "target_type" text NOT NULL,
    "target_id" varchar NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "internal_notes_admin_id_idx" ON "internal_notes"("admin_id")`,
  `CREATE INDEX IF NOT EXISTS "internal_notes_target_type_idx" ON "internal_notes"("target_type")`,
  `CREATE INDEX IF NOT EXISTS "internal_notes_target_id_idx" ON "internal_notes"("target_id")`,
  `CREATE INDEX IF NOT EXISTS "internal_notes_created_at_idx" ON "internal_notes"("created_at")`,

  // hilltop_ads_stats
  `CREATE TABLE IF NOT EXISTS "hilltop_ads_stats" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "zone_id" varchar REFERENCES "hilltop_ads_zones"("id") ON DELETE CASCADE,
    "date" timestamp NOT NULL,
    "impressions" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "cpm" decimal(10,4) DEFAULT '0.0000',
    "revenue" decimal(10,4) DEFAULT '0.0000',
    "ctr" decimal(5,2) DEFAULT '0.00',
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "hilltop_ads_stats_zone_id_idx" ON "hilltop_ads_stats"("zone_id")`,
  `CREATE INDEX IF NOT EXISTS "hilltop_ads_stats_date_idx" ON "hilltop_ads_stats"("date")`,

  // commission_logs
  `CREATE TABLE IF NOT EXISTS "commission_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "beneficiary_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "source_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "trigger_withdrawal_id" varchar REFERENCES "withdrawals"("id") ON DELETE SET NULL,
    "amount" decimal(10,2) NOT NULL,
    "rate" decimal(5,4) NOT NULL,
    "level" integer NOT NULL,
    "status" text DEFAULT 'pending',
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "commission_logs_beneficiary_idx" ON "commission_logs"("beneficiary_id")`,
  `CREATE INDEX IF NOT EXISTS "commission_logs_source_user_idx" ON "commission_logs"("source_user_id")`,
  `CREATE INDEX IF NOT EXISTS "commission_logs_withdrawal_idx" ON "commission_logs"("trigger_withdrawal_id")`,
  `CREATE INDEX IF NOT EXISTS "commission_logs_status_idx" ON "commission_logs"("status")`,
  `CREATE INDEX IF NOT EXISTS "idx_commission_logs_level" ON "commission_logs"("level")`,
  `CREATE INDEX IF NOT EXISTS "idx_commission_logs_beneficiary_status" ON "commission_logs"("beneficiary_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_commission_logs_beneficiary_level" ON "commission_logs"("beneficiary_id", "level")`,

  // rank_logs
  `CREATE TABLE IF NOT EXISTS "rank_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "old_rank" text NOT NULL,
    "new_rank" text NOT NULL,
    "trigger_source" text NOT NULL,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "rank_logs_user_idx" ON "rank_logs"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_rank_logs_created_at" ON "rank_logs"("created_at" DESC)`,

  // notifications
  `CREATE TABLE IF NOT EXISTS "notifications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "type" text DEFAULT 'info',
    "admin_name" text,
    "admin_role" text,
    "amount" decimal(10,2),
    "adjustment_type" text,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type")`,
  `CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at")`,

  // Additional indexes from migration 0004
  `CREATE INDEX IF NOT EXISTS "idx_users_rank" ON "users"("rank")`,
];

async function main() {
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  try {
    await client.query("BEGIN");

    for (const stmt of statements) {
      const preview = stmt.trim().slice(0, 60).replace(/\s+/g, " ");
      try {
        await client.query(stmt);
        console.log(`✓ ${preview}`);
        passed++;
      } catch (err) {
        if (err.message?.includes("already exists")) {
          console.log(`~ (exists) ${preview}`);
          passed++;
        } else {
          console.error(`✗ ${preview}\n  → ${err.message}`);
          failed++;
          // Roll back the whole transaction on first real failure
          await client.query("ROLLBACK");
          console.error(`\nRolled back. ${passed} ok before failure.`);
          process.exit(1);
        }
      }
    }

    await client.query("COMMIT");
    console.log(`\nDone: ${passed} passed, ${failed} failed`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Unexpected error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
