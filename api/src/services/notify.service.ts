import webpush from 'web-push';
import { env } from '../config/env';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { parseLocale } from '../utils/locale';
import {
  formatDate,
  formatTime,
  sendBookingCancelledNotificationEmail,
  sendBookingRescheduledNotificationEmail,
  sendNewBookingNotificationEmail,
  type BookingNoticeParams,
} from './email.service';
import { emailStrings } from './emailStrings';

export type BookingEvent = 'new' | 'rescheduled' | 'cancelled';

/** What the shop is told about a customer's booking, whatever the event. */
export interface ShopNotice {
  shopId: string;
  shopName: string;
  shopSlug: string;
  timezone: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  /** Rescheduled only: the time it moved from. */
  previousStartTime?: Date;
  products?: BookingNoticeParams['products'];
  servicePrice?: number;
}

/**
 * Who hears about a customer's booking: the owner always, and each manager the
 * owner has allowed (by email, by push, or both). Staff never. Each person's
 * own email switch still applies; push goes to every phone they turned it on.
 */
export const shopNoticeRecipients = async (shopId: string) => {
  const members = await prisma.userShop.findMany({
    where: {
      shopId,
      active: true,
      userId: { not: null },
      OR: [
        { role: 'owner' },
        {
          role: 'manager',
          OR: [
            { managerEmailNotifications: true },
            { managerPushNotifications: true },
          ],
        },
      ],
    },
    include: {
      user: {
        select: {
          email: true,
          locale: true,
          emailNotifications: true,
          pushSubscriptions: true,
        },
      },
    },
  });

  return members.flatMap((m) => {
    if (!m.user) return [];
    const isOwner = m.role === 'owner';
    return [
      {
        // The membership's address, as the shop knows them; the account's if none.
        email:
          (isOwner || m.managerEmailNotifications) && m.user.emailNotifications
            ? (m.email ?? m.user.email)
            : null,
        push:
          isOwner || m.managerPushNotifications ? m.user.pushSubscriptions : [],
        locale: parseLocale(m.user.locale),
      },
    ];
  });
};

let vapidSet = false;
const pushReady = () => {
  if (!env.push) return false;
  if (!vapidSet) {
    webpush.setVapidDetails(
      env.push.subject,
      env.push.publicKey,
      env.push.privateKey,
    );
    vapidSet = true;
  }
  return true;
};

const sendEmail = (
  event: BookingEvent,
  params: BookingNoticeParams,
  n: ShopNotice,
) => {
  if (event === 'new') return sendNewBookingNotificationEmail(params);
  if (event === 'cancelled')
    return sendBookingCancelledNotificationEmail(params);
  return sendBookingRescheduledNotificationEmail({
    ...params,
    previousStartTime: n.previousStartTime ?? n.startTime,
  });
};

const pushTitle = (
  event: BookingEvent,
  shop: string,
  t: (typeof emailStrings)['el'],
) =>
  event === 'new'
    ? t.push.newTitle(shop)
    : event === 'rescheduled'
      ? t.push.rescheduledTitle(shop)
      : t.push.cancelledTitle(shop);

/**
 * Tells the shop about a customer's booking. Fire-and-forget: every failure
 * is logged, never thrown, so the customer's request is not affected.
 */
export const notifyShopOfBooking = async (
  event: BookingEvent,
  n: ShopNotice,
) => {
  try {
    const recipients = await shopNoticeRecipients(n.shopId);
    const withPush = pushReady();

    await Promise.all(
      recipients.map(async (r) => {
        const jobs: Promise<unknown>[] = [];

        if (r.email) {
          jobs.push(
            sendEmail(
              event,
              {
                email: r.email,
                customerName: n.customerName,
                customerPhone: n.customerPhone,
                shopName: n.shopName,
                serviceName: n.serviceName,
                staffName: n.staffName,
                startTime: n.startTime,
                timezone: n.timezone,
                products: n.products,
                servicePrice: n.servicePrice,
                // The recipient's own language, not the customer's.
                locale: r.locale,
              },
              n,
            ).catch((err) =>
              logger.error(err, `Failed to send ${event} booking email`),
            ),
          );
        }

        if (withPush && r.push.length > 0) {
          const t = emailStrings[r.locale];
          const when = `${formatDate(n.startTime, n.timezone, r.locale)}, ${formatTime(n.startTime, n.timezone, r.locale)}`;
          const payload = JSON.stringify({
            title: pushTitle(event, n.shopName, t),
            body: t.push.body(n.customerName, n.serviceName, when),
            url: `/shops/${n.shopSlug}/bookings`,
          });
          for (const sub of r.push) {
            jobs.push(
              webpush
                .sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  payload,
                  { TTL: 60 * 60 },
                )
                .catch(async (err: { statusCode?: number }) => {
                  // The phone turned push off or the subscription expired.
                  if (err.statusCode === 404 || err.statusCode === 410) {
                    await prisma.pushSubscription.deleteMany({
                      where: { id: sub.id },
                    });
                    return;
                  }
                  logger.error(err, `Failed to send ${event} booking push`);
                }),
            );
          }
        }

        await Promise.all(jobs);
      }),
    );
  } catch (err) {
    logger.error(err, `Failed to notify shop of ${event} booking`);
  }
};

// ── The person's own settings (Account → Notifications) ─────────────────────

/**
 * What the Account page needs: their email switch, whether any shop notifies
 * them at all (by email, by push), and the key a phone subscribes with
 * (null while push is off on the server).
 */
export const getNotificationSettings = async (userId: string) => {
  const [user, memberships] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailNotifications: true },
    }),
    prisma.userShop.findMany({
      where: { userId, active: true, role: { in: ['owner', 'manager'] } },
      select: {
        role: true,
        managerEmailNotifications: true,
        managerPushNotifications: true,
      },
    }),
  ]);
  const isOwner = memberships.some((m) => m.role === 'owner');
  return {
    emailNotifications: user.emailNotifications,
    receivesEmail:
      isOwner || memberships.some((m) => m.managerEmailNotifications),
    receivesPush:
      isOwner || memberships.some((m) => m.managerPushNotifications),
    pushPublicKey: env.push?.publicKey ?? null,
  };
};

export const setEmailNotifications = async (userId: string, on: boolean) => {
  await prisma.user.update({
    where: { id: userId },
    data: { emailNotifications: on },
  });
  return getNotificationSettings(userId);
};

/** This phone turned push on: keep (or move to this user) its subscription. */
export const savePushSubscription = async (
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
) => {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, ...sub },
    update: {
      userId,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent,
    },
  });
};

/** This phone turned push off. Only the caller's own subscription goes. */
export const deletePushSubscription = async (
  userId: string,
  endpoint: string,
) => {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
};
