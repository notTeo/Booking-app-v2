import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
} from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

const { app } = await loadApp();
const api = await serve(app);

describe('removing a team member who still has bookings', () => {
  it('is a 409 CONFLICT_REFERENCED, which the web maps to "deactivate instead"', async () => {
    const t = await createTenant('RemoveConflict');
    const staff = await createStaffMember(t, 'Booked');
    const booking = await createBookingRow(t);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { staffId: staff.staff.id },
    });

    const res = await api
      .delete(`/api/shops/${t.shop.id}/team/${staff.staff.id}`)
      .set(authHeader(t.token));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT_REFERENCED');
    expect(await prisma.userShop.count({ where: { id: staff.staff.id } })).toBe(
      1,
    );
  });
});
