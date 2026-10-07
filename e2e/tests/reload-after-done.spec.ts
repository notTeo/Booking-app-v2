import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';

// A link from an email is spent by its own success. Reloading the page must
// keep showing the success, not call the API again and report an invalid link.

test('email change link: a reload after success still shows the success', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  let calls = 0;
  await page.route(/\/auth\/verify-email-change/, (route) => {
    calls += 1;
    // The real endpoint accepts a token once, then rejects it.
    return calls === 1
      ? route.fulfill({ status: 200, json: { status: 'success', data: {} } })
      : route.fulfill({ status: 400, json: { status: 'error', message: 'Invalid verification token' } });
  });

  await page.goto('/verify-email-change?token=spent-after-one-use');
  await expect(page.getByText('Your email address has been updated successfully.')).toBeVisible();
  // The token is out of the address bar.
  await expect(page).toHaveURL(/\/verify-email-change\?done=1$/);

  await page.reload();
  await expect(page.getByText('Your email address has been updated successfully.')).toBeVisible();
  expect(calls).toBe(1);
});

test('email verification link: the success page survives a reload', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.route(/\/auth\/verify-email(\?|$)/, (route) =>
    route.fulfill({ status: 200, json: { status: 'success', data: {} } }),
  );
  await page.goto('/verify-email?token=any');
  await page.locator('#verify-password').fill('Whatever1!');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByText('Email verified successfully. You can now log in.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Email verified successfully. You can now log in.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Login' })).toBeVisible();
});
