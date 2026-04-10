import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Synchronizing schema: Adding instructions column to daily_tasks table...");
  try {
    await db.execute(sql`
      ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS instructions TEXT;
    `);
    console.log("Migration complete: Column added successfully (or already existed).");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
