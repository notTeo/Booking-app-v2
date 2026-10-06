// AU-08: env parsing only checks that the two JWT secrets are non-empty. A
// one-character secret, or the same value for both, boots fine. Access and
// refresh tokens carry the same claims ({ userId, iat, exp }) with no type /
// audience, so with equal secrets a 30-day refresh token IS a valid access
// token.
import jwt from "../../../api/node_modules/jsonwebtoken";
import { parseEnv } from "../../../api/src/config/parseEnv";
import {
  signRefreshToken,
  verifyAccessToken,
} from "../../../api/src/utils/jwt";
import { env } from "../../../api/src/config/env";

const BASE = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  CLIENT_URLS: "https://example.gr",
  RESEND_API_KEY: "re_x",
  EMAIL_FROM: "noreply@example.gr",
  S3_ENDPOINT: "https://s3.example.com",
  S3_REGION: "auto",
  S3_BUCKET: "b",
  S3_ACCESS_KEY_ID: "k",
  S3_SECRET_ACCESS_KEY: "s",
} as NodeJS.ProcessEnv;

describe("AU-08 JWT secret policy", () => {
  it("AU-08: production config with a trivially short JWT secret is rejected", () => {
    const parsed = parseEnv({
      ...BASE,
      JWT_ACCESS_SECRET: "a",
      JWT_REFRESH_SECRET: "b",
    });
    expect(parsed.env).toBeNull();
  });

  it("AU-08: production config with identical access and refresh secrets is rejected", () => {
    const same = "x".repeat(64);
    const parsed = parseEnv({
      ...BASE,
      JWT_ACCESS_SECRET: same,
      JWT_REFRESH_SECRET: same,
    });
    expect(parsed.env).toBeNull();
  });

  it("AU-08: a refresh token is distinguishable from an access token by its claims, not only by the signing key", () => {
    const refresh = signRefreshToken("user_1");
    const claims = jwt.decode(refresh) as Record<string, unknown>;
    // Control: under the test config the secrets differ, so today the key is
    // the only thing keeping a refresh token out of `authenticate`.
    expect(env.jwt.accessSecret).not.toBe(env.jwt.refreshSecret);
    expect(() => verifyAccessToken(refresh)).toThrow();
    // Secure: some claim (typ / aud / token_use) marks what the token is for.
    const marker = claims.typ ?? claims.aud ?? claims.type ?? claims.token_use;
    expect(marker).toBeDefined();
  });
});
