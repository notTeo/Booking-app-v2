import { randomUUID } from 'crypto';
import { describe, it, expect, vi } from 'vitest';
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

vi.mock('../services/email.service');

const patch = (t: Tenant, body: object, token = t.token) =>
  api.patch(`/api/shops/${t.shop.id}`).set(authHeader(token)).send(body);
const publicInfo = async (t: Tenant) =>
  (await api.get(`/public/${t.shop.slug}`)).body.data;

describe('the public booking page look (shop.publicPalette / publicFont)', () => {
  it('defaults to black and white with the standard fonts', async () => {
    const t = await createTenant('Brand');
    expect(await publicInfo(t)).toMatchObject({
      publicPalette: 'mono',
      publicFont: 'default',
    });
  });

  it('can be changed, and the public page gets the new look', async () => {
    const t = await createTenant('Brand');
    const res = await patch(t, {
      publicPalette: 'rose',
      publicFont: 'manrope',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      publicPalette: 'rose',
      publicFont: 'manrope',
    });
    expect(await publicInfo(t)).toMatchObject({
      publicPalette: 'rose',
      publicFont: 'manrope',
    });
  });

  it.each([
    { publicPalette: 'neon' },
    { publicPalette: '#ff0000' },
    { publicPalette: 5 },
    { publicFont: 'Comic Sans' },
    { publicFont: '' },
  ])('rejects %o with 400', async (body) => {
    const t = await createTenant('Brand');
    expect((await patch(t, body)).status).toBe(400);
    expect(await publicInfo(t)).toMatchObject({
      publicPalette: 'mono',
      publicFont: 'default',
    });
  });

  it('follows the shop-settings permission', async () => {
    const t = await createTenant('Brand');
    const staff = await createStaffMember(t);
    const limited = await addManager(t, 'Limited', {
      canEditShopSettings: false,
    });
    const body = { publicPalette: 'blue' };
    expect((await patch(t, body, staff.token)).status).toBe(403);
    expect((await patch(t, body, limited.token)).status).toBe(403);
    expect((await patch(t, body)).status).toBe(200);
  });

  it("comes with the customer's own booking, for the reschedule page", async () => {
    const t = await createTenant('Brand');
    await patch(t, { publicPalette: 'sand', publicFont: 'alegreya' });
    const booking = await createBookingRow(t);
    const token = randomUUID();
    await prisma.booking.update({
      where: { id: booking.id },
      data: { cancelToken: token },
    });
    const res = await api.post('/public/booking').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.data.shop).toMatchObject({
      publicPalette: 'sand',
      publicFont: 'alegreya',
    });
  });
});
