import { describe, it, expect } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addManager,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

const base = (t: Tenant) => `/api/shops/${t.shop.id}/customers`;
const importRows = (t: Tenant, token: string, rows: unknown) =>
  api
    .post(`${base(t)}/import`)
    .set(authHeader(token))
    .send({ rows });

describe('GET /api/shops/:shopId/customers/export-all', () => {
  it("returns every customer of the shop with a booking count, and no other shop's", async () => {
    const t = await createTenant('Export');
    const booking = await createBookingRow(t);
    await prisma.customer.update({
      where: { id: booking.customerId },
      data: { name: 'Maria', email: 'maria@example.com', notes: 'vip' },
    });
    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Nikos', phone: '6900000001' },
    });
    const other = await createTenant('Other');
    await createBookingRow(other);

    const res = await api.get(`${base(t)}/export-all`).set(authHeader(t.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      name: 'Maria',
      email: 'maria@example.com',
      notes: 'vip',
      bookings: 1,
    });
    expect(res.body.data[1]).toMatchObject({
      name: 'Nikos',
      phone: '6900000001',
      email: null,
      bookings: 0,
    });
  });

  it('is for the owner and managers: staff get 403', async () => {
    const t = await createTenant('Export');
    const staff = await createStaffMember(t);
    const manager = await addManager(t);

    const refused = await api
      .get(`${base(t)}/export-all`)
      .set(authHeader(staff.token));
    expect(refused.status).toBe(403);
    const allowed = await api
      .get(`${base(t)}/export-all`)
      .set(authHeader(manager.token));
    expect(allowed.status).toBe(200);
  });
});

describe('POST /api/shops/:shopId/customers/import', () => {
  it('creates new customers, fills blanks on existing ones and never overwrites', async () => {
    const t = await createTenant('Import');
    await prisma.customer.createMany({
      data: [
        {
          shopId: t.shop.id,
          name: 'Has Email',
          phone: '6900000001',
          email: 'kept@example.com',
        },
        { shopId: t.shop.id, name: 'No Email', phone: '6900000002' },
      ],
    });

    const res = await importRows(t, t.token, [
      {
        name: 'New One',
        phone: ' 6900000003 ',
        email: 'new@example.com',
        notes: 'hi',
      },
      { name: 'Changed Name', phone: '6900000001', email: 'other@example.com' },
      {
        name: 'Changed Name',
        phone: '6900000002',
        email: 'filled@example.com',
        notes: 'note',
      },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      created: 1,
      updated: 1,
      skipped: 1,
      errors: [],
    });
    const customers = await prisma.customer.findMany({
      where: { shopId: t.shop.id },
      orderBy: { phone: 'asc' },
    });
    expect(customers.map((c) => [c.name, c.phone, c.email, c.notes])).toEqual([
      ['Has Email', '6900000001', 'kept@example.com', null],
      ['No Email', '6900000002', 'filled@example.com', 'note'],
      ['New One', '6900000003', 'new@example.com', 'hi'],
    ]);
  });

  it('reports bad rows by position and imports the rest', async () => {
    const t = await createTenant('Import');

    const res = await importRows(t, t.token, [
      { name: '', phone: '6900000001' },
      { name: 'No Phone' },
      { name: 'Bad Email', phone: '6900000002', email: 'nope' },
      { name: 'Fine', phone: '6900000003' },
      'not a row',
    ]);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ created: 1, updated: 0, skipped: 0 });
    expect(res.body.data.errors.map((e: { row: number }) => e.row)).toEqual([
      0, 1, 2, 4,
    ]);
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('treats a phone repeated in the file as one customer', async () => {
    const t = await createTenant('Import');

    const res = await importRows(t, t.token, [
      { name: 'First', phone: '6900000001' },
      { name: 'Second', phone: '6900000001', email: 'second@example.com' },
    ]);

    expect(res.body.data).toMatchObject({ created: 1, updated: 1 });
    const [only] = await prisma.customer.findMany({
      where: { shopId: t.shop.id },
    });
    expect(only).toMatchObject({ name: 'First', email: 'second@example.com' });
  });

  it('accepts a 500-row batch larger than the default body limit, and rejects 501 rows', async () => {
    const t = await createTenant('Import');
    const rows = Array.from({ length: 500 }, (_, i) => ({
      name: `Customer ${i}`,
      phone: `69${String(10000000 + i)}`,
      notes: 'x'.repeat(400),
    }));

    const res = await importRows(t, t.token, rows);
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(500);

    const tooMany = await importRows(t, t.token, [...rows, rows[0]]);
    expect(tooMany.status).toBe(400);
    expect((await importRows(t, t.token, [])).status).toBe(400);
  });

  it('is for the owner and managers: staff get 403 and nothing is created', async () => {
    const t = await createTenant('Import');
    const staff = await createStaffMember(t);

    const res = await importRows(t, staff.token, [
      { name: 'X', phone: '6900000001' },
    ]);

    expect(res.status).toBe(403);
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });
});
