# Local Development Setup Checklist

## ✅ What Was Done

### 1. **Removed Exposed Credentials**
   - Cleared production MongoDB connection string from `server/.env`
   - Removed real SMTP password
   - Removed real OAuth client secrets
   - Removed real database credentials

### 2. **Created Local Environment Templates**
   - `server/.env` - Local development template with placeholder values
   - `client/.env.local` - Already configured for local API
   - `client/.env.local.example` - Example template

### 3. **Updated .gitignore**
   - Enhanced rules to prevent any `.env` files from being committed
   - Ensured `.env.*` patterns are properly ignored

### 4. **Created Documentation**
   - `LOCAL_SETUP.md` - Comprehensive setup guide
   - Updated `README.md` - References local setup guide
   - Created `SETUP_CHECKLIST.md` - This file

## 🚀 Next Steps to Make It Work

### Step 1: Update Credentials
Edit `server/.env` and add your local credentials:

```bash
# Option A: Using Local MongoDB
MONGO_URI=mongodb://localhost:27017/astrix-local

# Option B: Using MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/astrix-local
```

### Step 2: Add JWT and Session Secrets
Edit `server/.env` - replace placeholders:

```env
JWT_SECRET=your_strong_random_secret_here_min_32_chars
SESSION_SECRET=your_strong_random_secret_here_min_32_chars
```

Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 3: (Optional) Add OAuth Credentials
If you need to test OAuth locally:

#### Google OAuth
1. Visit: https://console.cloud.google.com/
2. Create OAuth 2.0 Web credentials
3. Add redirect URI: `http://localhost:5000/auth/google/callback`
4. Add to `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

#### GitHub OAuth
1. Visit: https://github.com/settings/developers
2. Create OAuth App
3. Set callback to: `http://localhost:5000/auth/github/callback`
4. Add to `server/.env`:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

### Step 4: (Optional) Add SMTP for Email Testing
If testing email features:

```bash
# Using Gmail App Password
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Generate at myaccount.google.com/apppasswords
```

### Step 5: Start Development Servers

```bash
# Terminal 1: Start MongoDB (if using local)
mongod

# Terminal 2: Start server
cd server
npm install  # If not done yet
npm run dev

# Terminal 3: Start client
cd client
npm install  # If not done yet
npm run dev
```

Access the app at: `http://localhost:5173`

## 📋 Verification Checklist

- [ ] `server/.env` contains local development values
- [ ] `client/.env.local` is configured for localhost:5000
- [ ] MongoDB is running or MongoDB Atlas connection is working
- [ ] Server starts without errors: `npm run dev` in server/
- [ ] Client starts without errors: `npm run dev` in client/
- [ ] Client can reach server at `http://localhost:5000`
- [ ] (Optional) OAuth credentials are set if testing auth flows
- [ ] (Optional) SMTP is configured if testing emails

## 🔒 Security Reminder

✅ **Safe** - Files committed to git:
- `.env.example` - Templates only
- `.gitignore` - Prevents credential leaks
- Local setup documentation

❌ **Never commit**:
- Actual `.env` files with real credentials
- Database passwords
- OAuth secrets
- SMTP passwords
- API keys

All sensitive data goes in:
- `server/.env` (local only, ignored by git)
- `client/.env.local` (local only, ignored by git)

## 🆘 Troubleshooting

**"Cannot find module 'dotenv'"**
```bash
cd server && npm install
```

**"MongoDB connection failed"**
```bash
# Check if MongoDB is running
# Windows: mongod
# macOS: brew services start mongodb-community
# Or use MongoDB Atlas: mongodb+srv://...
```

**"Port 5000 already in use"**
```bash
# Change PORT in server/.env to 5001 or kill process
```

**"CORS error when calling API"**
```bash
# Ensure CLIENT_URL and SERVER_URL are correct in server/.env
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

---

**Status:** ✅ Project is now ready for local development with secure credential handling!
