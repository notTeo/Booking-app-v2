# API

Express + TypeScript + Prisma + PostgreSQL backend for the booking app: email/password auth, multi-tenant shops (team, services, working hours, customers, bookings), and a public booking API. Free scheduling only — no payments, no OAuth.

Local dev: `http://localhost:3000`. The included `Dockerfile` (used for the Railway deploy) also listens on port 3000.

## Stack

Express, TypeScript, Prisma (`@prisma/adapter-pg`), PostgreSQL, jsonwebtoken, bcrypt, Luxon, Resend (transactional email), express-validator, express-rate-limit, helmet, pino, Vitest + Supertest.

## Layout

```
api/
├── prisma/            schema + committed migrations
├── scripts/           dev-only helpers
└── src/
    ├── config/        env parsing/validation (parseEnv.ts, env.ts)
    ├── controllers/   HTTP layer
    ├── services/      business logic (bookings, booking rules, email, ...)
    ├── routes/        route tables, validation chains + rate limiters wired here
    ├── validators/    express-validator chains, slug rules
    ├── middleware/    authenticate, validate, rateLimiter, requestId, errorHandler
    ├── utils/         jwt, prisma, logger, slots, shutdown, ...
    ├── docs/          openapi.yaml (served at /docs outside production)
    ├── tests/         Vitest suites (need a Postgres test database)
    └── app.ts         app setup + server start
```

## Local setup

```bash
cd api
cp .env.example .env      # fill in secrets; NODE_ENV is required
npm install
npx prisma migrate dev
npm run dev
```

Requires Node 20+, PostgreSQL, and a [Resend](https://resend.com) API key.

## Environment variables

Validated at startup by `src/config/parseEnv.ts`; the process exits with the full list of problems if anything is wrong. See `.env.example` for a template.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `development`, `test` or `production`. No default — unset would silently disable HSTS, secure cookies and rate limiting. |
| `DATABASE_URL` | yes | `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `CLIENT_URLS` | yes* | Comma-separated frontend origins. All are allowed by CORS; the **first** is used in email links. *`CLIENT_URL` (single origin) still works if `CLIENT_URLS` is unset. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | e.g. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_ACCESS_EXPIRES_IN` | no | Default `15m`. Format: number + `s`/`m`/`h`/`d`/`w`. |
| `JWT_REFRESH_EXPIRES_IN` | no | Default `30d`. Same format; sets the refresh token lifetime, and the cookie lifetime when the user chose "remember me" (otherwise the cookie is a session cookie). A bare number is rejected. |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes | |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | production | The S3-compatible bucket photos are stored in (a Railway bucket). All five or none. Without them photos go to `api/.uploads/` (override with `UPLOADS_DIR`) in development and stay in memory in tests; production refuses to start. |
| `PORT` | no | Default `3000`. |
| `INVITE_EMAIL_OVERRIDE` | no | Dev only: send all invite emails to this address. |
| `RATE_LIMIT_DISABLED` | no | `true` disables rate limiting. Ignored when `NODE_ENV=production`. Used by the e2e suite. |

Test and script variables (not read by the running server): `TEST_DATABASE_URL` overrides the database in `.env.test` for `npm test`; `TENANT_PASSWORD` and `HAIROLOGY_OWNER_PASSWORD` set the owner password for the tenant scripts below; the e2e suite has its own variables, see [e2e/README.md](../e2e/README.md).

## Operations

- `GET /health` — `200 {status:"ok", db:"up"}` when the database answers `SELECT 1`, otherwise `503 {status:"error", db:"down"}`. Use it as the platform health check.
- **Graceful shutdown** — on `SIGTERM`/`SIGINT` the server stops accepting connections, drains in-flight requests, disconnects Prisma, and exits (forced exit after 10s). `unhandledRejection`/`uncaughtException` are logged and trigger the same path with exit code 1.
- **Request IDs** — every response carries `X-Request-Id` (an incoming, well-formed one from the proxy is reused) and every log line written during the request includes it as `requestId`. Query strings are never logged.
- **Logs contain no email addresses**; log lines identify users by id.
- Migrations run automatically on container start (`prisma migrate deploy`).

## Tenant operations (admin only)

```bash
# Create a customer: verified Pro owner + shop + owner membership.
# Password from TENANT_PASSWORD, or generated and printed once. Never overwrites.
npm run tenant:create -- --owner-name "Maria K" --owner-email maria@example.com \
  --shop-name "Maria's Salon" --slug marias-salon [--timezone Europe/Athens]

# Pilot tenant (no demo data; refuses if it exists). Edit
# src/admin/hairologyData.ts and set HAIROLOGY_DATA_CONFIRMED = true first.
HAIROLOGY_OWNER_NAME=... HAIROLOGY_OWNER_EMAIL=... HAIROLOGY_OWNER_PASSWORD=... npm run seed:hairology

# Local dev demo data only — refuses unless NODE_ENV is development/test.
npm run seed:dev-visual-check
```

These run against whatever `DATABASE_URL` is in the environment (`api/.env` locally).

## API reference

Interactive docs at `/docs` (non-production only, from `src/docs/openapi.yaml`). Route groups:

| Mount | Purpose |
|---|---|
| `/auth` | register, login, refresh, logout, email verification, password reset, sessions |
| `/user` | current user: get / update / delete |
| `/api/shops` | shops the user belongs to and everything under `/:shopId` (team, services, schedules, bookings, customers) |
| `/api/invites` | invites addressed to the current user |
| `/public` | unauthenticated: shop info, slots, create/cancel booking (rate limited) |
| `/health` | see above |

## Scripts

```bash
npm run dev        # ts-node-dev with reload
npm run build      # compile to dist/
npm start          # run dist/app.js
npm test           # Vitest (needs a Postgres test DB, see Testing below)
npm run test:watch
npm run test:tz    # suite under UTC, Europe/Athens, America/New_York
npm run lint       # lint:fix to autofix, format to run Prettier
npm run audit:schedule-overlaps   # report overlapping working-hour rows (read-only)
npx prisma studio
```

## Testing

`npm test` needs a PostgreSQL database named `booking_app_test` (the name must contain `test`; the suite refuses anything else). `.env.test` points at `postgresql://postgres@localhost:5432/booking_app_test`. If your local role is not `postgres`, override it for your shell:

```bash
createdb booking_app_test
export TEST_DATABASE_URL=postgresql://YOUR_USER@localhost:5432/booking_app_test
npm test
```

Migrations are applied automatically before the suite runs. Browser tests live in `../e2e`.

## Email previews

`npm run preview:emails` renders all nine emails to `api/email-previews/*.html` (set `EMAIL_PREVIEW_DIR` to write elsewhere). Open them in a browser with the web dev server running, so the wordmark images load.
