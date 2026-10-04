import type { Page } from '@playwright/test';

/**
 * After submitting the login form: wait until the post-login resolver has
 * moved the browser off /login. Where it lands depends on the user's shops and
 * invites (see login-landing.spec.ts), so specs needing a page go there next.
 */
export async function waitForLanding(page: Page) {
  await page.waitForURL((url) => url.pathname !== '/login');
}
