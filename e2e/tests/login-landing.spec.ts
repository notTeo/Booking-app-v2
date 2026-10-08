import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';
import { addPendingInvite as seedInvite } from '../support/invites';

/**
 * Where login lands (PublicRoute + utils/landing.ts): a safe ?redirect= first,
 * then pending invites -> /dashboard, no shop -> /shops/new, exactly one shop
 * -> that shop, otherwise /dashboard. The seeded owner (u1) has one shop, s1. Extra shops here all
 * have ids starting "land-" and are deleted after each test (cascading their
 * memberships and invites).
 */
const SHOP = `/shops/${E2E.shop.slug}`;
const INVITE_TOKEN = 'e2e-landing-invite-token';

async function submitLogin(page: Page, path = '/login') {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(path);
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
}

async function addShop(id: string, slug: string) {
  await query(
    `insert into "Shop"(id,name,slug,timezone,"maxAdvanceDays","updatedAt")
     values ($1,$2,$3,'Europe/Athens',730,now())`,
    [id, `Landing ${id}`, slug],
  );
}

/** A second shop the owner is a member of. */
async function addSecondShop() {
  await addShop('land-s2', 'land-second');
  await query(
    `insert into "UserShop"(id,"userId","shopId",role,name,email)
     values ('land-us2','u1','land-s2','staff','E2E Owner','owner@e2e.test')`,
  );
}

/** A pending invite for the owner's email into a shop they are not in yet. */
const addPendingInvite = () =>
  seedInvite({ shopId: 'land-inv', slug: 'land-invited', name: 'Landing land-inv', token: INVITE_TOKEN });

test.afterEach(async () => {
  await query(`delete from "Shop" where id like 'land-%'`);
  await query(`update "UserShop" set active = true where id = 'us1'`);
});

test('one shop: login lands inside it', async ({ page }) => {
  await submitLogin(page);
  await expect(page).toHaveURL(new RegExp(`${SHOP}$`));
});

test('two shops: login lands on the dashboard', async ({ page }) => {
  await addSecondShop();
  await submitLogin(page);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('a pending invite wins over a single shop: login lands on the dashboard', async ({ page }) => {
  await addPendingInvite();
  await submitLogin(page);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('no shops and no invites: login lands on the start of the new-shop flow', async ({ page }) => {
  await query(`update "UserShop" set active = false where id = 'us1'`);
  await submitLogin(page);
  await expect(page).toHaveURL(/\/shops\/new$/);
});

test('an invite opened while logged out survives the login and can be accepted', async ({ page }) => {
  await addPendingInvite();
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/invite?token=${INVITE_TOKEN}`);
  await page.getByRole('link', { name: 'Log In to Accept' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);

  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();

  await expect(page).toHaveURL(new RegExp(`/invite\\?token=${INVITE_TOKEN}$`));
  await page.getByRole('button', { name: 'Accept Invitation' }).click();
  await expect(page).toHaveURL(/\/shops\/land-invited$/);
});

test('an in-app ?redirect= is honoured', async ({ page }) => {
  await submitLogin(page, `/login?redirect=${encodeURIComponent(`${SHOP}/services`)}`);
  await expect(page).toHaveURL(new RegExp(`${SHOP}/services$`));
});

for (const evil of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
  test(`an off-site ?redirect= (${evil}) is ignored`, async ({ page }) => {
    await submitLogin(page, `/login?redirect=${encodeURIComponent(evil)}`);
    await expect(page).toHaveURL(new RegExp(`^${E2E.webUrl}${SHOP}$`));
  });
}

test('visiting /dashboard directly never bounces into the only shop', async ({ page }) => {
  await submitLogin(page);
  await expect(page).toHaveURL(new RegExp(`${SHOP}$`));
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('opening /login with a live session goes straight to the landing page', async ({ page }) => {
  await submitLogin(page);
  await expect(page).toHaveURL(new RegExp(`${SHOP}$`));
  await page.goto('/login');
  await expect(page).toHaveURL(new RegExp(`${SHOP}$`));
});
