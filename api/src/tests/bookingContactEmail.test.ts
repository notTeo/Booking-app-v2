import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { authHeader, createBookingRow, createTenant } from './helpers';
import { bookingEmailParams } from '../utils/bookingEmail';

const api = await serve(app);

// The address a customer typed for one booking on the public page. It is the
// customer's, like the cancel token: used for their emails, never sent back to
// the shop's members.
describe('booking contactEmail', () => {
  it('is not in the responses a shop member gets', async () => {
    const t = await createTenant('Contact');
    const booking = await createBookingRow(t);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        contactEmail: 'typed@example.com',
        cancelToken: crypto.randomUUID(),
      },
    });

    const base = `/api/shops/${t.shop.id}/bookings`;
    const list = await api.get(base).set(authHeader(t.token));
    const one = await api.get(`${base}/${booking.id}`).set(authHeader(t.token));
    const status = await api
      .patch(`${base}/${booking.id}/status`)
      .set(authHeader(t.token))
      .send({ status: 'CANCELED' });

    for (const res of [list, one, status]) {
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('typed@example.com');
    }
  });

  it("is where the booking's emails go, ahead of the customer's own address", () => {
    const booking = {
      cancelToken: 'token',
      locale: 'en',
      startTime: new Date('2027-07-01T09:00:00Z'),
      endTime: new Date('2027-07-01T09:30:00Z'),
      customer: { name: 'C', email: 'on-file@example.com' as string | null },
      service: { name: 'Cut', price: 2000 },
      staff: { name: 'S' },
      shop: {
        name: 'Shop',
        timezone: 'Europe/Athens',
        formattedAddress: null,
        customerRescheduleEnabled: true,
        cancelCutoffHours: 1,
        rescheduleCutoffHours: 1,
      },
    };

    expect(
      bookingEmailParams({ ...booking, contactEmail: 'typed@example.com' })
        ?.email,
    ).toBe('typed@example.com');
    expect(bookingEmailParams({ ...booking, contactEmail: null })?.email).toBe(
      'on-file@example.com',
    );
    expect(
      bookingEmailParams({
        ...booking,
        contactEmail: 'typed@example.com',
        customer: { name: 'C', email: null },
      })?.email,
    ).toBe('typed@example.com');
  });
});
