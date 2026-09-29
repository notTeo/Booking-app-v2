import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load test env before vitest resolves any modules. Only the explicit
// TEST_DATABASE_URL (e.g. CI) may override the DB — never an ambient
// DATABASE_URL, so a shell pointed at a real database can't be wiped.
dotenv.config({ path: '.env.test', override: true });
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['dist/**', 'node_modules/**'],
    globalSetup: ['./src/tests/globalSetup.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 15000,
    // Run test files serially to avoid DB conflicts between parallel test files
    fileParallelism: false,
  },
});
