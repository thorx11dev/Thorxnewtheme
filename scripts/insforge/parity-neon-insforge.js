import pg from "pg";

const { Pool } = pg;

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DATABASE_URL || !TARGET_DATABASE_URL) {
  throw new Error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required");
}

const source = new Pool({
  connectionString: SOURCE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const target = new Pool({
  connectionString: TARGET_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const tables = [
  "users","advertisements","system_config","team_invitations","team_keys","user_credentials",
  "earnings","ad_views","referrals","withdrawals","commission_logs","rank_logs","audit_logs",
  "internal_notes","notifications","daily_tasks","task_records","chat_messages","team_emails",
  "leaderboard_cache","hilltop_ads_config","hilltop_ads_zones","hilltop_ads_stats"
];

async function count(pool, table) {
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return r.rows[0]?.c || 0;
}

async function main() {
  let mismatch = false;
  for (const t of tables) {
    const [s, d] = await Promise.all([count(source, t), count(target, t)]);
    const ok = s === d;
    if (!ok) mismatch = true;
    console.log(`${ok ? "[ok]" : "[mismatch]"} ${t}: source=${s} target=${d}`);
  }
  await source.end();
  await target.end();
  if (mismatch) process.exit(2);
}

main().catch(async (e) => {
  console.error(e);
  try { await source.end(); } catch {}
  try { await target.end(); } catch {}
  process.exit(1);
});
