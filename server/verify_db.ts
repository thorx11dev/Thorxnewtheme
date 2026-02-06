
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Checking database connection...");
        const result = await db.execute(sql`SELECT 1`);
        console.log("Database connected:", result);

        console.log("Checking tables...");
        const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tableNames = tables.rows.map((row: any) => row.table_name);
        console.log("Tables found:", tableNames);

        if (tableNames.includes('session')) {
            console.log("Found 'session' table (connect-pg-simple default).");
            const sessionCount = await db.execute(sql`SELECT COUNT(*) FROM session`);
            console.log("Session count:", sessionCount.rows[0]);
        } else {
            console.log("WARNING: 'session' table NOT found.");
        }

        if (tableNames.includes('users')) {
            console.log("Found 'users' table.");
            // Check one user
            const users = await db.execute(sql`SELECT id, email, avatar FROM users LIMIT 1`);
            console.log("Sample user:", users.rows[0]);
        }

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main();
