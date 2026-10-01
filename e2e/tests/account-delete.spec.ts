import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';

// Wrong password on account delete: one request only (a 401 would trigger the
// client's refresh-and-retry), a specific message, and the dialog stays open.
// The account is never actually deleted here.
test('account delete with a wrong password shows "Incorrect password." after a single request', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));

  const deleteRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'DELETE' && r.url().endsWith('/user/me')) deleteRequests.push(r.url());
  });

  await page.goto('/settings');
  await page.getByRole('button', { name: /delete account/i }).first().click();
  const dialog = page.getByRole('alertdialog');
  const password = dialog.getByLabel('Confirm your password');
  await expect(password).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Delete account' });
  await expect(confirm).toBeDisabled();

  await password.fill('definitely-wrong');
  await confirm.click();

  await expect(dialog.getByRole('alert')).toHaveText('Incorrect password.');
  await expect(dialog).toBeVisible();
  await expect(password).toHaveValue('');
  await expect(page).toHaveURL(/\/settings$/);
  expect(deleteRequests).toHaveLength(1);
});
