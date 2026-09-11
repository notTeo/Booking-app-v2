# Bookly

Free online booking for barbershops and salons. Shop owners manage staff, services, and working hours, and get a public booking page their clients can book from directly — no calls, no payments to configure.

**What it does:**
- Public booking page per shop at `/p/:slug`
- Staff, service, and working-hours management
- Email notifications (booking confirmations, cancellations, staff invites, account verification)
- Multi-tenant: one account can own or staff multiple shops

**What it doesn't do (by design):**
- No payments or billing — the app is free, full stop
- No SMS — email only
- No Google OAuth — email + password login only

---

## Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite | Vercel |
| Backend | Node + Express + TypeScript | Railway |
| Database | PostgreSQL via Prisma | Railway |
| Email | Resend | — |
| Testing | Vitest (api) | — |

## Monorepo Structure

```
booking-app-v2/
├── api/                    # Express + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma   # models and enums
│   │   └── migrations/     # committed SQL migration history
│   └── src/
│       ├── config/         # env validation
│       ├── controllers/    # auth, user, shop, booking, team, invites, etc.
│       ├── middleware/     # JWT auth, validation, rate limiting, error handler
│       ├── routes/         # route definitions per resource
│       ├── services/       # business logic
│       ├── utils/          # JWT helpers, Prisma client, logger, response
│       ├── validators/     # express-validator chains
│       └── app.ts
└── web/                    # React + TypeScript frontend
    └── src/
        ├── api/            # API client modules (axios)
        ├── components/     # layout, sidebar, route guards
        ├── context/        # auth, shop, theme, language state
        ├── pages/           # dashboard, shop management, public booking page, etc.
        └── main.tsx
```

## Running Locally

### Prerequisites

- Node.js 18+
- PostgreSQL running locally, or a remote `DATABASE_URL`
- [Resend](https://resend.com) account (for email sending)

### Backend

```bash
cd api
cp .env.example .env   # fill in values — see api/.env.example for details
npm install
npx prisma migrate dev
npm run dev             # http://localhost:3000
```

Swagger UI (non-production only): `http://localhost:3000/docs`

### Frontend

```bash
cd web
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev             # http://localhost:5173
```

## API Overview

| Base path | Covers |
|---|---|
| `/auth` | register, login, logout, refresh, email verification, password reset, sessions |
| `/user` | current user profile (`/user/me`) |
| `/api/shops` | shop CRUD, and nested: working hours, team, invites, services, bookings, customers |
| `/api/invites` | global invite lookup/accept |
| `/public` | public-facing shop/service/availability data for the booking page |

The public booking page itself is a frontend route: `/p/:slug`.

## Scripts

```bash
# api/
npm run dev     # ts-node-dev with hot reload
npm run build    # compile to /dist
npm run start    # run compiled build
npm run test     # vitest (single run)
npm run lint     # ESLint
npx prisma studio        # Prisma DB browser
npx prisma migrate dev   # apply migrations + regenerate client

# web/
npm run dev      # Vite dev server
npm run build    # type-check + Vite build
npm run preview  # preview production build
npm run lint     # ESLint
```
