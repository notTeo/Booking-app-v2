import { prisma } from '../utils/prisma';
import { createTenant } from './createTenant';
import { HAIROLOGY, HAIROLOGY_DATA_CONFIRMED } from './hairologyData';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export interface SeedHairologyInput {
  ownerName: string;
  ownerEmail: string;
  password?: string;
  // Tests inject their own data; the CLI always uses the real, confirmed one.
  data?: typeof HAIROLOGY;
  confirmed?: boolean;
}

// Creates the Hairology tenant: owner, shop, team, services and weekly hours.
// No customers, bookings or demo data. Refuses if the shop already exists —
// it never updates or deletes anything, so it is safe to point at production.
export const seedHairology = async (input: SeedHairologyInput) => {
  if (!(input.confirmed ?? HAIROLOGY_DATA_CONFIRMED)) {
    throw new Error(
      'Hairology seed data has not been confirmed. Edit api/src/admin/hairologyData.ts with the real team, services and hours, then set HAIROLOGY_DATA_CONFIRMED = true.',
    );
  }
  const data = input.data ?? HAIROLOGY;

  const tenant = await createTenant({
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    password: input.password,
    shopName: data.shopName,
    slug: data.slug,
    timezone: data.timezone,
  });
  const shopId = tenant.shop.id;

  const services = await Promise.all(
    data.services.map((s) => prisma.service.create({ data: { shopId, ...s } })),
  );

  const staffMembers = [tenant.membership];
  for (const s of data.staff) {
    staffMembers.push(
      await prisma.userShop.create({
        data: { shopId, role: 'staff', name: s.name },
      }),
    );
  }

  // Everyone can perform every service until the owner narrows it in the UI.
  await prisma.staffService.createMany({
    data: staffMembers.flatMap((m) =>
      services.map((sv) => ({ userShopId: m.id, serviceId: sv.id })),
    ),
  });

  // One shop-level schedule (staffId null) — what the public page reads.
  await prisma.shopWorkingSchedule.create({
    data: {
      shopId,
      staffId: null,
      startDate: new Date(Date.UTC(2026, 0, 1)),
      days: {
        create: DAYS.map((day) => {
          const ranges = data.hours[day];
          return ranges && ranges.length > 0
            ? { day, isOpen: true, hours: { create: ranges } }
            : { day, isOpen: false };
        }),
      },
    },
  });

  return { ...tenant, services, staffCount: staffMembers.length };
};
