import { defineConfig } from '@playwright/test';
import { tmpdir } from 'os';
import { join } from 'path';
import { E2E } from './support/env';

const apiEnv = {
  // The API runs in UTC on purpose: that is what Railway does, and it is
  // exactly the environment where server-local-time bugs used to hide.
  TZ: 'UTC',
  DATABASE_URL: E2E.dbUrl,
  PORT: String(E2E.apiPort),
  NODE_ENV: 'development',
  CLIENT_URL: E2E.webUrl,
  JWT_ACCESS_SECRET: 'e2e-access-secret',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret',
  RESEND_API_KEY: 're_e2e_dummy',
  EMAIL_FROM: 'e2e@example.com',
  // One browser IP does many logins/page loads; the 10-per-15-min auth limiter
  // would block the suite. (Ignored by the API in production.)
  RATE_LIMIT_DISABLED: 'true',
  // No bucket in e2e: photos go to a throwaway folder, not api/.uploads.
  UPLOADS_DIR: join(tmpdir(), 'bebooked-e2e-uploads'),
};

export default defineConfig({
  testDir: './tests',
  // Tests share one seeded database and one shop, so run them serially.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: E2E.webUrl,
    // Uses the locally installed Google Chrome (no browser download). Set
    // E2E_BROWSER_CHANNEL=chromium to use Playwright's bundled Chromium.
    channel: process.env.E2E_BROWSER_CHANNEL === 'chromium' ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Reset + migrate + seed the e2e DB, then start the real API.
      command: 'node ../e2e/support/prepare-db.mjs && npx ts-node-dev --transpile-only src/app.ts',
      cwd: '../api',
      url: `${E2E.apiUrl}/health`,
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${E2E.webPort} --strictPort`,
      cwd: '../web',
      url: E2E.webUrl,
      env: { VITE_API_URL: E2E.apiUrl },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
