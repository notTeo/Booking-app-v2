import { createHash, randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import type { Prisma } from '../../dist/generated/prisma';
import type { prisma } from '../utils/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

// How the public pages know a returning customer: the browser they first
// booked or signed up from keeps a random key in a cookie, and the shop's
// CustomerDevice row ties that key to their record. Whoever holds the key is
// that customer. A phone number proves nothing (anyone can type one), so a
// browser without a key is always a new customer, even with a known phone;
// the shop then sees two records with one phone and merges them.

const COOKIE = 'customerKey';
// Browsers cap a cookie's life at about 400 days; each visit renews it.
const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;
// 32 random bytes, base64url.
const KEY_FORMAT = /^[A-Za-z0-9_-]{43}$/;

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

/** The key this browser sent, or null when it has none (or something else in its place). */
export const readDeviceKey = (req: Request): string | null => {
  const key: unknown = req.cookies?.[COOKIE];
  return typeof key === 'string' && KEY_FORMAT.test(key) ? key : null;
};

export const newDeviceKey = () => randomBytes(32).toString('base64url');

/**
 * Hands the key to the browser, or renews the one it has. Not readable by
 * scripts, and SameSite=Lax: the web app and the API share a site, and no
 * other site's page can make the browser send it with a form.
 */
export const setDeviceCookie = (res: Response, key: string) =>
  res.cookie(COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
  });

/** The shop's customer this browser is, or null. */
export const customerOfDevice = async (
  db: Db,
  shopId: string,
  key: string | null | undefined,
) => {
  if (!key) return null;
  const device = await db.customerDevice.findUnique({
    where: { keyHash_shopId: { keyHash: hashKey(key), shopId } },
    include: { customer: true },
  });
  return device && !device.customer.isSystem ? device.customer : null;
};

/**
 * From now on this browser is that customer of the shop. Only for a browser
 * that is nobody there yet: if another request made it someone in the
 * meantime, this fails (a unique violation, or a serialization failure inside
 * a serializable transaction) instead of quietly making it someone else.
 */
export const bindDevice = (
  db: Db,
  shopId: string,
  customerId: string,
  key: string,
) =>
  db.customerDevice.create({
    data: { keyHash: hashKey(key), shopId, customerId },
  });
