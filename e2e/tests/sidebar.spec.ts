import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/** Sidebar levels, owner vs staff items, and the mobile drawer. */
const SHOP = `/shops/${E2E.shop.slug}`;

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  // The owner's landing depends on how many shops the test left active.
  await page.goto('/dashboard');
}

const sidebar = (page: Page) => page.locator('aside.sidebar');
const item = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true });

test('level 1 -> shop (level 2) -> account returns to level 1', async ({ page }) => {
  await login(page);
  await expect(item(page, 'Dashboard')).toBeVisible();
  await expect(item(page, 'Shops')).toBeVisible();
  await expect(item(page, 'My invites')).toBeVisible();
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
    for (const path of ['team', 'customers', 'settings', 'bookings/new']) {
      await page.goto(`${SHOP}/${path}`);
      await expect(page, path).toHaveURL(new RegExp(`${SHOP}$`));
    }
  } finally {
    await query(`update "UserShop" set role = 'owner' where id = 'us1'`);
  }
});

test('desktop rail has rounded right corners and can be resized by dragging its edge', async ({ page }) => {
  await login(page);
  const rail = sidebar(page);
  const radius = await rail.evaluate((el) => getComputedStyle(el).borderTopRightRadius);
  expect(parseFloat(radius)).toBeGreaterThan(0);

  const handle = page.getByRole('separator', { name: 'Resize sidebar' });
  expect(await handle.evaluate((el) => getComputedStyle(el).cursor)).toBe('col-resize');
  const before = (await rail.boundingBox())!.width;
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, 300);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, 300, { steps: 5 });
  await page.mouse.up();
  expect((await rail.boundingBox())!.width).toBeGreaterThan(before + 60);

  // Remembered across a reload, and the keyboard works too.
  await page.reload();
  expect((await rail.boundingBox())!.width).toBeGreaterThan(before + 60);
  await handle.focus();
  const wide = (await rail.boundingBox())!.width;
  await page.keyboard.press('ArrowLeft');
  expect((await rail.boundingBox())!.width).toBeLessThan(wide);
  await handle.dblclick();
  expect(Math.round((await rail.boundingBox())!.width)).toBe(256);
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

  test('closed top bar is as wide as the open drawer, with the same corner radius', async ({ page }) => {
    await login(page);
    const bar = page.locator('.topbar');
    const barWidth = (await bar.boundingBox())!.width;
    const barRadius = await bar.evaluate((el) => getComputedStyle(el).borderBottomRightRadius);
    expect(parseFloat(barRadius)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(sidebar(page)).toBeVisible();
    await page.waitForTimeout(400);
    expect((await sidebar(page).boundingBox())!.width).toBeCloseTo(barWidth, 0);
    expect(await sidebar(page).evaluate((el) => getComputedStyle(el).borderBottomRightRadius)).toBe(barRadius);
    await expect(page.getByRole('separator', { name: 'Resize sidebar' })).toHaveCount(0);
  });

  test('top bar stays slim on a short page, even on a tall screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 1000 });
    await login(page);
    await page.goto('/shops');
    await expect(page.getByRole('heading', { name: /shops/i }).first()).toBeVisible();
    expect((await page.locator('.topbar').boundingBox())!.height).toBeLessThan(52);
  });

  test('top bar stays slim and the drawer fits the visible viewport, footer items reachable', async ({ page }) => {
    await login(page);
    expect((await page.locator('.topbar').boundingBox())!.height).toBeLessThan(52);

    // A short phone screen (browser bars showing): footer must stay on screen.
    await page.setViewportSize({ width: 360, height: 480 });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.waitForTimeout(400);
    const rail = (await sidebar(page).boundingBox())!;
    expect(rail.y).toBe(0);
    expect(Math.round(rail.height)).toBe(480);
    await sidebar(page).getByRole('button', { name: 'Logout' }).scrollIntoViewIfNeeded();
    const logout = (await sidebar(page).getByRole('button', { name: 'Logout' }).boundingBox())!;
    expect(logout.y + logout.height).toBeLessThanOrEqual(480);
  });

  test('account-level pages show the logo in the top bar', async ({ page }) => {
    await login(page);
    await expect(page.locator('.topbar .wordmark')).toBeVisible();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(item(page, 'Dashboard')).toBeVisible();
  });
});
