import admin from "firebase-admin";
const authProvider = (process.env.AUTH_PROVIDER || "firebase").toLowerCase();

// To initialize Firebase Admin, you need a Service Account JSON.
// You can get this from the Firebase Console:
// Project Settings > Service Accounts > Generate new private key

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (authProvider !== "firebase") {
    console.log("Firebase Admin disabled (AUTH_PROVIDER is not firebase)");
}

if (authProvider === "firebase" && serviceAccountJson) {
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
} else if (authProvider === "firebase") {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not found. Some admin features may not work locally.");
    // Try initializing with default credentials (useful in some environments like GCP)
    try {
        admin.initializeApp();
    } catch (e) {
        console.error("Failed to initialize Firebase Admin with default credentials:", e);
    }
}

export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export default admin;
