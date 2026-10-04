# End-to-end tests

Playwright browser tests for the booking flow, owner dashboard, routing and account flows (`tests/*.spec.ts`).

## Run

Requires Node 20+, a local PostgreSQL server, and installed `api/` and `web/` dependencies.

```bash
cd e2e
npm install
npm run e2e            # headless
npm run e2e:headed     # watch it run
npm run e2e:report     # open the last report
```

From the repository root, `npm run e2e` does the same.

Playwright starts both servers itself: the API on port 3300 and the web app on port 5199 (`playwright.config.ts`, `support/env.ts`). Before the API starts, `support/prepare-db.mjs` drops, recreates, migrates and seeds a database named `booking_e2e`. It refuses any database whose name does not contain `e2e`. Tests run serially because they share one seeded shop.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `E2E_DATABASE_URL` | local `booking_e2e` | Database the suite resets and uses. |
| `E2E_DB_ADMIN_URL` | local `postgres` database | Connection used to drop and create it. |
| `PGUSER` | OS user | Postgres role for the defaults above. |
| `E2E_BROWSER_CHANNEL` | `chrome` | Set to `chromium` to use Playwright's bundled Chromium instead of installed Chrome. |

The suite sets its own throwaway secrets and disables API rate limiting (`RATE_LIMIT_DISABLED`, ignored in production). In CI it runs as the `E2E (Playwright)` job on pull requests and on pushes to `dev` and `main`.
