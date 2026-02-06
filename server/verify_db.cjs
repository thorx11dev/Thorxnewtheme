
const { Pool } = require('pg');

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is missing!");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
    });

    try {
        console.log("Checking database connection...");
        const res = await pool.query('SELECT 1');
        console.log("Database connected:", res.rows[0]);

        console.log("Checking tables...");
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tableNames = tables.rows.map(row => row.table_name);
        console.log("Tables found:", tableNames);

        if (tableNames.includes('session')) {
            console.log("Found 'session' table.");
            const sessionCount = await pool.query('SELECT COUNT(*) FROM session');
            console.log("Session count:", sessionCount.rows[0]);
            // Show recent sessions content (obscured)
            const sessions = await pool.query('SELECT sid, expire, sess FROM session ORDER BY expire DESC LIMIT 3');
            sessions.rows.forEach(row => {
                console.log(`Session ${row.sid} (Expires: ${row.expire}):`, JSON.stringify(row.sess).substring(0, 100) + "...");
            });

        } else {
            console.log("WARNING: 'session' table NOT found.");
        }

        // Check user_sessions too
        if (tableNames.includes('user_sessions')) {
            console.log("Found 'user_sessions' table.");
            const sessionCount = await pool.query('SELECT COUNT(*) FROM user_sessions');
            console.log("user_sessions count:", sessionCount.rows[0]);
        }

        await pool.end();
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main();
