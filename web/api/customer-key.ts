// A Vercel function, served by the web app's own host at /api/customer-key.
//
// The API hands a returning customer's browser its key in a cookie
// (api/src/services/customerDevice.service.ts). The API runs on another
// company's servers than this site, and Safari keeps a cookie set from such a
// host for seven days only. A customer who books once a month would then be a
// stranger every time. A cookie set by the site itself keeps its full life, so
// the page asks here for the same cookie to be set again, unchanged. The key
// never passes through the page's scripts.

const COOKIE = 'customerKey';
// 32 random bytes, base64url: what the API issues.
const KEY_FORMAT = /^[A-Za-z0-9_-]{43}$/;
// Browsers cap a cookie's life at about 400 days.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

interface FunctionRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface FunctionResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): { end(): unknown };
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

/** The key in a Cookie header, or null when there is none (or something else in its place). */
export const keyFrom = (cookieHeader: string): string | null => {
  const found = cookieHeader
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === COOKIE);
  const key = found?.slice(1).join('=');
  return key && KEY_FORMAT.test(key) ? key : null;
};

/** The same cookie the API sets, for the whole site ("www." and the API's subdomain included). */
export const renewedCookie = (key: string, host: string): string => {
  const site = host.split(':')[0].replace(/^www\./, '');
  return `${COOKIE}=${key}; Domain=${site}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
};

export default function handler(req: FunctionRequest, res: FunctionResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const key = keyFrom(header(req.headers.cookie));
  if (req.method === 'POST' && key) res.setHeader('Set-Cookie', renewedCookie(key, header(req.headers.host)));
  res.status(204).end();
}
