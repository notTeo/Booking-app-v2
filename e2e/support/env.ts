import { userInfo } from 'os';

// One place for every URL/credential the e2e suite uses. The database is
// dropped and recreated on every run, so its name must contain "e2e" — the
// preparer refuses anything else.
const dbUser = process.env.PGUSER ?? userInfo().username;

export const E2E = {
  apiPort: 3300,
  webPort: 5199,
  apiUrl: 'http://localhost:3300',
  webUrl: 'http://localhost:5199',
  adminDbUrl:
    process.env.E2E_DB_ADMIN_URL ?? `postgresql://${dbUser}@localhost:5432/postgres`,
  dbName: 'booking_e2e',
  dbUrl:
    process.env.E2E_DATABASE_URL ??
    `postgresql://${dbUser}@localhost:5432/booking_e2e`,
  shop: { slug: 'e2e-shop', timezone: 'Europe/Athens' },
  owner: { email: 'owner@e2e.test', password: 'E2e-Password1!' },
} as const;
