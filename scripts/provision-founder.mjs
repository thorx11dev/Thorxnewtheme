/**
 * Idempotent founder provisioning script.
 *
 * Reads credentials from environment variables — never hardcode them here.
 *
 * Required env vars:
 *   FOUNDER_EMAIL      e.g. export FOUNDER_EMAIL=admin@example.com
 *   FOUNDER_PASSWORD   e.g. export FOUNDER_PASSWORD=<your-password>
 *   FOUNDER_FIRST_NAME (optional, defaults to "Founder")
 *   FOUNDER_LAST_NAME  (optional, defaults to "")
 *
 * Run:
 *   FOUNDER_EMAIL=you@example.com FOUNDER_PASSWORD=secret node scripts/provision-founder.mjs
 *
 * Safe to re-run: produces the same end state whether the account exists or not:
 *   - role = founder
 *   - password_hash updated to FOUNDER_PASSWORD
 *   - active founder team_key present
 */
import bcrypt from "bcrypt";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

const EMAIL      = process.env.FOUNDER_EMAIL;
const PASSWORD   = process.env.FOUNDER_PASSWORD;
const FIRST_NAME = process.env.FOUNDER_FIRST_NAME || "Founder";
const LAST_NAME  = process.env.FOUNDER_LAST_NAME  || "";

if (!EMAIL || !PASSWORD) {
  console.error("❌  FOUNDER_EMAIL and FOUNDER_PASSWORD environment variables are required.");
  console.error("    Example: FOUNDER_EMAIL=you@example.com FOUNDER_PASSWORD=secret node scripts/provision-founder.mjs");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertFounderKey(client, userId, displayName) {
  const { rows } = await client.query(
    `SELECT id FROM team_keys WHERE user_id = $1 AND access_level = 'founder' LIMIT 1`,
    [userId]
  );
  if (rows.length > 0) {
    await client.query(
      `UPDATE team_keys SET is_active = true, permissions = ARRAY['all'] WHERE id = $1`,
      [rows[0].id]
    );
    console.log("  ✅  Founder team key confirmed active.");
  } else {
    await client.query(
      `INSERT INTO team_keys (user_id, key_name, access_level, permissions, is_active)
       VALUES ($1, $2, 'founder', ARRAY['all'], true)`,
      [userId, displayName]
    );
    console.log("  ✅  Founder team key created.");
  }
}

async function main() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const displayName  = `${FIRST_NAME} ${LAST_NAME}`.trim();

    const { rows: existing } = await client.query(
      `SELECT id, email, role FROM users WHERE email = $1 LIMIT 1`,
      [EMAIL]
    );

    if (existing.length > 0) {
      const u = existing[0];
      console.log(`ℹ️   User already exists (id=${u.id}, role=${u.role}). Updating to founder…`);

      // Ensure role=founder, refresh password hash, update name if needed
      await client.query(
        `UPDATE users
           SET role          = 'founder',
               password_hash = $2,
               first_name    = $3,
               last_name     = $4
         WHERE id = $1`,
        [u.id, passwordHash, FIRST_NAME, LAST_NAME]
      );
      console.log("  ✅  role=founder and password_hash updated.");

      await upsertFounderKey(client, u.id, displayName);
    } else {
      console.log(`ℹ️   No account found for ${EMAIL}. Creating new founder…`);

      const referralCode = `FOUNDER-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const identity     = `FOUNDER_${Date.now()}`;

      const { rows: [user] } = await client.query(
        `INSERT INTO users
           (first_name, last_name, identity, phone, email, password_hash, referral_code, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'founder')
         RETURNING id, email, role`,
        [FIRST_NAME, LAST_NAME, identity, "", EMAIL, passwordHash, referralCode]
      );
      console.log(`  ✅  Founder user created: id=${user.id}, email=${user.email}, role=${user.role}`);

      await upsertFounderKey(client, user.id, displayName);
    }

    console.log(`\n🎉  Done. Log in at /login with the email and password you provided.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error("❌ Error:", err.message); process.exit(1); });
