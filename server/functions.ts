import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { log } from "./vite";

const app = express();

// CORS Configuration for Production
app.use(cors({
    origin: true, // In production, adjust this to your Firebase Hosting domain
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Initialize routes
(async () => {
    await registerRoutes(app);
})();

// Export the app as a Firebase Cloud Function
export const api = onRequest({
    memory: "512MiB",
    timeoutSeconds: 60,
    region: "us-central1" // Adjusted based on standard Firebase regions, can be changed
}, app);
