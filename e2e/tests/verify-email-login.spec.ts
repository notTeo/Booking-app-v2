import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';

// Verifying a sign-up asks for the password, so it is already a login: the new
// user goes straight into the app, with no login form in between.

const EMAIL = 'verify-login@e2e.test';
const PASSWORD = 'E2e-Verify-Pass1!';
const TOKEN = 'e2e-verify-login-token';

test.afterEach(async ({ page }) => {
  // Close the page first: a refresh still in flight would add a RefreshToken
  // between the two deletes below and the User delete would hit its foreign key.
  await page.close();
  await query('delete from "PendingRegistration" where email = $1', [EMAIL]);
  await query(
    'delete from "RefreshToken" where "userId" in (select id from "User" where email = $1)',
    [EMAIL],
  );
  await query('delete from "User" where email = $1', [EMAIL]);
});

test('verifying the sign-up email logs the new user in', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await query(
    `insert into "PendingRegistration"(id,name,email,"passwordHash",token,"expiresAt")
     values ('e2e-verify-login','Verify Login',$1,$2,$3,now() + interval '1 day')`,
    [EMAIL, await bcrypt.hash(PASSWORD, 10), createHash('sha256').update(TOKEN).digest('hex')],
  );

  await page.goto(`/verify-email?token=${TOKEN}`);
  await page.locator('#verify-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Verify email' }).click();

  // No shops and no invites yet, so the landing is the dashboard.
  await expect(page).toHaveURL(/\/dashboard$/);

  // The session is a real one: it survives a reload.
  const refreshed = page.waitForResponse((r) => r.url().endsWith('/auth/refresh'));
  await page.reload();
  expect((await refreshed).ok()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard$/);
});
