import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';

// The public booking page lives at /<slug>. Static routes must never be
// shadowed by it, and anything that isn't a real shop must be a real 404.

test('the shop booking page is served at /<slug>', async ({ page }) => {
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByRole('checkbox').first()).toBeVisible();
});

test('the old /p/<slug> link redirects to /<slug>', async ({ page }) => {
  await page.goto(`/p/${E2E.shop.slug}`);
  await expect(page).toHaveURL(`${E2E.webUrl}/${E2E.shop.slug}`);
  await expect(page.getByRole('checkbox').first()).toBeVisible();
});

test('static routes are not shadowed by /:slug', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('.legal-page h1')).toBeVisible();
  await page.goto('/login');
  await expect(page.locator('#email')).toBeVisible();
});

test('an unknown slug shows the real 404 page', async ({ page }) => {
  await page.goto('/no-such-shop');
  await expect(page.locator('.empty__code')).toBeVisible();
});

test('a path that cannot be a slug is a 404 without asking the API', async ({ page }) => {
  let apiCalls = 0;
  page.on('request', (r) => {
    if (r.url().startsWith(E2E.apiUrl) && r.url().includes('/public/')) apiCalls++;
  });
  await page.goto('/not_a_slug');
  await expect(page.locator('.empty__code')).toBeVisible();
  expect(apiCalls).toBe(0);
});
