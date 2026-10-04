import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addPendingInvite } from '../support/invites';

/**
 * /dashboard, the one page outside a shop: invite inbox (only with pending
 * invites), "Your shops" with the user's role, Create shop for Pro users, and
 * an empty state. Analytics (owners of 2+ shops) are in dashboard-overview.spec.
 * The seeded owner u1 is Pro and owns one shop (s1, membership us1). Shops
 * added here have ids starting "dash2-" and are deleted after each test.
 */
async function openDashboard(page: Page, theme: 'light' | 'dark' = 'light') {
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
  // Let the page finish its session refresh before anything navigates again.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const inbox = (page: Page) => page.getByRole('region', { name: 'Invitations' });
const shops = (page: Page) => page.getByRole('region', { name: 'Your shops' });
const createShop = (page: Page) => page.getByRole('link', { name: 'Create shop' });
const inviteShop = (n: number) => ({ shopId: `dash2-inv${n}`, slug: `dash2-invited-${n}`, name: `Invited Shop ${n}`, token: `dash2-token-${n}` });

test.afterEach(async () => {
  await query(`delete from "Shop" where id like 'dash2-%'`);
  await query(`update "UserShop" set active = true, role = 'owner' where id = 'us1'`);
  await query(`update "User" set "isPro" = true where id = 'u1'`);
});

test('Your shops: a card with the shop name and my role, linking into the shop', async ({ page }) => {
  await openDashboard(page);
  const card = shops(page).locator('.shop-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('E2E Shop');
  await expect(card).toContainText('Owner');
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/shops/${E2E.shop.slug}$`));
});

test('a staff member sees Staff on the card', async ({ page }) => {
  await query(`update "UserShop" set role = 'staff' where id = 'us1'`);
  await openDashboard(page);
  await expect(shops(page).locator('.shop-card')).toContainText('Staff');
});

test('Create shop: shown to Pro users and opens the form, hidden otherwise', async ({ page }) => {
  await openDashboard(page);
  await createShop(page).click();
  await expect(page).toHaveURL(/\/shops\/new$/);

  await query(`update "User" set "isPro" = false where id = 'u1'`);
  await page.goto('/dashboard');
  await expect(shops(page)).toBeVisible();
  await expect(createShop(page)).toHaveCount(0);
});

test('no pending invites: no invite inbox', async ({ page }) => {
  await openDashboard(page);
  await expect(shops(page)).toBeVisible();
  await expect(inbox(page)).toHaveCount(0);
});

test('invite inbox: who invited me and as what; Accept goes into that shop', async ({ page }) => {
  await addPendingInvite(inviteShop(1));
  await openDashboard(page);
  const card = inbox(page).locator('.shop-card', { hasText: 'Invited Shop 1' });
  await expect(card).toContainText('owner@e2e.test invited you as Staff');
  await card.getByRole('button', { name: 'Accept' }).click();
  await expect(page).toHaveURL(/\/shops\/dash2-invited-1$/);

  // Back on the dashboard: the invite is gone and the shop is listed.
  await page.goto('/dashboard');
  await expect(shops(page).locator('.shop-card', { hasText: 'Invited Shop 1' })).toBeVisible();
  await expect(inbox(page)).toHaveCount(0);
});

test('Decline asks first, then removes the card for good', async ({ page }) => {
  await addPendingInvite(inviteShop(1));
  await addPendingInvite(inviteShop(2));
  await openDashboard(page);
  const card = inbox(page).locator('.shop-card', { hasText: 'Invited Shop 1' });

  await card.getByRole('button', { name: 'Decline' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Decline' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: /decline/i }).click();
  await expect(card).toHaveCount(0);
  await expect(inbox(page).locator('.shop-card', { hasText: 'Invited Shop 2' })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.reload();
  await expect(inbox(page).locator('.shop-card')).toHaveCount(1);
});

test('no shops and no invites: ask your shop owner to invite my email', async ({ page }) => {
  await query(`update "UserShop" set active = false where id = 'us1'`);
  await query(`update "User" set "isPro" = false where id = 'u1'`);
  await openDashboard(page);
  await expect(page.getByRole('heading', { name: "You're not part of a shop yet" })).toBeVisible();
  await expect(page.getByText('Ask your shop owner to invite owner@e2e.test.')).toBeVisible();
  await expect(shops(page)).toHaveCount(0);
  await expect(inbox(page)).toHaveCount(0);
  await expect(createShop(page)).toHaveCount(0);
});

test('no shops but an invite: the inbox, no empty state', async ({ page }) => {
  await query(`update "UserShop" set active = false where id = 'us1'`);
  await addPendingInvite(inviteShop(1));
  await openDashboard(page);
  await expect(inbox(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: "You're not part of a shop yet" })).toHaveCount(0);
});

test('the old /shops and /invites pages are gone', async ({ page }) => {
  await openDashboard(page);
  for (const path of ['/shops', '/invites']) {
    await page.goto(path);
    await expect(page.locator('.shops-grid, .invites-tabs'), path).toHaveCount(0);
    await expect(page.locator('header.navbar'), path).toHaveCount(0);
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`360px, ${theme}: inbox and shop cards fit, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await addPendingInvite(inviteShop(1));
    await openDashboard(page, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(inbox(page)).toBeVisible();
    await expect(shops(page)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    for (const name of ['Accept', 'Decline']) {
      const box = (await inbox(page).getByRole('button', { name }).boundingBox())!;
      expect(box.x + box.width, name).toBeLessThanOrEqual(360);
    }
  });
}
