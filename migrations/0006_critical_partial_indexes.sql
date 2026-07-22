-- Critical partial unique indexes that drizzle-kit does not track via its index DSL.
-- These must be applied manually after every drizzle-kit push --force.

-- Prevent duplicate pending withdrawals per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_withdrawals_one_pending_per_user
  ON withdrawals (user_id)
  WHERE status = 'pending';

-- Prevent duplicate transaction source records per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_transactions_source
  ON transactions (user_id, source_type, source_id)
  WHERE source_id IS NOT NULL;
