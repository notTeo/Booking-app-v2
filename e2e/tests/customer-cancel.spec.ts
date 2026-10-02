import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { cancelTokenOf } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

// A day no other spec books on.
const date = addDays(athensDate(), 11);

test('customer cancel link: cancels once, then reports "already cancelled"; a malformed link is invalid', async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);

  const book = await request.post(`${E2E.apiUrl}/public/${E2E.shop.slug}/book`, {
    data: {
      name: 'Cancel Tester',
      phone: '6900000311',
      serviceId: 'sv1',
      staffId: 'us1',
      startTime: athensWallClockToUtc(date, '10:00').toISOString(),
    },
  });
  expect(book.status()).toBe(201);
  const token = await cancelTokenOf((await book.json()).data.id);

  await page.goto(`/cancel?token=${token}`);
  await page.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(page.getByRole('heading', { name: 'Booking Cancelled' })).toBeVisible();

  // Same link again.
  await page.goto(`/cancel?token=${token}`);
  await page.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(page.getByText('This booking has already been cancelled.')).toBeVisible();

  // Malformed token: rejected by validation, shown as an invalid link.
  await page.goto('/cancel?token=not-a-uuid');
  await page.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(page.getByText('Booking not found. The link may be invalid or expired.')).toBeVisible();
});
