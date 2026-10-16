import type { Prisma } from '../../dist/generated/prisma';
import type { prisma } from './prisma';

type Db = Prisma.TransactionClient | typeof prisma;

// A phone number is not unique in a shop: someone booking from a device the
// shop has not seen becomes a new customer even when the number is known, and
// the shop merges the two once it sees they are one person.

/** The shop's customer with this phone: the oldest one when several have it. */
export const findCustomerByPhone = (db: Db, shopId: string, phone: string) =>
  db.customer.findFirst({
    where: { shopId, phone, isSystem: false },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

/** The phone numbers more than one of the shop's customers have (all of them, or only among `phones`). */
export const duplicatePhones = async (
  db: Db,
  shopId: string,
  phones?: string[],
): Promise<Set<string>> => {
  if (phones && phones.length === 0) return new Set();
  const groups = await db.customer.groupBy({
    by: ['phone'],
    where: {
      shopId,
      isSystem: false,
      ...(phones && { phone: { in: phones } }),
    },
    having: { phone: { _count: { gt: 1 } } },
  });
  return new Set(groups.map((g) => g.phone));
};
