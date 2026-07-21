# Local Setup

This guide sets up Astrix on your machine for frontend and backend development.

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB connection string
- Resend API key for email OTPs
- Google OAuth app credentials
- GitHub OAuth app credentials

Phone OTP uses Twilio-ready settings, but it can be left disabled until that flow is finished.

## 1. Backend Setup

```bash
cd server
npm install
copy .env.example .env
```

Edit `server/.env`:

```text
PORT=5000
NODE_ENV=production
HOST=0.0.0.0
MONGO_URI=your_mongodb_connection_string

# Use your deployed frontend origin, or your frontend port URL when testing locally.
CLIENT_URL=your_frontend_origin

# Use your deployed backend origin, or your backend port URL when testing locally.
SERVER_URL=your_backend_origin

JWT_SECRET=replace_with_a_long_random_value
SESSION_SECRET=replace_with_a_long_random_value

RESEND_API_KEY=your_resend_api_key
RESEND_FROM="Astrix <noreply@astrix-app.me>"
RESEND_REPLY_TO=support@astrix-app.me

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Use your backend origin plus /auth/google/callback.
GOOGLE_CALLBACK_URL=your_backend_origin/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Use your backend origin plus /auth/github/callback.
GITHUB_CALLBACK_URL=your_backend_origin/auth/github/callback
```

Start the backend:

```bash
npm run dev
```

Backend health check:

```text
your_backend_origin
```

## 2. Frontend Setup

```bash
cd client
npm install
copy .env.example .env
```

Edit `client/.env`:

```text
# Use your deployed backend API origin, or your backend port URL when testing locally.
VITE_API_URL=your_backend_api_origin
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
your_frontend_origin
```

## 3. OAuth Redirect URIs

For local development, configure redirect URIs using your backend port URL:

```text
your_backend_origin/auth/google/callback
your_backend_origin/auth/github/callback
```

For production, use:

```text
https://api.astrix-app.me/auth/google/callback
https://api.astrix-app.me/auth/github/callback
```

## 4. Resend Email

In Resend, verify `astrix-app.me` and wait for DKIM verification before production testing.

Use:

```text
RESEND_FROM="Astrix <noreply@astrix-app.me>"
RESEND_REPLY_TO=support@astrix-app.me
```

Resend does not need access to Zoho mailboxes. Zoho handles monitored inboxes such as `admin@astrix-app.me` and `support@astrix-app.me`.

## 5. Phone OTP

Phone OTP settings are present in `server/.env.example` for Twilio, but this flow can remain unfinished for now. Email verification and password reset OTPs do not depend on phone OTP.

## 6. Docker Compose

For local container builds:

```bash
docker compose up --build
```

You can override the frontend API URL at build time:

```bash
VITE_API_URL=your_backend_api_origin docker compose up --build
```

On Windows PowerShell:

```powershell
$env:VITE_API_URL="your_backend_api_origin"
docker compose up --build
```

## Production Checklist

- Backend service env has `SERVER_URL=https://api.astrix-app.me`
- Backend service env has `CLIENT_URL=https://astrix-app.me`
- Backend service env has Resend, MongoDB, JWT, session, and OAuth secrets
- Frontend service build env has `VITE_API_URL=https://api.astrix-app.me`
- Google redirect URI is `https://api.astrix-app.me/auth/google/callback`
- GitHub redirect URI is `https://api.astrix-app.me/auth/github/callback`
- Resend domain status is verified
