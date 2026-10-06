// AU-04 / AU-05: account existence is observable without credentials.
import app from "../../../api/src/app";
import { serve } from "../../../api/src/tests/testRequest";
import { STRONG_PASSWORD, registerAndVerify, uniqueEmail } from "./_helpers";

vi.mock("../../../api/src/services/email.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

describe("user enumeration", () => {
  it("AU-04: POST /auth/register answers the same for a registered and an unregistered email", async () => {
    const api = await serve(app);
    const existing = await registerAndVerify(api);
    const body = (email: string) => ({
      name: "Probe",
      email,
      password: STRONG_PASSWORD,
      acceptTerms: true,
    });

    const fresh = await api
      .post("/auth/register")
      .send(body(uniqueEmail("new")));
    const taken = await api.post("/auth/register").send(body(existing.email));

    expect({ status: taken.status, body: taken.body }).toEqual({
      status: fresh.status,
      body: fresh.body,
    });
  });

  it("AU-05: POST /auth/login takes about as long for an unknown email as for a known one", async () => {
    const api = await serve(app);
    const existing = await registerAndVerify(api);
    const time = async (email: string) => {
      const t0 = performance.now();
      const res = await api
        .post("/auth/login")
        .send({ email, password: "Wrong-Pass-9!" });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials"); // control: same body
      return performance.now() - t0;
    };

    // Warm up, then interleave so drift hits both equally.
    await time(existing.email);
    await time(uniqueEmail("ghost"));
    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 5; i++) {
      known.push(await time(existing.email));
      unknown.push(await time(uniqueEmail("ghost")));
    }
    const gap = median(known) - median(unknown);
    // bcrypt cost 12 is ~150-300ms; a login that skips it returns in a few ms.
    expect(gap).toBeLessThan(50);
  });
});
