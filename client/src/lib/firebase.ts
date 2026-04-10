import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { isFirebaseAuth } from "./auth-provider";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function initFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} | null {
  if (!isFirebaseAuth) return null;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || String(apiKey).trim() === "") {
    console.warn(
      "[firebase] VITE_AUTH_PROVIDER is firebase but VITE_FIREBASE_API_KEY is missing; Firebase is disabled.",
    );
    return null;
  }
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

const bundle = initFirebase();

export const auth: Auth | null = bundle?.auth ?? null;
export const db: Firestore | null = bundle?.db ?? null;
export default bundle?.app ?? null;
