import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/**
 * A service with bookings can't be deleted: the owner gets the reason and is
 * offered "Deactivate" instead. A service without bookings is deleted.
 */
test.beforeAll(async () => {
  await query(
    `insert into "Service"(id,"shopId",name,duration,price,"updatedAt")
     values ('sv-booked','s1','Booked Service',30,1000,now()),
            ('sv-empty','s1','Empty Service',30,1000,now())
     on conflict (id) do nothing`,
  );
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
     values ('cust-svdel','s1','Svc Del','6900009999',now()) on conflict (id) do nothing`,
  );
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime","updatedAt")
     values ('bk-svdel','s1','cust-svdel','sv-booked','us1','2030-01-07 08:00+00','2030-01-07 08:30+00',now())
     on conflict (id) do nothing`,
  );
});

test.afterAll(async () => {
  await query(`delete from "Booking" where id = 'bk-svdel'`);
  await query(`delete from "Customer" where id = 'cust-svdel'`);
  await query(`delete from "Service" where id in ('sv-booked','sv-empty')`);
});

test('deleting a booked service offers Deactivate; an unbooked one is deleted', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/services`);

  const row = (name: string) => page.locator('li, .card, .service-card').filter({ hasText: name }).last();

  // unbooked: deleted
  await row('Empty Service').getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete service' }).click();
  await expect(page.getByText('Empty Service')).toHaveCount(0);

  // booked: refused, then offered Deactivate
  await row('Booked Service').getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete service' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('This service has bookings. Deactivate it instead');
  await dialog.getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(row('Booked Service')).toContainText('Inactive');

  const [svc] = await query<{ isActive: boolean }>(`select "isActive" from "Service" where id = 'sv-booked'`);
  expect(svc.isActive).toBe(false);
  expect(await query(`select 1 from "Booking" where id = 'bk-svdel'`)).toHaveLength(1);
});
