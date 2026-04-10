/**
 * THORX -> Insforge core data migration script (idempotent).
 * Usage:
 *   node scripts/insforge/migrate-core-data.js
 *
 * Required env:
 *   DATABASE_URL
 *   INSFORGE_API_URL
 *   INSFORGE_API_KEY
 */
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const API_URL = process.env.INSFORGE_API_URL;
const API_KEY = process.env.INSFORGE_API_KEY;

async function pushCollection(path, rows) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ rows }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed push ${path}: ${res.status} ${text}`);
  }
}

async function migrateTable(tableName) {
  const { rows } = await pool.query(`SELECT * FROM ${tableName}`);
  await pushCollection(`/migration/${tableName}`, rows);
  console.log(`[migrate] ${tableName}: ${rows.length} rows`);
}

async function main() {
  if (!API_URL || !API_KEY) {
    throw new Error("INSFORGE_API_URL / INSFORGE_API_KEY missing");
  }

  const orderedTables = [
    "users",
    "referrals",
    "earnings",
    "withdrawals",
    "team_keys",
    "audit_logs",
  ];

  for (const table of orderedTables) {
    await migrateTable(table);
  }

  console.log("[migrate] Core migration completed");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
