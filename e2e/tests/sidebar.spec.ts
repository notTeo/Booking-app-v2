import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/** The shop sidebar (the only sidebar): owner vs staff items, the rail and the mobile drawer. */
const SHOP = `/shops/${E2E.shop.slug}`;

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(SHOP);
  // Let the page finish its session refresh before anything navigates again:
  // a reload that aborts the refresh in flight loses the rotated cookie.
  await page.locator('.app-shell').waitFor();
}

const sidebar = (page: Page) => page.locator('aside.sidebar');
const item = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true });

test('shop sidebar: shop items, no account-level items; on Account the sidebar stays as it is', async ({ page }) => {
  await login(page);
  for (const name of ['Overview', 'Bookings', 'Services', 'Team', 'Customers', 'Settings', 'Account']) {
    await expect(item(page, name), name).toBeVisible();
  }
  // Log out is on the Account page only.
  await expect(sidebar(page).getByRole('button', { name: 'Logout' })).toHaveCount(0);
  for (const name of ['Dashboard', 'Shops', 'My invites', 'New Booking']) {
    await expect(item(page, name), name).toHaveCount(0);
  }
  // "Home" is a way out (to the dashboard), not the current page.
  await expect(item(page, 'Home')).toHaveAttribute('href', '/dashboard');
  await expect(item(page, 'Home')).not.toHaveAttribute('aria-current', 'page');
  await item(page, 'Home').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goBack();
  await expect(item(page, 'Overview')).toHaveAttribute('aria-current', 'page');

  await item(page, 'Account').click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(item(page, 'Account')).toHaveAttribute('aria-current', 'page');
  await expect(item(page, 'Home')).toBeVisible();
  await expect(item(page, 'Overview')).toBeVisible();
  await expect(page.locator('header.navbar')).toHaveCount(0);
});

test('Account has no Back to shop button: Overview in the sidebar goes back to the shop', async ({ page }) => {
  await login(page);
  await item(page, 'Account').click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account');
  await expect(page.getByRole('link', { name: 'Back to shop' })).toHaveCount(0);
  await item(page, 'Overview').click();
  await expect(page).toHaveURL(new RegExp(`${SHOP}$`));
});

test('owner can still start a booking from the Bookings page', async ({ page }) => {
  await login(page);
  await page.goto(`${SHOP}/bookings`);
  await page.getByRole('link', { name: 'New Booking' }).click();
  await expect(page).toHaveURL(new RegExp(`${SHOP}/bookings/new$`));
});

test('a manager gets the owner menu and pages, but no way to delete the shop', async ({ page }) => {
  await login(page);
  await query(`update "UserShop" set role = 'manager' where id = 'us1'`);
  try {
    await page.goto(SHOP);
    for (const name of ['Overview', 'Bookings', 'Services', 'Team', 'Customers', 'Settings']) {
      await expect(item(page, name), name).toBeVisible();
    }
    await page.goto(`${SHOP}/settings`);
    await expect(page).toHaveURL(new RegExp(`${SHOP}/settings$`));
    await expect(page.locator('.badge', { hasText: 'Manager' })).toBeVisible();
    // Deleting the shop (on the Plan tab) is the owner's alone.
    await page.getByRole('tab', { name: 'Plan' }).click();
    await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible();
    await expect(page.locator('.card--danger')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Shop', exact: true }).click();
    // Without the owner's permission the settings are view only.
    await expect(page.getByText('View only. The owner can let you edit these settings.')).toBeVisible();
    await expect(page.locator('#detail-name')).toBeDisabled();
    await expect(page.locator('#detail-active')).toBeDisabled();

    // With it they can change and save, but taking the shop offline stays with the owner.
    await query(`update "UserShop" set "canEditShopSettings" = true where id = 'us1'`);
    await page.reload();
    const name = page.locator('#detail-name');
    await expect(name).toBeEnabled();
    const original = await name.inputValue();
    await name.fill(`${original} x`);
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    await name.fill(original);
    await expect(page.locator('#detail-active')).toBeDisabled();
    await expect(page.getByText('Only the owner can change this.')).toBeVisible();
  } finally {
    await query(`update "UserShop" set role = 'owner', "canEditShopSettings" = false where id = 'us1'`);
  }
});

test('staff see the trimmed menu and are redirected away from owner pages', async ({ page }) => {
  await login(page);
  await query(`update "UserShop" set role = 'staff' where id = 'us1'`);
  try {
    await page.goto(SHOP);
    for (const name of ['Home', 'Overview', 'Bookings', 'Services', 'Account']) {
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

  test('top bar: logo left, menu button right; drawer closes on link tap, backdrop tap and Esc', async ({ page }) => {
    await login(page);
    await page.goto(SHOP);
    const menu = page.getByRole('button', { name: 'Open menu' });
    const logo = page.locator('header.navbar .wordmark');
    await expect(logo).toHaveAttribute('href', SHOP);
    expect((await logo.boundingBox())!.x).toBeLessThan((await menu.boundingBox())!.x);
    await expect(sidebar(page)).toBeHidden();

    await menu.click();
    await expect(sidebar(page)).toBeVisible();
    await item(page, 'Services').click();
    await expect(page).toHaveURL(new RegExp(`${SHOP}/services$`));
    await expect(sidebar(page)).toBeHidden();

    await menu.click();
    await expect(sidebar(page)).toBeVisible();
    await page.locator('.scrim').click({ position: { x: 10, y: 400 } });
    await expect(sidebar(page)).toBeHidden();

    await menu.click();
    await expect(sidebar(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sidebar(page)).toBeHidden();
  });

  test('top bar is 90% wide and centred, with the drawer\'s corner radius; the drawer opens from the right', async ({ page }) => {
    await login(page);
    const bar = page.locator('header.navbar');
    const box = (await bar.boundingBox())!;
    expect(box.width).toBeCloseTo(390 * 0.9, 0);
    expect(box.x).toBeCloseTo(390 * 0.05, 0);
    const barRadius = await bar.evaluate((el) => getComputedStyle(el).borderBottomRightRadius);
    expect(parseFloat(barRadius)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(sidebar(page)).toBeVisible();
    await page.waitForTimeout(400);
    const drawer = (await sidebar(page).boundingBox())!;
    expect(Math.round(drawer.x + drawer.width)).toBe(390);
    expect(await sidebar(page).evaluate((el) => getComputedStyle(el).borderBottomLeftRadius)).toBe(barRadius);
    await expect(page.getByRole('separator', { name: 'Resize sidebar' })).toHaveCount(0);
  });

  test('top bar stays slim on a short page, even on a tall screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 1000 });
    await login(page);
    // An unknown shop is the shortest shop page: just the not-found state.
    await page.goto('/shops/no-such-shop');
    await expect(page.getByText('Shop not available')).toBeVisible();
    expect((await page.locator('header.navbar').boundingBox())!.height).toBeLessThan(60);
  });

  test('top bar stays slim and the drawer fits the visible viewport, footer items reachable', async ({ page }) => {
    await login(page);
    expect((await page.locator('header.navbar').boundingBox())!.height).toBeLessThan(60);

    // A short phone screen (browser bars showing): footer must stay on screen.
    await page.setViewportSize({ width: 360, height: 480 });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.waitForTimeout(400);
    const rail = (await sidebar(page).boundingBox())!;
    expect(rail.y).toBe(0);
    expect(Math.round(rail.height)).toBe(480);
    await item(page, 'Account').scrollIntoViewIfNeeded();
    const account = (await item(page, 'Account').boundingBox())!;
    expect(account.y + account.height).toBeLessThanOrEqual(480);
  });
});
