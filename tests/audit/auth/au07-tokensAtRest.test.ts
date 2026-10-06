// AU-07: single-use account tokens and refresh tokens are stored verbatim, so
// read access to the database (backup, replica, SQL console, injection) is
// enough to take over accounts. Invite tokens, by contrast, are stored hashed
// (team.service.ts sendLoginInvite -> hashToken).
import app from "../../../api/src/app";
import { serve } from "../../../api/src/tests/testRequest";
import { authHeader } from "../../../api/src/tests/helpers";
import { prisma } from "../../../api/src/utils/prisma";
import * as emailService from "../../../api/src/services/email.service";
import {
  login,
  registerAndVerify,
  uniqueEmail,
  STRONG_PASSWORD,
} from "./_helpers";

vi.mock("../../../api/src/services/email.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: vi.fn().mockResolvedValue(undefined),
}));

describe("AU-07 secrets at rest", () => {
  it("AU-07: the password-reset token in the database is not the one that was emailed", async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    await api.post("/auth/forgot-password").send({ email: victim.email });

    const emailed = vi
      .mocked(emailService.sendPasswordResetEmail)
      .mock.calls.at(-1)![1];
    const row = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { userId: victim.user.id },
    });
    expect(emailed).toMatch(/^[0-9a-f]{64}$/); // control: we captured the token
    expect(row.token).not.toBe(emailed);
  });

  it("AU-07: the email-verification token of a pending registration is not stored verbatim", async () => {
    const api = await serve(app);
    const email = uniqueEmail("pending");
    await api
      .post("/auth/register")
      .send({ name: "P", email, password: STRONG_PASSWORD, acceptTerms: true });
    const emailed = vi
      .mocked(emailService.sendVerificationEmail)
      .mock.calls.at(-1)![1];
    const row = await prisma.pendingRegistration.findUniqueOrThrow({
      where: { email },
    });
    expect(row.token).not.toBe(emailed);
  });

  it("AU-07: the email-change token is not stored verbatim", async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const session = await login(api, victim.email, victim.password);
    await api
      .patch("/user/me")
      .set(authHeader(session.accessToken!))
      .send({ email: uniqueEmail("new"), currentPassword: victim.password });
    const emailed = vi
      .mocked(emailService.sendEmailChangeVerification)
      .mock.calls.at(-1)![1];
    const row = await prisma.pendingEmailChange.findUniqueOrThrow({
      where: { userId: victim.user.id },
    });
    expect(row.token).not.toBe(emailed);
  });

  it("AU-07: the refresh token in the database is not the cookie value", async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const session = await login(api, victim.email, victim.password);
    expect(session.refreshToken.split(".")).toHaveLength(3); // control: a JWT

    const rows = await prisma.refreshToken.findMany({
      where: { userId: victim.user.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].token).not.toBe(session.refreshToken);
  });
});
