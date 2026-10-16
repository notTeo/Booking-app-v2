import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import webpush from 'web-push';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import {
  addManager,
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  unique,
  type Tenant,
} from './helpers';
import {
  sendBookingCancelledNotificationEmail,
  sendNewBookingNotificationEmail,
} from '../services/email.service';
import {
  notifyShopOfBooking,
  type ShopNotice,
} from '../services/notify.service';

const api = await serve(app);

// Every email is a no-op spy; the date helpers stay real (push text uses them).
vi.mock('../services/email.service', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('../services/email.service')>();
  const spies = Object.fromEntries(
    Object.entries(real).map(([k, v]) => [
      k,
      k.startsWith('send') ? vi.fn().mockResolvedValue(undefined) : v,
    ]),
  );
  return spies;
});
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

const sendPush = vi.mocked(webpush.sendNotification);
const newEmail = vi.mocked(sendNewBookingNotificationEmail);
const cancelledEmail = vi.mocked(sendBookingCancelledNotificationEmail);

// Push is on for these tests (no VAPID keys in the test env otherwise).
const pushBefore = env.push;
env.push = {
  publicKey: 'pub-key',
  privateKey: 'priv',
  subject: 'mailto:t@example.com',
};
afterAll(() => {
  env.push = pushBefore;
});

beforeEach(() => {
  newEmail.mockClear();
  cancelledEmail.mockClear();
  sendPush.mockReset();
  sendPush.mockResolvedValue({} as never);
});

const notice = (t: Tenant): ShopNotice => ({
  shopId: t.shop.id,
  shopName: t.shop.name,
  shopSlug: t.shop.slug,
  timezone: 'Europe/Athens',
  customerName: 'Maria',
  customerPhone: '6900000000',
  serviceName: 'Cut',
  staffName: 'Nick',
  startTime: new Date('2026-12-10T08:00:00.000Z'),
});

async function tenant() {
  const t = await createTenant('Notify');
  await prisma.userShop.update({
    where: { id: t.staff.id },
    data: { email: `owner-${unique()}@example.com` },
  });
  return t;
}

const subscribe = (userId: string) =>
  prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: `https://push.example/${randomUUID()}`,
      p256dh: 'p',
      auth: 'a',
    },
  });

const emailedTo = (spy: typeof newEmail) =>
  spy.mock.calls.map(([p]) => p.email);

describe('notifyShopOfBooking: who hears about it', () => {
  it('emails the owner, and a manager only when the owner allowed it; never staff', async () => {
    const t = await tenant();
    const allowed = await addManager(t, 'Allowed');
    await prisma.userShop.update({
      where: { id: allowed.staff.id },
      data: { managerEmailNotifications: true, email: 'allowed@example.com' },
    });
    await addManager(t, 'NotAllowed');
    await createStaffMember(t);

    await notifyShopOfBooking('new', notice(t));

    const owner = await prisma.userShop.findUniqueOrThrow({
      where: { id: t.staff.id },
    });
    expect(emailedTo(newEmail).sort()).toEqual(
      [owner.email, 'allowed@example.com'].sort(),
    );
  });

  it("respects the person's own email switch", async () => {
    const t = await tenant();
    await prisma.user.update({
      where: { id: t.user.id },
      data: { emailNotifications: false },
    });

    await notifyShopOfBooking('new', notice(t));

    expect(newEmail).not.toHaveBeenCalled();
  });

  it('pushes to every phone of the owner and of managers allowed push, not to others', async () => {
    const t = await tenant();
    await subscribe(t.user.id);
    await subscribe(t.user.id);
    const pushed = await addManager(t, 'Pushed');
    await prisma.userShop.update({
      where: { id: pushed.staff.id },
      data: { managerPushNotifications: true },
    });
    await subscribe(pushed.user.id);
    const quiet = await addManager(t, 'Quiet');
    await subscribe(quiet.user.id);

    await notifyShopOfBooking('cancelled', notice(t));

    expect(sendPush).toHaveBeenCalledTimes(3);
    const payload = JSON.parse(sendPush.mock.calls[0][1] as string);
    expect(payload.url).toBe(`/shops/${t.shop.slug}/bookings`);
    expect(payload.title).toContain(t.shop.name);
    expect(payload.body).toContain('Maria');
  });

  it('forgets a phone whose push subscription is gone (410)', async () => {
    const t = await tenant();
    const sub = await subscribe(t.user.id);
    sendPush.mockRejectedValueOnce(
      Object.assign(new Error('Gone'), { statusCode: 410 }),
    );

    await notifyShopOfBooking('new', notice(t));

    expect(
      await prisma.pushSubscription.findUnique({ where: { id: sub.id } }),
    ).toBeNull();
  });
});

describe('a customer cancelling tells the shop', () => {
  it('sends the owner the cancelled notice', async () => {
    const t = await tenant();
    await addWeeklySchedule(t);
    const customer = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Cust', phone: unique() },
    });
    const token = randomUUID();
    const start = new Date('2026-12-10T08:00:00.000Z');
    await prisma.booking.create({
      data: {
        shopId: t.shop.id,
        customerId: customer.id,
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
        cancelToken: token,
      },
    });

    const res = await api.post('/public/cancel').send({ token });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    await vi.waitFor(() => expect(cancelledEmail).toHaveBeenCalledTimes(1));
    expect(cancelledEmail.mock.calls[0][0]).toMatchObject({
      customerName: 'Cust',
      staffName: t.staff.name,
    });
  });
});

describe('/user/me/notifications and push subscriptions', () => {
  it('reports what the owner receives and saves their email switch', async () => {
    const t = await tenant();
    const get = await api
      .get('/user/me/notifications')
      .set(authHeader(t.token));
    expect(get.status).toBe(200);
    expect(get.body.data).toEqual({
      emailNotifications: true,
      receivesEmail: true,
      receivesPush: true,
      pushPublicKey: 'pub-key',
    });

    const off = await api
      .patch('/user/me/notifications')
      .set(authHeader(t.token))
      .send({ emailNotifications: false });
    expect(off.status).toBe(200);
    expect(off.body.data.emailNotifications).toBe(false);
  });

  it('tells a manager without permission and staff that they receive nothing', async () => {
    const t = await tenant();
    const manager = await addManager(t);
    const staff = await createStaffMember(t);
    for (const who of [manager, staff]) {
      const res = await api
        .get('/user/me/notifications')
        .set(authHeader(who.token));
      expect(res.body.data).toMatchObject({
        receivesEmail: false,
        receivesPush: false,
      });
    }
  });

  it('subscribes this phone, and only its owner can remove it', async () => {
    const t = await tenant();
    const other = await createTenant('Other');
    const endpoint = `https://push.example/${randomUUID()}`;

    const add = await api
      .post('/user/me/push-subscriptions')
      .set(authHeader(t.token))
      .send({ endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(add.status).toBe(201);

    await api
      .delete('/user/me/push-subscriptions')
      .set(authHeader(other.token))
      .send({ endpoint });
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(
      1,
    );

    await api
      .delete('/user/me/push-subscriptions')
      .set(authHeader(t.token))
      .send({ endpoint });
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(
      0,
    );
  });

  it('rejects a push endpoint that is not https', async () => {
    const t = await tenant();
    const res = await api
      .post('/user/me/push-subscriptions')
      .set(authHeader(t.token))
      .send({
        endpoint: 'http://push.example/x',
        keys: { p256dh: 'p', auth: 'a' },
      });
    expect(res.status).toBe(400);
  });
});

describe("a manager's notification permissions", () => {
  const patch = (t: Tenant, token: string, memberId: string, body: object) =>
    api
      .patch(`/api/shops/${t.shop.id}/team/${memberId}`)
      .set(authHeader(token))
      .send({ role: 'manager', ...body });

  it('the owner can turn them on', async () => {
    const t = await tenant();
    const m = await addManager(t);
    const res = await patch(t, t.token, m.staff.id, {
      managerEmailNotifications: true,
      managerPushNotifications: true,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await prisma.userShop.findUniqueOrThrow({
      where: { id: m.staff.id },
    });
    expect(row).toMatchObject({
      managerEmailNotifications: true,
      managerPushNotifications: true,
    });
  });

  it('another manager cannot', async () => {
    const t = await tenant();
    const boss = await addManager(t, 'Boss');
    const m = await addManager(t, 'Target');
    const res = await patch(t, boss.token, m.staff.id, {
      managerPushNotifications: true,
    });
    expect(res.status).toBe(403);
  });
});
