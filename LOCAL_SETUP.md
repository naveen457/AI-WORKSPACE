# Local Development Setup

## 1) Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or cloud)

## 2) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

## 3) Configure backend environment

```bash
cp server/.env.example server/.env
```

Update `server/.env` with real values:
- `MONGO_URI`
- `JWT_SECRET`
- `SESSION_SECRET`
- `CLIENT_URL=http://localhost:5173`
- `SERVER_URL=http://localhost:5000`

Optional integrations:
- Resend: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`
- Twilio: `PHONE_OTP_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`

## 4) Configure frontend environment

Create `client/.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

## 5) Run development servers

Terminal 1:
```bash
cd server
npm run dev
```

Terminal 2:
```bash
cd client
npm run dev
```

## Security Notes

- Never commit `.env` or `.env.local` files.
- Keep production credentials out of source control.
- Use `server/.env.example` only as a template.
