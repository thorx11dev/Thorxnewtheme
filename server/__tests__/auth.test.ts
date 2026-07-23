/**
 * Auth integration tests — THORX
 *
 * Exercises the full auth flow end-to-end against a real Express app instance:
 *   register → login → session check → logout → 401 check → re-login
 *
 * CSRF handling: the server uses double-submit cookies (thorx.csrf.v2).
 * We use a supertest Agent that persists cookies across requests, then read
 * the CSRF token from the cookie jar and replay it as the x-csrf-token header
 * on every state-changing (POST) request.
 *
 * Each suite creates a unique test user (deleted in afterAll) so parallel
 * runs do not collide.
 *
 * Run: npx vitest run server/__tests__/auth.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Agent } from "supertest";
import { db, pool } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// ── Test fixtures ─────────────────────────────────────────────────────────────
const TS            = Date.now();
const TEST_EMAIL    = `test_auth_${TS}@thorx-test.local`;
const TEST_PHONE    = `030${Math.floor(10000000 + Math.random() * 89999999)}`;
const TEST_PASSWORD = "TestPass123!";
const TEST_IDENTITY = `tauth_${TS}`;

let app: any;
let agent: Agent;        // cookie-persistent supertest agent
let createdUserId: string | null = null;

// ── CSRF helper ───────────────────────────────────────────────────────────────
/** Read thorx.csrf.v2 from the agent's cookie jar (Set-Cookie headers). */
function getCsrfToken(res: request.Response): string {
  const cookies: string[] = Array.isArray(res.headers["set-cookie"])
    ? res.headers["set-cookie"]
    : res.headers["set-cookie"] ? [res.headers["set-cookie"]] : [];

  for (const c of cookies) {
    const m = c.match(/thorx\.csrf\.v2=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return "";
}

let csrfToken = "";

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Build a minimal Express app + register all THORX routes.
  // registerRoutes(app) starts the session store, CSRF middleware, etc.
  // Note: express.json() is set up in server/index.ts *before* registerRoutes,
  // so we must add it here too — registerRoutes itself does not add it.
  const expressModule = await import("express");
  app = expressModule.default();
  app.use(expressModule.default.json({ limit: "10mb" }));
  app.use(expressModule.default.urlencoded({ extended: false }));
  const { registerRoutes } = await import("../routes");
  await registerRoutes(app);

  // Use a persistent agent so session cookies are maintained across calls.
  agent = request.agent(app);

  // Seed the CSRF cookie by hitting any safe (GET) endpoint.
  const seedRes = await agent.get("/api/health");
  csrfToken = getCsrfToken(seedRes);
  // Health may 200 or 503 — both are fine for our seeding purpose.
}, 60_000);

afterAll(async () => {
  if (createdUserId) {
    await db.delete(users).where(eq(users.id, createdUserId)).catch(() => {});
  }
  await pool.end();
}, 30_000);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** POST with the current CSRF token. The agent maintains the session cookie. */
async function post(path: string, body: object): Promise<request.Response> {
  const res = await agent
    .post(path)
    .set("x-csrf-token", csrfToken)
    .send(body);
  // If the server rotated the CSRF token, capture the new one.
  const fresh = getCsrfToken(res);
  if (fresh) csrfToken = fresh;
  return res;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("Auth flow", () => {
  it("registers a new user", async () => {
    const res = await post("/api/register", {
      firstName: "Test",
      lastName:  "Auth",
      identity:  TEST_IDENTITY,
      phone:     TEST_PHONE,
      email:     TEST_EMAIL,
      password:  TEST_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(TEST_EMAIL);
    createdUserId = res.body.user.id;
  });

  it("rejects duplicate registration (same email)", async () => {
    const res = await post("/api/register", {
      firstName: "Dup",
      lastName:  "User",
      identity:  `${TEST_IDENTITY}_dup`,
      phone:     `030${Math.floor(10000000 + Math.random() * 89999999)}`,
      email:     TEST_EMAIL,
      password:  TEST_PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("DUPLICATE_EMAIL");
  });

  it("returns 401 on unauthenticated /api/user", async () => {
    // Use a fresh agent (no session) to confirm guard works
    const fresh = request.agent(app);
    const seedRes = await fresh.get("/api/health");
    const localCsrf = getCsrfToken(seedRes);
    const res = await fresh.get("/api/user");
    expect(res.status).toBe(401);
  });

  it("logs in with correct credentials", async () => {
    const res = await post("/api/login", { email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it("rejects wrong password", async () => {
    const res = await post("/api/login", { email: TEST_EMAIL, password: "WrongPassword1!" });
    expect(res.status).toBe(401);
  });

  it("returns session profile when authenticated", async () => {
    // Re-login the main agent (it may have been invalidated by wrong-password attempt)
    await post("/api/login", { email: TEST_EMAIL, password: TEST_PASSWORD });

    const res = await agent.get("/api/user");
    expect(res.status).toBe(200);
    expect(res.body?.email).toBe(TEST_EMAIL);
  });

  it("logs out successfully", async () => {
    const res = await post("/api/logout", {});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 after logout", async () => {
    // Same agent — session cookie is now invalid.
    const res = await agent.get("/api/user");
    expect(res.status).toBe(401);
  });

  it("can log in again after logout", async () => {
    const res = await post("/api/login", { email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });
});
