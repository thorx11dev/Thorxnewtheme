
import { storage } from '../server/storage';

async function fixAllRanks() {
  console.log("Starting rank recalculation for all users...");
  
  try {
    // Import db and users table
    const { db } = await import('../server/db');
    const { users } = await import('../shared/schema');
    
    const allUsers = await db.select({ id: users.id, firstName: users.firstName, rank: users.rank, totalEarnings: users.totalEarnings }).from(users);
    
    console.log(`Found ${allUsers.length} users to process.`);
    
    let updated = 0;
    for (const u of allUsers) {
      try {
        const before = u.rank || 'Useless';
        const result = await storage.checkAndUpdateRank(u.id);
        const after = result.rank || 'Useless';
        
        if (before !== after) {
          console.log(`✅ ${u.firstName}: ${before} → ${after} (earnings: ${u.totalEarnings})`);
          updated++;
        }
      } catch (err: any) {
        console.error(`Failed for ${u.firstName}: ${err.message}`);
      }
    }
    
    console.log(`\nDone. Updated ${updated} / ${allUsers.length} user ranks.`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
  
  process.exit(0);
}

fixAllRanks();
