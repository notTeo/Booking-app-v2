import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';

/**
 * Deactivating a member switches both bookable toggles off; reactivating must
 * switch both back on, and the page must show what the server saved rather
 * than the stale toggles it had before the save.
 */
test.beforeAll(async () => {
  await query(
    `insert into "UserShop"(id,"shopId",role,name) values ('us-react','s1','staff','React Member')
     on conflict (id) do nothing`,
  );
});

test.afterAll(async () => {
  await query(`delete from "UserShop" where id = 'us-react'`);
});

const toggle = (page: Page, name: string) => page.getByRole('switch', { name, exact: true });
const flip = (page: Page, name: string) =>
  page.locator('label.switch').filter({ has: toggle(page, name) }).click();

test('reactivating a member in the UI turns both bookable switches back on', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  await page.goto(`/shops/${E2E.shop.slug}/team/us-react`);

  await expect(toggle(page, 'Bookable by customers')).toBeChecked();
  await expect(toggle(page, 'Bookable internally')).toBeChecked();

  // deactivate → both bookable switches go off
  await flip(page, 'Active');
  await expect(toggle(page, 'Bookable by customers')).not.toBeChecked();
  await page.getByRole('button', { name: 'Save Role' }).click();
  await expect(page.getByText('Role updated successfully.')).toBeVisible();
  await expect(toggle(page, 'Active')).not.toBeChecked();
  await expect(toggle(page, 'Bookable by customers')).not.toBeChecked();
  await expect(toggle(page, 'Bookable internally')).not.toBeChecked();

  // reactivate → after save both show on, as the server stored them
  await flip(page, 'Active');
  await page.getByRole('button', { name: 'Save Role' }).click();
  await expect(page.getByText('Role updated successfully.')).toBeVisible();
  await expect(toggle(page, 'Active')).toBeChecked();
  await expect(toggle(page, 'Bookable by customers')).toBeChecked();
  await expect(toggle(page, 'Bookable internally')).toBeChecked();

  const [row] = await query<{ bookableByCustomers: boolean; bookableInternally: boolean }>(
    `select "bookableByCustomers","bookableInternally" from "UserShop" where id = 'us-react'`,
  );
  expect(row).toEqual({ bookableByCustomers: true, bookableInternally: true });
});
