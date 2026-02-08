import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    query,
    where,
    getDocs,
    onSnapshot,
    Timestamp,
    addDoc,
    orderBy,
    limit
} from "firebase/firestore";

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
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
        ...data,
        updatedAt: Timestamp.now()
    }, { merge: true });
};

export const getUserProfile = async (userId: string) => {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
};

// --- Earnings ---
export const addEarningRecord = async (userId: string, amount: number, type: string, description: string) => {
    const earningsRef = collection(db, COLLECTIONS.EARNINGS);
    await addDoc(earningsRef, {
        userId,
        amount,
        type,
        description,
        timestamp: Timestamp.now()
    });

    // Also update user summary balance
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    // Note: For real apps, use FieldValue.increment()
    // import { increment } from "firebase/firestore";
};

// --- Real-time Listeners ---
export const subscribeToUserBalance = (userId: string, callback: (data: any) => void) => {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};
