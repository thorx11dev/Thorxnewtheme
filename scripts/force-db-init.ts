import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Forcing db push over leaderboard_cache...");
  try {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "leaderboard_cache" (
      "id" character varying PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
      "user_id" character varying NOT NULL,
      "global_rank" integer NOT NULL,
      "performance_score" numeric(10, 2) NOT NULL,
      "earnings_score" numeric(10, 2) NOT NULL,
      "team_score" numeric(10, 2) NOT NULL,
      "active_score" numeric(10, 2) NOT NULL,
      "health_score" numeric(10, 2) NOT NULL,
      "recorded_at" timestamp DEFAULT now()
    );
    `);
    
    // Add foreign key if it does not exist
    try {
        await db.execute(sql`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints
                WHERE constraint_name = 'leaderboard_cache_user_id_users_id_fk'
            ) THEN
                ALTER TABLE "leaderboard_cache" ADD CONSTRAINT "leaderboard_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
            END IF;
        END;
        $$;
        `);
    } catch(e: any) {
        console.log("FK creation message:", e.message);
    }

    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "leaderboard_rank_idx" ON "leaderboard_cache" ("global_rank");`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "leaderboard_user_id_idx" ON "leaderboard_cache" ("user_id");`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "leaderboard_recorded_at_idx" ON "leaderboard_cache" ("recorded_at");`);
    } catch(e: any) {
        console.log("Index creation message", e.message);
    }
    
    console.log("leaderboard_cache table created successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
  }
  process.exit(0);
}

main();
