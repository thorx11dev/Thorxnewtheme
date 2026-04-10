
const { Pool } = require('pg');

async function main() {
    const connectionString = "postgresql://neondb_owner:npg_7demX5xoVhbj@ep-snowy-lab-a1fnnips-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    
    const pool = new Pool({
        connectionString,
    });

    try {
        console.log("Checking for founder user...");
        const res = await pool.query("SELECT id, email, role FROM users WHERE email = 'founder@thorx.com'");
        
        if (res.rows.length === 0) {
            console.log("No founder user found with email 'founder@thorx.com'.");
        } else {
            const user = res.rows[0];
            console.log(`Found user: ${user.email} with current role: ${user.role}`);
            
            if (user.role !== 'founder') {
                console.log("Updating role to 'founder'...");
                await pool.query("UPDATE users SET role = 'founder' WHERE id = $1", [user.id]);
                console.log("Role updated successfully.");
            } else {
                console.log("Role is already 'founder'. No update needed.");
            }
        }

        await pool.end();
    } catch (error) {
        console.error("Failed to fix founder role:", error);
        process.exit(1);
    }
}

main();
