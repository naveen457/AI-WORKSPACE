# ASTRIX

AI Workspace authentication platform with:
- Node.js/Express backend (`/server`)
- React + Vite frontend (`/client`)
- Email OTP, phone OTP, Google OAuth, and GitHub OAuth

## Setup Docs

- [Local setup](./LOCAL_SETUP.md)
- [Server setup](./server/SETUP.md)
- [Client setup](./client/README.md)

## Quick Start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment files
cp server/.env.example server/.env
# create client/.env.local and set VITE_API_URL=http://localhost:5000

# Run apps
cd server && npm run dev
cd ../client && npm run dev
```

## Domain and Email Notes (astrix-app.me)

The backend mailer defaults are configured for `astrix-app.me`:
- `RESEND_FROM="Astrix <noreply@astrix-app.me>"`
- `RESEND_REPLY_TO=support@astrix-app.me`

For production, set your deployed URLs in `server/.env`:
- `CLIENT_URL=https://<your-client-domain>`
- `SERVER_URL=https://<your-api-domain>`
- OAuth callbacks should match `${SERVER_URL}/auth/google/callback` and `${SERVER_URL}/auth/github/callback`

## Secret Leak Audit

Repository scan completed for tracked files:
- No committed live API keys/tokens/private keys were found.
- Only placeholder values were found in `server/.env.example`.

Keep secrets only in local `.env` files (already gitignored).
