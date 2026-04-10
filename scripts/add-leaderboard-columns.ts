import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function migrate() {
  console.log("Running targeted migration: add L1/L2 columns to leaderboard_cache...");
  
  try {
    await db.execute(sql`
      ALTER TABLE leaderboard_cache 
      ADD COLUMN IF NOT EXISTS level1_count INTEGER DEFAULT 0
    `);
    console.log("✅ level1_count column added.");

    await db.execute(sql`
      ALTER TABLE leaderboard_cache 
      ADD COLUMN IF NOT EXISTS level2_count INTEGER DEFAULT 0
    `);
    console.log("✅ level2_count column added.");

    // Verify
    const check = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'leaderboard_cache' 
      AND column_name IN ('level1_count', 'level2_count')
    `);
    console.log("Columns present:", check.rows.map((r: any) => r.column_name));
    console.log("🚀 Migration complete. You can now run Force Sync.");
  } catch (e: any) {
    console.error("❌ Migration failed:", e.message);
  }

  process.exit(0);
}

migrate();
