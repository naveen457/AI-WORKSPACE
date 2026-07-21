# Astrix Frontend

React/Vite frontend for Astrix.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

The local dev server runs on:

```text
your_frontend_origin
```

## Environment

Create `client/.env`:

```text
# Use your deployed backend API origin, or your backend port URL when testing locally.
VITE_API_URL=your_backend_api_origin
```

For production builds:

```text
VITE_API_URL=https://api.astrix-app.me
```

`VITE_API_URL` is read at build time. If this value changes in Render, rebuild/redeploy the frontend service.

## Build

```bash
npm run build
```

## API

The frontend API client is defined in `src/api/api.js`. OAuth buttons link to:

- `${VITE_API_URL}/auth/google`
- `${VITE_API_URL}/auth/github`
