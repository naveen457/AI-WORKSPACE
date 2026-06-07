# Local Development Setup

This guide helps you set up ASTRIX for local development with MongoDB and local credentials.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB running locally or MongoDB Atlas account

## Quick Start

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies (in another terminal)
cd client
npm install
```

### 2. Configure Environment Variables

#### Server Setup (server/.env)

The `.env` file is already set up for local development. Update it with your credentials:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/astrix-local

# Local URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# JWT & Session Secrets (use strong values)
JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here

# Optional: SMTP settings for email
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional: OAuth credentials (if testing OAuth flows)
GOOGLE_CLIENT_ID=your_local_google_client_id
GITHUB_CLIENT_ID=your_local_github_client_id
```

#### Client Setup (client/.env.local)

The `.env.local` file is pre-configured to use the local server:

```env
VITE_API_URL=http://localhost:5000
```

### 3. Start MongoDB (if using local MongoDB)

```bash
# Windows (using MongoDB Community)
mongod

# macOS (using Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 4. Start the Development Servers

```bash
# Terminal 1: Start the server (from server directory)
npm run dev

# Terminal 2: Start the client (from client directory)
npm run dev
```

The client will be available at `http://localhost:5173`
The server will be available at `http://localhost:5000`

## Getting OAuth Credentials (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:5000/auth/google/callback` to authorized redirect URIs
6. Copy Client ID and Client Secret to `.env`

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to `http://localhost:5000/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` (Windows) or `brew services start mongodb-community` (macOS)
- Check MONGO_URI in `.env` matches your setup

### Port Already in Use
- Server: Change `PORT` in `.env` (default: 5000)
- Client: Change port in `vite.config.js` or use `npm run dev -- --port 3000`

### CORS Errors
- Ensure `CLIENT_URL` and `SERVER_URL` are set correctly in `.env`
- Check CORS configuration in `server/src/app.js`

## Environment Files

**Files to commit:**
- `.env.example` - template for production
- `.env` - local template (never commit real credentials)

**Files to ignore (never commit):**
- `.env.local` - local overrides
- Any `.env.*` with real credentials

All `.env` files are ignored via `.gitignore` - ensure you use `.env` for local testing only.

## Security Notes

⚠️ **Important**: Never commit files containing:
- Database passwords or connection strings
- OAuth client secrets
- SMTP passwords
- JWT/Session secrets

Always use placeholder values in `.env` and actual values in `.env.local` (not tracked by git).
