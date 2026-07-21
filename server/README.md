# Astrix Backend

Express API for Astrix authentication, profile management, OAuth callbacks, email OTPs, password reset OTPs, and phone OTP endpoints.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

The API runs on:

```text
your_backend_origin
```

## Required Environment

Create `server/.env` from `server/.env.example`.

Core:

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
```

Email OTPs through Resend:

```text
RESEND_API_KEY=your_resend_api_key
RESEND_FROM="Astrix <noreply@astrix-app.me>"
RESEND_REPLY_TO=support@astrix-app.me
```

OAuth:

```text
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your_backend_origin/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=your_backend_origin/auth/github/callback
```

## Production Values

For Render production:

```text
CLIENT_URL=https://astrix-app.me
SERVER_URL=https://api.astrix-app.me
GOOGLE_CALLBACK_URL=https://api.astrix-app.me/auth/google/callback
GITHUB_CALLBACK_URL=https://api.astrix-app.me/auth/github/callback
```

After changing backend env vars in Render, redeploy the backend service.

## Email

`src/utils/mailer.js` uses the Resend SDK. Resend sends from `noreply@astrix-app.me`; replies go to `support@astrix-app.me`.

Zoho Mail does not need to be connected to Resend. Zoho handles inboxes, while Resend handles automated delivery.

## Phone OTP

Phone OTP code is isolated in `src/services/phoneOtp.service.js` and `src/controllers/phone.controller.js`. It supports Twilio settings but can stay disabled until the phone OTP flow is completed.
