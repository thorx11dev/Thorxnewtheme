
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating daily_tasks table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      action_url TEXT,
      secret_code TEXT,
      target_rank TEXT DEFAULT 'Useless',
      is_active BOOLEAN DEFAULT true,
      is_mandatory BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  console.log("Creating task_records table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_records (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id VARCHAR NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'completed',
      clicked_at TIMESTAMP,
      completed_at TIMESTAMP DEFAULT now()
    );
  `);
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS task_records_user_id_idx ON task_records(user_id);
    CREATE INDEX IF NOT EXISTS task_records_task_id_idx ON task_records(task_id);
  `);

  console.log("Execution matching schema.ts complete");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
