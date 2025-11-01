
# 🚀 New Replit Account Setup Guide

This guide ensures your project works perfectly every time you import it to a new Replit account.

## Automatic Setup Process

Your project is configured to set up automatically! Here's what happens:

### ✅ What Happens Automatically

1. **Dependencies Installation** - All npm packages install automatically
2. **Database Migration** - Tables are created automatically when DATABASE_URL exists
3. **Session Secret Generation** - A temporary secret is generated if not set

### 📋 Manual Steps (One-Time Per Account)

You only need to do these **once** when setting up a new Replit account:

#### Step 1: Provision PostgreSQL Database (REQUIRED)
```
1. Click "Tools" in left sidebar
2. Type "Database" or "PostgreSQL"
3. Click "Create Database"
4. Wait 30 seconds for provisioning
```
✅ This automatically sets `DATABASE_URL` environment variable

#### Step 2: Set SESSION_SECRET (RECOMMENDED)
```
1. Click "Tools" → "Secrets" (🔒 icon)
2. Click "New Secret"
3. Key: SESSION_SECRET
4. Value: (run this command to generate):
```

Generate secret in Shell:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste as the secret value.

#### Step 3: Run the Application
```
1. Click the "Run" button
2. Wait for setup to complete
3. Your app is ready!
```

## 🔄 What Happens on Each Import

When you import this project from GitHub to a new Replit account:

1. ✅ Replit detects Node.js and installs dependencies
2. ✅ `postinstall` script runs and checks for database
3. ⚠️  If no DATABASE_URL: Shows instructions
4. ✅ If DATABASE_URL exists: Runs migrations automatically
5. ✅ Application starts with full functionality

## 🛠️ Troubleshooting

### "DATABASE_URL not found"
**Solution:** Provision PostgreSQL database (Step 1 above)
- Click "Tools" in left sidebar
- Search for "Database" or "PostgreSQL"
- Click "Create Database"
- Wait for provisioning to complete (30-60 seconds)

### "Session errors" or "Not authenticated"
**Possible causes:**
1. SESSION_SECRET not set (will auto-generate temporarily)
2. Cookie issues in iframe environment
3. Database connection issues

**Solutions:**
- Set SESSION_SECRET in Secrets (Step 2 above) for persistence
- Clear browser cache and cookies
- Check console logs for session save/reload errors
- Verify DATABASE_URL is accessible

### "Session save error" or "Session reload error"
**Root cause:** Database connection issues with session store

**Solutions:**
```bash
# 1. Verify database connection
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()').then(r => {console.log('✅ Connected:', r.rows[0]); pool.end();}).catch(e => {console.error('❌ Error:', e.message); pool.end();})"

# 2. Check if session table exists
psql $DATABASE_URL -c "SELECT * FROM session LIMIT 1;"

# 3. Re-run migrations
npm run setup
```

### "Migration failed"
**Solution:** Run manually:
```bash
npm run setup
```

If still failing, check:
- DATABASE_URL is set and correct
- Database is accessible (not paused/sleeping)
- Migrations directory exists

### "userId is undefined after login/registration"
**This should NOT happen anymore.** The session save/reload has been fixed with explicit promises.

If you still see this:
1. Check browser console for errors
2. Check server logs for "Session save error" or "Session reload error"
3. Verify cookie is being set (check DevTools → Application → Cookies)
4. Ensure `trust proxy` is set correctly for Replit environment

## ⚡ Quick Start Checklist

- [ ] Import project from GitHub to new Replit account
- [ ] Wait for dependencies to install
- [ ] Provision PostgreSQL database (Tools → Database)
- [ ] Set SESSION_SECRET in Secrets (optional but recommended)
- [ ] Click Run button
- [ ] ✅ Done!

## 📊 Verification

After setup, verify everything works:

### Step-by-step Verification Checklist

1. **Application loads**
   - ✅ URL opens without errors
   - ✅ No console errors in browser DevTools

2. **Database tables exist**
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```
   - ✅ Should see tables: users, earnings, advertisements, etc.

3. **Session store works**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM session;"
   ```
   - ✅ Should return a count (even if 0)

4. **Registration flow**
   - ✅ Navigate to registration page
   - ✅ Fill out form and submit
   - ✅ Check console: should see "Session saved: {userId: ...}"
   - ✅ Check console: should see "Session after reload: {userId: ...}"
   - ✅ Should redirect to dashboard

5. **Login flow**
   - ✅ Navigate to login page
   - ✅ Enter credentials and submit
   - ✅ Check console: should see "Session saved: {userId: ...}"
   - ✅ Should redirect to dashboard

6. **Session persistence**
   - ✅ After login, check `/api/user` endpoint
   - ✅ Should return user data (not 401)
   - ✅ Refresh page - should stay logged in
   - ✅ Cookie should be visible in DevTools → Application → Cookies

7. **Browser DevTools checks**
   - ✅ Network tab: Check response headers for `Set-Cookie: thorx.sid=...`
   - ✅ Application tab: Verify cookie exists with correct attributes
   - ✅ Console: No errors related to sessions or authentication

## 💡 Pro Tips

- **SESSION_SECRET**: Generate once, reuse for the same account
- **Database**: No need to recreate tables manually
- **GitHub**: All code changes sync automatically
- **Data**: User data is account-specific (fresh start each time)

---

**Need Help?** Check the console logs when running `npm run setup` for detailed diagnostic information.
