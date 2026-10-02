import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';

/**
 * When the shop can't be resolved (unknown slug, deactivated membership, API
 * error) the shop pages must say so instead of spinning forever.
 */
const PATHS = ['bookings', 'bookings/new', 'services', 'team', 'team/us1', 'customers', 'customers/c1'];

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
}

const notAvailable = (page: Page) => page.locator('.empty').filter({ hasText: 'Shop not available' });

test('an unknown shop slug shows a not-found state on every shop page', async ({ page }) => {
  await login(page);
  for (const path of PATHS) {
    await page.goto(`/shops/no-such-shop/${path}`);
    await expect(notAvailable(page), path).toBeVisible();
    await expect(page.locator('.spinner'), path).toHaveCount(0);
  }
  await page.getByRole('link', { name: 'Back to my shops' }).click();
  await expect(page).toHaveURL(/\/shops$/);
});

test('a deactivated member sees the not-found state, not a spinner', async ({ page }) => {
  await login(page);
  await query(`update "UserShop" set active = false where id = 'us1'`);
  try {
    for (const path of PATHS) {
      await page.goto(`/shops/${E2E.shop.slug}/${path}`);
      await expect(notAvailable(page), path).toBeVisible();
      await expect(page.locator('.spinner'), path).toHaveCount(0);
    }
  } finally {
    await query(`update "UserShop" set active = true where id = 'us1'`);
  }
});

test('a failed shop lookup shows an error with Retry, and Retry recovers', async ({ page }) => {
  await login(page);
  const isShopList = (u: URL) => u.pathname === '/api/shops';
  await page.route(isShopList, (route) => route.fulfill({ status: 500, json: { status: 'error' } }));
  await page.goto(`/shops/${E2E.shop.slug}/team`);
  await expect(page.getByRole('alert')).toContainText('Could not load this shop');
  await expect(notAvailable(page)).toHaveCount(0);
  await expect(page.locator('.spinner')).toHaveCount(0);

  await page.unroute(isShopList);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a deactivated member sees the gate state on the overview and settings pages too', async ({ page }) => {
  await login(page);
  await query(`update "UserShop" set active = false where id = 'us1'`);
  try {
    for (const path of ['', '/settings', '/invites']) {
      await page.goto(`/shops/${E2E.shop.slug}${path}`);
      await expect(notAvailable(page), path || 'overview').toBeVisible();
      await expect(page.locator('.spinner'), path || 'overview').toHaveCount(0);
    }
  } finally {
    await query(`update "UserShop" set active = true where id = 'us1'`);
  }
});
