-- Migration: Add missing tables not created by previous migrations
-- Created: 2026-06-27
-- Description: Creates system_config, team_invitations, device_fingerprints,
--              leaderboard_cache, task_records, hilltop_ads_config,
--              hilltop_ads_zones, hilltop_ads_stats, internal_notes,
--              commission_logs, and rank_logs tables.

-- system_config: Global system configuration key/value store
CREATE TABLE IF NOT EXISTS "system_config" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL UNIQUE,
  "value" jsonb NOT NULL,
  "description" text,
  "updated_by" varchar REFERENCES "users"("id"),
  "updated_at" timestamp DEFAULT now()
);

-- team_invitations: Pending invitations to join as team members
CREATE TABLE IF NOT EXISTS "team_invitations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'team',
  "permissions" jsonb NOT NULL DEFAULT '[]',
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_by" varchar NOT NULL REFERENCES "users"("id"),
  "consumed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "invitations_email_idx" ON "team_invitations"("email");
CREATE INDEX IF NOT EXISTS "invitations_token_idx" ON "team_invitations"("token");
CREATE INDEX IF NOT EXISTS "invitations_expires_at_idx" ON "team_invitations"("expires_at");

-- device_fingerprints: Multi-account abuse prevention
CREATE TABLE IF NOT EXISTS "device_fingerprints" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fingerprint_hash" text NOT NULL,
  "user_agent" text,
  "ip_address" text,
  "created_at" timestamp DEFAULT now(),
  "last_seen_at" timestamp DEFAULT now(),
  CONSTRAINT uq_device_fp_user_hash UNIQUE (user_id, fingerprint_hash)
);
CREATE INDEX IF NOT EXISTS "idx_device_fp_hash" ON "device_fingerprints"("fingerprint_hash");
CREATE INDEX IF NOT EXISTS "idx_device_fp_user" ON "device_fingerprints"("user_id");

-- leaderboard_cache: High-performance enterprise analytics cache
CREATE TABLE IF NOT EXISTS "leaderboard_cache" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "global_rank" integer NOT NULL,
  "performance_score" decimal(10, 2) NOT NULL,
  "earnings_score" decimal(10, 2) NOT NULL,
  "team_score" decimal(10, 2) NOT NULL,
  "active_score" decimal(10, 2) NOT NULL,
  "health_score" decimal(10, 2) NOT NULL,
  "level1_count" integer DEFAULT 0,
  "level2_count" integer DEFAULT 0,
  "recorded_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "leaderboard_rank_idx" ON "leaderboard_cache"("global_rank");
CREATE INDEX IF NOT EXISTS "leaderboard_user_id_idx" ON "leaderboard_cache"("user_id");
CREATE INDEX IF NOT EXISTS "leaderboard_recorded_at_idx" ON "leaderboard_cache"("recorded_at");

-- task_records: Records of task completions by users
CREATE TABLE IF NOT EXISTS "task_records" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "task_id" varchar NOT NULL REFERENCES "daily_tasks"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'completed',
  "clicked_at" timestamp,
  "completed_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "task_records_user_id_idx" ON "task_records"("user_id");
CREATE INDEX IF NOT EXISTS "task_records_task_id_idx" ON "task_records"("task_id");

-- hilltop_ads_config: HilltopAds integration configuration
CREATE TABLE IF NOT EXISTS "hilltop_ads_config" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key" text NOT NULL,
  "publisher_id" text,
  "is_active" boolean DEFAULT true,
  "settings" jsonb NOT NULL DEFAULT '{}',
  "last_synced_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- hilltop_ads_zones: HilltopAds zone definitions
CREATE TABLE IF NOT EXISTS "hilltop_ads_zones" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "zone_id" text NOT NULL UNIQUE,
  "site_name" text NOT NULL,
  "zone_name" text NOT NULL,
  "ad_format" text NOT NULL,
  "status" text DEFAULT 'active',
  "settings" jsonb NOT NULL DEFAULT '{}',
  "total_impressions" integer DEFAULT 0,
  "total_clicks" integer DEFAULT 0,
  "total_revenue" decimal(10, 2) DEFAULT '0.00',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "hilltop_ads_zones_zone_id_idx" ON "hilltop_ads_zones"("zone_id");
CREATE INDEX IF NOT EXISTS "hilltop_ads_zones_status_idx" ON "hilltop_ads_zones"("status");
CREATE INDEX IF NOT EXISTS "hilltop_ads_zones_ad_format_idx" ON "hilltop_ads_zones"("ad_format");

-- internal_notes: Team collaboration notes for admin review
CREATE TABLE IF NOT EXISTS "internal_notes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" varchar NOT NULL REFERENCES "users"("id"),
  "target_type" text NOT NULL,
  "target_id" varchar NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "internal_notes_admin_id_idx" ON "internal_notes"("admin_id");
CREATE INDEX IF NOT EXISTS "internal_notes_target_type_idx" ON "internal_notes"("target_type");
CREATE INDEX IF NOT EXISTS "internal_notes_target_id_idx" ON "internal_notes"("target_id");
CREATE INDEX IF NOT EXISTS "internal_notes_created_at_idx" ON "internal_notes"("created_at");

-- hilltop_ads_stats: Per-zone daily statistics
CREATE TABLE IF NOT EXISTS "hilltop_ads_stats" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "zone_id" varchar REFERENCES "hilltop_ads_zones"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "impressions" integer DEFAULT 0,
  "clicks" integer DEFAULT 0,
  "cpm" decimal(10, 4) DEFAULT '0.0000',
  "revenue" decimal(10, 4) DEFAULT '0.0000',
  "ctr" decimal(5, 2) DEFAULT '0.00',
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "hilltop_ads_stats_zone_id_idx" ON "hilltop_ads_stats"("zone_id");
CREATE INDEX IF NOT EXISTS "hilltop_ads_stats_date_idx" ON "hilltop_ads_stats"("date");

-- commission_logs: Multi-level referral commission records
CREATE TABLE IF NOT EXISTS "commission_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "beneficiary_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "trigger_withdrawal_id" varchar REFERENCES "withdrawals"("id") ON DELETE SET NULL,
  "amount" decimal(10, 2) NOT NULL,
  "rate" decimal(5, 4) NOT NULL,
  "level" integer NOT NULL,
  "status" text DEFAULT 'pending',
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "commission_logs_beneficiary_idx" ON "commission_logs"("beneficiary_id");
CREATE INDEX IF NOT EXISTS "commission_logs_source_user_idx" ON "commission_logs"("source_user_id");
CREATE INDEX IF NOT EXISTS "commission_logs_withdrawal_idx" ON "commission_logs"("trigger_withdrawal_id");
CREATE INDEX IF NOT EXISTS "commission_logs_status_idx" ON "commission_logs"("status");

-- rank_logs: User rank change history
CREATE TABLE IF NOT EXISTS "rank_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "old_rank" text NOT NULL,
  "new_rank" text NOT NULL,
  "trigger_source" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rank_logs_user_idx" ON "rank_logs"("user_id");
