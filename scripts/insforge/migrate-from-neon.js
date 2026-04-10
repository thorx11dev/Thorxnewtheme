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

const tablesInOrder = [
  "users",
  "advertisements",
  "system_config",
  "team_invitations",
  "team_keys",
  "user_credentials",
  "earnings",
  "ad_views",
  "referrals",
  "withdrawals",
  "commission_logs",
  "rank_logs",
  "audit_logs",
  "internal_notes",
  "notifications",
  "daily_tasks",
  "task_records",
  "chat_messages",
  "team_emails",
  "leaderboard_cache",
  "hilltop_ads_config",
  "hilltop_ads_zones",
  "hilltop_ads_stats",
];

async function getColumns(pool, table) {
  const res = await pool.query(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );
  return res.rows.map((r) => ({
    columnName: r.column_name,
    dataType: r.data_type,
    udtName: r.udt_name,
  }));
}

async function getPrimaryKeyColumns(pool, table) {
  const res = await pool.query(
    `
      SELECT a.attname AS column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)
    `,
    [table],
  );
  return res.rows.map((r) => r.column_name);
}

function buildInsertQuery(table, columns, pkColumns) {
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  if (!pkColumns.length) {
    return `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;
  }

  const updateCols = columns.filter((c) => !pkColumns.includes(c));
  if (!updateCols.length) {
    return `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT (${pkColumns.map((c) => `"${c}"`).join(", ")}) DO NOTHING`;
  }

  const updateSet = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
  return `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT (${pkColumns.map((c) => `"${c}"`).join(", ")}) DO UPDATE SET ${updateSet}`;
}

async function migrateTable(table) {
  const srcColumns = await getColumns(source, table);
  const tgtColumns = await getColumns(target, table);
  const targetColumnMap = new Map(tgtColumns.map((c) => [c.columnName, c]));
  const commonColumns = srcColumns
    .filter((c) => targetColumnMap.has(c.columnName))
    .map((c) => c.columnName);
  if (!commonColumns.length) {
    console.log(`[skip] ${table}: no common columns`);
    return { table, copied: 0 };
  }

  const pkColumns = (await getPrimaryKeyColumns(target, table)).filter((c) => commonColumns.includes(c));
  const selectCols = commonColumns.map((c) => `"${c}"`).join(", ");

  const srcData = await source.query(`SELECT ${selectCols} FROM "${table}"`);
  const insertSql = buildInsertQuery(table, commonColumns, pkColumns);

  let copied = 0;
  for (const row of srcData.rows) {
    const values = commonColumns.map((c) => {
      const targetCol = targetColumnMap.get(c);
      const raw = row[c];
      const isJsonType = targetCol && (targetCol.dataType === "json" || targetCol.dataType === "jsonb" || targetCol.udtName === "json" || targetCol.udtName === "jsonb");
      if (!isJsonType || raw == null) return raw;
      if (typeof raw === "object") return JSON.stringify(raw);
      if (typeof raw !== "string") return raw;

      try {
        let parsed = JSON.parse(raw);
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // keep single-parsed value
          }
        }
        return JSON.stringify(parsed);
      } catch {
        // Defensive fallback for malformed legacy JSON payloads.
        return JSON.stringify(raw.trim().startsWith("[") ? [] : {});
      }
    });
    try {
      await target.query(insertSql, values);
    } catch (err) {
      const jsonDebug = commonColumns
        .map((c, i) => ({ col: c, val: values[i], type: targetColumnMap.get(c)?.dataType }))
        .filter((x) => x.type === "json" || x.type === "jsonb");
      console.error(`[error] table=${table}`);
      console.error(JSON.stringify(jsonDebug, null, 2));
      throw err;
    }
    copied += 1;
  }

  console.log(`[ok] ${table}: ${copied} rows upserted`);
  return { table, copied };
}

async function main() {
  const summary = [];
  for (const table of tablesInOrder) {
    summary.push(await migrateTable(table));
  }

  console.log("\nMigration summary:");
  for (const item of summary) {
    console.log(`- ${item.table}: ${item.copied}`);
  }

  await source.end();
  await target.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await source.end(); } catch {}
  try { await target.end(); } catch {}
  process.exit(1);
});
