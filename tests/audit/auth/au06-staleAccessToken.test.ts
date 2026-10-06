// AU-06: access tokens are never checked against server state, so they keep
// working (until their own exp, 15 min by default) after the user resets their
// password, revokes every session, or logs out.
import app from "../../../api/src/app";
import { serve } from "../../../api/src/tests/testRequest";
import { authHeader } from "../../../api/src/tests/helpers";
import { prisma } from "../../../api/src/utils/prisma";
import { emailedToken, login, registerAndVerify } from "./_helpers";

vi.mock("../../../api/src/services/email.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("AU-06 access tokens outlive revocation", () => {
  // ACCEPTED BY DESIGN (decision D4, 2026-10-06): an access token lives out
  // its 15 minutes; see docs/deployment.md "Known limits". These two tests
  // now document that, and that the refresh side is what gets revoked.
  it("AU-06 (accepted): an access token issued before a password reset still works until it expires", async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const stolen = await login(api, victim.email, victim.password);

    await api.post("/auth/forgot-password").send({ email: victim.email });
    const done = await api.post("/auth/reset-password").send({
      token: emailedToken("sendPasswordResetEmail", victim.email),
      password: "Recovered-Pass-3!",
    });
    expect(done.status).toBe(200);
    // Control: the refresh side IS revoked.
    expect(
      await prisma.refreshToken.count({ where: { userId: victim.user.id } }),
    ).toBe(0);

    const res = await api.get("/user/me").set(authHeader(stolen.accessToken!));
    expect(res.status).toBe(200);
    // What it cannot do any more: outlive its 15 minutes, or take the account.
    const refreshed = await api
      .post("/auth/refresh")
      .set("Cookie", stolen.cookie);
    expect(refreshed.status).toBe(401);
    const takeover = await api
      .patch("/user/me")
      .set(authHeader(stolen.accessToken!))
      .send({ password: "Attacker-Pass-2!" });
    expect(takeover.status).toBe(403);
  });

  it("AU-06 (accepted): an access token still works after DELETE /auth/sessions, but cannot be refreshed", async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const stolen = await login(api, victim.email, victim.password);
    const own = await login(api, victim.email, victim.password);

    const revoke = await api
      .delete("/auth/sessions")
      .set(authHeader(own.accessToken!));
    expect(revoke.status).toBe(200);

    const res = await api.get("/user/me").set(authHeader(stolen.accessToken!));
    expect(res.status).toBe(200);
    const refreshed = await api
      .post("/auth/refresh")
      .set("Cookie", stolen.cookie);
    expect(refreshed.status).toBe(401);
  });
});
