import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/**
 * A shop picks the colours and font of its public booking page in its
 * settings. The preview there shows the look being tried; customers only get
 * it once it is saved. Black and white with the standard fonts is the default.
 */
const html = (page: { locator: (s: string) => ReturnType<import('@playwright/test').Page['locator']> }) =>
  page.locator('html');

test.afterAll(async () => {
  await query(`update "Shop" set "publicPalette" = 'mono', "publicFont" = 'default'`);
});

test('the look picked in settings is previewed, then applied to the public page', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);

  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(html(page)).toHaveAttribute('data-palette', 'mono');
  await expect(html(page)).not.toHaveAttribute('data-font', /.+/);

  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/settings`);

  const card = page.locator('.card', { has: page.getByRole('heading', { name: 'Booking page look' }) });
  const save = card.getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled();
  await card.getByRole('button', { name: 'Rose' }).click();
  await card.getByLabel('Font').selectOption('manrope');

  // The preview is the real page with the unsaved look.
  const preview = page.frameLocator('iframe[title="Preview"]');
  await expect(preview.locator('html')).toHaveAttribute('data-palette', 'rose');
  await expect(preview.locator('html')).toHaveAttribute('data-font', 'manrope');
  await expect(card.getByText('Not saved yet')).toBeVisible();

  // Not saved: customers still get the old look.
  const visitor = await context.newPage();
  await visitor.goto(`/${E2E.shop.slug}`);
  await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(html(visitor)).toHaveAttribute('data-palette', 'mono');

  await save.click();
  await expect(card.getByText('The look was saved.')).toBeVisible();

  await visitor.reload();
  await expect(html(visitor)).toHaveAttribute('data-palette', 'rose');
  await expect(html(visitor)).toHaveAttribute('data-font', 'manrope');
  await expect
    .poll(() => visitor.evaluate(() => getComputedStyle(document.body).fontFamily))
    .toContain('Manrope');
});

test('a shop with one provider does not offer "No preference"', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/${E2E.shop.slug}`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  const providers = page.getByRole('radiogroup').getByRole('radio');
  await expect(providers).toHaveCount(1);
  await expect(page.getByText('No preference')).toHaveCount(0);
});
