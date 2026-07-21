# Astrix

Astrix is a full-stack authentication and profile app with a React/Vite frontend and an Express/MongoDB backend. It supports email/password signup, email OTP verification, password reset OTPs through Resend, OAuth login, profile editing, and optional phone OTP delivery.

## Production URLs

- Frontend: `https://astrix-app.me`
- Backend API: `https://api.astrix-app.me`
- Google redirect URI: `https://api.astrix-app.me/auth/google/callback`
- GitHub redirect URI: `https://api.astrix-app.me/auth/github/callback`

## Tech Stack

- Frontend: React, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, MongoDB/Mongoose, Passport, JWT
- Email: Resend HTTP API
- OAuth: Google OAuth 2.0, GitHub OAuth
- Phone OTP: Twilio-ready, currently optional
- Deployment: Docker/Render-compatible services

## Project Structure

```text
.
├── client/                  # React/Vite frontend
│   ├── src/
│   │   ├── api/             # Axios API client
│   │   ├── components/      # Auth and UI components
│   │   ├── pages/           # App pages
│   │   └── App.jsx
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── server/                  # Express backend
│   ├── src/
│   │   ├── config/          # DB and OAuth config
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Phone OTP services
│   │   └── utils/           # Mailer and logger
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── LOCAL_SETUP.md
```

## Quick Start

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

In another terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

When testing locally, choose the frontend and backend ports you want to run and put those origin URLs in the `.env` files:

- Frontend: `your_frontend_origin`
- Backend: `your_backend_origin`

For the complete setup checklist, see [LOCAL_SETUP.md](./LOCAL_SETUP.md).

## Required Environment

Backend variables live in `server/.env` locally and in the backend service environment on Render:

- `MONGO_URI`
- `CLIENT_URL`
- `SERVER_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_REPLY_TO`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`

Frontend variables live in `client/.env` locally and must be available when the frontend is built:

- `VITE_API_URL`

For production, set:

```text
VITE_API_URL=https://api.astrix-app.me
```

## Email Setup

Automated emails are sent through Resend using:

```text
from: Astrix <noreply@astrix-app.me>
replyTo: support@astrix-app.me
```

Zoho Mail can manage monitored inboxes such as `admin@astrix-app.me` and `support@astrix-app.me`. Resend does not need mailbox access. It only needs the domain DNS records verified in Resend.

## Deployment Notes

- Backend env changes on Render require a backend redeploy.
- Frontend `VITE_API_URL` changes require a frontend rebuild/redeploy because Vite bakes env values into the static bundle.
- Phone OTP is isolated in the backend phone OTP service and can be finished later without changing the email OTP flow.

## Security

Never commit real `.env` files, API keys, OAuth secrets, database credentials, JWT secrets, or session secrets. Use the `.env.example` files as templates only.
