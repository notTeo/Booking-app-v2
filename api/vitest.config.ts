import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load test env before vitest resolves any modules
dotenv.config({ path: '.env.test', override: true });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 15000,
    // Run test files serially to avoid DB conflicts between parallel test files
    fileParallelism: false,
  },
});
