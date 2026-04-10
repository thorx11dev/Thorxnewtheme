
import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const allUsers = await db.select().from(users);
    console.log(`Total users: ${allUsers.length}`);
    allUsers.forEach(u => {
      console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Rank: ${u.rank}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    process.exit(1);
  }
}

main();
