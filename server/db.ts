import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Ensure explicit sslmode to suppress pg v8 deprecation warning about
// 'require' being treated as 'verify-full' in the current version.
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
pool.on('error', (err: Error) => {
  // Use a direct stderr write here — importing the pino logger would create a
  // circular dependency (logger → db → logger). Pool errors are fatal-adjacent
  // so we want them in the process output regardless of logger state.
  process.stderr.write(`[DB] Unexpected pool error: ${err.message}\n`);
});
export const db = drizzle(pool, { schema });
