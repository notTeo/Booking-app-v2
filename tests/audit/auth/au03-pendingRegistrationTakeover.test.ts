// AU-03: POST /auth/register replaces any pending registration for the same
// email, password included, and GET /auth/verify-email then creates the
// account with whatever password was submitted last. Whoever submits last
// chooses the password; whoever owns the mailbox merely activates it.
import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  authHeader,
  createTenant,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';
import { OTHER_PASSWORD, STRONG_PASSWORD, login, uniqueEmail } from './_helpers';

vi.mock('../../../api/src/services/email.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

const register = (
  api: Awaited<ReturnType<typeof serve>>,
  email: string,
  password: string,
  name: string,
) =>
  api
    .post('/auth/register')
    .send({ name, email, password, acceptTerms: true });

describe('AU-03 pending registration can be overwritten by anyone', () => {
  it('AU-03: a password set by a second, unauthenticated registration for the same email does not become the account password', async () => {
    const api = await serve(app);
    const email = uniqueEmail('victim');

    // Victim starts signing up.
    expect((await register(api, email, STRONG_PASSWORD, 'Victim')).status).toBe(201);
    // Attacker, who has no access to the mailbox, re-registers the same email.
    await register(api, email, OTHER_PASSWORD, 'Attacker');

    // Victim clicks the newest "verify your email" link in their inbox.
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email },
    });
    if (pending)
      await api.get('/auth/verify-email').query({ token: pending.token });

    // The attacker never proved control of the mailbox, so their password
    // must not log in.
    const asAttacker = await login(api, email, OTHER_PASSWORD);
    expect(asAttacker.status).toBe(401);
  });

  it('AU-03: ...and so cannot be used to accept a shop invite addressed to the victim', async () => {
    const api = await serve(app);
    const email = uniqueEmail('victim');
    const t = await createTenant('Inviter');

    // The owner invites the victim's address as a manager.
    const created = await api
      .post(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token))
      .send({ name: 'Victim', email, role: 'manager' });
    expect(created.status).toBe(201);
    const invite = await prisma.shopInvite.findFirstOrThrow({
      where: { shopId: t.shop.id, email },
    });

    // Attacker registers the victim's email with their own password; the
    // victim (expecting mail from this product) clicks the verification link.
    await register(api, email, OTHER_PASSWORD, 'Attacker');
    const pending = await prisma.pendingRegistration.findUniqueOrThrow({
      where: { email },
    });
    await api.get('/auth/verify-email').query({ token: pending.token });

    // Attacker logs in with the password they chose and accepts the invite.
    const asAttacker = await login(api, email, OTHER_PASSWORD);
    if (asAttacker.accessToken)
      await api
        .post(`/api/invites/${invite.id}/accept`)
        .set(authHeader(asAttacker.accessToken));

    const membership = await prisma.userShop.findUniqueOrThrow({
      where: { id: created.body.data.id },
    });
    // Nobody holding only the attacker's password may end up as the manager.
    expect(asAttacker.status === 200 && membership.userId !== null).toBe(false);
  });
});
