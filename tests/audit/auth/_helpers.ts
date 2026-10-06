// Shared helpers for the auth audit tests (not a test file).
import { prisma } from '../../../api/src/utils/prisma';
import type { serve } from '../../../api/src/tests/testRequest';

export type Api = Awaited<ReturnType<typeof serve>>;

export const STRONG_PASSWORD = 'Victim-Pass-1!';
export const OTHER_PASSWORD = 'Attacker-Pass-2!';

let n = 0;
// Plain lowercase local part on a non-gmail domain, so normalizeEmail() leaves
// it untouched and DB lookups by the same string work.
export const uniqueEmail = (label = 'user') =>
  `${label}${Date.now()}x${++n}@audit-example.com`;

/**
 * A real account made the way production makes one: POST /auth/register, then
 * GET /auth/verify-email with the token from the PendingRegistration row.
 */
export async function registerAndVerify(
  api: Api,
  email = uniqueEmail(),
  password = STRONG_PASSWORD,
) {
  const reg = await api
    .post('/auth/register')
    .send({ name: 'Audit User', email, password, acceptTerms: true });
  if (reg.status !== 201)
    throw new Error(`setup: register failed ${reg.status} ${reg.text}`);
  const pending = await prisma.pendingRegistration.findUniqueOrThrow({
    where: { email },
  });
  const ver = await api.get('/auth/verify-email').query({ token: pending.token });
  if (ver.status !== 200)
    throw new Error(`setup: verify failed ${ver.status} ${ver.text}`);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { email, password, user };
}

export async function login(api: Api, email: string, password: string) {
  const res = await api.post('/auth/login').send({ email, password });
  const setCookie = (res.headers['set-cookie'] ?? []) as unknown as string[];
  const cookie = setCookie.find((c) => c.startsWith('refreshToken=')) ?? '';
  return {
    status: res.status,
    accessToken: res.body?.data?.accessToken as string | undefined,
    // "refreshToken=<jwt>" ready for a Cookie header
    cookie: cookie.split(';')[0],
    refreshToken: cookie.split(';')[0].replace('refreshToken=', ''),
  };
}
