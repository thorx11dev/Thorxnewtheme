
const { Pool } = require('pg');

async function main() {
    const connectionString = "postgresql://neondb_owner:npg_7demX5xoVhbj@ep-snowy-lab-a1fnnips-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    
    const pool = new Pool({
        connectionString,
    });

    try {
        console.log("Checking users...");
        const res = await pool.query('SELECT id, email, role, rank FROM users');
        console.log(`Total users found: ${res.rows.length}`);
        res.rows.forEach(row => {
            console.log(`User: ${row.email} | Role: ${row.role} | Rank: ${row.rank} | ID: ${row.id}`);
        });

        await pool.end();
    } catch (error) {
        console.error("Failed to query users:", error);
        process.exit(1);
    }
}

main();
