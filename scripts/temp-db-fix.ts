import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fix() {
  try {
    console.log('Running DB update...');
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '[]'`);
    console.log('Successfully added permissions column');
  
    // Also add internal_notes if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "internal_notes" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "target_type" text NOT NULL,
        "target_id" varchar NOT NULL,
        "content" text NOT NULL,
        "admin_id" varchar NOT NULL REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now()
      )
    `);
    console.log('Ensured internal_notes table exists');

    // Also add audit_logs if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "admin_id" varchar NOT NULL REFERENCES "users"("id"),
        "action" text NOT NULL,
        "target_type" text NOT NULL,
        "target_id" varchar NOT NULL,
        "details" jsonb DEFAULT '{}',
        "ip_address" text,
        "created_at" timestamp DEFAULT now()
      )
    `);
    console.log('Ensured audit_logs table exists');

  } catch (error: any) {
    console.error('Error updating database:', error.message);
  } finally {
    process.exit(0);
  }
}

fix();
