import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { signAccessToken } from '../utils/jwt';
import { sendInviteEmail } from '../services/email.service';
import { authHeader, createTenant, unique, type Tenant } from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// A login invite links a person's account to a team member that already
// exists. It is a privilege boundary: only the invited email may accept it,
// only while it is pending and unexpired, and accepting grants exactly the
// member's own role and nothing more.

const { app } = await loadApp();
const api = await serve(app);

const PASSWORD = 'Password123!';

async function account(email: string) {
  const user = await prisma.user.create({
    data: { name: 'Person', email, isVerified: true },
  });
  return { user, token: signAccessToken(user.id) };
}

// A tenant, a login-less staff member with an email, and the invite the owner
// sends them. `token` is the secret from the invite email.
async function invited(
  opts: { role?: 'staff' | 'owner'; email?: string } = {},
) {
  const t = await createTenant('Inviter');
  const email = opts.email ?? `invitee-${unique()}@example.com`;
  const member = await prisma.userShop.create({
    data: {
      shopId: t.shop.id,
      name: 'Invitee',
      email,
      role: opts.role ?? 'staff',
      canViewCustomerDetails: false,
    },
  });
  const token = await send(t, member.id);
  const invite = await prisma.shopInvite.findFirstOrThrow({
    where: { userShopId: member.id },
  });
  return { t, member, email, token, invite };
}
type Invited = Awaited<ReturnType<typeof invited>>;

// Sends (or re-sends) the invite and returns the plain token that was emailed.
async function send(t: Tenant, memberId: string) {
  vi.mocked(sendInviteEmail).mockClear();
  const res = await api
    .post(`/api/shops/${t.shop.id}/team/${memberId}/invite`)
    .set(authHeader(t.token));
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return vi.mocked(sendInviteEmail).mock.calls[0][1];
}

const accept = (inviteId: string, token: string) =>
  api.post(`/api/invites/${inviteId}/accept`).set(authHeader(token));
const decline = (inviteId: string, token: string) =>
  api.post(`/api/invites/${inviteId}/decline`).set(authHeader(token));
const lookup = (token: string) =>
  api.get(`/api/invites/lookup?token=${encodeURIComponent(token)}`);

const state = async (i: Invited) => ({
  invite: await prisma.shopInvite.findUniqueOrThrow({
    where: { id: i.invite.id },
    select: { status: true, acceptedById: true },
  }),
  member: await prisma.userShop.findUniqueOrThrow({
    where: { id: i.member.id },
    select: {
      userId: true,
      role: true,
      canViewCustomerDetails: true,
      active: true,
    },
  }),
});

const UNTOUCHED = {
  invite: { status: 'pending', acceptedById: null },
  member: {
    userId: null,
    role: 'staff',
    canViewCustomerDetails: false,
    active: true,
  },
};

describe('accepting an invite', () => {
  it('the invited person gets the member’s own role and settings, nothing more', async () => {
    const i = await invited();
    const me = await account(i.email);

    const res = await accept(i.invite.id, me.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ shopId: i.t.shop.id, role: 'staff' });
    expect(await state(i)).toEqual({
      invite: { status: 'accepted', acceptedById: me.user.id },
      member: { ...UNTOUCHED.member, userId: me.user.id },
    });
    // No second membership was created beside the linked one.
    expect(
      await prisma.userShop.count({ where: { shopId: i.t.shop.id } }),
    ).toBe(2);

    // They are in, as staff: shop readable, owner-only action refused.
    const shop = await api
      .get(`/api/shops/${i.t.shop.id}`)
      .set(authHeader(me.token));
    expect(shop.status).toBe(200);
    expect(shop.body.data).toMatchObject({
      role: 'staff',
      canViewCustomerDetails: false,
    });
    const ownerOnly = await api
      .patch(`/api/shops/${i.t.shop.id}`)
      .set(authHeader(me.token))
      .send({ name: 'Taken Over' });
    expect(ownerOnly.status).toBe(403);
  });

  it('matches the invited email whatever its letter case', async () => {
    const i = await invited({ email: `Mixed.Case-${unique()}@Example.com` });
    const me = await account(i.email.toLowerCase());
    expect((await accept(i.invite.id, me.token)).status).toBe(200);
  });

  it('someone else cannot accept it: 404 and nothing changes', async () => {
    const i = await invited();
    const other = await account(`other-${unique()}@example.com`);

    const res = await accept(i.invite.id, other.token);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Invite not found');
    expect(await state(i)).toEqual(UNTOUCHED);
    const shop = await api
      .get(`/api/shops/${i.t.shop.id}`)
      .set(authHeader(other.token));
    expect(shop.status).toBe(404);
  });

  it('not even the owner who sent it can accept it for themselves', async () => {
    const i = await invited();
    expect((await accept(i.invite.id, i.t.token)).status).toBe(404);
    expect(await state(i)).toEqual(UNTOUCHED);
  });

  it('an unknown invite id is a 404, and no login is a 401', async () => {
    const me = await account(`nobody-${unique()}@example.com`);
    expect((await accept('no-such-invite', me.token)).status).toBe(404);
    expect((await api.post('/api/invites/whatever/accept')).status).toBe(401);
    expect((await api.post('/api/invites/whatever/decline')).status).toBe(401);
  });

  it('cannot be accepted twice', async () => {
    const i = await invited();
    const me = await account(i.email);
    expect((await accept(i.invite.id, me.token)).status).toBe(200);

    const again = await accept(i.invite.id, me.token);

    expect(again.status).toBe(400);
    expect((await state(i)).member.userId).toBe(me.user.id);
  });

  it('an expired invite is refused and links nothing', async () => {
    const i = await invited();
    const me = await account(i.email);
    await prisma.shopInvite.update({
      where: { id: i.invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await accept(i.invite.id, me.token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invite has expired');
    expect(await state(i)).toEqual(UNTOUCHED);
  });

  it('someone who already belongs to the shop gets a 409 and stays as they were', async () => {
    const i = await invited();
    const me = await account(i.email);
    const existing = await prisma.userShop.create({
      data: {
        userId: me.user.id,
        shopId: i.t.shop.id,
        role: 'staff',
        name: 'Already',
      },
    });

    const res = await accept(i.invite.id, me.token);

    expect(res.status).toBe(409);
    expect(await state(i)).toEqual(UNTOUCHED);
    expect(
      (await prisma.userShop.findUniqueOrThrow({ where: { id: existing.id } }))
        .userId,
    ).toBe(me.user.id);
  });

  it('a withdrawn invite can no longer be accepted', async () => {
    const i = await invited();
    const me = await account(i.email);
    const withdrawn = await api
      .delete(`/api/shops/${i.t.shop.id}/team/${i.member.id}/invite`)
      .set(authHeader(i.t.token));
    expect(withdrawn.status).toBe(200);

    expect((await accept(i.invite.id, me.token)).status).toBe(404);
    expect((await lookup(i.token)).status).toBe(404);
    expect(
      await prisma.shopInvite.count({ where: { userShopId: i.member.id } }),
    ).toBe(0);
    expect(
      (await prisma.userShop.findUniqueOrThrow({ where: { id: i.member.id } }))
        .userId,
    ).toBeNull();
  });
});

describe('declining an invite', () => {
  it('the invited person can decline; it can then never be accepted', async () => {
    const i = await invited();
    const me = await account(i.email);

    expect((await decline(i.invite.id, me.token)).status).toBe(200);
    expect((await state(i)).invite.status).toBe('expired');

    expect((await accept(i.invite.id, me.token)).status).toBe(400);
    expect((await decline(i.invite.id, me.token)).status).toBe(400);
    expect((await lookup(i.token)).status).toBe(400);
    expect((await state(i)).member.userId).toBeNull();
  });

  it('someone else cannot decline it: 404 and it stays pending', async () => {
    const i = await invited();
    const other = await account(`other-${unique()}@example.com`);

    expect((await decline(i.invite.id, other.token)).status).toBe(404);
    expect(await state(i)).toEqual(UNTOUCHED);
  });
});

describe('GET /api/invites', () => {
  it('shows an invite only to the person it is addressed to (and to its sender as sent)', async () => {
    const i = await invited();
    const me = await account(i.email);
    const other = await account(`other-${unique()}@example.com`);
    const list = async (token: string) =>
      (await api.get('/api/invites').set(authHeader(token))).body.data;

    expect(
      (await list(me.token)).received.map((r: { id: string }) => r.id),
    ).toEqual([i.invite.id]);
    expect(await list(other.token)).toEqual({ received: [], sent: [] });
    const owner = await list(i.t.token);
    expect(owner.received).toEqual([]);
    expect(owner.sent.map((r: { id: string }) => r.id)).toEqual([i.invite.id]);
  });

  it('never lists an expired or already answered invite as received', async () => {
    const i = await invited();
    const me = await account(i.email);
    await prisma.shopInvite.update({
      where: { id: i.invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await api.get('/api/invites').set(authHeader(me.token));
    expect(res.body.data.received).toEqual([]);
  });

  it('never exposes the token hash', async () => {
    const i = await invited();
    const me = await account(i.email);
    for (const token of [me.token, i.t.token]) {
      const res = await api.get('/api/invites').set(authHeader(token));
      expect(JSON.stringify(res.body)).not.toContain('tokenHash');
      expect(JSON.stringify(res.body)).not.toContain(i.token);
    }
  });
});

describe('GET /api/invites/lookup (the link in the email)', () => {
  it('describes a pending invite to whoever holds the token', async () => {
    const i = await invited();
    const res = await lookup(i.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      inviteId: i.invite.id,
      shopName: i.t.shop.name,
      shopSlug: i.t.shop.slug,
      role: 'staff',
      email: i.email,
    });
    expect(JSON.stringify(res.body)).not.toContain('tokenHash');
  });

  it.each([
    ['a wrong token', 'f'.repeat(64), 404],
    ['the invite id used as a token', 'INVITE_ID', 404],
    ['the stored hash used as a token', 'TOKEN_HASH', 404],
  ])('%s finds nothing', async (_l, raw, status) => {
    const i = await invited();
    const stored = await prisma.shopInvite.findUniqueOrThrow({
      where: { id: i.invite.id },
    });
    const token =
      raw === 'INVITE_ID'
        ? i.invite.id
        : raw === 'TOKEN_HASH'
          ? stored.tokenHash
          : raw;
    expect((await lookup(token)).status).toBe(status);
  });

  it('a missing token is a 400', async () => {
    expect((await api.get('/api/invites/lookup')).status).toBe(400);
  });

  it('expired and used invites are a 400', async () => {
    const expired = await invited();
    await prisma.shopInvite.update({
      where: { id: expired.invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await lookup(expired.token)).status).toBe(400);

    const used = await invited();
    const me = await account(used.email);
    await accept(used.invite.id, me.token);
    expect((await lookup(used.token)).status).toBe(400);
  });

  it('re-sending the invite replaces the token: the old link stops working', async () => {
    const i = await invited();
    const fresh = await send(i.t, i.member.id);

    expect(fresh).not.toBe(i.token);
    expect((await lookup(i.token)).status).toBe(404);
    expect((await lookup(fresh)).status).toBe(200);
    expect(
      await prisma.shopInvite.count({ where: { userShopId: i.member.id } }),
    ).toBe(1);
  });
});

describe('registering through an invite link', () => {
  const register = (email: string, inviteToken: string) =>
    api.post('/auth/register').send({
      name: 'New Person',
      email,
      password: PASSWORD,
      acceptTerms: true,
      inviteToken,
    });

  it('creates the account, links it to the member and signs in', async () => {
    const i = await invited();
    const res = await register(i.email, i.token);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: i.email },
    });
    expect(user.isVerified).toBe(true);
    expect(await state(i)).toEqual({
      invite: { status: 'accepted', acceptedById: user.id },
      member: { ...UNTOUCHED.member, userId: user.id },
    });
  });

  it('refuses a different email than the invited one and creates nothing', async () => {
    const i = await invited();
    const email = `intruder-${unique()}@example.com`;
    const res = await register(email, i.token);

    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await state(i)).toEqual(UNTOUCHED);
  });

  it('refuses a made-up, used or expired token and creates nothing', async () => {
    const i = await invited();
    expect((await register(i.email, 'f'.repeat(64))).status).toBe(400);

    await prisma.shopInvite.update({
      where: { id: i.invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await register(i.email, i.token)).status).toBe(400);
    expect(
      await prisma.user.findUnique({ where: { email: i.email } }),
    ).toBeNull();

    const used = await invited();
    expect((await register(used.email, used.token)).status).toBe(200);
    const second = await register(used.email, used.token);
    expect(second.status).toBe(400);
    expect(await prisma.user.count({ where: { email: used.email } })).toBe(1);
  });

  it('an existing account must log in and accept instead (409)', async () => {
    const i = await invited();
    await account(i.email);
    expect((await register(i.email, i.token)).status).toBe(409);
    expect(await state(i)).toEqual(UNTOUCHED);
  });
});

describe('sending an invite', () => {
  it('is owner-only, and refused for a member who already has a login', async () => {
    const i = await invited();
    const me = await account(i.email);
    await accept(i.invite.id, me.token);

    // The new staff member cannot invite, and the owner cannot re-invite them.
    const byStaff = await api
      .post(`/api/shops/${i.t.shop.id}/team/${i.member.id}/invite`)
      .set(authHeader(me.token));
    expect(byStaff.status).toBe(403);
    const again = await api
      .post(`/api/shops/${i.t.shop.id}/team/${i.member.id}/invite`)
      .set(authHeader(i.t.token));
    expect(again.status).toBe(400);
  });

  it('an invited manager becomes a manager: the role comes from the member, not the caller', async () => {
    const i = await invited({ role: 'manager' });
    const me = await account(i.email);
    expect((await accept(i.invite.id, me.token)).status).toBe(200);

    const shop = await api
      .get(`/api/shops/${i.t.shop.id}`)
      .set(authHeader(me.token));
    expect(shop.body.data.role).toBe('manager');
  });
});
