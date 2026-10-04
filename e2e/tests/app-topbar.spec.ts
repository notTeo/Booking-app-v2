import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';

/**
 * Pages outside a shop (/dashboard, /account): no sidebar, only the app
 * navbar: logo -> /dashboard, then icon-only Account and Logout with tooltips.
 */
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
const account = (page: Page) => bar(page).getByRole('link', { name: 'Account', exact: true });
const logout = (page: Page) => bar(page).getByRole('button', { name: 'Logout', exact: true });
const bubble = (page: Page, text: string) => bar(page).locator('.tooltip__bubble', { hasText: text });

test('outside a shop there is no sidebar, only the top bar', async ({ page }) => {
  await login(page);
  for (const path of ['/dashboard', '/account']) {
    await page.goto(path);
    await expect(bar(page), path).toBeVisible();
    await expect(page.locator('aside.sidebar'), path).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' }), path).toHaveCount(0);
  }
});

test('logo goes to the dashboard, Account to /account (marked current)', async ({ page }) => {
  await login(page);
  await account(page).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(account(page)).toHaveAttribute('aria-current', 'page');

  await bar(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(account(page)).not.toHaveAttribute('aria-current', 'page');
});

test('Logout signs out and protected pages send you to login', async ({ page }) => {
  await login(page);
  await logout(page).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('icon buttons show a tooltip on hover and on keyboard focus; Esc hides it', async ({ page }) => {
  await login(page);
  await expect(bubble(page, 'Account')).toBeHidden();

  await account(page).hover();
  await expect(bubble(page, 'Account')).toBeVisible();
  await page.mouse.move(5, 400);
  await expect(bubble(page, 'Account')).toBeHidden();

  // Tab from the logo: Account, then Logout.
  await bar(page).getByRole('link', { name: 'Dashboard' }).focus();
  await page.keyboard.press('Tab');
  await expect(account(page)).toBeFocused();
  await expect(bubble(page, 'Account')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bubble(page, 'Account')).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(logout(page)).toBeFocused();
  await expect(bubble(page, 'Logout')).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`360px, ${theme}: everything fits, no horizontal scroll, tooltip stays on screen`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    for (const path of ['/dashboard', '/account']) {
      await page.goto(path);
      await expect(bar(page)).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll, path).toBeLessThanOrEqual(360);
      for (const control of [bar(page).getByRole('link', { name: 'Dashboard' }), account(page), logout(page)]) {
        const box = (await control.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(360);
      }
    }

    await logout(page).hover();
    const tip = bubble(page, 'Logout');
    await expect(tip).toBeVisible();
    const box = (await tip.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(360);

    // Inverted colours from tokens: the bubble's background is the theme's text colour.
    const [bg, text] = await tip.evaluate((el) => [
      getComputedStyle(el).backgroundColor,
      getComputedStyle(document.body).color,
    ]);
    expect(bg).toBe(text);
  });
}

test('the logo\'s "Be" is brand orange in the top bar and plain text colour when muted', async ({ page }) => {
  await login(page);
  const be = bar(page).locator('.wordmark__be');
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

  await bar(page).getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const muted = page.locator('.brand-wordmark--muted .wordmark__be');
  const [mutedColor, around] = await muted.evaluate((el) => [
    getComputedStyle(el).color,
    getComputedStyle(el.parentElement!).color,
  ]);
  expect(mutedColor).toBe(around);
});
