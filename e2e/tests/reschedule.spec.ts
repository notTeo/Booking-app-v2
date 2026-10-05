import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { cancelTokenOf } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

// Days no other spec books on.
const customerDay = addDays(athensDate(), 16);
const ownerDay = addDays(athensDate(), 18);

async function book(request: APIRequestContext, name: string, phone: string, date: string, time: string) {
  const res = await request.post(`${E2E.apiUrl}/public/${E2E.shop.slug}/book`, {
    data: {
      name,
      phone,
      serviceId: 'sv1',
      staffId: 'us1',
      startTime: athensWallClockToUtc(date, time).toISOString(),
    },
  });
  return res;
}

async function logIn(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
}

test('customer reschedules from the email link; the old time stays as a reference and is free again', async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);

  const made = await book(request, 'Resched Tester', '6900000411', customerDay, '10:00');
  expect(made.status()).toBe(201);
  const token = await cancelTokenOf((await made.json()).data.id);

  // The link opens on the date/time step, on the booking's own day.
  await page.goto(`/reschedule?token=${token}`);
  await expect(page.getByRole('heading', { name: 'Reschedule your booking' })).toBeVisible();
  await expect(page.locator('#booking-date')).toHaveValue(customerDay);
  await page.getByRole('button', { name: '12:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Booking rescheduled' })).toBeVisible();

  // The old link is dead and says where the booking went.
  await page.goto(`/reschedule?token=${token}`);
  await expect(page.getByText(/already rescheduled to/)).toBeVisible();
  await page.goto(`/cancel?token=${token}`);
  await page.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(page.getByText('This booking was rescheduled. Use the link in your latest email.')).toBeVisible();

  // The old time is bookable again by someone else.
  expect((await book(request, 'Next Customer', '6900000412', customerDay, '10:00')).status()).toBe(201);

  // The calendar shows the old booking as a reference next to the new ones.
  await logIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${customerDay}`);
  const blocks = page.locator('.cal-block', { hasText: 'Resched Tester' });
  await expect(blocks).toHaveCount(2);
  const old = blocks.filter({ hasText: 'Rescheduled' });
  await expect(old.locator('.cal-block__time')).toContainText(/10:00/);
  await expect(page.locator('.cal-block', { hasText: 'Next Customer' })).toBeVisible();

  // The reference can't be re-opened; the moved booking says where it came from.
  await old.click();
  await expect(page.getByText(/This booking was rescheduled to/)).toBeVisible();
  await expect(page.getByRole('group', { name: /status/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();
  await blocks.filter({ hasNotText: 'Rescheduled' }).click();
  await expect(page.getByText(/Rescheduled from/)).toBeVisible();
});

test('owner reschedule wizard: Back walks 3 -> 2 -> 1, the service can change, and Cancel leaves', async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  expect((await book(request, 'Back Tester', '6900000413', ownerDay, '10:00')).status()).toBe(201);

  await logIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${ownerDay}`);
  await page.locator('.cal-block', { hasText: 'Back Tester' }).click();
  await page.getByRole('link', { name: 'Reschedule' }).click();

  const current = page.locator('.steps__item.is-current');
  await expect(current).toContainText('Date & Time');
  await page.getByRole('button', { name: /back/i }).click();
  await expect(current).toContainText('Staff');
  // The reported bug: this used to jump forward to Date & Time again.
  await page.getByRole('button', { name: /back/i }).click();
  await expect(current).toContainText('Service');

  // Forward again through the service and staff steps, keeping the date.
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await expect(current).toContainText('Staff');
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await expect(current).toContainText('Date & Time');
  await expect(page.locator('#booking-date')).toHaveValue(ownerDay);

  // Cancel is there on every step and returns to the booking's day.
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings?date=${ownerDay}`);
  await expect(page.locator('.cal-block', { hasText: 'Back Tester' })).toHaveCount(1);
});
