import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * Two customers with one phone number are probably one person. The shop sees
 * them marked in the customer list (with a filter for them) and on the newer
 * one's booking, and merges the newer record into the older from either page.
 */
const PHONE = '+306900008850';
// A day no other spec books on.
const date = addDays(athensDate(), 33);

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function seed() {
  await query(`delete from "Customer" where id in ('cust-same-old','cust-same-new')`);
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"createdAt","updatedAt") values
       ('cust-same-old','s1','Olga Older',$1,now() - interval '30 days',now()),
       ('cust-same-new','s1','Nora Newer',$1,now(),now())`,
    [PHONE],
  );
  const start = athensWallClockToUtc(date, '10:00');
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime","updatedAt")
     values ('bk-same','s1','cust-same-new','sv1','us1',$1,$2,now())`,
    [start.toISOString(), new Date(start.getTime() + 30 * 60_000).toISOString()],
  );
}

test.afterAll(async () => {
  await query(`delete from "Customer" where id in ('cust-same-old','cust-same-new')`);
});

for (const theme of ['light', 'dark'] as const) {
  test(`customers sharing a phone are marked, filtered and merged into the older one (${theme})`, async ({ page, context }) => {
    await seed();
    await context.addCookies([
      { name: 'lang', value: 'en', url: E2E.webUrl },
      { name: 'theme', value: theme, url: E2E.webUrl },
    ]);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/login');
    await page.locator('#email').fill(E2E.owner.email);
    await page.locator('#password').fill(E2E.owner.password);
    await page.locator('button[type=submit]').click();
    await waitForLanding(page);

    // The booking of the newer record carries the mark, in the calendar and in its details.
    await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${date}`);
    const block = page.locator('.cal-block').filter({ hasText: 'Nora Newer' });
    await expect(block.getByText('Same phone')).toBeAttached();
    await block.click();
    await expect(page.getByRole('dialog').getByText('Same phone')).toBeVisible();
    await page.keyboard.press('Escape');

    // The list marks both, and the filter leaves only them, the older first.
    await page.goto(`/shops/${E2E.shop.slug}/customers`);
    await page.getByRole('button', { name: 'Same phone (2)' }).click();
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Olga Older');
    await expect(rows.nth(1)).toContainText('Nora Newer');
    await expect(rows.nth(1).getByText('Same phone')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    // The newer record offers to be merged into the older one.
    await rows.nth(1).getByRole('link', { name: 'Nora Newer' }).click();
    await expect(page.getByText('+30 690 000 8850 is on another record too')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole('button', { name: 'Merge into Olga Older' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Merge', exact: true }).click();

    // The older one stays as it was, and has the booking now.
    await expect(page).toHaveURL(new RegExp(`/customers/cust-same-old$`));
    await expect(page.getByRole('heading', { name: 'Olga Older' })).toBeVisible();
    await expect(page.getByText('is on another record too')).toHaveCount(0);
    expect(await query(`select "customerId" from "Booking" where id = 'bk-same'`)).toEqual([
      { customerId: 'cust-same-old' },
    ]);
    expect(await query(`select id from "Customer" where phone = $1`, [PHONE])).toEqual([{ id: 'cust-same-old' }]);
  });
}
