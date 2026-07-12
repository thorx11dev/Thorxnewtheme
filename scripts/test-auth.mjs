/**
 * Comprehensive auth flow test: registration, login, profile, logout
 * Run with: node scripts/test-auth.mjs
 */

import http from "http";

const HOST = "localhost";
const PORT = 5000;

function extractCookiesFromHeaders(rawSetCookie = []) {
  const jar = {};
  for (const c of rawSetCookie) {
    const [pair] = c.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx < 0) continue;
    const k = pair.slice(0, eqIdx).trim();
    const v = pair.slice(eqIdx + 1).trim();
    if (k) jar[k] = v;
  }
  return jar;
}

function buildCookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function request(method, path, body, jar = {}) {
  return new Promise((resolve, reject) => {
    const csrf = jar["thorx.csrf.v2"] || "";
    const bodyStr = body ? JSON.stringify(body) : "";
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        Accept: "application/json",
        Cookie: buildCookieHeader(jar),
        // Simulate Replit's HTTPS reverse proxy so express-session sends Secure cookies
        "X-Forwarded-Proto": "https",
        "X-Forwarded-Host": "test.replit.app",
        ...(body
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(bodyStr),
              "x-csrf-token": csrf,
            }
          : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const rawSetCookie = res.headers["set-cookie"] || [];
        const newCookies = extractCookiesFromHeaders(rawSetCookie);
        let parsed = {};
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, body: parsed, cookies: newCookies, rawHeaders: res.headers });
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const get = (path, jar) => request("GET", path, null, jar);
const post = (path, body, jar) => request("POST", path, body, jar);

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  THORX Auth Flow Test Suite");
  console.log("══════════════════════════════════════════════\n");

  // ── 1. Unauthenticated profile + CSRF seeding ─────────────────────────────
  console.log("▶ [1] CSRF Token Seeding & Unauthenticated Access");
  let jar = {};
  const unauth = await get("/api/profile", jar);
  Object.assign(jar, unauth.cookies);
  assert("GET /api/profile → 401 for unauthenticated user", unauth.status === 401);
  assert("CSRF cookie issued on first GET", !!jar["thorx.csrf.v2"]);

  // ── 2. Founder login ───────────────────────────────────────────────────────
  console.log("\n▶ [2] Founder Login (thorx11dev@gmail.com / Aonimran777!)");
  const login = await post(
    "/api/login",
    { email: "thorx11dev@gmail.com", password: "Aonimran777!" },
    jar
  );
  // Merge any new cookies (including thorx.sid)
  Object.assign(jar, login.cookies);
  assert("POST /api/login → 200", login.status === 200, `got ${login.status}`);
  assert("Login response has user object", !!login.body?.user);
  assert("Returned role is 'founder'", login.body?.user?.role === "founder", `role=${login.body?.user?.role}`);
  const sidKey = Object.keys(jar).find(k => k.includes("sid"));
  assert("Session cookie (thorx.sid) returned", !!sidKey, `keys=${JSON.stringify(Object.keys(jar))}`);

  // ── 3. Profile fetch (authenticated) ─────────────────────────────────────
  console.log("\n▶ [3] Authenticated Profile Fetch");
  const profile = await get("/api/profile", jar);
  assert("GET /api/profile → 200 when authenticated", profile.status === 200, `got ${profile.status}`);
  assert("Profile email matches founder", profile.body?.email === "thorx11dev@gmail.com", `got ${profile.body?.email}`);
  assert("Profile role is 'founder'", profile.body?.role === "founder", `got ${profile.body?.role}`);

  // ── 4. Wrong password rejection ───────────────────────────────────────────
  console.log("\n▶ [4] Wrong Password Rejection");
  let jar2 = {};
  const seed2 = await get("/api/profile", jar2);
  Object.assign(jar2, seed2.cookies);
  const badLogin = await post(
    "/api/login",
    { email: "thorx11dev@gmail.com", password: "WrongPassword999!" },
    jar2
  );
  assert("Wrong password → 401", badLogin.status === 401, `got ${badLogin.status}`);
  assert("Error code is UNAUTHORIZED", badLogin.body?.error === "UNAUTHORIZED");

  // ── 5. New user registration ──────────────────────────────────────────────
  console.log("\n▶ [5] New User Registration");
  const ts = Date.now();
  const regEmail = `testuser_${ts}@thorx-test.com`;
  const initials = "TU";
  const identity = `THX_${initials}_${String(ts).slice(-5)}`;
  let jar3 = {};
  const seed3 = await get("/api/profile", jar3);
  Object.assign(jar3, seed3.cookies);
  const reg = await post(
    "/api/register",
    {
      firstName: "Test",
      lastName: "User",
      email: regEmail,
      phone: "+923001234567",
      password: "SecurePass123!",
      identity,
      deviceFingerprint: `fp_test_${ts}`,
    },
    jar3
  );
  assert(
    "POST /api/register → 200 or 201",
    reg.status === 200 || reg.status === 201,
    `got ${reg.status} — ${JSON.stringify(reg.body)}`
  );
  if (reg.status === 200 || reg.status === 201) {
    assert("Registration returns user/success data", !!reg.body?.user || !!reg.body?.id || !!reg.body?.message);
  }

  // ── 6. Duplicate email rejection ─────────────────────────────────────────
  console.log("\n▶ [6] Duplicate Email Registration (should reject)");
  let jar4 = {};
  const seed4 = await get("/api/profile", jar4);
  Object.assign(jar4, seed4.cookies);
  const dupReg = await post(
    "/api/register",
    {
      firstName: "Thor",
      lastName: "X",
      email: "thorx11dev@gmail.com",
      phone: "+923009999999",
      password: "AnotherPass123!",
      identity: `THX_TX_${Date.now()}`,
      deviceFingerprint: `fp_dup_${Date.now()}`,
    },
    jar4
  );
  assert("Duplicate email → 4xx", dupReg.status >= 400 && dupReg.status < 500, `got ${dupReg.status}`);
  assert("Error indicates duplicate email", dupReg.body?.error === "DUPLICATE_EMAIL" || /already/i.test(dupReg.body?.message || ""));

  // ── 7. Missing fields validation ─────────────────────────────────────────
  console.log("\n▶ [7] Registration — Missing Required Fields");
  let jar5 = {};
  const seed5 = await get("/api/profile", jar5);
  Object.assign(jar5, seed5.cookies);
  const badReg = await post("/api/register", { firstName: "Only" }, jar5);
  assert("Incomplete registration → 400", badReg.status === 400, `got ${badReg.status}`);

  // ── 8. Logout ─────────────────────────────────────────────────────────────
  console.log("\n▶ [8] Logout");
  const logout = await post("/api/logout", {}, jar);
  assert("POST /api/logout → 200", logout.status === 200, `got ${logout.status} — ${JSON.stringify(logout.body)}`);

  // ── 9. Profile blocked after logout ──────────────────────────────────────
  console.log("\n▶ [9] Access Blocked After Logout");
  const postLogout = await get("/api/profile", jar);
  assert("GET /api/profile → 401 after logout", postLogout.status === 401, `got ${postLogout.status}`);

  // ── 10. Re-login after logout ─────────────────────────────────────────────
  console.log("\n▶ [10] Re-Login After Logout");
  let jar6 = {};
  const seed6 = await get("/api/profile", jar6);
  Object.assign(jar6, seed6.cookies);
  const reLogin = await post(
    "/api/login",
    { email: "thorx11dev@gmail.com", password: "Aonimran777!" },
    jar6
  );
  Object.assign(jar6, reLogin.cookies);
  assert("Re-login → 200", reLogin.status === 200, `got ${reLogin.status}`);
  const reProfile = await get("/api/profile", jar6);
  assert("Profile accessible after re-login", reProfile.status === 200, `got ${reProfile.status}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log("\n══════════════════════════════════════════════");
  console.log(`  Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : " — all green ✅"}`);
  console.log("══════════════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
