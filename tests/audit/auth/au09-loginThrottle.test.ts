// AU-09: login attempts are limited per client IP only (authLimiter, 10 per
// 15 min, shared with register and reset-password). Nothing counts failures
// per account, so password guessing against one account is unlimited for
// anyone who can spread requests over several addresses.
//
// The limiters are pass-through under NODE_ENV=test, so this loads the real
// router with NODE_ENV=development (the pattern of
// api/src/tests/rateLimiterSwitch.test.ts) on a small app that mirrors
// app.ts: trust proxy = 1, json, cookies, /auth, ErrorHandler.
import express from "../../../api/node_modules/express";
import cookieParser from "../../../api/node_modules/cookie-parser";
import { serve } from "../../../api/src/tests/testRequest";
import { prisma } from "../../../api/src/utils/prisma";
import { uniqueEmail } from "./_helpers";

const ORIGINAL = { ...process.env };

async function realAuthApp() {
  vi.resetModules();
  Object.assign(process.env, ORIGINAL, { NODE_ENV: "development" });
  delete process.env.RATE_LIMIT_DISABLED;
  const { default: authRoutes } =
    await import("../../../api/src/routes/auth.routes");
  const { ErrorHandler } =
    await import("../../../api/src/middleware/errorHandler");
  const app = express();
  app.set("trust proxy", 1); // app.ts:27
  app.use(cookieParser());
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use(ErrorHandler);
  return serve(app);
}

afterEach(() => {
  for (const k of Object.keys(process.env))
    if (!(k in ORIGINAL)) delete process.env[k];
  Object.assign(process.env, ORIGINAL);
  vi.resetModules();
});

describe("AU-09 login throttling is per IP only", () => {
  it("AU-09: after 10 failed logins for one account, an 11th guess from another IP is throttled", async () => {
    const api = await realAuthApp();
    const email = uniqueEmail("target");
    // passwordHash only needs to exist; every guess below is wrong.
    await prisma.user.create({
      data: {
        name: "Target",
        email,
        isVerified: true,
        passwordHash:
          "$2b$04$abcdefghijklmnopqrstuuJ8xQmF3xkq0b3mXo7mM3o8QpJm8i8jS",
      },
    });
    const guess = (ip: string, i: number) =>
      api
        .post("/auth/login")
        // One trusted hop (Railway's edge) reports the client address here.
        .set("X-Forwarded-For", ip)
        .send({ email, password: `Guess-${i}!` });

    const first: number[] = [];
    for (let i = 0; i < 10; i++)
      first.push((await guess("198.51.100.7", i)).status);
    expect(first.every((s) => s === 401)).toBe(true);
    // Control: the per-IP limiter is really on in this app.
    expect((await guess("198.51.100.7", 10)).status).toBe(429);

    // Same account, next address: a per-account limit would say 429 here.
    const other = await guess("203.0.113.9", 11);
    expect(other.status).toBe(429);
  });
});
