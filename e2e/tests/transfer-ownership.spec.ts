import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/**
 * The owner hands the shop to a manager from that manager's team page: the
 * manager becomes the owner, and the old owner stays on as a manager who can
 * no longer delete the shop. The owner's own row never offers Remove.
 */
const SHOP = `/shops/${E2E.shop.slug}`;

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
}

test.beforeEach(async () => {
  await query(
    `insert into "User"(id,name,email,"isVerified","updatedAt") values ('xfer-u','Mina Manager','mina@e2e.test',true,now())`,
  );
  await query(
    `insert into "UserShop"(id,"userId","shopId",role,name,email)
     values ('xfer-us','xfer-u','s1','manager','Mina Manager','mina@e2e.test')`,
  );
});

test.afterEach(async () => {
  await query(`delete from "UserShop" where id = 'xfer-us'`);
  await query(`delete from "User" where id = 'xfer-u'`);
  await query(
    `update "UserShop" set role = 'owner', "canManageManagers" = false, "canEditShopSettings" = false where id = 'us1'`,
  );
});

const permissionSwitch = (page: Page, name: string) =>
  page.locator('label.switch').filter({ has: page.getByRole('switch', { name, exact: true }) });

test('the owner switches a manager\'s permissions on their profile; both start off', async ({ page }) => {
  await login(page);
  await page.goto(`${SHOP}/team/xfer-us`);
  for (const name of ['Manage managers', 'Edit shop settings']) {
    await expect(page.getByRole('switch', { name, exact: true })).not.toBeChecked();
  }

  await permissionSwitch(page, 'Edit shop settings').click();
  await page.getByRole('button', { name: 'Save Role' }).click();
  await expect
    .poll(async () => (await query(`select "canManageManagers" m, "canEditShopSettings" s from "UserShop" where id = 'xfer-us'`))[0])
    .toEqual({ m: false, s: true });
});

test('a manager without "Manage managers" sees other managers read-only and can only add staff', async ({ page }) => {
  await query(`update "UserShop" set role = 'manager' where id = 'us1'`);
  await login(page);
  await page.goto(`${SHOP}/team`);
  const managerRow = page.getByRole('row').filter({ hasText: 'mina@e2e.test' });
  await expect(managerRow).toBeVisible();
  await expect(managerRow.getByRole('button', { name: 'Remove' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Team Member' }).click();
  const options = page.getByRole('dialog', { name: 'Add Team Member' }).getByLabel('Role').locator('option');
  await expect(options).toHaveText(['Staff']);
  await page.keyboard.press('Escape');

  await page.goto(`${SHOP}/team/xfer-us`);
  await expect(page.locator('.team-member-card .badge').first()).toHaveText('Manager');
  await expect(page.getByLabel('Role')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Manage managers', exact: true })).toHaveCount(0);
  await expect(page.locator('.card--danger')).toHaveCount(0);
});

test('the owner transfers the shop to a manager and becomes a manager', async ({ page }) => {
  await login(page);
  await page.goto(`${SHOP}/team/xfer-us`);
  await expect(page.locator('.team-member-card .badge').first()).toHaveText('Manager');

  await page.getByRole('button', { name: 'Transfer ownership' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('Transfer the shop to Mina Manager?');
  await confirm.getByRole('button', { name: 'Transfer ownership' }).click();

  await expect(page.locator('.team-member-card .badge').first()).toHaveText('Owner');
  // No longer the owner: nothing left to transfer, and the new owner's row is locked.
  await expect(page.getByRole('button', { name: 'Transfer ownership' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);

  const roles = await query(`select id, role from "UserShop" where id in ('us1','xfer-us') order by id`);
  expect(roles).toEqual([
    { id: 'us1', role: 'manager' },
    { id: 'xfer-us', role: 'owner' },
  ]);

  await page.goto(`${SHOP}/settings`);
  await expect(page.locator('.badge', { hasText: 'Manager' })).toBeVisible();
  await expect(page.locator('.card--danger')).toHaveCount(0);
});

test('the owner row offers no Remove, on the team list or on its own page', async ({ page }) => {
  await login(page);
  await page.goto(`${SHOP}/team`);
  const ownerRow = page.getByRole('row').filter({ hasText: 'owner@e2e.test' });
  await expect(ownerRow.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(
    page.getByRole('row').filter({ hasText: 'mina@e2e.test' }).getByRole('button', { name: 'Remove' }),
  ).toBeVisible();

  await page.goto(`${SHOP}/team/us1`);
  await expect(page.locator('.team-member-card .badge').first()).toHaveText('Owner');
  await expect(page.getByLabel('Role')).toHaveCount(0);
  await expect(page.locator('.card--danger')).toHaveCount(0);
});
