-- Migration to drop unused tables

DROP TABLE IF EXISTS "registrations";
DROP TABLE IF EXISTS "daily_tasks";
DROP TABLE IF EXISTS "payment_methods";
DROP TABLE IF EXISTS "transactions";
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "achievements";
DROP TABLE IF EXISTS "login_streaks";
DROP TABLE IF EXISTS "support_tickets";
DROP TABLE IF EXISTS "audit_logs";
DROP TABLE IF EXISTS "user_sessions";
DROP TABLE IF EXISTS "system_settings";
