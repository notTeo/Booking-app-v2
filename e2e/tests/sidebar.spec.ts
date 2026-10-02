import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';

/** Sidebar levels, owner vs staff items, and the mobile drawer. */
const SHOP = `/shops/${E2E.shop.slug}`;

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
}

const sidebar = (page: Page) => page.locator('aside.sidebar');
const item = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true });

test('level 1 -> shop (level 2) -> account returns to level 1', async ({ page }) => {
  await login(page);
  await expect(item(page, 'Dashboard')).toBeVisible();
  await expect(item(page, 'Shops')).toBeVisible();
  await expect(item(page, 'Account')).toBeVisible();
  await expect(sidebar(page).getByRole('button', { name: 'Logout' })).toBeVisible();
  await expect(sidebar(page).getByText('App', { exact: true })).toHaveCount(0);

  await page.goto(SHOP);
  for (const name of ['Overview', 'Bookings', 'Services', 'Team', 'Customers', 'Settings', 'Account']) {
    await expect(item(page, name), name).toBeVisible();
  }
  await expect(item(page, 'New Booking')).toHaveCount(0);
  // "My Shops" is a way out, not the current page.
  await expect(item(page, 'My Shops')).not.toHaveAttribute('aria-current', 'page');
  await expect(item(page, 'Overview')).toHaveAttribute('aria-current', 'page');

  await item(page, 'Account').click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(item(page, 'Dashboard')).toBeVisible();
  await expect(item(page, 'Team')).toHaveCount(0);
});

test('owner can still start a booking from the Bookings page', async ({ page }) => {
  await login(page);
  await page.goto(`${SHOP}/bookings`);
  await page.getByRole('link', { name: 'New Booking' }).click();
  await expect(page).toHaveURL(new RegExp(`${SHOP}/bookings/new$`));
});

test('staff see the trimmed menu and are redirected away from owner pages', async ({ page }) => {
  await login(page);
  await query(`update "UserShop" set role = 'staff' where id = 'us1'`);
  try {
    await page.goto(SHOP);
    for (const name of ['Overview', 'Bookings', 'Services', 'Account']) {
      await expect(item(page, name), name).toBeVisible();
    }
    for (const name of ['Team', 'Customers', 'Settings']) {
      await expect(item(page, name), name).toHaveCount(0);
    }
    for (const path of ['team', 'customers', 'settings', 'bookings/new', 'invites']) {
      await page.goto(`${SHOP}/${path}`);
      await expect(page, path).toHaveURL(new RegExp(`${SHOP}$`));
    }
  } finally {
    await query(`update "UserShop" set role = 'owner' where id = 'us1'`);
  }
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('top bar shows the shop name; drawer closes on link tap, backdrop tap and Esc', async ({ page }) => {
    await login(page);
    await page.goto(SHOP);
    const menu = page.getByRole('button', { name: 'Open menu' });
    await expect(page.locator('.topbar__title')).toHaveText(/\S/);
    await expect(sidebar(page)).toBeHidden();

    await menu.click();
    await expect(sidebar(page)).toBeVisible();
    await item(page, 'Services').click();
    await expect(page).toHaveURL(new RegExp(`${SHOP}/services$`));
    await expect(sidebar(page)).toBeHidden();

    await menu.click();
    await expect(sidebar(page)).toBeVisible();
    await page.locator('.scrim').click({ position: { x: 380, y: 400 } });
    await expect(sidebar(page)).toBeHidden();

    await menu.click();
    await expect(sidebar(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sidebar(page)).toBeHidden();
  });

  test('account-level pages show the logo in the top bar', async ({ page }) => {
    await login(page);
    await expect(page.locator('.topbar .wordmark')).toBeVisible();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(item(page, 'Dashboard')).toBeVisible();
  });
});
