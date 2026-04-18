-- THORX P1 Security Migration: Password Reset Token Expiry + Referral FK
-- Apply to production database via Railway SQL console or psql
-- Date: 2026-04-18

-- 1. Add password reset token expiry column (1-hour TTL on token generation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;

-- 2. Add foreign key constraint on referred_by (prevents orphaned referral pointers)
-- Uses SET NULL on delete so deleting a referrer doesn't cascade-delete the referred user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_referred_by'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT fk_users_referred_by
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add index on daily_tasks.is_active (missing per audit)
CREATE INDEX IF NOT EXISTS daily_tasks_is_active_idx ON daily_tasks (is_active);

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'verification_token_expires_at';
