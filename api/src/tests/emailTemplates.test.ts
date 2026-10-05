import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// The real templates, with only the Resend client replaced: every send is
// captured so the HTML can be checked (and written out, see below).
const sent = vi.hoisted(() => [] as { subject: string; html: string }[]);
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (mail: { subject: string; html: string }) => {
        sent.push(mail);
        return { error: null };
      },
    };
  },
}));

import * as email from '../services/email.service';

const booking = {
  email: 'customer@example.com',
  customerName: 'Maria',
  shopName: 'Hairology & Co',
  serviceName: 'Haircut',
  staffName: 'Nikos',
  startTime: new Date('2026-12-08T08:00:00Z'),
  endTime: new Date('2026-12-08T08:30:00Z'),
  timezone: 'Europe/Athens',
  formattedAddress: 'Ermou 1, Athens',
  cancelToken: 'tok',
  canReschedule: true,
  cancelCutoffHours: 2,
  rescheduleCutoffHours: 2,
};
const previous = { previousStartTime: new Date('2026-12-07T08:00:00Z') };
const notification = {
  ...booking,
  email: 'owner@example.com',
  customerPhone: '6900000000',
};

const ACCOUNT: Record<string, () => Promise<void>> = {
  verification: () =>
    email.sendVerificationEmail('user@example.com', 'tok', 'Nick'),
  'email-change': () =>
    email.sendEmailChangeVerification('user@example.com', 'tok'),
  'password-reset': () =>
    email.sendPasswordResetEmail('user@example.com', 'tok', 'Nick'),
  invite: () =>
    email.sendInviteEmail(
      'staff@example.com',
      'tok',
      booking.shopName,
      'owner@example.com',
      'staff',
    ),
  'new-booking-notification': () =>
    email.sendNewBookingNotificationEmail(notification),
  'rescheduled-notification': () =>
    email.sendBookingRescheduledNotificationEmail({
      ...notification,
      ...previous,
    }),
};

const CUSTOMER: Record<string, () => Promise<void>> = {
  'booking-confirmation': () => email.sendBookingConfirmationEmail(booking),
  'booking-rescheduled': () =>
    email.sendBookingRescheduledEmail({ ...booking, ...previous }),
  'booking-cancelled': () => email.sendCancellationConfirmationEmail(booking),
  'booking-reminder': () => email.sendBookingReminderEmail(booking),
};

// EMAIL_PREVIEW_DIR=some/dir npm run preview:emails writes each email there
// as an .html file, to open in a browser.
const previewDir = process.env.EMAIL_PREVIEW_DIR;

async function render(name: string, send: () => Promise<void>) {
  sent.length = 0;
  await send();
  expect(sent).toHaveLength(1);
  const { html } = sent[0];
  if (previewDir) {
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, `${name}.html`), html);
  }
  return html;
}

const GREEN = /#166534|#064e3b/i;
const footerOf = (html: string) => html.slice(html.indexOf('Powered by'));
const headerOf = (html: string) =>
  html.slice(html.indexOf('<body'), html.indexOf('</table>'));

describe('email templates', () => {
  it.each(Object.entries(ACCOUNT))(
    'account email "%s": green, wordmark on top, powered-by footer',
    async (name, send) => {
      const html = await render(name, send);
      expect(headerOf(html)).toContain('/email/wordmark.png');
      expect(html).toMatch(GREEN);
      expect(footerOf(html)).toContain('alt="BeBooked"');
      expect(html).toContain("'Poppins', Helvetica, Arial, sans-serif");
      expect(html).not.toContain('BEBOOKED');
    },
  );

  it.each(Object.entries(CUSTOMER))(
    'customer email "%s": black and white, shop name on top, powered-by footer',
    async (name, send) => {
      const html = await render(name, send);
      expect(headerOf(html)).toContain('Hairology &amp; Co');
      expect(headerOf(html)).not.toContain('BeBooked');
      expect(html).not.toMatch(GREEN);
      expect(html).not.toContain('/email/wordmark.png');
      expect(footerOf(html)).toContain('/email/wordmark-mono.png');
      expect(html).toContain("'Poppins', Helvetica, Arial, sans-serif");
      expect(html).not.toContain('BEBOOKED');
    },
  );

  it('is Greek unless the recipient uses English', async () => {
    const greek = await render('booking-confirmation-el', () =>
      email.sendBookingConfirmationEmail(booking),
    );
    expect(sent[0].subject).toBe(
      'Το ραντεβού σου στο Hairology & Co επιβεβαιώθηκε',
    );
    expect(greek).toContain('<html lang="el">');
    expect(greek).toContain('Τρίτη 8 Δεκεμβρίου 2026');
    expect(greek).toContain('10:00');
    expect(greek).toContain('Ακύρωση ραντεβού');
    expect(greek).toContain('έως 2 ώρες πριν');

    const english = await render('booking-confirmation-en', () =>
      email.sendBookingConfirmationEmail({ ...booking, locale: 'en' }),
    );
    expect(sent[0].subject).toBe('Your booking at Hairology & Co is confirmed');
    expect(english).toContain('<html lang="en">');
    expect(english).toContain('Tuesday, December 8, 2026');
    expect(english).toContain('10:00 AM');
    expect(english).toContain('Cancel booking');
  });

  it('writes account emails in the language passed in', async () => {
    const english = await render('verification-en', () =>
      email.sendVerificationEmail('user@example.com', 'tok', 'Nick', 'en'),
    );
    expect(english).toContain('Verify your email, Nick.');
    const greek = await render('invite-el', () =>
      email.sendInviteEmail(
        'staff@example.com',
        'tok',
        booking.shopName,
        'owner@example.com',
        'staff',
        'el',
      ),
    );
    expect(greek).toContain('μέλος προσωπικού');
    expect(greek).toContain('Αποδοχή πρόσκλησης');
  });
});
