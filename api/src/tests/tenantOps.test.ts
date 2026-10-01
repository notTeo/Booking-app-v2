import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import { createTenant } from '../admin/createTenant';
import { seedHairology } from '../admin/seedHairology';
import { assertDevEnvironment } from '../admin/devGuard';
import { HAIROLOGY } from '../admin/hairologyData';

const base = {
  ownerName: 'Maria K',
  ownerEmail: 'Maria@Example.com',
  shopName: "Maria's Salon",
  slug: 'marias-salon',
};

describe('createTenant', () => {
  it('creates a verified Pro owner, the shop and an owner membership, atomically', async () => {
    const r = await createTenant({ ...base, password: 'Sup3r-Secret!' });

    expect(r.user).toMatchObject({
      email: 'maria@example.com', // lower-cased
      isVerified: true,
      isPro: true,
    });
    expect(r.shop).toMatchObject({
      slug: 'marias-salon',
      timezone: 'Europe/Athens',
    });
    expect(r.membership).toMatchObject({
      userId: r.user.id,
      shopId: r.shop.id,
      role: 'owner',
    });
    expect(r.generatedPassword).toBeNull(); // caller supplied it
  });

  it('the created owner can actually log in and sees the shop', async () => {
    await createTenant({ ...base, password: 'Sup3r-Secret!' });

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'maria@example.com', password: 'Sup3r-Secret!' });
    expect(login.status).toBe(200);

    const shops = await request(app)
      .get('/api/shops')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(shops.body.data.map((s: { slug: string }) => s.slug)).toEqual([
      'marias-salon',
    ]);
  });

  it('generates a password that satisfies the password rules and works to log in', async () => {
    const r = await createTenant(base);
    const pw = r.generatedPassword!;
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(pw).toMatch(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/);
    expect(pw.length).toBeGreaterThanOrEqual(8);

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'maria@example.com', password: pw });
    expect(login.status).toBe(200);
  });

  it('never stores the password in plain text', async () => {
    const r = await createTenant({ ...base, password: 'Sup3r-Secret!' });
    expect(r.user.passwordHash).not.toContain('Sup3r-Secret!');
  });

  it.each([
    ['a reserved slug', { slug: 'dashboard' }, /reserved/i],
    ['a too-short slug', { slug: 'ab' }, /Slug/],
    ['a bad email', { ownerEmail: 'nope' }, /email/i],
    ['an unknown timezone', { timezone: 'Mars/Base' }, /timezone/i],
    ['a too-short password', { password: 'short' }, /Password/],
  ])('rejects %s and creates nothing', async (_l, over, msg) => {
    await expect(createTenant({ ...base, ...over })).rejects.toThrow(msg);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.shop.count()).toBe(0);
  });

  it('refuses a duplicate email or slug and never overwrites', async () => {
    const first = await createTenant({ ...base, password: 'Sup3r-Secret!' });

    await expect(
      createTenant({ ...base, slug: 'other-slug', password: 'Different-1!' }),
    ).rejects.toThrow(/already exists/);
    await expect(
      createTenant({
        ...base,
        ownerEmail: 'other@example.com',
        password: 'Different-1!',
      }),
    ).rejects.toThrow(/already exists/);

    const user = await prisma.user.findUnique({ where: { id: first.user.id } });
    expect(user!.passwordHash).toBe(first.user.passwordHash);
    expect(await prisma.shop.count()).toBe(1);
  });
});

describe('seedHairology', () => {
  const data = {
    ...HAIROLOGY,
    staff: [{ name: 'Anna' }],
    services: [
      { name: 'Cut', duration: 30, price: 2000 },
      { name: 'Colour', duration: 90, price: 6000 },
    ],
  };
  const owner = {
    ownerName: 'Owner',
    ownerEmail: 'owner@hairology.test',
    password: 'Sup3r-Secret!',
  };

  it('refuses to run while the placeholder data is unconfirmed', async () => {
    await expect(seedHairology({ ...owner })).rejects.toThrow(
      /not been confirmed/,
    );
    expect(await prisma.shop.count()).toBe(0);
  });

  it('creates the shop, team, services and hours — and no demo data', async () => {
    const r = await seedHairology({ ...owner, data, confirmed: true });

    expect(r.shop).toMatchObject({
      slug: 'hairology',
      timezone: 'Europe/Athens',
    });
    expect(await prisma.service.count({ where: { shopId: r.shop.id } })).toBe(
      2,
    );
    // owner + Anna; everyone performs every service
    expect(await prisma.userShop.count({ where: { shopId: r.shop.id } })).toBe(
      2,
    );
    expect(await prisma.staffService.count()).toBe(4);
    expect(await prisma.customer.count()).toBe(0);
    expect(await prisma.booking.count()).toBe(0);

    // Hours are per team member: no shop-level schedule, one per member.
    expect(
      await prisma.shopWorkingSchedule.count({
        where: { shopId: r.shop.id, staffId: null },
      }),
    ).toBe(0);
    const schedules = await prisma.shopWorkingSchedule.findMany({
      where: { shopId: r.shop.id },
      include: { days: { include: { hours: true } } },
    });
    expect(schedules).toHaveLength(2);
    for (const schedule of schedules) {
      expect(schedule.days).toHaveLength(7);
      const sun = schedule.days.find((d) => d.day === 'SUN')!;
      expect(sun.isOpen).toBe(false);
      const mon = schedule.days.find((d) => d.day === 'MON')!;
      expect(mon.hours.map((h) => [h.startTime, h.endTime])).toEqual([
        ['10:00', '20:00'],
      ]);
    }
  });

  it('produces a shop the public booking page can actually serve', async () => {
    await seedHairology({ ...owner, data, confirmed: true });

    const res = await request(app).get('/public/hairology');
    expect(res.status).toBe(200);
    expect(
      res.body.data.services.map((s: { name: string }) => s.name).sort(),
    ).toEqual(['Colour', 'Cut']);
    expect(
      res.body.data.members.map((m: { name: string }) => m.name).sort(),
    ).toEqual(['Anna', 'Owner']);
  });

  it('refuses to run twice and leaves the first run untouched', async () => {
    const first = await seedHairology({ ...owner, data, confirmed: true });
    await expect(
      seedHairology({ ...owner, data, confirmed: true }),
    ).rejects.toThrow(/already exists/);

    expect(
      await prisma.service.count({ where: { shopId: first.shop.id } }),
    ).toBe(2);
    expect(await prisma.shop.count()).toBe(1);
  });
});

describe('assertDevEnvironment', () => {
  it('allows development and test', () => {
    expect(() => assertDevEnvironment('development', 'x')).not.toThrow();
    expect(() => assertDevEnvironment('test', 'x')).not.toThrow();
  });

  it('refuses production, and an unset NODE_ENV (unsafe by default)', () => {
    expect(() => assertDevEnvironment('production', 'seed-x')).toThrow(
      /dev-only.*production/,
    );
    expect(() => assertDevEnvironment(undefined, 'seed-x')).toThrow(/unset/);
    expect(() => assertDevEnvironment('staging', 'seed-x')).toThrow(/dev-only/);
  });
});
