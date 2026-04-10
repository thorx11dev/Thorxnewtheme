
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function updatePassword() {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
    
    // Initialize standard Firebase app (like your server does)
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    const auth = getAuth(app);
    
    // Update the existing auth profile that was linked to founder@thorx.com
    await auth.updateUser('cwBmReAkUAVAlgTCgr8sHtxD5Vi2', {
      password: 'Admin123!',
    });
    
    console.log("SUCCESS: Firebase Auth password hard-reset to 'Admin123!'");
    process.exit(0);
  } catch (err) {
    console.error("Failed to update Firebase:", err);
    process.exit(1);
  }
}

updatePassword();
