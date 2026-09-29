import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { checkSlug, SLUG_MESSAGES } from '../validators/slug';

export interface CreateTenantInput {
  ownerName: string;
  ownerEmail: string;
  // Omit to have one generated (returned once, never stored in plain text).
  password?: string;
  shopName: string;
  slug: string;
  timezone?: string;
}

// Same shape rule as the register endpoint; lower-cased like normalizeEmail.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generatePassword = (): string =>
  // 18 random bytes -> 24 url-safe chars, plus a suffix guaranteeing the
  // upper/number/special rules the login/reset flows enforce on new passwords.
  `${crypto.randomBytes(18).toString('base64url')}Aa1!`;

// Admin-only: creates a verified Pro owner, their shop and the owner
// membership (also the first bookable staff member) in one transaction.
// Never overwrites: an existing email or slug is an error.
export const createTenant = async (input: CreateTenantInput) => {
  const email = input.ownerEmail.trim().toLowerCase();
  if (!EMAIL.test(email))
    throw new Error(`Invalid owner email: "${input.ownerEmail}"`);
  if (!input.ownerName.trim()) throw new Error('Owner name is required');
  if (!input.shopName.trim()) throw new Error('Shop name is required');

  const problem = checkSlug(input.slug);
  if (problem)
    throw new Error(`Invalid slug "${input.slug}": ${SLUG_MESSAGES[problem]}`);

  const timezone = input.timezone ?? 'Europe/Athens';
  if (
    !(Intl as unknown as { supportedValuesOf(key: string): string[] })
      .supportedValuesOf('timeZone')
      .includes(timezone)
  ) {
    throw new Error(`Invalid timezone: "${timezone}"`);
  }

  const [userExists, shopExists] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.shop.findUnique({ where: { slug: input.slug } }),
  ]);
  if (userExists) throw new Error(`A user with email ${email} already exists`);
  if (shopExists)
    throw new Error(`A shop with slug "${input.slug}" already exists`);

  const password = input.password ?? generatePassword();
  if (password.length < 8)
    throw new Error('Password must be at least 8 characters');
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.ownerName.trim(),
        email,
        passwordHash,
        isVerified: true,
        isPro: true,
      },
    });
    const shop = await tx.shop.create({
      data: { name: input.shopName.trim(), slug: input.slug, timezone },
    });
    const membership = await tx.userShop.create({
      data: {
        userId: user.id,
        shopId: shop.id,
        role: 'owner',
        name: user.name,
        email: user.email,
      },
    });
    return { user, shop, membership };
  });

  return {
    ...result,
    // Only present when we generated it, so the caller can show it once.
    generatedPassword: input.password ? null : password,
  };
};
