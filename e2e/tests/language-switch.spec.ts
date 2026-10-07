import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';

// The login pages and the public booking page are Greek by default and carry
// a Greek / English switch; the choice is kept in the "lang" cookie.

const lang = (page: Page) => page.getByRole('group', { name: /Γλώσσα|Language/ });

test('the login page is Greek by default and switches to English and back', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Σύνδεση' })).toBeVisible();
  await expect(page.getByText('Να με θυμάσαι')).toBeVisible();

  await lang(page).getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // Kept across pages and a reload.
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();

  await lang(page).getByRole('button', { name: 'ΕΛ' }).click();
  await expect(page.getByRole('heading', { name: 'Ξεχάσατε τον Κωδικό' })).toBeVisible();
});

test('the public booking page has the switch, and its settings preview does not', async ({ page }) => {
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByRole('heading', { name: 'Διάλεξε υπηρεσία' })).toBeVisible();
  await lang(page).getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a service' })).toBeVisible();

  await page.goto(`/${E2E.shop.slug}?palette=rose`);
  await expect(page.getByRole('heading', { name: 'Choose a service' })).toBeVisible();
  await expect(lang(page)).toHaveCount(0);
});

test('360px: the switch fits on the login card', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/login');
  await expect(lang(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('just visiting sets no preference cookies; picking a language or theme does', async ({ page }) => {
  const names = async () => (await page.context().cookies()).map((c) => c.name);

  await page.goto('/');
  await expect(page.locator('#root > *').first()).toBeVisible();
  await page.goto('/login');
  await expect(page.locator('#email')).toBeVisible();
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByRole('checkbox').first()).toBeVisible();
  expect(await names()).toEqual([]);

  await lang(page).getByRole('button', { name: 'EN' }).click();
  expect(await names()).toEqual(['lang']);

  await page.goto('/');
  await page.locator('.home-nav-right .home-nav-toggle').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect((await names()).sort()).toEqual(['lang', 'theme']);
  // Kept on a reload.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
