
import { Pool } from 'pg';

async function verify() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Checking notifications table content...");
    const res = await pool.query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5`);
    console.log("Recent notifications:", JSON.stringify(res.rows, null, 2));

    const counts = await pool.query(`SELECT count(*) FROM notifications`);
    console.log("Total notification count:", counts.rows[0].count);
  } catch (err) {
    console.error("Error verifying notifications:", err);
  } finally {
    await pool.end();
  }
}

verify();
