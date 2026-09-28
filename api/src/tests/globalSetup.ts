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

  // Make the DATABASE's default session timezone deliberately hostile (not
  // UTC, not the dev machine's zone). The app must pin its own connections to
  // UTC; if any code path relied on the session zone, the suite would fail
  // here instead of only on a machine that happens to differ from prod.
  const dbName = url.split('/').pop()!.split('?')[0];
  execSync('npx prisma db execute --stdin', {
    input: `ALTER DATABASE "${dbName}" SET timezone TO 'America/New_York';`,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: process.env,
  });
}
