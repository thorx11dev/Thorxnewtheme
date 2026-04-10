/**
 * Compare core dataset counts between Postgres and Insforge.
 * Usage:
 *   node scripts/insforge/parity-check.js
 */
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const API_URL = process.env.INSFORGE_API_URL;
const API_KEY = process.env.INSFORGE_API_KEY;

async function getPgCount(tableName) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return rows[0]?.count || 0;
}

async function getInsforgeCount(tableName) {
  const res = await fetch(`${API_URL}/migration/${tableName}/count`, {
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insforge count failed for ${tableName}: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Number(data.count || 0);
}

async function main() {
  if (!API_URL || !API_KEY) {
    throw new Error("INSFORGE_API_URL / INSFORGE_API_KEY missing");
  }

  const tables = ["users", "referrals", "earnings", "withdrawals", "team_keys", "audit_logs"];
  let hasMismatch = false;

  for (const table of tables) {
    const [pgCount, insCount] = await Promise.all([
      getPgCount(table),
      getInsforgeCount(table),
    ]);
    const ok = pgCount === insCount;
    if (!ok) hasMismatch = true;
    console.log(`[parity] ${table}: pg=${pgCount} insforge=${insCount} status=${ok ? "OK" : "MISMATCH"}`);
  }

  await pool.end();
  if (hasMismatch) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
