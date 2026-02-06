import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const pool = new Pool({ connectionString });

async function fixSchema() {
    try {
        console.log("Checking and adding 'rank' column to 'users' table...");
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS rank text DEFAULT 'Useless'
    `);
        console.log("Column 'rank' added or already exists.");

        // Also check for other potential missing columns from recent updates
        // such as 'avatar' if it was added recently
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar text DEFAULT 'default'
    `);
        console.log("Column 'avatar' checked.");

    } catch (err) {
        console.error("Error fixing schema:", err);
    } finally {
        await pool.end();
    }
}

fixSchema();
