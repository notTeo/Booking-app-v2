import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addManager,
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import {
  sendBookingConfirmationEmail,
  sendNewBookingNotificationEmail,
} from '../services/email.service';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingRescheduledEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingRescheduledNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => vi.clearAllMocks());

// Frozen clock 2026-12-01T09:00Z; hours 09:00–13:00 Athens, 30-minute service.
const FIRST = '2026-12-08T10:00:00+02:00';
const SECOND = '2026-12-08T11:00:00+02:00';

async function shop(stock = 3) {
  const t = await createTenant('Resv');
  await addWeeklySchedule(t);
  const product = await prisma.product.create({
    data: {
      shopId: t.shop.id,
      name: 'Shampoo',
      price: 1250,
      stock,
      supplierUrl: 'https://supplier.example/x',
    },
  });
  return { t, product };
}

const publicBook = (t: Tenant, body: object = {}, startTime = FIRST) =>
  api.post(`/public/${t.shop.slug}/book`).send({
    name: 'Nikos',
    phone: '6900001000',
    email: 'nikos@example.com',
    serviceId: t.service.id,
    staffId: t.staff.id,
    startTime,
    ...body,
  });

const staffBook = (
  t: Tenant,
  token: string,
  body: object = {},
  startTime = FIRST,
) =>
  api
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(token))
    .send({
      name: 'Nikos',
      phone: '6900001000',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      ...body,
    });

const stockOf = async (id: string) =>
  (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

describe('reserving products on the public page', () => {
  it('reserves several products, copies name and price, and leaves stock alone', async () => {
    const { t, product } = await shop(5);
    const second = await prisma.product.create({
      data: { shopId: t.shop.id, name: 'Conditioner', price: 900, stock: 2 },
    });
    const res = await publicBook(t, {
      products: [
        { productId: product.id, quantity: 2 },
        { productId: second.id, quantity: 1 },
      ],
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.products).toEqual([
      { name: 'Shampoo', quantity: 2, unitPrice: 1250 },
      { name: 'Conditioner', quantity: 1, unitPrice: 900 },
    ]);
    const lines = await prisma.bookingProduct.findMany({
      where: { bookingId: res.body.data.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(lines.map((l) => [l.name, l.quantity, l.saleStatus])).toEqual([
      ['Shampoo', 2, 'RESERVED'],
      ['Conditioner', 1, 'RESERVED'],
    ]);
    expect(await stockOf(product.id)).toBe(5);
    expect(await stockOf(second.id)).toBe(2);
  });

  it('refuses more than is left, and books nothing', async () => {
    const { t, product } = await shop(1);
    const res = await publicBook(t, {
      products: [{ productId: product.id, quantity: 2 }],
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRODUCT_OUT_OF_STOCK');
    expect(res.body.violations[0].overridable).toBe(false);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );

    // A customer cannot override it, even by asking.
    const sneaky = await publicBook(t, {
      products: [{ productId: product.id, quantity: 2 }],
      overrideRules: ['PRODUCT_OUT_OF_STOCK'],
    });
    expect(sneaky.status).toBe(422);

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: 0 },
    });
    const none = await publicBook(t, {
      products: [{ productId: product.id, quantity: 1 }],
    });
    expect(none.status).toBe(422);
  });

  it('checks the list', async () => {
    const { t, product } = await shop();
    const other = await shop();
    const lines = (products: unknown) => publicBook(t, { products });
    expect((await lines([{ productId: product.id, quantity: 0 }])).status).toBe(
      400,
    );
    expect(
      (await lines([{ productId: product.id, quantity: 100 }])).status,
    ).toBe(400);
    expect(
      (await lines([{ productId: product.id, quantity: 1.5 }])).status,
    ).toBe(400);
    expect(
      (
        await lines([
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 1 },
        ])
      ).status,
    ).toBe(400);
    const foreign = await lines([{ productId: other.product.id, quantity: 1 }]);
    expect(foreign.status).toBe(404);
    expect(foreign.body.code).toBe('PRODUCT_NOT_FOUND');

    // A deactivated product is not on offer.
    await prisma.product.update({
      where: { id: product.id },
      data: { isActive: false },
    });
    const off = await lines([{ productId: product.id, quantity: 1 }]);
    expect(off.status).toBe(404);
    expect(off.body.code).toBe('PRODUCT_NOT_FOUND');
    expect((await lines('nope')).status).toBe(400);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('a booking without products still works, and so does an empty list', async () => {
    const { t } = await shop();
    expect((await publicBook(t)).status).toBe(201);
    const res = await publicBook(t, { products: [] }, SECOND);
    expect(res.status).toBe(201);
    expect(res.body.data.products).toEqual([]);
  });

  it('a plan without products cannot reserve them', async () => {
    const { t, product } = await shop();
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { plan: 'SOLO' },
    });
    const res = await publicBook(t, {
      products: [{ productId: product.id, quantity: 1 }],
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_FEATURE');
  });

  it('puts the products, with the total and the pay-in-shop note, in the emails', async () => {
    const { t, product } = await shop();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { email: 'owner@example.com' },
    });
    await publicBook(t, { products: [{ productId: product.id, quantity: 2 }] });
    await vi.waitFor(() =>
      expect(sendBookingConfirmationEmail).toHaveBeenCalled(),
    );
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [{ name: 'Shampoo', quantity: 2, unitPrice: 1250 }],
        // The total in the email adds the service fee to the products.
        servicePrice: 2000,
      }),
    );
    await vi.waitFor(() =>
      expect(sendNewBookingNotificationEmail).toHaveBeenCalled(),
    );
    expect(sendNewBookingNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [expect.objectContaining({ name: 'Shampoo', quantity: 2 })],
      }),
    );
  });

  it("the customer's manage-booking page lists them", async () => {
    const { t, product } = await shop();
    const made = await publicBook(t, {
      products: [{ productId: product.id, quantity: 1 }],
    });
    const token = (
      await prisma.booking.findUniqueOrThrow({
        where: { id: made.body.data.id },
      })
    ).cancelToken;
    const res = await api.post('/public/booking').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([
      { name: 'Shampoo', quantity: 1, unitPrice: 1250 },
    ]);
  });
});

describe('reserving products from the staff booking page', () => {
  const over = (productId: string) => ({
    products: [{ productId, quantity: 9 }],
  });

  it('owner and managers reserve past the stock once they accept it', async () => {
    const { t, product } = await shop(1);
    const manager = await addManager(t, 'Mgr');

    for (const token of [t.token, manager.token]) {
      const refused = await staffBook(t, token, over(product.id));
      expect(refused.status).toBe(422);
      expect(refused.body.code).toBe('PRODUCT_OUT_OF_STOCK');
      expect(refused.body.violations[0].overridable).toBe(true);
    }

    const ok = await staffBook(t, manager.token, {
      ...over(product.id),
      overrideRules: ['PRODUCT_OUT_OF_STOCK'],
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(201);
    expect(ok.body.data.overriddenRules).toContain('PRODUCT_OUT_OF_STOCK');
    expect(ok.body.data.products[0]).toMatchObject({
      name: 'Shampoo',
      quantity: 9,
    });
    // Reserving past the stock does not push it below zero.
    expect(await stockOf(product.id)).toBe(1);
  });

  it('staff cannot reserve past the stock, whatever they send', async () => {
    const { t, product } = await shop(1);
    const staff = await createStaffMember(t);
    const res = await staffBook(t, staff.token, {
      ...over(product.id),
      overrideRules: ['PRODUCT_OUT_OF_STOCK'],
    });
    expect(res.status).toBe(422);
    expect(res.body.violations[0].overridable).toBe(false);
    // Within the stock is fine for staff.
    const fine = await staffBook(t, staff.token, {
      products: [{ productId: product.id, quantity: 1 }],
    });
    expect(fine.status).toBe(201);
    expect(fine.body.data.overriddenRules).not.toContain(
      'PRODUCT_OUT_OF_STOCK',
    );
  });

  it('a blocked slot takes no products', async () => {
    const { t, product } = await shop();
    const res = await staffBook(t, t.token, {
      block: true,
      products: [{ productId: product.id, quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('shows them on the bookings list and the booking', async () => {
    const { t, product } = await shop();
    const made = await staffBook(t, t.token, {
      products: [{ productId: product.id, quantity: 2 }],
    });
    const list = await api
      .get(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token));
    expect(list.body.data[0].products[0]).toMatchObject({
      name: 'Shampoo',
      quantity: 2,
      unitPrice: 1250,
      saleStatus: 'RESERVED',
      product: { stock: 3 },
    });
    const one = await api
      .get(`/api/shops/${t.shop.id}/bookings/${made.body.data.id}`)
      .set(authHeader(t.token));
    expect(one.body.data.products).toHaveLength(1);
  });
});

describe('sold and not sold', () => {
  const mark = (
    t: Tenant,
    bookingId: string,
    lineId: string,
    saleStatus: string,
    token = t.token,
  ) =>
    api
      .patch(`/api/shops/${t.shop.id}/bookings/${bookingId}/products/${lineId}`)
      .set(authHeader(token))
      .send({ saleStatus });

  async function reserved(stock: number, quantity: number) {
    const { t, product } = await shop(stock);
    const made = await staffBook(t, t.token, {
      products: [{ productId: product.id, quantity }],
      overrideRules: ['PRODUCT_OUT_OF_STOCK'],
    });
    const bookingId = made.body.data.id as string;
    const line = made.body.data.products[0].id as string;
    return { t, product, bookingId, line };
  }

  it('sold takes the quantity out of the stock, and not sold gives it back', async () => {
    const { t, product, bookingId, line } = await reserved(5, 2);
    expect((await mark(t, bookingId, line, 'SOLD')).body.data.saleStatus).toBe(
      'SOLD',
    );
    expect(await stockOf(product.id)).toBe(3);
    // Clicking sold again does not take it twice.
    await mark(t, bookingId, line, 'SOLD');
    expect(await stockOf(product.id)).toBe(3);
    await mark(t, bookingId, line, 'NOT_SOLD');
    expect(await stockOf(product.id)).toBe(5);
    await mark(t, bookingId, line, 'NOT_SOLD');
    expect(await stockOf(product.id)).toBe(5);
  });

  it('never goes below zero, and gives back only what it took', async () => {
    const { t, product, bookingId, line } = await reserved(1, 4);
    const sold = await mark(t, bookingId, line, 'SOLD');
    expect(sold.body.data.product.stock).toBe(0);
    expect(await stockOf(product.id)).toBe(0);
    await mark(t, bookingId, line, 'RESERVED');
    expect(await stockOf(product.id)).toBe(1);
  });

  it('is open to staff, and refused for another shop', async () => {
    const { t, product, bookingId, line } = await reserved(3, 1);
    const staff = await createStaffMember(t);
    expect((await mark(t, bookingId, line, 'SOLD', staff.token)).status).toBe(
      200,
    );
    expect(await stockOf(product.id)).toBe(2);

    const outsider = await createTenant('Out');
    const res = await api
      .patch(
        `/api/shops/${outsider.shop.id}/bookings/${bookingId}/products/${line}`,
      )
      .set(authHeader(outsider.token))
      .send({ saleStatus: 'NOT_SOLD' });
    expect(res.status).toBe(404);
    expect(await stockOf(product.id)).toBe(2);
    expect((await mark(t, bookingId, line, 'MAYBE')).status).toBe(400);
  });

  it('two marks at once take the stock only once each', async () => {
    const { t, product, bookingId, line } = await reserved(3, 2);
    await Promise.all([
      mark(t, bookingId, line, 'SOLD'),
      mark(t, bookingId, line, 'SOLD'),
    ]);
    expect(await stockOf(product.id)).toBe(1);
  });
});

describe('changing the quantity on a booking', () => {
  const patch = (
    t: Tenant,
    bookingId: string,
    line: string,
    body: object,
    token = t.token,
  ) =>
    api
      .patch(`/api/shops/${t.shop.id}/bookings/${bookingId}/products/${line}`)
      .set(authHeader(token))
      .send(body);

  async function reserved(stock: number, quantity: number) {
    const { t, product } = await shop(stock);
    const made = await staffBook(t, t.token, {
      products: [{ productId: product.id, quantity }],
    });
    return {
      t,
      product,
      bookingId: made.body.data.id as string,
      line: made.body.data.products[0].id as string,
    };
  }

  it('changes the quantity without touching the stock', async () => {
    const { t, product, bookingId, line } = await reserved(5, 1);
    const res = await patch(t, bookingId, line, { quantity: 3 });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({
      quantity: 3,
      saleStatus: 'RESERVED',
    });
    expect(await stockOf(product.id)).toBe(5);
  });

  it('on a sold line, takes or gives back the difference', async () => {
    const { t, product, bookingId, line } = await reserved(5, 2);
    await patch(t, bookingId, line, { saleStatus: 'SOLD' });
    expect(await stockOf(product.id)).toBe(3);
    await patch(t, bookingId, line, { quantity: 4 });
    expect(await stockOf(product.id)).toBe(1);
    await patch(t, bookingId, line, { quantity: 1 });
    expect(await stockOf(product.id)).toBe(4);
    // 0 keeps the line, and gives the stock back; it only goes when removed.
    const zero = await patch(t, bookingId, line, { quantity: 0 });
    expect(zero.body.data).toMatchObject({ id: line, quantity: 0 });
    expect(await stockOf(product.id)).toBe(5);
    expect(await prisma.bookingProduct.count({ where: { bookingId } })).toBe(1);

    await patch(t, bookingId, line, { saleStatus: 'SOLD', quantity: 2 });
    expect(await stockOf(product.id)).toBe(3);
    const removed = await api
      .delete(`/api/shops/${t.shop.id}/bookings/${bookingId}/products/${line}`)
      .set(authHeader(t.token));
    expect(removed.body.data).toEqual({ id: line, deleted: true });
    expect(await stockOf(product.id)).toBe(5);
    expect(await prisma.bookingProduct.count({ where: { bookingId } })).toBe(0);
  });

  it('a line at 0 is left out of what the customer sees and is emailed', async () => {
    const { t, product, bookingId, line } = await reserved(5, 2);
    await patch(t, bookingId, line, { quantity: 0 });
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { email: 'o@example.com' },
    });
    const token = (
      await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })
    ).cancelToken;
    const res = await api.post('/public/booking').send({ token });
    expect(res.body.data.products).toEqual([]);
    expect(await stockOf(product.id)).toBe(5);
  });

  it('staff cannot raise it past the stock; owner and managers can', async () => {
    const { t, bookingId, line } = await reserved(2, 1);
    const staff = await createStaffMember(t);
    const refused = await patch(
      t,
      bookingId,
      line,
      { quantity: 3 },
      staff.token,
    );
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('PRODUCT_OUT_OF_STOCK');
    expect(
      (await patch(t, bookingId, line, { quantity: 2 }, staff.token)).status,
    ).toBe(200);
    expect((await patch(t, bookingId, line, { quantity: 9 })).status).toBe(200);
  });

  it('needs a quantity or a status, and a sensible one', async () => {
    const { t, bookingId, line } = await reserved(2, 1);
    expect((await patch(t, bookingId, line, {})).status).toBe(400);
    expect((await patch(t, bookingId, line, { quantity: -1 })).status).toBe(
      400,
    );
    expect((await patch(t, bookingId, line, { quantity: 100 })).status).toBe(
      400,
    );
    expect((await patch(t, bookingId, line, { quantity: 1.5 })).status).toBe(
      400,
    );
  });
});

describe('products and the booking lifecycle', () => {
  it('canceling the booking leaves the stock and the lines alone', async () => {
    const { t, product } = await shop(3);
    const made = await publicBook(t, {
      products: [{ productId: product.id, quantity: 1 }],
    });
    await api
      .patch(`/api/shops/${t.shop.id}/bookings/${made.body.data.id}/status`)
      .set(authHeader(t.token))
      .send({ status: 'CANCELED' });
    expect(await stockOf(product.id)).toBe(3);
    expect(
      await prisma.bookingProduct.count({
        where: { bookingId: made.body.data.id },
      }),
    ).toBe(1);
  });

  it('a reschedule carries the products, and their sold marks, to the new booking', async () => {
    const { t, product } = await shop(3);
    const made = await staffBook(t, t.token, {
      products: [{ productId: product.id, quantity: 2 }],
    });
    const line = made.body.data.products[0].id;
    await api
      .patch(
        `/api/shops/${t.shop.id}/bookings/${made.body.data.id}/products/${line}`,
      )
      .set(authHeader(t.token))
      .send({ saleStatus: 'SOLD' });

    const moved = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${made.body.data.id}`)
      .set(authHeader(t.token))
      .send({ startTime: SECOND });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(moved.body.data.id).not.toBe(made.body.data.id);
    expect(moved.body.data.products).toEqual([
      expect.objectContaining({ id: line, quantity: 2, saleStatus: 'SOLD' }),
    ]);
    expect(
      await prisma.bookingProduct.count({
        where: { bookingId: made.body.data.id },
      }),
    ).toBe(0);
    // Still sold once, not twice.
    expect(await stockOf(product.id)).toBe(1);
  });

  it('deleting the product keeps the booking line as the customer saw it', async () => {
    const { t, product } = await shop(3);
    const made = await publicBook(t, {
      products: [{ productId: product.id, quantity: 1 }],
    });
    await api
      .delete(`/api/shops/${t.shop.id}/products/${product.id}`)
      .set(authHeader(t.token));
    const line = await prisma.bookingProduct.findFirstOrThrow({
      where: { bookingId: made.body.data.id },
    });
    expect(line).toMatchObject({
      productId: null,
      name: 'Shampoo',
      unitPrice: 1250,
    });
    // Marking it sold afterwards is allowed and touches no stock.
    const res = await api
      .patch(
        `/api/shops/${t.shop.id}/bookings/${made.body.data.id}/products/${line.id}`,
      )
      .set(authHeader(t.token))
      .send({ saleStatus: 'SOLD' });
    expect(res.status).toBe(200);
  });
});
