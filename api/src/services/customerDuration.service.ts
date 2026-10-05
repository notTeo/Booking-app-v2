import type { Prisma } from '../../dist/generated/prisma';
import type { prisma } from '../utils/prisma';

// Who a booking is for, as far as its length goes: a known customer id
// (owner/staff flows, existing bookings) or the phone a booking is being made
// with. Both are matched inside the shop only.
export type DurationCustomer = { customerId: string } | { phone: string };

/**
 * How long `service` takes for this customer, in minutes: their own duration
 * for it when the shop has set one, the service's standard duration otherwise
 * (also for an unknown customer or none at all).
 */
export const resolveDuration = async (
  db: Prisma.TransactionClient | typeof prisma,
  shopId: string,
  service: { id: string; duration: number },
  customer?: DurationCustomer | null,
): Promise<number> => {
  if (!customer) return service.duration;
  const own = await db.customerServiceDuration.findFirst({
    where: {
      serviceId: service.id,
      customer:
        'customerId' in customer
          ? { id: customer.customerId, shopId }
          : { phone: customer.phone, shopId },
    },
    select: { duration: true },
  });
  return own?.duration ?? service.duration;
};
