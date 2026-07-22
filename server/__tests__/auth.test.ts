/**
 * Auth integration tests — THORX
 *
 * These tests exercise the auth flow end-to-end against the running Express
 * app (register → login → session → logout → 401 → login again). They rely
 * on a real PostgreSQL test database (DATABASE_URL env var) and real sessions;
 * each suite creates a unique test user that is deleted in afterAll.
 *
 * Run: npx vitest run server/__tests__/auth.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createServer, type Server } from "http";
import { db, pool } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// ── Lazy-import the Express app so tests don't race the module initialiser ─────
let app: any;
let httpServer: Server;

const TEST_EMAIL = `test_auth_${Date.now()}@thorx-test.local`;
const TEST_PHONE = `030${Math.floor(10000000 + Math.random() * 89999999)}`;
const TEST_PASSWORD = "TestPass123!";
const TEST_IDENTITY = `tauth_${Date.now()}`;

let createdUserId: string | null = null;

beforeAll(async () => {
  // Import the app without starting the workflow listener
  const { registerRoutes } = await import("../routes");
  const express = (await import("express")).default;
  app = express();
  app.use(express.json());
  // Minimal session for testing (in-memory store is sufficient here)
  const session = (await import("express-session")).default;
  app.use(session({
    secret: process.env.SESSION_SECRET ?? "test-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // http for tests
  }));
  httpServer = createServer(app);
  await registerRoutes(app, httpServer);
}, 30_000);

afterAll(async () => {
  if (createdUserId) {
    try { await db.delete(users).where(eq(users.id, createdUserId)); } catch { /* best-effort */ }
  }
  await pool.end();
  httpServer.close();
});

describe("Auth flow", () => {
  let sessionCookie: string;

  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        firstName: "Test",
        lastName: "Auth",
        identity: TEST_IDENTITY,
        phone: TEST_PHONE,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(TEST_EMAIL);
    createdUserId = res.body.user.id;
  });

  it("rejects duplicate registration (same email)", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        firstName: "Dup",
        lastName: "User",
        identity: `${TEST_IDENTITY}_dup`,
        phone: `030${Math.floor(10000000 + Math.random() * 89999999)}`,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    expect(res.status).toBe(400);
  });

  it("returns 401 on unauthenticated session check", async () => {
    const res = await request(app).get("/api/auth/session");
    expect(res.status).toBe(401);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    // Capture the session cookie for subsequent requests
    const raw = res.headers["set-cookie"];
    sessionCookie = Array.isArray(raw) ? raw[0] : raw;
    expect(sessionCookie).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: "WrongPassword1!" });
    expect(res.status).toBe(401);
  });

  it("returns session profile when authenticated", async () => {
    const res = await request(app)
      .get("/api/auth/session")
      .set("Cookie", sessionCookie);
    expect(res.status).toBe(200);
    expect(res.body.user?.email).toBe(TEST_EMAIL);
  });

  it("logs out successfully", async () => {
    const res = await request(app)
      .post("/api/logout")
      .set("Cookie", sessionCookie);
    expect(res.status).toBe(200);
  });

  it("returns 401 after logout", async () => {
    // Same cookie should now be invalid
    const res = await request(app)
      .get("/api/auth/session")
      .set("Cookie", sessionCookie);
    expect(res.status).toBe(401);
  });
});
