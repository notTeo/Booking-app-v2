# BeBooked

[![CI](https://github.com/notTeo/Booking-app-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/notTeo/Booking-app-v2/actions/workflows/ci.yml)

Online booking for barbershops and salons. A shop owner manages staff, services and working hours, and clients book from a public page at `/<shop-slug>`, with no phone calls and no payments to configure.

## The problem

Small appointment-based shops often run on phone calls and paper notebooks. BeBooked gives each shop a booking page that only offers slots that are actually free, and a dashboard to see and manage what was booked. It is aimed at independent shops with a handful of staff.

## Features

- Public booking page per shop at `/:slug` (old `/p/:slug` links redirect)
- Service, staff and per-staff working-hours management
- Bookings and customer records, including owner-created bookings outside working hours
- Team invites by email; one account can own or work in several shops
- Email: account verification, password reset, booking confirmation and cancellation, invites
- Customer cancellation through a link in the confirmation email
- Greek and English interface, light and dark theme

By design there are no payments, no SMS and no social login: email and password only.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma |
| Email | Resend |
| Tests | Vitest (api, web), Playwright (e2e) |
| CI | GitHub Actions |
| Hosting | Vercel (web), Railway (api and database) |

## Architecture

A monorepo of three independent npm projects: `api/` (Express API), `web/` (React single-page app) and `e2e/` (Playwright tests). Design-system and deployment documentation is in `docs/`.

- **Auth**: a short-lived JWT access token held in memory by the web app, plus a rotating refresh token in an `httpOnly` cookie, with reuse detection.
- **Multi-tenancy**: every shop resource is scoped by shop and checked against the caller's membership.
- **Double-booking protection**: the API checks and retries inside transactions, and PostgreSQL exclusion constraints reject overlapping bookings for one provider as a last line of defence.
- **Time**: instants are stored as `timestamptz` and slots are computed in the shop's timezone.

## Local setup

Requirements: Node.js 20+, PostgreSQL, and a [Resend](https://resend.com) API key for sending email.

```bash
# API  -> http://localhost:3000   (Swagger UI at /docs outside production)
cd api
cp .env.example .env     # fill in secrets, see api/README.md for every variable
npm install
npx prisma migrate dev
npm run dev

# Web  -> http://localhost:5173
cd web
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

## Configuration

The API validates its environment at startup and prints every problem. Variables are documented in [api/README.md](api/README.md#environment-variables). The web app needs only `VITE_API_URL`.

## Tests and CI

```bash
cd api && npm test            # needs a Postgres test database, see api/README.md#testing
cd api && npm run test:tz     # suite under three timezones
cd web && npm test
npm run e2e                   # Playwright, see e2e/README.md
```

GitHub Actions runs lint, type checks, API and web tests, a schema drift check and the e2e suite. Pushes to feature branches get a fast run; pull requests and pushes to `dev` and `main` get the full run.

## Project status

In development. A pilot deployment for a barbershop is in preparation. Deployment steps are in [docs/deployment.md](docs/deployment.md).

## Known limitations

- No shop closures or holidays beyond working-hours schedules.
- The data-processing agreement page is placeholder text until launch.
- The page-level CSS is still being migrated to the design system ([docs/design-system/migration.md](docs/design-system/migration.md)).

## License

Source available for viewing. All rights reserved.
