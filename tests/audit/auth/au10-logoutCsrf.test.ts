// AU-10: POST /auth/logout is authenticated only by the refresh cookie, which
// production sets with SameSite=None (auth.controller.ts:40,69,97), and does
// not look at Origin. Any site the user visits can end their session.
import app from "../../../api/src/app";
import { serve } from "../../../api/src/tests/testRequest";
import { prisma } from "../../../api/src/utils/prisma";
import { login, registerAndVerify } from "./_helpers";

vi.mock("../../../api/src/services/email.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("AU-10 cross-site logout", () => {
  it("AU-10: a cookie-only POST /auth/logout from a foreign Origin does not end the session", async () => {
    const api = await serve(app);
    const victim = await registerAndVerify(api);
    const session = await login(api, victim.email, victim.password);
    expect(
      await prisma.refreshToken.count({ where: { userId: victim.user.id } }),
    ).toBe(1);

    // What a browser sends for <form method=post action=".../auth/logout"> on
    // evil.example when the cookie is SameSite=None: cookie + foreign Origin,
    // no Authorization header, no custom header.
    await api
      .post("/auth/logout")
      .set("Origin", "https://evil.example")
      .set("Cookie", session.cookie)
      .type("form")
      .send("");

    expect(
      await prisma.refreshToken.count({ where: { userId: victim.user.id } }),
    ).toBe(1);
  });
});
