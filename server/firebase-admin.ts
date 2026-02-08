import admin from "firebase-admin";

// To initialize Firebase Admin, you need a Service Account JSON.
// You can get this from the Firebase Console:
// Project Settings > Service Accounts > Generate new private key

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (serviceAccountJson) {
    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized with Service Account");
    } catch (error) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", error);
        // Fallback to default if possible
        admin.initializeApp();
    }
} else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not found. Some admin features may not work locally.");
    // Try initializing with default credentials (useful in some environments like GCP)
    try {
        admin.initializeApp();
    } catch (e) {
        console.error("Failed to initialize Firebase Admin with default credentials:", e);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
