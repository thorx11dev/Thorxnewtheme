#!/usr/bin/env bash
# ============================================================
# THORX – Replit setup script
# Run once after a fresh import to get the app ready.
# Usage:  bash scripts/setup-replit.sh
# ============================================================
set -euo pipefail

echo "=== [1/3] Installing npm dependencies ==="
npm install

echo ""
echo "=== [2/3] Pushing database schema ==="
# Replit's built-in PostgreSQL exposes DATABASE_URL automatically.
# drizzle-kit push applies the schema without needing interactive prompts.
npx drizzle-kit push --force

echo ""
echo "=== [3/3] Verifying database connectivity ==="
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM users')
  .then(r => { console.log('DB check OK — users rows:', r.rows[0].count); pool.end(); })
  .catch(e => { console.error('DB check FAILED:', e.message); pool.end(); process.exit(1); });
"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next: start the app with  npm run dev"
echo ""
echo "To provision the first founder account (one-time, only works before any team"
echo "members exist), POST to /api/bootstrap-founder with your chosen credentials."
echo "See SETUP_NEW_ACCOUNT.md for the full provisioning walkthrough."
