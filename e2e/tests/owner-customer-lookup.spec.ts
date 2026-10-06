import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';
import { pickServiceAndProvider } from '../support/booking';

/**
 * The owner wizard's phone field looks up existing customers. Rules:
 *  - a match may auto-fill name / email ONLY when that field is empty;
 *  - it must never clear or overwrite text the user typed;
 *  - changing the phone never clears anything.
 */
test.use({ timezoneId: 'America/New_York' });

const PHONE = '6911223344';
const KNOWN = { name: 'Known Customer', email: 'known@example.com' };

test.beforeAll(async () => {
  await query(
    `insert into "Customer"(id,"shopId",name,phone,email,"updatedAt")
     values ('cust-known','s1',$1,$2,$3,now()) on conflict (id) do nothing`,
    [KNOWN.name, PHONE, KNOWN.email],
  );
});

async function openCustomerForm(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(addDays(athensDate(), 5));
  await page.getByRole('button', { name: '11:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.locator('#b-phone')).toBeVisible();
}

test('typing a name first, then a phone: the name survives', async ({ page }) => {
  await openCustomerForm(page);
  await page.locator('#b-name').fill('Typed First');
  await page.locator('#b-phone').fill('6900000000'); // no such customer
  await page.waitForTimeout(600);
  await expect(page.locator('#b-name')).toHaveValue('Typed First');
  // editing the phone again still doesn't touch it
  await page.locator('#b-phone').fill('69000000');
  await page.waitForTimeout(600);
  await expect(page.locator('#b-name')).toHaveValue('Typed First');
});

test('an exact phone match auto-fills EMPTY name and email', async ({ page }) => {
  await openCustomerForm(page);
  await page.locator('#b-phone').fill(PHONE);
  await expect(page.locator('#b-name')).toHaveValue(KNOWN.name);
  await expect(page.locator('#b-email')).toHaveValue(KNOWN.email);
});

test('a match never overwrites typed text; it only fills what is empty', async ({ page }) => {
  await openCustomerForm(page);
  await page.locator('#b-name').fill('Someone Else'); // typed name, email left empty
  await page.locator('#b-phone').fill(PHONE);
  await expect(page.locator('#b-email')).toHaveValue(KNOWN.email); // empty -> filled
  await page.waitForTimeout(300);
  await expect(page.locator('#b-name')).toHaveValue('Someone Else'); // typed -> kept
});

test('clicking a suggestion fills only empty fields too', async ({ page }) => {
  await openCustomerForm(page);
  await page.locator('#b-name').fill('Keep Me');
  await page.locator('#b-phone').fill('691122'); // partial: suggestions, not an exact match
  const suggestion = page.locator('button', { hasText: KNOWN.name }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page.locator('#b-phone')).toHaveValue(PHONE);
  await expect(page.locator('#b-email')).toHaveValue(KNOWN.email);
  await expect(page.locator('#b-name')).toHaveValue('Keep Me');
});

test('the "New customer" hint shows only after a completed search with no match', async ({ page }) => {
  await openCustomerForm(page);
  const hint = page.getByText('New customer', { exact: true });

  // search in flight: no hint yet
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(/\/api\/shops\/[^/]+\/customers\?/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#b-phone').fill('6999999991'); // no such customer
  await page.waitForTimeout(500); // past the debounce, response still held
  await expect(hint).toHaveCount(0);
  release();
  await expect(hint).toBeVisible();
  await page.unroute(/\/api\/shops\/[^/]+\/customers\?/);

  // changing the number hides it again until that search completes
  await page.locator('#b-phone').fill('6999999992');
  await expect(hint).toBeVisible(); // second search also finds nothing
});

test('a known customer found by exact phone never gets the "New customer" hint', async ({ page }) => {
  await openCustomerForm(page);
  await page.locator('#b-phone').fill(PHONE);
  await expect(page.locator('#b-name')).toHaveValue(KNOWN.name); // search completed + autofilled
  await expect(page.getByText('New customer', { exact: true })).toHaveCount(0);
});
