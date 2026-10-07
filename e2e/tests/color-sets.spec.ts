import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';

/**
 * Colour sets: Original, Black & white and Purple, picked with one click in
 * Account > Preferences and remembered on the device. They apply inside the
 * app and on the marketing and login pages (data-palette on <html>); the
 * public booking page is always black and white. The logo's "Be" follows the set.
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
  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account');
}

const palette = (page: Page) => page.locator('html').getAttribute('data-palette');
const pick = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Colours' }).getByRole('button', { name, exact: true });
/** Resolved colours of the logo's "Be" and of the page background. */
const colours = async (page: Page) => {
  // After a reload data-palette is set before React renders, so wait for the logo.
  await page.locator('.wordmark__be').first().waitFor();
  return page.evaluate(() => ({
    be: getComputedStyle(document.querySelector('.wordmark__be')!).color,
    bg: getComputedStyle(document.body).backgroundColor,
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  }));
};

test('one click in Preferences changes the set at once, and it survives a reload', async ({ page }) => {
  await login(page);
  expect(await palette(page)).toBeNull();
  await expect(pick(page, 'Original')).toHaveAttribute('aria-pressed', 'true');
  const original = await colours(page);

  await pick(page, 'Purple').click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'purple');
  await expect(pick(page, 'Purple')).toHaveAttribute('aria-pressed', 'true');
  const purple = await colours(page);
  expect(purple.accent).not.toBe(original.accent);
  expect(purple.be).not.toBe(original.be);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'purple');
  expect(await colours(page)).toEqual(purple);

  await pick(page, 'Black & white').click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'mono');
  const mono = await colours(page);
  expect(mono.be).not.toBe(purple.be);
  expect(mono.be).not.toBe(original.be);

  await pick(page, 'Original').click();
  expect(await palette(page)).toBeNull();
  expect(await colours(page)).toEqual(original);
});

test('the set follows into shop, marketing and login pages, and never onto the public booking page', async ({ page }) => {
  await login(page);
  await pick(page, 'Purple').click();

  await page.goto(SHOP);
  await page.locator('.app-shell').waitFor();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'purple');

  // On a reload too: the pre-paint script sets it before React does.
  for (const path of ['/', '/privacy', '/reset-password']) {
    await page.goto(path);
    await expect(page.locator('html'), path).toHaveAttribute('data-palette', 'purple');
  }

  // The public booking page is black and white whatever the visitor picked.
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'mono');

  // Leaving for a shop's booking page by a link (no reload) swaps the set for the shop's.
  await page.goto('/privacy');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'purple');
  await page.evaluate((slug) => window.history.pushState({}, '', `/${slug}`), E2E.shop.slug);
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'mono');
});

for (const set of ['mono', 'purple'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${set}, ${theme}, 360px: dashboard, shop overview and account fit; the dark set is really dark`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.context().addCookies([{ name: 'palette', value: set, url: E2E.webUrl }]);
      await login(page, theme);
      for (const path of ['/account', '/dashboard', SHOP]) {
        await page.goto(path);
        await page.locator('.app-shell').waitFor();
        await expect(page.locator('html')).toHaveAttribute('data-palette', set);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path}: horizontal overflow`).toBeLessThanOrEqual(0);
      }
      const { bg } = await colours(page);
      const [r, g, b] = bg.match(/\d+/g)!.map(Number);
      const light = (r + g + b) / 3 > 128;
      expect(light).toBe(theme === 'light');
    });
  }
}
