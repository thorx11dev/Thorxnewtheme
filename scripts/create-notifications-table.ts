
import { Pool } from 'pg';

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Checking if notifications table exists...");
    
    // Create notifications table manually
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar NOT NULL,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "type" text DEFAULT 'info',
        "admin_name" text,
        "admin_role" text,
        "amount" decimal(10, 2),
        "adjustment_type" text,
        "is_read" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now()
      );
    `);

    console.log("Creating indexes for notifications table...");
    await pool.query(`CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" ("type");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");`);

    console.log("Success: notifications table and indexes created.");
  } catch (err) {
    console.error("Error creating notifications table:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
