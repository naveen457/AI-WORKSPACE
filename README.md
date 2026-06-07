# ASTRIX

AI Workspace Platform

## Quick Links

- 🚀 [Local Development Setup](./LOCAL_SETUP.md)
- 📚 [Project Structure](#project-structure)

## Getting Started

For local development with MongoDB and local credentials, see [LOCAL_SETUP.md](./LOCAL_SETUP.md)

### Quick Start

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment variables
# See LOCAL_SETUP.md for detailed instructions

# 3. Start development servers
cd server && npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2
```

## Project Structure

```
.
├── server/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/        # Database and auth config
│   │   ├── routes/        # API routes
│   │   ├── models/        # Database models
│   │   ├── controllers/   # Route handlers
│   │   └── middleware/    # Express middleware
│   ├── .env              # Local environment variables
│   ├── .env.example      # Environment template
│   └── package.json
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── api/           # API client
│   │   └── App.jsx
│   ├── .env.local        # Vite environment variables
│   └── package.json
│
└── LOCAL_SETUP.md         # Setup guide for local development
```

## Important: Credentials

All environment variables with sensitive data (database passwords, OAuth secrets, etc.) are:
- Listed in `.env.example` as templates
- Stored locally in `.env` and `.env.local` (ignored by git)
- Never committed to the repository

See [LOCAL_SETUP.md](./LOCAL_SETUP.md#security-notes) for security guidelines.
