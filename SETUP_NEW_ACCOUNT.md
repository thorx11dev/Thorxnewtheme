
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

### "Session errors" or "Not authenticated"
**Solution:** Set SESSION_SECRET in Secrets (Step 2 above)

### "Migration failed"
**Solution:** Run manually:
```bash
npm run setup
```

## ⚡ Quick Start Checklist

- [ ] Import project from GitHub to new Replit account
- [ ] Wait for dependencies to install
- [ ] Provision PostgreSQL database (Tools → Database)
- [ ] Set SESSION_SECRET in Secrets (optional but recommended)
- [ ] Click Run button
- [ ] ✅ Done!

## 📊 Verification

After setup, verify everything works:

1. Application loads at the URL
2. Can visit `/auth` page
3. Can register a new account
4. Can login successfully
5. Dashboard loads with user data

## 💡 Pro Tips

- **SESSION_SECRET**: Generate once, reuse for the same account
- **Database**: No need to recreate tables manually
- **GitHub**: All code changes sync automatically
- **Data**: User data is account-specific (fresh start each time)

---

**Need Help?** Check the console logs when running `npm run setup` for detailed diagnostic information.
