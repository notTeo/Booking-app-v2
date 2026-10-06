import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/**
 * Plans: the pricing page shows Solo, Team and Business; a shop at its staff
 * limit cannot add members; a locked shop (no subscription) is read-only with
 * a banner, and its public page takes no bookings. The seeded shop s1 is
 * active on Team with one bookable member (the owner); each test puts it back.
 */
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function signIn(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.context().addCookies([
    { name: 'lang', value: 'en', url: E2E.webUrl },
    { name: 'theme', value: theme, url: E2E.webUrl },
  ]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
}

test.afterEach(async () => {
  await query(`update "Shop" set plan = 'TEAM', "subscriptionStatus" = 'ACTIVE', "trialEndsAt" = null where id = 's1'`);
});

test('pricing page: three plans with their prices, and a column for each in the tables', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/pricing');
  const cards = page.locator('.home-price-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Solo');
  await expect(cards.nth(0).locator('.amount')).toHaveText('19');
  await expect(cards.nth(1)).toContainText('Team');
  await expect(cards.nth(1).locator('.amount')).toHaveText('35');
  await expect(cards.nth(2)).toContainText('Business');
  await expect(cards.nth(2).locator('.amount')).toHaveText('59');
  // Yearly: ten months' price for the year.
  await page.getByRole('tab', { name: /^Yearly/ }).click();
  await expect(cards.locator('.amount')).toHaveText(['190', '350', '590']);
  await expect(cards.nth(0)).toContainText('/year');
  await page.getByRole('tab', { name: 'Monthly' }).click();
  await expect(cards.locator('.amount')).toHaveText(['19', '35', '59']);
  await expect(page.locator('.data-table').first().locator('thead th')).toHaveText(['Feature', 'Solo', 'Team', 'Business']);
  await expect(page.getByText('30-day free trial')).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`360px, ${theme}: pricing page and home pricing fit, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.context().addCookies([
      { name: 'lang', value: 'el', url: E2E.webUrl },
      { name: 'theme', value: theme, url: E2E.webUrl },
    ]);
    await page.goto('/pricing');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.home-price-card')).toHaveCount(3);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.goto('/');
    await expect(page.locator('#pricing .home-price-card')).toHaveCount(3);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test(`360px, ${theme}: a locked shop shows the read-only banner and its plan, and fits`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await query(`update "Shop" set "subscriptionStatus" = 'INACTIVE' where id = 's1'`);
    await signIn(page, theme);
    await page.goto(`/shops/${E2E.shop.slug}/settings`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByText('This shop is read-only', { exact: true })).toBeVisible();
    const plan = page.locator('.card', { has: page.getByRole('heading', { name: 'Plan', exact: true }) });
    await expect(plan.locator('.badge')).toHaveText('Team');
    await expect(plan).toContainText('There is no active subscription.');
    await expect(plan).toContainText('Up to 5 bookable staff.');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

test('an active shop has no banner; its plan card says the subscription is active', async ({ page }) => {
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/settings`);
  const plan = page.locator('.card', { has: page.getByRole('heading', { name: 'Plan', exact: true }) });
  await expect(plan).toContainText('The subscription is active.');
  await expect(page.getByText('This shop is read-only', { exact: true })).toHaveCount(0);
});

test('a trial about to end is announced to the owner', async ({ page }) => {
  await query(`update "Shop" set "subscriptionStatus" = 'TRIALING', "trialEndsAt" = now() + interval '3 days' where id = 's1'`);
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/settings`);
  await expect(page.getByText(/^Your free trial ends on /)).toBeVisible();
  await expect(page.getByText(/^Free trial until /)).toBeVisible();
});

test('Solo at its staff limit: Add member is disabled and the page says why', async ({ page }) => {
  await query(`update "Shop" set plan = 'SOLO' where id = 's1'`);
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/team`);
  await expect(page.getByText('The Solo plan allows up to 1 bookable staff. Adding more needs an upgrade.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Team Member' })).toBeDisabled();
});

test('a locked shop: the public page shows the shop but offers no booking', async ({ page }) => {
  await query(`update "Shop" set "subscriptionStatus" = 'INACTIVE' where id = 's1'`);
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Online booking is not available right now')).toBeVisible();
  await expect(page.getByRole('radiogroup')).toHaveCount(0);
});
