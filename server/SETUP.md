# Server Setup

## Install

```bash
cd server
npm install
```

## Environment

Copy template and edit values:

```bash
cp .env.example .env
```

Required in production:
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `SESSION_SECRET`
- `CLIENT_URL`
- `SERVER_URL`

Optional features:
- Resend email OTP: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`
- Twilio phone OTP: `PHONE_OTP_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- OAuth providers:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`

## astrix-app.me values

Current example sender values:
- `RESEND_FROM="Astrix <noreply@astrix-app.me>"`
- `RESEND_REPLY_TO=support@astrix-app.me`

Use your own verified sending domain if different.

## Run

```bash
npm run dev
```
