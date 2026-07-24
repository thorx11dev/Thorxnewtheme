-- Critical partial unique indexes that drizzle-kit does not track via its index DSL.
-- These must be applied manually after every drizzle-kit push --force.

-- Prevent duplicate pending withdrawals per user (normal flow)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_withdrawals_one_pending_per_user
  ON withdrawals (user_id)
  WHERE status = 'pending';

-- Prevent duplicate approved withdrawals per user (S-Rank fast-track)
-- S-Rank withdrawals are created with status='approved', so a separate index
-- is required to enforce the one-active-withdrawal-per-user invariant for them.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_withdrawals_one_approved_per_user
  ON withdrawals (user_id)
  WHERE status = 'approved';

-- Prevent duplicate transaction source records per user.
-- NOTE: table is user_transactions. The original migration referenced 'transactions'
-- which is a non-existent table — these indexes were never created until this fix.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_transactions_source
  ON user_transactions (user_id, source_type, source_id)
  WHERE source_id IS NOT NULL;
