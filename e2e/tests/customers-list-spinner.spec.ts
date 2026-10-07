import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';

/**
 * The customers list replaces its loading spinner with the list. The spinner's
 * elements must be removed, not reused for the list: on iOS a reused element
 * kept the spinner's rotation and the customer cards spun on the page.
 */
test('the customers list is not built from the spinner elements', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  // Hold the list back so the spinner is on screen long enough to grab.
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/shops/*/customers?*', async (route) => {
    await held;
    await route.continue();
  });

  await page.goto(`/shops/${E2E.shop.slug}/customers`);
  const spinner = await page.locator('.spinner-wrap .spinner').elementHandle();
  release();
  await expect(page.locator('.table-surface')).toBeVisible();
  expect(await spinner!.evaluate((el) => el.isConnected)).toBe(false);
});
