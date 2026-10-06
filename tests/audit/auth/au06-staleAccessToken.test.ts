// AU-06: access tokens are never checked against server state, so they keep
// working (until their own exp, 15 min by default) after the user resets their
// password, revokes every session, or logs out.
import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { authHeader } from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';
import { login, registerAndVerify } from './_helpers';

vi.mock('../../../api/src/services/email.service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('AU-06 access tokens outlive revocation', () => {
  it('AU-06: an access token issued before a password reset is rejected afterwards', async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const stolen = await login(api, victim.email, victim.password);

    await api.post('/auth/forgot-password').send({ email: victim.email });
    const reset = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { userId: victim.user.id },
    });
    const done = await api
      .post('/auth/reset-password')
      .send({ token: reset.token, password: 'Recovered-Pass-3!' });
    expect(done.status).toBe(200);
    // Control: the refresh side IS revoked.
    expect(
      await prisma.refreshToken.count({ where: { userId: victim.user.id } }),
    ).toBe(0);

    const res = await api.get('/user/me').set(authHeader(stolen.accessToken!));
    expect(res.status).toBe(401);
  });

  it('AU-06: an access token is rejected after DELETE /auth/sessions ("log out everywhere")', async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const stolen = await login(api, victim.email, victim.password);
    const own = await login(api, victim.email, victim.password);

    const revoke = await api
      .delete('/auth/sessions')
      .set(authHeader(own.accessToken!));
    expect(revoke.status).toBe(200);

    const res = await api.get('/user/me').set(authHeader(stolen.accessToken!));
    expect(res.status).toBe(401);
  });
});
