# API — Auth Boilerplate

Express + TypeScript backend. Handles authentication, token management, email, Google OAuth, user management, and Stripe billing.

Local dev runs on: `http://localhost:3000`
Docker runs on: `http://localhost:5001` (mapped from internal port 3000)

## Stack

| Tool | Purpose |
|---|---|
| Express | HTTP framework |
| TypeScript | Type safety |
| Prisma | ORM + migrations |
| PostgreSQL | Database |
| jsonwebtoken | Sign and verify JWTs |
| bcrypt | Password hashing |
| Resend | Transactional email |
| Stripe | Billing, subscriptions, webhooks |
| express-validator | Input validation |
| express-rate-limit | Rate limiting |
| helmet | Security headers |
| passport-google-oauth20 | Google OAuth strategy |

## Folder Structure

```
api/
├── prisma/
│   ├── schema.prisma         ← User, Subscription models
│   └── migrations/           ← committed SQL migration history
├── src/
│   ├── config/
│   │   ├── env.ts            ← validated env variables
│   │   └── passport.ts       ← Google OAuth strategy setup
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts   ← getMe, updateMe, deleteMe
│   │   └── billing.controller.ts ← checkout, portal, webhook
│   ├── middleware/
│   │   ├── authenticate.ts   ← JWT Bearer token guard
│   │   ├── validate.ts       ← express-validator error handler
│   │   ├── rateLimiter.ts    ← rate limit configs
│   │   └── errorHandler.ts   ← global error handler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── billing.routes.ts
│   ├── services/
│   │   ├── auth.service.ts      ← register, login, refresh, logout, verify, reset, update, delete
│   │   ├── email.service.ts     ← Resend email templates
│   │   ├── oauth.service.ts     ← Google OAuth user creation/linking
│   │   └── billing.service.ts   ← Stripe customer, checkout, portal, webhook handlers
│   ├── utils/
│   │   ├── jwt.ts            ← sign/verify helpers + token expiry
│   │   ├── prisma.ts         ← Prisma client singleton
│   │   ├── logger.ts
│   │   └── response.ts       ← consistent success response shape
│   ├── validators/
│   │   └── authValidation.ts ← express-validator chains
│   └── app.ts
├── .env.example
├── tsconfig.json
└── package.json
```

## Local Dev Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally or a remote connection string
- [Resend](https://resend.com) account and API key
- [Google Cloud](https://console.cloud.google.com) OAuth 2.0 credentials
- [Stripe](https://stripe.com) account + [Stripe CLI](https://stripe.com/docs/stripe-cli) for webhooks

### Steps

```bash
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

### Stripe webhooks (local dev)

In a separate terminal, forward Stripe events to your local server:

```bash
stripe listen --forward-to localhost:3000/billing/webhook
```

Copy the `whsec_...` secret printed by the CLI and set it as `STRIPE_WEBHOOK_SECRET` in `api/.env`. Restart the API after updating.

## Docker

In Docker, the API is built and run via the root `docker-compose.yml`. It reads env vars from the **root `.env`** — not from `api/.env`.

`api/.env` is only used for local development.

```bash
# From the project root
docker compose up --build
```

The API will be available at `http://localhost:5001`.

Prisma migrations run automatically on container start (`prisma migrate deploy`).

## Environment Variables

For **local dev**, copy and fill in `api/.env.example`:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/auth_boilerplate

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx  # from: stripe listen --forward-to ...
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxx
```

For **Docker**, fill in the root `.env`. Key differences:
- `CLIENT_URL=http://localhost` (frontend on port 80)
- `DATABASE_URL` uses `postgres` as the hostname (Docker service name)
- `GOOGLE_CALLBACK_URL=http://localhost:5001/auth/google/callback`
- Use a real Stripe webhook secret from the Stripe Dashboard (not the CLI one)

> Never commit `.env`. It is already in `.gitignore`.

## Endpoints

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Returns `{ status: "ok", timestamp }` |
| GET | `/docs` | Swagger UI — **local dev only**, disabled in production |

### Auth — `/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create pending registration, send verification email |
| POST | `/auth/login` | Login, set refresh token cookie, return access token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/refresh` | Rotate refresh token, return new access token |
| GET | `/auth/verify-email?token=` | Verify email, create user account |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password, invalidate all sessions |
| GET | `/auth/google` | Redirect to Google OAuth |
| GET | `/auth/google/callback` | Handle Google OAuth callback |

### User — `/user`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/me` | ✅ | Get current authenticated user + subscription |
| PATCH | `/user/me` | ✅ | Update email or password |
| DELETE | `/user/me` | ✅ | Delete account (requires `password` in body) |

### Billing — `/billing`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/billing/create-checkout-session` | ✅ | Create Stripe Checkout session, returns `{ url }` |
| POST | `/billing/create-portal-session` | ✅ | Create Stripe Billing Portal session, returns `{ url }` |
| POST | `/billing/webhook` | ❌ (Stripe signature) | Receive and process Stripe webhook events |

#### Webhook events handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Create/update subscription record in DB |
| `customer.subscription.updated` | Sync status, `cancelAtPeriodEnd`, and period end |
| `customer.subscription.deleted` | Mark subscription as `canceled` |

## Scripts

```bash
npm run dev        # start with ts-node-dev (hot reload)
npm run build      # compile TypeScript to /dist
npm run start      # run compiled /dist/app.js
npm run lint       # ESLint
npx prisma studio  # open Prisma DB browser
```
