// AU-02: PATCH /user/me changes the password, and starts an email change, on
// the strength of a bearer access token alone - no current password. A pending
// email change also survives a password reset.
import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { authHeader } from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';
import {
  OTHER_PASSWORD,
  STRONG_PASSWORD,
  login,
  registerAndVerify,
  uniqueEmail,
} from './_helpers';

vi.mock('../../../api/src/services/email.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: vi.fn().mockResolvedValue(undefined),
}));

describe('AU-02 sensitive account changes without re-authentication', () => {
  it('AU-02: PATCH /user/me refuses a new password when the current one is not supplied', async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const session = await login(api, victim.email, victim.password);

    // All an attacker holds is a (stolen) 15-minute access token.
    const res = await api
      .patch('/user/me')
      .set(authHeader(session.accessToken!))
      .send({ password: OTHER_PASSWORD });

    expect(res.status).not.toBe(200);
    // And the attacker's password must not open the account.
    const asAttacker = await login(api, victim.email, OTHER_PASSWORD);
    expect(asAttacker.status).toBe(401);
  });

  it('AU-02: PATCH /user/me refuses to start an email change when the current password is not supplied', async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const session = await login(api, victim.email, victim.password);

    const res = await api
      .patch('/user/me')
      .set(authHeader(session.accessToken!))
      .send({ email: uniqueEmail('attacker') });

    expect(res.status).not.toBe(200);
    expect(
      await prisma.pendingEmailChange.count({ where: { userId: victim.user.id } }),
    ).toBe(0);
  });

  it('AU-02: a pending email change does not survive a password reset', async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const session = await login(api, victim.email, victim.password);
    const attackerEmail = uniqueEmail('attacker');

    // Attacker, with the stolen access token, queues an email change to a
    // mailbox they control. The link goes to THEIR inbox.
    await api
      .patch('/user/me')
      .set(authHeader(session.accessToken!))
      .send({ email: attackerEmail });
    const pending = await prisma.pendingEmailChange.findUnique({
      where: { userId: victim.user.id },
    });
    expect(pending).not.toBeNull(); // setup: today this is accepted (see above)

    // Victim notices something is off and recovers the account properly.
    await api.post('/auth/forgot-password').send({ email: victim.email });
    const reset = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { userId: victim.user.id },
    });
    const done = await api
      .post('/auth/reset-password')
      .send({ token: reset.token, password: 'Recovered-Pass-3!' });
    expect(done.status).toBe(200);

    // Attacker now clicks the link they were sent before the reset.
    const hijack = await api
      .get('/auth/verify-email-change')
      .query({ token: pending!.token });
    expect(hijack.status).toBe(400);
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: victim.user.id },
    });
    expect(after.email).toBe(victim.email);
    expect(STRONG_PASSWORD).toBe(victim.password);
  });
});
