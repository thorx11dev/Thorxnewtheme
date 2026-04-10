import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    type Firestore,
    onSnapshot,
    Timestamp,
    addDoc,
} from "firebase/firestore";

function requireDb(): Firestore {
    if (!db) throw new Error("Firestore is not initialized (enable Firebase auth and env keys).");
    return db;
}

// Collection Names
export const COLLECTIONS = {
    USERS: "users",
    EARNINGS: "earnings",
    AD_VIEWS: "ad_views",
    REFERRALS: "referrals",
    ADMIN_CONFIG: "admin_config"
};

// --- User Profile ---
export const saveUserProfile = async (userId: string, data: any) => {
    const userRef = doc(requireDb(), COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
        ...data,
        updatedAt: Timestamp.now()
    }, { merge: true });
};

export const getUserProfile = async (userId: string) => {
    const userRef = doc(requireDb(), COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
};

// --- Earnings ---
export const addEarningRecord = async (userId: string, amount: number, type: string, description: string) => {
    const earningsRef = collection(requireDb(), COLLECTIONS.EARNINGS);
    await addDoc(earningsRef, {
        userId,
        amount,
        type,
        description,
        timestamp: Timestamp.now()
    });

    // Also update user summary balance
    const userRef = doc(requireDb(), COLLECTIONS.USERS, userId);
    // Note: For real apps, use FieldValue.increment()
    // import { increment } from "firebase/firestore";
};

// --- Real-time Listeners ---
export const subscribeToUserBalance = (userId: string, callback: (data: any) => void) => {
    if (!db) return () => {};
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    return onSnapshot(userRef, 
        (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            }
        },
        (error) => {
            if (error.message.includes('Missing or insufficient permissions')) {
                // Ignore gracefully - usually means admin doesn't have a legacy doc
                return;
            }
            console.warn(`[Firestore] Subscription error for user ${userId}:`, error.message);
        }
    );
};
