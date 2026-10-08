import { test, expect, type Page } from '@playwright/test';
import bcrypt from 'bcryptjs';
import { E2E } from '../support/env';
import { query } from '../support/db';

/**
 * The new-shop flow: someone with no shop lands on the Plan step after login,
 * picks a plan, names the shop and is walked through its setup. Each test has
 * its own fresh owner ("onb-…"); their shops are deleted afterwards.
 */
const PASSWORD = 'Onb-Password1!';
const SHOTS = 'test-results/onboarding';

async function newOwner(id: string) {
  const email = `${id}@e2e.test`;
  await query(
    `insert into "User"(id,name,email,"passwordHash","isVerified","updatedAt")
     values ($1,'Nia Newcomer',$2,$3,true,now())`,
    [id, email, await bcrypt.hash(PASSWORD, 4)],
  );
  return email;
}

/** A picture of the screen once the step has slid in, for looking at afterwards. */
async function shot(page: Page, name: string) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${SHOTS}/${name}` });
}

async function login(page: Page, email: string, lang: 'en' | 'el' = 'en') {
  await page.context().addCookies([{ name: 'lang', value: lang, url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
}

test.afterEach(async () => {
  await query(`delete from "Shop" where slug like 'onb-%'`);
  await query(`delete from "RefreshToken" where "userId" like 'onb-%'`);
  await query(`delete from "User" where id like 'onb-%'`);
});

test('a new owner on Solo goes from login to a bookable shop', async ({ page }) => {
  const email = await newOwner('onb-solo');
  await login(page, email);

  // No shop yet: straight into the flow, with Team preselected.
  await expect(page).toHaveURL(/\/shops\/new$/);
  await expect(page.getByRole('heading', { name: 'Choose your plan' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Team/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Continue with Team' })).toBeVisible();
  await shot(page, '1-plan.png');

  // Solo has no Team or Products step.
  const steps = page.getByRole('navigation', { name: 'Setup steps' });
  await expect(steps.getByText('Products')).toBeVisible();
  await page.getByRole('radio', { name: /^Solo/ }).check({ force: true });
  await expect(steps.getByText('Products')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue with Solo' }).click();

  await page.getByLabel('Shop name').fill('Onb Solo Studio');
  await expect(page.getByLabel('Booking link')).toHaveValue('onb-solo-studio');
  await expect(page.getByText('You start with 30 days free on Solo. No card needed.')).toBeVisible();
  await shot(page, '2-shop.png');
  await page.getByRole('button', { name: 'Create shop' }).click();

  // The shop exists, on a Solo trial; setup starts at the hours.
  await expect(page).toHaveURL(/\/shops\/onb-solo-studio\/setup/);
  await expect(page.getByRole('heading', { name: 'When do you work?' })).toBeVisible();
  const shop = await query(`select plan,"subscriptionStatus" from "Shop" where slug='onb-solo-studio'`);
  expect(shop[0]).toMatchObject({ plan: 'SOLO', subscriptionStatus: 'TRIALING' });
  await page.getByRole('switch', { name: 'Saturday' }).check({ force: true });
  await shot(page, '3-hours.png');
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page.getByRole('heading', { name: 'What do you offer?' })).toBeVisible();
  await page.getByRole('button', { name: 'Add service' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Haircut');
  await dialog.getByLabel(/Duration/).fill('30');
  await dialog.getByLabel(/Price/).fill('15');
  await shot(page, '4-service-popup.png');
  await dialog.getByRole('button', { name: 'Add service' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Haircut')).toBeVisible();
  await shot(page, '5-services.png');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  // Share: the link, and no warning now that a service exists.
  await expect(page.getByRole('heading', { name: 'Share your booking link' })).toBeVisible();
  await expect(page.getByText(/\/onb-solo-studio$/)).toBeVisible();
  await expect(page.getByText("Customers can't book yet.")).toHaveCount(0);
  await shot(page, '6-share.png');
  await page.getByRole('button', { name: 'Go to my shop' }).click();

  // Hours and a service are in: nothing is left to finish.
  await expect(page).toHaveURL(/\/shops\/onb-solo-studio$/);
  await expect(page.getByRole('heading', { name: 'Finish setup' })).toHaveCount(0);
  const saved = await query(
    `select count(*)::int as open from "ShopWorkingDay" d join "ShopWorkingSchedule" s on s.id = d."scheduleId"
     join "Shop" sh on sh.id = s."shopId" where sh.slug='onb-solo-studio' and d."isOpen"`,
  );
  expect(saved[0].open).toBe(6);
  const assigned = await query(
    `select count(*)::int as n from "StaffService" ss join "Service" sv on sv.id = ss."serviceId"
     join "Shop" sh on sh.id = sv."shopId" where sh.slug='onb-solo-studio'`,
  );
  expect(assigned[0].n).toBe(1);

  // Solo: Products is there but locked; Team lists only the owner.
  await page.goto('/shops/onb-solo-studio/products');
  await expect(page.getByRole('heading', { name: 'Products are available on the Team plan' })).toBeVisible();
  await shot(page, '7-solo-products.png');
  await page.goto('/shops/onb-solo-studio/team');
  await expect(page.getByText('Working with others?')).toBeVisible();
  await shot(page, '8-solo-team.png');
});

test('skipping everything leaves a Finish setup card; the plan can be switched', async ({ page }) => {
  const email = await newOwner('onb-team');
  await login(page, email);
  await page.getByRole('button', { name: 'Continue with Team' }).click();
  await page.getByLabel('Shop name').fill('Onb Team Studio');
  await page.getByRole('button', { name: 'Create shop' }).click();

  // Hours, Services, Team, Products: skip them all.
  await expect(page.getByRole('heading', { name: 'When do you work?' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: 'What do you offer?' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: 'Who works with you?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How team roles work' })).toHaveAttribute('href', '/help#team-roles');
  await shot(page, '9-team.png');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: 'Do you sell products?' })).toBeVisible();
  await page.getByRole('button', { name: 'Add product' }).click();
  await shot(page, '10-product-popup.png');
  await page.getByRole('dialog').getByText('Cancel', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue without products' }).click();
  await expect(page.getByText("Customers can't book yet. Add at least one service first.")).toBeVisible();
  await page.getByRole('button', { name: 'Go to my shop' }).click();

  const card = page.getByRole('region', { name: 'Finish setup' });
  await expect(card).toBeVisible();
  await expect(card.getByText('0 of 2 done')).toBeVisible();
  await shot(page, '11-finish-card.png');
  await card.getByRole('link', { name: 'Add services' }).click();
  await expect(page).toHaveURL(/\/setup\?step=services$/);
  await expect(page.getByRole('heading', { name: 'What do you offer?' })).toBeVisible();

  // A second team member, so the move down has someone to switch off.
  await query(
    `insert into "UserShop"(id,"shopId",role,name) select 'onb-staff', id, 'staff', 'Sam Staff' from "Shop" where slug='onb-team-studio'`,
  );

  // Down to Solo from the settings, after a confirmation.
  await page.goto('/shops/onb-team-studio/settings?tab=plan');
  await page.getByRole('radio', { name: /^Solo/ }).check({ force: true });
  await shot(page, '12-change-plan.png');
  await page.getByRole('button', { name: 'Switch to Solo' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('On Solo only you, the owner, stay active.');
  await confirm.getByRole('button', { name: 'Switch to Solo' }).click();
  await expect(page.getByText('Your shop is now on Solo.')).toBeVisible();
  const shop = await query(`select plan from "Shop" where slug='onb-team-studio'`);
  expect(shop[0].plan).toBe('SOLO');
  await expect(page.getByRole('link', { name: 'Run setup again' })).toHaveAttribute('href', '/shops/onb-team-studio/setup');

  // The member the move down switched off is still listed, inactive and locked; the owner is the one active.
  await page.goto('/shops/onb-team-studio/team');
  const staffRow = page.getByRole('row', { name: /Sam Staff/ });
  await expect(staffRow.getByText('Locked by plan')).toBeVisible();
  await expect(page.getByRole('row', { name: /onb-team@e2e\.test/ }).getByText('Locked by plan')).toHaveCount(0);
  const members = await query(`select name, active from "UserShop" where "shopId" = (select id from "Shop" where slug='onb-team-studio') order by name`);
  expect(members).toEqual([
    { name: 'Nia Newcomer', active: true },
    { name: 'Sam Staff', active: false },
  ]);
  await shot(page, '14-solo-team-locked.png');

  // The note about the Team plan can be closed, and stays closed.
  await expect(page.getByText('Working with others?')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Working with others?')).toHaveCount(0);
  await page.reload();
  await expect(staffRow).toBeVisible();
  await expect(page.getByText('Working with others?')).toHaveCount(0);

  // The list of shops names each shop's plan.
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: /Onb Team Studio/ }).getByText('Solo', { exact: true })).toBeVisible();
  await shot(page, '15-dashboard-plan-pill.png');
});

test('a second shop is created inactive and ends on "contact us"', async ({ page }) => {
  const email = await newOwner('onb-second');
  await query(`update "User" set "trialUsedAt" = now() where id = 'onb-second'`);
  await login(page, email);

  await expect(page.getByText('You have already used your free trial.')).toBeVisible();
  await page.getByRole('radio', { name: /^Business/ }).check({ force: true });
  await page.getByRole('button', { name: 'Continue with Business' }).click();
  await page.getByLabel('Shop name').fill('Onb Second Studio');
  await page.getByRole('button', { name: 'Create shop' }).click();

  await expect(page.getByRole('heading', { name: 'Your shop is created' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact us' })).toBeVisible();
  await shot(page, '13-second-shop.png');
  const shop = await query(`select plan,"subscriptionStatus" from "Shop" where slug='onb-second-studio'`);
  expect(shop[0]).toMatchObject({ plan: 'BUSINESS', subscriptionStatus: 'INACTIVE' });
});

test('the flow fits a 360px phone in Greek and in dark', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.context().addCookies([{ name: 'theme', value: 'dark', url: E2E.webUrl }]);
  const email = await newOwner('onb-phone');
  await login(page, email, 'el');

  await expect(page.getByRole('heading', { name: 'Διάλεξε το πακέτο σου' })).toBeVisible();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await shot(page, '20-phone-plan.png');
  await page.getByRole('button', { name: 'Συνέχεια με Team' }).click();
  await page.getByLabel('Όνομα καταστήματος').fill('Onb Phone Studio');
  await shot(page, '21-phone-shop.png');
  await page.getByRole('button', { name: 'Δημιουργία καταστήματος' }).click();
  await expect(page.getByRole('heading', { name: 'Πότε δουλεύεις;' })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await shot(page, '22-phone-hours.png');
  await page.getByRole('button', { name: 'Παράλειψη' }).click();
  await page.getByRole('button', { name: 'Παράλειψη' }).click();
  await expect(page.getByRole('heading', { name: 'Ποιοι δουλεύουν μαζί σου;' })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await shot(page, '23-phone-team.png');
});
