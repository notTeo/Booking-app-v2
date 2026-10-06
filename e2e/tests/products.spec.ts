import { test, expect, type Page } from '@playwright/test';
import { join } from 'path';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';
import { pickServiceAndProvider } from '../support/booking';

/**
 * Products: the owner lists one from the Products tab (with a photo from the
 * editor), customers reserve it with a booking on the public page, and the
 * owner marks it sold on the booking, which takes it out of the stock.
 */
const PHOTO = join(__dirname, '../fixtures/photo.jpg');
const CUSTOMER = 'E2E Reserver';
const DATE = addDays(athensDate(), 41);

const signIn = async (page: Page) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
};

const seedProduct = (id: string, name: string, stock: number) =>
  query(
    `insert into "Product"(id,"shopId",name,price,stock,description,"supplierUrl","updatedAt")
     values ($1,'s1',$2,1250,$3,'Repairs dry hair','https://supplier.example/x',now())`,
    [id, name, stock],
  );

const stockOf = async (id: string) =>
  Number((await query(`select stock from "Product" where id = $1`, [id]))[0].stock);


/** Public page up to the details step (service, provider, date and time chosen). */
const openDetailsStep = async (page: Page) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/${E2E.shop.slug}`);
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, DATE);
  await page.getByRole('button', { name: '14:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
};

const bookingLineCount = async () =>
  Number((await query(`select count(*)::int as n from "BookingProduct"`))[0].n);

test.afterEach(async () => {
  await query(
    `delete from "Booking" where "customerId" in (select id from "Customer" where name = $1)`,
    [CUSTOMER],
  );
  await query(`delete from "Customer" where name = $1`, [CUSTOMER]);
  await query(`delete from "Product" where "shopId" = 's1'`);
});

test('the owner adds a product with a photo, and its page and list show it', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Products' }).first().click();
  await expect(page.getByText('You have not added any products yet.')).toBeVisible();

  await page.getByRole('link', { name: 'Add product' }).click();
  await expect(page).toHaveURL(new RegExp(`/shops/${E2E.shop.slug}/products/new$`));

  // The photo goes through the same editor as the team's.
  await page.locator('input[type=file]').setInputFiles(PHOTO);
  const editor = page.getByRole('dialog', { name: 'Edit photo' });
  await editor.getByLabel('Zoom').fill('1.5');
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor).toBeHidden();

  await page.getByLabel('Name').fill('E2E Shampoo');
  await page.getByLabel('Price (€)').fill('12,50');
  await page.getByLabel('How many are left').fill('3');
  await page.getByLabel('Description').fill('Repairs dry hair');
  await page.getByLabel('Where I buy it (supplier link)').fill('https://supplier.example/shampoo');
  await page.getByRole('button', { name: 'Create product' }).click();

  // Its own page, not a modal.
  await expect(page).toHaveURL(new RegExp(`/shops/${E2E.shop.slug}/products/(?!new)[^/]+$`));
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Shampoo' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.thumb--lg img')).toBeVisible();
  await expect(page.getByText('Only 3 left')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open supplier' })).toHaveAttribute(
    'href',
    'https://supplier.example/shampoo',
  );
  const rows = await query(`select price, stock, "photoUrl" from "Product" where name = 'E2E Shampoo'`);
  expect(rows[0]).toMatchObject({ price: 1250, stock: 3 });
  expect(rows[0].photoUrl).toMatch(/^\/media\/shops\/s1\/product-/);

  // Stock wording follows the count.
  await page.getByLabel('How many are left').fill('1');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('The product was saved.')).toBeVisible();
  await expect(page.locator('.badge', { hasText: 'Last one' })).toBeVisible();
  await page.getByLabel('How many are left').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.badge', { hasText: 'Not available' })).toBeVisible();

  // The overview lists it, with the supplier as a link that opens elsewhere.
  await page.getByRole('link', { name: 'Back to products' }).click();
  const row = page.getByRole('row', { name: /E2E Shampoo/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('Not available')).toBeVisible();
  const supplier = row.getByRole('link', { name: 'Open supplier' });
  await expect(supplier).toHaveAttribute('target', '_blank');
  await expect(supplier).toHaveAttribute('rel', /noopener/);
  await row.getByRole('link', { name: 'E2E Shampoo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Shampoo' })).toBeVisible();

  // Delete is behind a confirmation.
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(new RegExp(`/shops/${E2E.shop.slug}/products$`));
  await expect(page.getByText('You have not added any products yet.')).toBeVisible();
});

test('a customer reserves a product on the public page, and the owner marks it sold', async ({ page }) => {
  await seedProduct('p-e2e-1', 'E2E Shampoo', 3);
  await seedProduct('p-e2e-0', 'E2E Gone', 0);

  await openDetailsStep(page);
  await page.locator('#b-name').fill(CUSTOMER);
  await page.locator('#b-phone').fill('6900000451');

  const picker = page.locator('.product-picker');
  await expect(picker.getByText('E2E Shampoo')).toBeVisible();
  await expect(picker.getByText('€12.50').first()).toBeVisible();
  await expect(picker.getByText('Only 3 left')).toBeVisible();
  // Nothing to reserve of a product with none left.
  const gone = picker.locator('.product-row', { hasText: 'E2E Gone' });
  await expect(gone.getByText('Not available')).toBeVisible();
  await expect(gone.getByRole('button')).toHaveCount(0);
  // The supplier link is for the shop only.
  await expect(page.locator('body')).not.toContainText('supplier.example');

  // Never more than what is left.
  const more = picker.getByRole('button', { name: 'More: E2E Shampoo' });
  await more.click();
  await more.click();
  await more.click();
  await expect(more).toBeDisabled();
  await picker.getByRole('button', { name: 'Fewer: E2E Shampoo' }).click();
  // 2 × €12.50 plus the €15.00 service fee.
  await expect(picker.locator('.sum-up__row', { hasText: 'Service' })).toContainText('€15.00');
  await expect(picker.locator('.sum-up__row--total')).toContainText('€40.00');
  await expect(picker.getByText('Reservation only: you pay in the shop.')).toBeVisible();

  await page.getByRole('button', { name: /confirm booking/i }).click();
  const card = page.locator('.booking-card__body .card--center');
  await expect(card).toBeVisible();
  await expect(card.getByText('2 × E2E Shampoo')).toBeVisible();
  await expect(card.locator('.sum-up__row--total')).toContainText('€40.00');
  // Reserving does not touch the stock.
  expect(await stockOf('p-e2e-1')).toBe(3);

  // The owner sees it on the booking and marks it sold.
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${DATE}`);
  await page.locator('.cal-block').filter({ hasText: CUSTOMER }).click();
  const dialog = page.getByRole('dialog');
  // The overview: status, time, service fee, products and the total with what it is made of.
  await expect(dialog.getByText('Confirmed').first()).toBeVisible();
  await expect(dialog.getByText('€15.00', { exact: true })).toBeVisible();
  await expect(dialog.getByText('E2E Shampoo')).toBeVisible();
  await expect(dialog.getByText('× 2')).toBeVisible();
  await expect(dialog.locator('.total-bar__amount')).toHaveText('€40.00');
  await expect(dialog.getByText('Service €15.00 + products €25.00')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sold', exact: true })).toHaveCount(0);

  // Edit opens the controls: the quantity can be changed from here and the
  // total follows. The stock is untouched.
  await dialog.getByRole('button', { name: 'Edit' }).click();
  await expect(dialog.locator('.stepper__value')).toHaveText('2');
  await expect(dialog.getByText('3 in stock')).toBeVisible();
  await dialog.getByRole('button', { name: 'More: E2E Shampoo' }).click();
  await expect(dialog.locator('.stepper__value')).toHaveText('3');
  await expect(dialog.locator('.total-bar__amount')).toHaveText('€52.50');
  await dialog.getByRole('button', { name: 'Fewer: E2E Shampoo' }).click();
  await expect(dialog.locator('.stepper__value')).toHaveText('2');
  await expect(dialog.locator('.total-bar__amount')).toHaveText('€40.00');
  expect(await stockOf('p-e2e-1')).toBe(3);

  await dialog.getByRole('button', { name: 'Sold', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Sold', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByText('1 in stock')).toBeVisible();
  expect(await stockOf('p-e2e-1')).toBe(1);

  // Done goes back to the plain view, which shows the line as sold.
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog.locator('.badge', { hasText: 'Sold' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Edit' }).click();

  // Not sold gives it back.
  await dialog.getByRole('button', { name: 'Not sold', exact: true }).click();
  await expect(dialog.getByText('3 in stock')).toBeVisible();
  expect(await stockOf('p-e2e-1')).toBe(3);

  // Down to 0 does not delete the line (it may be a slip): it stays, dimmed,
  // and no longer counts. Only Remove takes it off.
  await dialog.getByRole('button', { name: 'Fewer: E2E Shampoo' }).click();
  await dialog.getByRole('button', { name: 'Fewer: E2E Shampoo' }).click();
  await expect(dialog.locator('.stepper__value')).toHaveText('0');
  await expect(dialog.getByText('Quantity is 0')).toBeVisible();
  await expect(dialog.locator('.total-bar__amount')).toHaveText('€15.00');
  await expect(dialog.getByRole('button', { name: 'Fewer: E2E Shampoo' })).toBeDisabled();
  expect(await bookingLineCount()).toBe(1);
  await dialog.getByRole('button', { name: 'More: E2E Shampoo' }).click();
  await dialog.getByRole('button', { name: 'More: E2E Shampoo' }).click();
  await expect(dialog.locator('.stepper__value')).toHaveText('2');

  // Remove is deliberate: a confirmation first.
  await dialog.getByRole('button', { name: 'Remove: E2E Shampoo' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(dialog.getByText('E2E Shampoo')).toHaveCount(0);
  expect(await bookingLineCount()).toBe(0);
});

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

for (const theme of ['light', 'dark'] as const) {
  test(`the product pages and the picker fit a 360px phone (${theme})`, async ({ page }) => {
    await seedProduct('p-e2e-1', 'E2E Shampoo with a rather long name to wrap onto lines', 3);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.context().addCookies([{ name: 'theme', value: theme, url: E2E.webUrl }]);

    await openDetailsStep(page);
    await expect(page.locator('.product-picker')).toBeVisible();
    await page.getByRole('button', { name: /^More:/ }).click();
    expect(await noHorizontalScroll(page)).toBe(true);
    await expect(page.getByRole('button', { name: /^More:/ })).toBeInViewport();

    await signIn(page);
    await page.goto(`/shops/${E2E.shop.slug}/products`);
    await expect(page.getByRole('row', { name: /E2E Shampoo/ })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole('link', { name: /E2E Shampoo/ }).click();
    await expect(page.getByLabel('Name')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
}
