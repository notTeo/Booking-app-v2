import { prisma } from './prisma';
import { logger } from './logger';
import { bookingEmailParams } from './bookingEmail';
import { sendBookingReminderEmail } from '../services/email.service';
import { MAX_REMINDER_HOURS } from '../validators/shop.validator';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Email a reminder for every confirmed booking that has come within its
 * shop's lead time. Each booking is claimed (reminderSentAt set) before its
 * email goes out, so a second run or a second server never sends it twice; a
 * send that then fails is logged and not retried.
 */
export const sendDueReminders = async (now: Date = new Date()) => {
  const candidates = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      cancelToken: { not: null },
      // No shop can ask for more notice than this, so nothing later is due.
      startTime: {
        gt: now,
        lte: new Date(now.getTime() + MAX_REMINDER_HOURS * HOUR_MS),
      },
      customer: { isSystem: false, email: { not: null } },
      shop: { isActive: true, reminderEnabled: true },
    },
    include: { customer: true, service: true, staff: true, shop: true },
    orderBy: { startTime: 'asc' },
  });

  let sent = 0;
  // One at a time: the email provider limits requests per second.
  for (const booking of candidates) {
    const leadMs = booking.shop.reminderHoursBefore * HOUR_MS;
    const dueAt = booking.startTime.getTime() - leadMs;
    if (now.getTime() < dueAt) continue;

    const params = bookingEmailParams(booking);
    const claimed = await prisma.booking.updateMany({
      where: { id: booking.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0 || !params) continue;
    // Booked inside the lead time: the confirmation they just got is the
    // reminder. Claimed above so it is not looked at again.
    if (booking.createdAt.getTime() >= dueAt) continue;

    try {
      await sendBookingReminderEmail(params);
      sent += 1;
    } catch (err) {
      logger.error(err, `Reminder email failed for booking ${booking.id}`);
    }
  }

  if (sent > 0) logger.info(`Reminders: sent ${sent}`);
  return sent;
};

// Every 5 minutes: a reminder goes out at most that long after it falls due.
export const startReminderJob = () => {
  const INTERVAL_MS = 5 * 60 * 1000;
  const run = () =>
    sendDueReminders().catch((err) => logger.error(err, 'Reminder job failed'));

  void run();
  const timer = setInterval(run, INTERVAL_MS);
  logger.info('Reminder job started (runs every 5 minutes)');
  return timer;
};
