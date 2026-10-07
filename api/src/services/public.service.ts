import { AppError } from '../middleware/errorHandler';
import { isShopLocked, PLAN_LIMITS, withoutPlan } from './plan.service';
import { prisma } from '../utils/prisma';
import { todayInZone } from '../utils/shopTime';
import type { DayOfWeek } from '../../dist/generated/prisma';
import type { BookingContext } from './booking.service';

const DAY_ORDER: DayOfWeek[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];

interface ScheduleForHours {
  startDate: Date;
  endDate: Date | null;
  days: {
    day: DayOfWeek;
    isOpen: boolean;
    hours: { startTime: string; endTime: string }[];
  }[];
}

/**
 * The shop's opening hours, derived from its team: for each weekday, the union
 * of every given schedule's ranges that is in force on `today` (a YYYY-MM-DD
 * date in the shop's timezone). Overlapping and touching ranges are merged;
 * a weekday nobody works comes back with no ranges.
 */
export const deriveOpeningHours = (
  schedules: ScheduleForHours[],
  today: string,
) => {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const inForce = schedules.filter(
    (s) => iso(s.startDate) <= today && (!s.endDate || iso(s.endDate) >= today),
  );
  return DAY_ORDER.map((day) => {
    const ranges = inForce
      .flatMap((s) => s.days)
      .filter((d) => d.day === day && d.isOpen)
      .flatMap((d) => d.hours)
      .map(({ startTime, endTime }) => ({ startTime, endTime }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const merged: { startTime: string; endTime: string }[] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r.startTime <= last.endTime) {
        if (r.endTime > last.endTime) last.endTime = r.endTime;
      } else merged.push({ ...r });
    }
    return { day, hours: merged };
  });
};

// What a booking wizard needs to start: the shop, its bookable services and
// its team. The public page ('public') never sees internal-only services; the
// owner/staff wizard ('internal') does.
export const getShopInfoService = async (
  by: { slug: string } | { id: string },
  context: BookingContext = 'public',
) => {
  if ('slug' in by && !by.slug) throw new AppError(404, 'Slug is required');
  const shop = await prisma.shop.findFirst({
    where: { ...by, isActive: true },
    include: {
      // The shop's own supplier link is never selected here.
      products: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          photoUrl: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      services: {
        where: {
          isActive: true,
          ...(context === 'public' && { showOnPublicPage: true }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          price: true,
        },
      },
      members: {
        // The public page lists only the members a customer can book.
        where: {
          active: true,
          ...(context === 'public' && { bookableByCustomers: true }),
        },
        select: {
          id: true,
          shopId: true,
          role: true,
          name: true,
          photoUrl: true,
          createdAt: true,
          bookableByCustomers: true,
          bookableInternally: true,
          staffServices: {
            // Same filter as the shop's own list above: an internal-only or
            // deactivated service is not named under a member either.
            where: {
              service: {
                isActive: true,
                ...(context === 'public' && { showOnPublicPage: true }),
              },
            },
            include: {
              service: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!shop) throw new AppError(404, 'Shop not found');

  // Team members' schedules are the only source of working hours; what the
  // public page shows is derived from the customer-bookable members.
  const schedules = await prisma.shopWorkingSchedule.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      staffId: {
        in: shop.members.filter((m) => m.bookableByCustomers).map((m) => m.id),
      },
    },
    include: { days: { include: { hours: true } } },
  });

  // The public only needs the photo that is shown, not what it was cut from.
  const { photoOriginalUrl: _original, photoCrop: _crop, ...visible } = shop;

  // Products are listed only while the plan includes them.
  const { products, members, ...shopFields } = visible;

  return {
    ...withoutPlan(shopFields),
    // A customer needs a member's name, photo and services, not their role or
    // when they joined.
    members:
      context === 'public'
        ? members.map(
            ({ id, name, photoUrl, bookableByCustomers, staffServices }) => ({
              id,
              name,
              photoUrl,
              bookableByCustomers,
              staffServices,
            }),
          )
        : members,
    products: PLAN_LIMITS[shop.plan].products ? products : [],
    // False while the shop is locked: the page still shows, but takes no
    // new bookings.
    acceptingBookings: !isShopLocked(shop),
    openingHours: deriveOpeningHours(schedules, todayInZone(shop.timezone)),
  };
};
