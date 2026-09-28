import { execSync } from 'child_process';

// Runs once per vitest run, before any test file. Guarantees the test DB is
// migrated to the current schema so a stale local DB can never cause
// spurious failures.
export default function globalSetup() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/test/i.test(url.split('/').pop() ?? '')) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL database name must contain "test" (got "${url.split('/').pop()}")`,
    );
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
