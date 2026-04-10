export type AuthProvider = "firebase" | "insforge";

const rawProvider = (import.meta.env.VITE_AUTH_PROVIDER || "firebase").toLowerCase();

export const authProvider: AuthProvider = rawProvider === "insforge" ? "insforge" : "firebase";

export const isInsforgeAuth = authProvider === "insforge";
export const isFirebaseAuth = authProvider === "firebase";
