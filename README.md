# Auth Boilerplate

This is my personal full-stack TypeScript auth starter. I built it not because I had to, but because I wanted to learn how auth really works under the hood. It's a solid starting point for real SaaS auth, not a toy, and it's something I can reuse for future projects without feeling like I'm glued to someone else's black box. If you're a solo mid-level developer looking to understand authentication, JWTs, refresh tokens, and full-stack flows, this is for you.

I could've used Clerk, Supabase, or Auth0 and called it a day — but then I'd never truly understand how login, tokens, and security work. The goal here is simple: learn fast, learn deeply; build a flexible foundation I can tweak or extend later; avoid black-box solutions while still having something functional. This boilerplate is stable for now but open to future improvements and versions, maybe adding RBAC, multi-tenancy, or custom domains when I have time.

---

## Features

### Auth & Security

- **Register with email + password** — sends a verification email before creating the account so emails are real
- **Email verification** — ensures users actually own their inbox
- **Login / Logout** — JWT-based, with access + refresh token rotation for safety
- **Refresh token rotation** — refresh tokens are in httpOnly cookies, so they can't be stolen via XSS
- **Forgot / Reset password** — invalidates all existing sessions to prevent compromised tokens from staying active
- **Google OAuth** — sign in or register via Google (just one social option for now)
- **Update profile** — change email or password from the Settings page
- **Delete account** — password-confirmed, removes all data
- **Protected routes** — frontend automatically redirects unauthenticated users
- **Security layers** — helmet, CORS, rate limiting, bcrypt, input validation to prevent token theft and account enumeration

### Billing

- **Stripe Checkout** — upgrade to a paid plan via a hosted Stripe session
- **Billing portal** — manage subscription, update payment method, cancel from Stripe's UI
- **Webhook sync** — subscription state stays in sync with Stripe events
- **Subscription state** — plan badge, renewal date, and cancellation notice in the UI

### Developer-Friendly

- **Swagger UI** — available locally only for testing endpoints
- **Thin controllers + services** — all business logic lives in services, validators run before hitting controllers
- **Flexible** — multi-tenancy and advanced RBAC are intentionally not included so developers can implement them however they want

---

## Stack

| Layer | Technology |
|---|---|
| API | Express, TypeScript, Prisma, PostgreSQL |
| Auth | JWT, bcrypt, Passport (Google OAuth), Resend (email) |
| Billing | Stripe (Checkout, Billing Portal, Webhooks) |
| Frontend | React 19, TypeScript, Vite, React Router v7, Axios |
| Infrastructure | Docker, Docker Compose, nginx |

---

## Project Structure

```
auth-boilerplate/
├── api/               ← Express API
├── web/               ← React frontend
├── docker-compose.yml
└── .env               ← environment variables used by Docker Compose
```

See [api/README.md](./api/README.md) and [web/README.md](./web/README.md) for full details on each.

---

## Quick Start — Docker

The fastest way to run the full stack locally.

### 1. Prerequisites

- [Docker](https://www.docker.com/) installed and running
- A [Resend](https://resend.com) account and API key
- A [Google Cloud](https://console.cloud.google.com) OAuth 2.0 Client ID and Secret
- A [Stripe](https://stripe.com) account with a product/price created

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your values: `DB_PASSWORD`, JWT secrets, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and your Stripe keys.

> For Google OAuth, add `http://localhost:5001/auth/google/callback` as an authorized redirect URI in your [Google Cloud Console](https://console.cloud.google.com).

### 3. Run everything

```bash
docker compose up --build
```

### 4. Access

| Service | URL |
|---|---|
| Frontend | http://localhost |
| API | http://localhost:5001 |

---

## Local Development

Run the API and frontend separately with hot reload.

### API

```bash
cd api
cp .env.example .env   # fill in your values
npm install
npx prisma migrate dev
npm run dev            # runs on http://localhost:3000
```

### Frontend

```bash
cd web
cp .env.example .env   # VITE_API_URL=http://localhost:3000 is already set
npm install
npm run dev            # runs on http://localhost:5173
```

### Stripe webhooks (local dev)

Stripe can't reach `localhost` directly. Run the CLI listener in a separate terminal:

```bash
stripe listen --forward-to localhost:3000/billing/webhook
```

Copy the `whsec_...` secret it prints and set it as `STRIPE_WEBHOOK_SECRET` in `api/.env`, then restart the API.

---

## Docker Commands You'll Actually Use

```bash
docker compose ps           # see running containers
docker compose logs api     # view API logs
docker compose down         # stop everything
docker compose down -v      # stop everything and wipe the database
docker compose up --build   # rebuild after code or env changes
```

---

## Philosophy / Why It's Built This Way

- **Learning first** — I built this to understand every piece of auth, not just copy-paste a solution.
- **Flexible** — minimal opinions, so developers can extend it however they want.
- **Secure by default** — tokens are protected, sessions are rotated, password resets invalidate everything, input is validated, and API exposure is minimal.
- **Readable** — thin controllers, services handle all logic, validators keep input clean.
- **SaaS-ready mindset** — it's a strong foundation for future projects: think RBAC, multi-tenancy, custom domains.

---

## What This Shows About Me

If someone browses my GitHub and sees this project, they should conclude:

> I don't know everything, but I learn fast, build understandable code, and can deliver above-average results once I've learned it.

That's it. A friendly, practical, mid-level dev guide to my TypeScript auth boilerplate. It's done for now, but evolving is always an option.
