
#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function autoSetup() {
  console.log('🚀 Starting automated setup for new Replit account...\n');

  // Step 1: Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    console.log('\n📋 ACTION REQUIRED:');
    console.log('1. Click "Tools" in the left sidebar');
    console.log('2. Search for "PostgreSQL" or "Database"');
    console.log('3. Click "Create Database"');
    console.log('4. After creation, restart the application\n');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL found');

  // Step 2: Auto-generate SESSION_SECRET if missing
  if (!process.env.SESSION_SECRET) {
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    console.log('⚠️  SESSION_SECRET not found. Generated new secret.');
    console.log('📝 Add this to your Secrets (Tools → Secrets):');
    console.log(`   SESSION_SECRET=${sessionSecret}\n`);
    console.log('   OR it will be auto-set for this session (temporary)\n');
    process.env.SESSION_SECRET = sessionSecret;
  } else {
    console.log('✅ SESSION_SECRET found');
  }

  // Step 3: Test database connection
  console.log('\n🔌 Testing database connection...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    await pool.end();
    process.exit(1);
  }

  // Step 4: Check migrations directory
  const migrationsPath = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsPath)) {
    console.error('❌ Migrations directory not found at:', migrationsPath);
    await pool.end();
    process.exit(1);
  }
  console.log('✅ Migrations directory found');

  // Step 5: Run migrations
  console.log('\n📦 Running database migrations...');
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }

  // Step 6: Verify tables exist
  console.log('\n🔍 Verifying database tables...');
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(r => r.table_name);
    console.log(`✅ Found ${tables.length} tables:`, tables.join(', '));
  } catch (error) {
    console.error('⚠️  Could not verify tables:', error.message);
  }

  await pool.end();

  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📌 Next steps:');
  console.log('1. If SESSION_SECRET was generated, add it to Secrets tool for persistence');
  console.log('2. Click the Run button to start your application');
  console.log('3. Your auth system and database are ready to use!\n');
}

autoSetup().catch(error => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});
