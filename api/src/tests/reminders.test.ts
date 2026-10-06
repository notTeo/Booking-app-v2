import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { createTenant, unique, type Tenant } from './helpers';
import { sendDueReminders } from '../utils/reminders';
import { sendBookingReminderEmail } from '../services/email.service';
import type { BookingStatus } from '../../dist/generated/prisma';

vi.mock('../services/email.service', () => ({
  sendBookingReminderEmail: vi.fn().mockResolvedValue(undefined),
}));

const HOUR = 60 * 60_000;
// Frozen clock (setup.ts): 2026-12-01T09:00Z.
const NOW = new Date('2026-12-01T09:00:00.000Z');
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * HOUR);

async function bookingWith(
  t: Tenant,
  opts: {
    start: Date;
    status?: BookingStatus;
    email?: string | null;
    createdAt?: Date;
    locale?: string;
  },
) {
  const email =
    opts.email === undefined ? `${unique()}@example.com` : opts.email;
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Cust', phone: unique(), email },
  });
  const booking = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: opts.start,
      endTime: new Date(opts.start.getTime() + 30 * 60_000),
      cancelToken: randomUUID(),
      // Booked well before any reminder falls due, unless a test says otherwise.
      createdAt: opts.createdAt ?? hoursFromNow(-200),
      ...(opts.status && { status: opts.status }),
      ...(opts.locale && { locale: opts.locale }),
    },
  });
  return { booking, email };
}

// Other test files share the database, so only this booking's email counts.
const remindersTo = (email: string | null) =>
  vi
    .mocked(sendBookingReminderEmail)
    .mock.calls.filter(([params]) => params.email === email);
const sentAt = async (id: string) =>
  (await prisma.booking.findUniqueOrThrow({ where: { id } })).reminderSentAt;

describe('reminder emails', () => {
  it('reminds a confirmed booking inside the shop lead time, once', async () => {
    const t = await createTenant('RemindDue');
    const { booking, email } = await bookingWith(t, {
      start: hoursFromNow(23),
      locale: 'en',
    });

    await sendDueReminders(NOW);
    expect(remindersTo(email)).toHaveLength(1);
    expect(remindersTo(email)[0][0]).toMatchObject({
      shopName: t.shop.name,
      locale: 'en',
    });
    expect(await sentAt(booking.id)).toEqual(NOW);

    await sendDueReminders(NOW);
    expect(remindersTo(email)).toHaveLength(1);
  });

  it('waits until the lead time is reached', async () => {
    const t = await createTenant('RemindEarly');
    const { booking, email } = await bookingWith(t, {
      start: hoursFromNow(30),
    });

    await sendDueReminders(NOW);
    expect(remindersTo(email)).toHaveLength(0);
    expect(await sentAt(booking.id)).toBeNull();
  });

  it("uses the shop's own lead time", async () => {
    const t = await createTenant('RemindLead');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { reminderHoursBefore: 48 },
    });
    const { email } = await bookingWith(t, { start: hoursFromNow(30) });

    await sendDueReminders(NOW);
    expect(remindersTo(email)).toHaveLength(1);
  });

  it('sends nothing when the shop turned reminders off', async () => {
    const t = await createTenant('RemindOff');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { reminderEnabled: false },
    });
    const { booking, email } = await bookingWith(t, { start: hoursFromNow(5) });

    await sendDueReminders(NOW);
    expect(remindersTo(email)).toHaveLength(0);
    expect(await sentAt(booking.id)).toBeNull();
  });

  it.each(['CANCELED', 'PENDING', 'COMPLETED', 'NO_SHOW'] as const)(
    'skips a %s booking',
    async (status) => {
      const t = await createTenant('RemindStatus');
      const { email } = await bookingWith(t, {
        start: hoursFromNow(5),
        status,
      });

      await sendDueReminders(NOW);
      expect(remindersTo(email)).toHaveLength(0);
    },
  );

  it('skips a customer without an email and a booking already past', async () => {
    const t = await createTenant('RemindSkip');
    const noEmail = await bookingWith(t, {
      start: hoursFromNow(5),
      email: null,
    });
    const past = await bookingWith(t, { start: hoursFromNow(-1) });

    await sendDueReminders(NOW);
    expect(await sentAt(noEmail.booking.id)).toBeNull();
    expect(remindersTo(past.email)).toHaveLength(0);
  });

  it('does not remind a booking made inside the lead time', async () => {
    const t = await createTenant('RemindLate');
    const { booking, email } = await bookingWith(t, {
      start: hoursFromNow(3),
      createdAt: hoursFromNow(-1),
    });

    await sendDueReminders(NOW);
    expect(remindersTo(email)).toHaveLength(0);
    // Marked as handled, so later runs skip it too.
    expect(await sentAt(booking.id)).toEqual(NOW);
  });
});
