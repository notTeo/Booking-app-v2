import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/**
 * A customer's own duration for a service is set on their page, and the
 * customers list can be narrowed to the customers who have one.
 */
test.beforeAll(async () => {
  await query(
    `insert into "Service"(id,"shopId",name,duration,price,"updatedAt")
     values ('sv-dur','s1','Duration Service',30,1000,now()) on conflict (id) do nothing`,
  );
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
     values ('cust-dur','s1','Slow Sam','6900008801',now()),
            ('cust-plain','s1','Plain Pat','6900008802',now()) on conflict (id) do nothing`,
  );
});

test.afterAll(async () => {
  await query(`delete from "Customer" where id in ('cust-dur','cust-plain')`);
  await query(`delete from "Service" where id = 'sv-dur'`);
});

test('set a custom duration, then filter the customers list by it', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/customers/cust-dur`);
  const card = page.locator('.card').filter({ hasText: 'Service durations' });
  const save = card.getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled();

  const field = card.getByLabel('Duration Service');
  await field.fill('0');
  await expect(card.getByRole('alert')).toContainText('whole number of minutes');
  await expect(save).toBeDisabled();

  await field.fill('45');
  await save.click();
  await expect(card).toContainText('Durations saved.');
  expect(
    await query(`select duration from "CustomerServiceDuration" where "customerId" = 'cust-dur' and "serviceId" = 'sv-dur'`),
  ).toEqual([{ duration: 45 }]);

  // Saved value survives a reload.
  await page.reload();
  await expect(page.locator('.card').filter({ hasText: 'Service durations' }).getByLabel('Duration Service')).toHaveValue('45');

  await page.goto(`/shops/${E2E.shop.slug}/customers`);
  await expect(page.getByRole('link', { name: 'Plain Pat' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Slow Sam' })).toContainText('Custom duration');

  await page.getByRole('button', { name: 'Custom durations' }).click();
  await expect(page.getByRole('link', { name: 'Slow Sam' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Plain Pat' })).toHaveCount(0);
});
