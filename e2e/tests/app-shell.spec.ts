import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';

/**
 * Pages outside a shop (/dashboard, /account) keep the sidebar, with only the
 * logo, Home and Account. No top bar on desktop; phones get the slim bar with
 * the menu button. Log out lives on the Account page.
 */
const SHOP = `/shops/${E2E.shop.slug}`;
async function login(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.context().addCookies([
    { name: 'lang', value: 'en', url: E2E.webUrl },
    { name: 'theme', value: theme, url: E2E.webUrl },
  ]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto('/dashboard');
  // Let the page finish its session refresh before anything navigates again:
  // a reload that aborts the refresh in flight loses the rotated cookie.
  await page.locator('.app-shell').waitFor();
}

const bar = (page: Page) => page.locator('header.navbar');
const sidebar = (page: Page) => page.locator('aside.sidebar');
const item = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true });
const logout = (page: Page) => page.getByRole('button', { name: 'Log out', exact: true });
const SHOP_ITEMS = ['Overview', 'Bookings', 'Services', 'Team', 'Customers', 'Settings'];

test('outside a shop: the sidebar with only the logo, Home and Account, and no top bar', async ({ page }) => {
  await login(page);
  for (const path of ['/dashboard', '/account']) {
    await page.goto(path);
    await expect(sidebar(page), path).toBeVisible();
    await expect(bar(page), path).toHaveCount(0);
    await expect(sidebar(page).locator('.wordmark'), path).toBeVisible();
    await expect(sidebar(page).getByRole('link'), path).toHaveCount(2);
    await expect(item(page, 'Home'), path).toHaveAttribute('href', '/dashboard');
    await expect(item(page, 'Account'), path).toHaveAttribute('href', '/account');
    await expect(sidebar(page).locator('.sidebar__title'), path).toHaveCount(0);
  }
});

test('the sidebar stays in place going shop -> Account -> Home; only the shop links come and go', async ({ page }) => {
  await login(page);
  await page.goto(SHOP);
  for (const name of SHOP_ITEMS) await expect(item(page, name), name).toBeVisible();
  const box = (await sidebar(page).boundingBox())!;

  await item(page, 'Account').click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(item(page, 'Account')).toHaveAttribute('aria-current', 'page');
  await expect(sidebar(page).getByRole('link')).toHaveCount(2);
  expect(await sidebar(page).boundingBox()).toEqual(box);

  await item(page, 'Home').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(item(page, 'Home')).toHaveAttribute('aria-current', 'page');
  expect(await sidebar(page).boundingBox()).toEqual(box);
  await expect(bar(page)).toHaveCount(0);
});

test('the sidebar has no Logout; Log out on the Account page signs out and protected pages send you to login', async ({ page }) => {
  await login(page);
  await expect(sidebar(page).getByRole('button')).toHaveCount(0);
  await page.goto('/account');
  await logout(page).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`360px, ${theme}: slim bar with the menu button on dashboard and account, drawer opens, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    for (const path of ['/dashboard', '/account']) {
      await page.goto(path);
      await expect(bar(page)).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll, path).toBeLessThanOrEqual(360);
      const menu = page.getByRole('button', { name: 'Open menu' });
      for (const control of [bar(page).locator('.wordmark'), menu]) {
        const box = (await control.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(360);
      }
      await menu.click();
      await expect(item(page, 'Account'), path).toBeVisible();
      await expect(item(page, 'Home'), path).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(sidebar(page), path).not.toHaveClass(/is-open/);
    }
  });
}

test('the logo\'s "Be" is brand orange in the sidebar and plain text colour when muted', async ({ page }) => {
  await login(page);
  const be = sidebar(page).locator('.wordmark__be');
  const [beColor, brand] = await be.evaluate((el) => {
    // Resolve the token to rgb() the same way the browser resolves the logo.
    const probe = document.createElement('span');
    probe.style.color = 'var(--brand-accent)';
    el.parentElement!.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return [getComputedStyle(el).color, resolved];
  });
  expect(beColor).toBe(brand);

  await page.goto('/account');
  await logout(page).click();
  await expect(page).toHaveURL(/\/login$/);
  const muted = page.locator('.wordmark--muted .wordmark__be');
  const [mutedColor, around] = await muted.evaluate((el) => [
    getComputedStyle(el).color,
    getComputedStyle(el.parentElement!).color,
  ]);
  expect(mutedColor).toBe(around);
});
