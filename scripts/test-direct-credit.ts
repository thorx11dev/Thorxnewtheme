
import { storage } from '../server/storage';

async function test() {
  const targetUserId = 'CwffdatDEpdSSajUsqiprRWfAKt1';
  const adminId = 'cwBmReAkUAVAlgTCgr8sHtxD5Vi2';
  
  console.log(`Starting test adjustment for user: ${targetUserId}`);
  
  try {
    const user = await storage.adjustUserBalance(
      targetUserId, 
      "100.00", 
      "add", 
      adminId, 
      "Direct API Test Notification"
    );
    
    console.log(`Adjustment successful. New balance: ${user.availableBalance}`);
    
    const notifications = await storage.getUserNotifications(targetUserId);
    console.log(`Notification check for user ${targetUserId}: Found ${notifications.length} records.`);
    if (notifications.length > 0) {
      console.log(`Latest notification: ${JSON.stringify(notifications[0], null, 2)}`);
    } else {
      console.error("FAIL: Balance updated but NO notification found for this user!");
    }
    
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

test();
