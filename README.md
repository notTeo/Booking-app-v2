# Bookly

Multi-tenant SaaS booking platform for barbershops and salons. Shop owners get a public booking page at `/:slug`, manage their services and staff, and receive bookings without needing a phone.

**Status:** MVP in progress — not yet deployed. Target user: one real barbershop.

---

## Stack

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.4-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway-336791?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-20.3-008CDD?logo=stripe&logoColor=white)

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React + TypeScript | 19.2 / 5.9 |
| Frontend build | Vite | 7.3 |
| Routing | React Router DOM | 7.13 |
| Data fetching | TanStack Query | 5.90 |
| HTTP client | Axios | 1.13 |
| Backend framework | Express + TypeScript | 5.2 / 5.9 |
| ORM | Prisma | 7.4 |
| Database | PostgreSQL | hosted on Railway |
| Auth | JWT + Google OAuth (Passport.js) | jsonwebtoken 9.0 |
| Email | Resend | 6.9 |
| Payments | Stripe | 20.3 |
| Testing | Vitest | 4.0 |

---

## Monorepo Structure

```
booking-app-v2/
├── api/                        # Express + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma       # all models and enums
│   │   └── migrations/         # committed SQL migration history
│   └── src/
│       ├── config/             # env validation, Passport strategy
│       ├── controllers/        # auth, user, billing
│       ├── middleware/         # JWT auth, validation, rate limiting, error handler
│       ├── routes/             # auth, user, billing route definitions
│       ├── services/           # business logic (auth, email, oauth, billing)
│       ├── utils/              # JWT helpers, Prisma singleton, logger, response
│       ├── validators/         # express-validator chains
│       └── app.ts
└── web/                        # React + TypeScript frontend
    └── src/
        ├── api/                # API client modules (axios)
        ├── components/         # ProtectedRoute, PublicRoute
        ├── config/             # env.ts
        ├── pages/              # BillingPage, OAuthCallback, VerifyEmail, etc.
        ├── store/              # Zustand auth store
        └── main.tsx
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- PostgreSQL running locally, or a remote `DATABASE_URL`
- [Resend](https://resend.com) account
- [Google Cloud](https://console.cloud.google.com) OAuth 2.0 credentials
- [Stripe](https://stripe.com) account + Stripe CLI (for webhooks)

### Backend

```bash
cd api
cp .env.example .env   # fill in values — see table below
npm install
npx prisma migrate dev
npm run dev            # http://localhost:3000
```

To test Stripe webhooks locally, run this in a separate terminal:

```bash
stripe listen --forward-to localhost:3000/billing/webhook
# copy the printed whsec_... secret into api/.env as STRIPE_WEBHOOK_SECRET
```

Swagger UI (local only): `http://localhost:3000/docs`

### Frontend

```bash
cd web
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev            # http://localhost:5173
```

---

## Environment Variables

### `api/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | API listen port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `CLIENT_URL` | Frontend origin (CORS) | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/bookly` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | any strong random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | any strong random string |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `30d` |
| `RESEND_API_KEY` | Resend API key | `re_xxxx` |
| `EMAIL_FROM` | Sender address for transactional email | `noreply@yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI | `http://localhost:3000/auth/google/callback` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_xxxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxxx` |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for the subscription plan | `price_xxxx` |

### `web/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:3000` |

---

## Data Model

All shop data is isolated by `shopId`. Multi-tenancy is row-level — one shared database.

```
User
 └── UserShop (role: owner | staff)  ←→  Shop
                                           ├── ShopWorkingSchedule
                                           │     └── ShopWorkingDay
                                           │           └── ShopWorkingHourRange
                                           ├── Service
                                           │     └── StaffService  (links staff ↔ service)
                                           ├── Customer
                                           └── Booking (refs: customer, service, staff)

User
 └── Subscription  (Stripe-backed, one per user)
```

**Key entities:**

- **User** — platform account. Can own or be staff at multiple shops. Supports password and Google OAuth login.
- **Shop** — the bookable entity. Has a globally unique `slug` for its public URL. Stores location via Google Places API fields (`lat`, `lng`, `formattedAddress`, `placeId`).
- **UserShop** — join table between `User` and `Shop`. Role is `owner` or `staff`. Owners have write access to all shop settings.
- **ShopWorkingSchedule / ShopWorkingDay / ShopWorkingHourRange** — a schedule can belong to the shop (default) or to a specific staff member. Each day has one or more open/close hour ranges.
- **Service** — a bookable service with a duration (minutes) and price (cents).
- **StaffService** — which staff members offer which services.
- **Customer** — created per shop, identified by `(shopId, phone)`. Not a platform User account.
- **Booking** — ties together a shop, customer, service, and staff member. Has a `cancelToken` for unauthenticated cancellation via email link.
- **Subscription** — Stripe subscription record linked to a User. Statuses mirror Stripe's (`active`, `canceled`, `past_due`, etc.).

---

## API Endpoints

### Auth — `/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create pending registration, send verification email |
| POST | `/auth/login` | Login, set refresh cookie, return access token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/refresh` | Rotate refresh token, return new access token |
| GET | `/auth/verify-email?token=` | Verify email, create account |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password, invalidate all sessions |
| GET | `/auth/google` | Redirect to Google OAuth |
| GET | `/auth/google/callback` | Handle Google OAuth callback |

### User — `/user`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/me` | ✓ | Get current user + subscription |
| PATCH | `/user/me` | ✓ | Update email or password |
| DELETE | `/user/me` | ✓ | Delete account |

### Billing — `/billing`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/billing/create-checkout-session` | ✓ | Create Stripe Checkout session |
| POST | `/billing/create-portal-session` | ✓ | Create Stripe Billing Portal session |
| POST | `/billing/webhook` | Stripe sig | Process Stripe webhook events |

---

## Scripts

```bash
# Backend
npm run dev          # ts-node-dev with hot reload
npm run build        # compile to /dist
npm run start        # run compiled build
npm run test         # vitest (single run)
npm run lint         # ESLint
npx prisma studio    # Prisma DB browser
npx prisma migrate dev   # apply migrations + regenerate client

# Frontend
npm run dev          # Vite dev server
npm run build        # type-check + Vite build
npm run preview      # preview production build
npm run lint         # ESLint
```
