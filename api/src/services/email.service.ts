import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const resend = new Resend(env.resend.apiKey);

// Emails render customer/staff/shop-supplied strings (names, addresses) —
// escape them before interpolating into HTML.
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Email clients are unreliable with <style> blocks, so every visual property
// below is inlined. The one <style> block in the template only loads Poppins:
// Apple Mail and iOS Mail use it, Gmail and Outlook drop it and fall back to
// Helvetica/Arial. Gmail also forces its own blue/underline on <a> tags unless
// the inline color is marked !important — that's why every link/button color
// below has it.
const FONT = `'Poppins', Helvetica, Arial, sans-serif`;
const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');";

interface EmailTheme {
  text: string;
  muted: string;
  accent: string;
  border: string;
  /** The wordmark image for this theme, under the web app's /email/ folder. */
  wordmark: string;
}

// Emails to BeBooked's own users (owners, managers, staff): the brand green.
const ACCOUNT_THEME: EmailTheme = {
  text: '#064e3b',
  muted: '#475569',
  accent: '#166534',
  border: '#e2e8e2',
  wordmark: 'wordmark.png',
};

// Emails to a shop's customers: black and white, headed by the shop's name.
// BeBooked only appears in the "Powered by" footer.
const CUSTOMER_THEME: EmailTheme = {
  text: '#111111',
  muted: '#555555',
  accent: '#111111',
  border: '#e2e2e2',
  wordmark: 'wordmark-mono.png',
};

// The wordmark is an image because Gasoek One cannot be loaded in most email
// clients. The files are 488x96; they are shown much smaller, so they stay
// sharp on high-density screens.
const wordmarkImg = (theme: EmailTheme, height: number) => {
  const width = Math.round((height * 488) / 96);
  return `<img src="${env.clientUrl}/email/${theme.wordmark}" alt="BeBooked" height="${height}" width="${width}" style="display:inline-block;height:${height}px;width:${width}px;border:0;vertical-align:middle;" />`;
};

const makeKit = (theme: EmailTheme) => {
  const { text, muted, accent, border } = theme;

  const styles = {
    body: `background:#ffffff;color:${text};font-family:${FONT};margin:0;padding:0;`,
    wrapper: `max-width:520px;margin:0 auto;padding:40px 24px;`,
    shopName: `font-family:${FONT};font-weight:700;font-size:20px;color:${text};`,
    pageLabel: `font-family:${FONT};font-size:15px;color:${muted};padding-left:10px;`,
    h1: `font-family:${FONT};font-size:26px;font-weight:700;line-height:1.3;color:${text};margin:0 0 14px;`,
    p: `font-family:${FONT};color:${muted};font-size:15px;line-height:1.6;margin:0 0 20px;`,
    note: `font-family:${FONT};font-size:13px;color:${muted};line-height:1.5;margin:0 0 12px;`,
    fallbackLink: `font-family:${FONT};font-size:13px;color:${accent} !important;word-break:break-all;`,
    detailLabel: `padding:9px 0;font-size:14px;color:${muted};border-bottom:1px solid ${border};font-family:${FONT};`,
    detailValue: `padding:9px 0;font-size:14px;font-weight:700;color:${text};text-align:right;border-bottom:1px solid ${border};font-family:${FONT};`,
    footer: `font-family:${FONT};color:${muted};font-size:13px;margin:40px 0 0;padding-top:20px;border-top:1px solid ${border};`,
    strong: `color:${text};`,
  };

  /** Outlined pill button — text lives in a nested <span> with its own
   * !important color, since some Gmail contexts only override the anchor
   * element's own color and leave a child element alone. */
  const btnOutline = (href: string, label: string) => `
  <a href="${href}" style="display:inline-block;border:1.5px solid ${accent};border-radius:50px;padding:10px 22px;margin:0 10px 10px 0;text-decoration:none;background:#ffffff;">
    <span style="font-family:${FONT};font-size:14px;font-weight:700;color:${accent} !important;">${label}</span>
  </a>
`;

  const detailRow = (label: string, value: string) => `
  <tr>
    <td style="${styles.detailLabel}">${label}</td>
    <td style="${styles.detailValue}">${value}</td>
  </tr>
`;

  /** `header` is the left cell of the top row: the wordmark or the shop's name. */
  const template = (
    title: string,
    header: string,
    pageLabel: string,
    content: string,
  ) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${FONT_IMPORT}</style>
</head>
<body style="${styles.body}">
  <div style="${styles.wrapper}">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="${styles.shopName}">${header}</td>
        <td style="${styles.pageLabel}">${pageLabel}</td>
      </tr>
    </table>
    ${content}
    <p style="${styles.footer}">Powered by <a href="${env.clientUrl}" style="text-decoration:none;">${wordmarkImg(theme, 14)}</a></p>
  </div>
</body>
</html>
`;

  return { styles, btnOutline, detailRow, template };
};

const accountKit = makeKit(ACCOUNT_THEME);
const customerKit = makeKit(CUSTOMER_THEME);

/** Emails to BeBooked users: the wordmark on top. */
const accountTemplate = (title: string, pageLabel: string, content: string) =>
  accountKit.template(
    title,
    wordmarkImg(ACCOUNT_THEME, 22),
    pageLabel,
    content,
  );

/** Emails to a shop's customers: the shop's name on top, no BeBooked heading. */
const customerTemplate = (
  title: string,
  shopName: string,
  pageLabel: string,
  content: string,
) => customerKit.template(title, escapeHtml(shopName), pageLabel, content);

/** Google Calendar "add event" link — no attachment/dependency needed, same
 * pattern as the existing Google Maps "Get Directions" link below. */
const buildCalendarUrl = (params: {
  title: string;
  startTime: Date;
  endTime: Date;
  details: string;
  location?: string | null;
}) => {
  const toUtcBasic = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const search = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${toUtcBasic(params.startTime)}/${toUtcBasic(params.endTime)}`,
    details: params.details,
    ...(params.location ? { location: params.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
};

export const sendVerificationEmail = async (
  email: string,
  token: string,
  name?: string,
) => {
  const { styles, btnOutline } = accountKit;
  const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;
  const heading = name
    ? `Verify your email, ${escapeHtml(name)}.`
    : 'Verify your email.';

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: email,
    subject: 'Verify your email',
    html: accountTemplate(
      'Verify your email',
      'Verify',
      `
      <h1 style="${styles.h1}">${heading}</h1>
      <p style="${styles.p}">Confirm this email to activate your account and keep your access secure.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">24 hours</strong>. If you didn't create a BeBooked account, you can ignore this email.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(verificationUrl, 'Verify email')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${verificationUrl}</p>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send verification email`);
    throw new Error('Failed to send verification email');
  }

  logger.info(`Verification email sent`);
};

export const sendEmailChangeVerification = async (
  newEmail: string,
  token: string,
) => {
  const { styles, btnOutline } = accountKit;
  const verifyUrl = `${env.clientUrl}/verify-email-change?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: newEmail,
    subject: 'Verify your new email address',
    html: accountTemplate(
      'Verify your new email address',
      'Verify email change',
      `
      <h1 style="${styles.h1}">Verify your new email.</h1>
      <p style="${styles.p}">You requested to change your account's email address. Confirm this address to complete the change.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">24 hours</strong>.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(verifyUrl, 'Verify new email')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${verifyUrl}</p>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send email change verification`);
    throw new Error('Failed to send email change verification');
  }

  logger.info(`Email change verification sent`);
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  name?: string,
) => {
  const { styles, btnOutline } = accountKit;
  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
  const heading = name
    ? `Reset your password, ${escapeHtml(name)}.`
    : 'Reset your password.';

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: email,
    subject: 'Reset your password',
    html: accountTemplate(
      'Reset your password',
      'Reset password',
      `
      <h1 style="${styles.h1}">${heading}</h1>
      <p style="${styles.p}">We received a request to reset your password. Set a new one below.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">1 hour</strong>. If you didn't request this, you can ignore this email.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(resetUrl, 'Reset password')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${resetUrl}</p>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send reset email`);
    throw new Error('Failed to send password reset email');
  }

  logger.info(`Password reset email sent`);
};

export interface BookingEmailParams {
  email: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  formattedAddress: string | null;
  cancelToken: string;
  // The shop's rules for the customer links (see Shop in schema.prisma).
  canReschedule: boolean;
  cancelCutoffHours: number;
  rescheduleCutoffHours: number;
}

const hoursLabel = (hours: number) => `${hours} hour${hours === 1 ? '' : 's'}`;

/** One line telling the customer until when the links below still work. */
const changePolicyNote = (p: BookingEmailParams) => {
  const cancel = p.cancelCutoffHours;
  const reschedule = p.rescheduleCutoffHours;
  if (!p.canReschedule)
    return cancel > 0
      ? `You can cancel up to ${hoursLabel(cancel)} before your appointment.`
      : '';
  if (cancel === reschedule)
    return cancel > 0
      ? `You can cancel or reschedule up to ${hoursLabel(cancel)} before your appointment.`
      : '';
  return [
    cancel > 0
      ? `You can cancel up to ${hoursLabel(cancel)} before your appointment.`
      : '',
    reschedule > 0
      ? `You can reschedule up to ${hoursLabel(reschedule)} before.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
};

/** Calendar, directions, reschedule and cancel buttons for a booking email. */
const bookingActions = (p: BookingEmailParams) => {
  const { styles, btnOutline } = customerKit;
  const mapsUrl = p.formattedAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.formattedAddress)}`
    : null;
  const calendarUrl = buildCalendarUrl({
    title: `${p.serviceName} at ${p.shopName}`,
    startTime: p.startTime,
    endTime: p.endTime,
    details: `Appointment with ${p.staffName} at ${p.shopName}.`,
    location: p.formattedAddress,
  });
  const rescheduleUrl = `${env.clientUrl}/reschedule?token=${p.cancelToken}`;
  const cancelUrl = `${env.clientUrl}/cancel?token=${p.cancelToken}`;
  const policy = changePolicyNote(p);

  return `
      <div style="margin:28px 0 16px;">
        ${btnOutline(calendarUrl, 'Save to calendar')}
        ${mapsUrl ? btnOutline(mapsUrl, 'Get directions') : ''}
        ${p.canReschedule ? btnOutline(rescheduleUrl, 'Reschedule booking') : ''}
        ${btnOutline(cancelUrl, 'Cancel booking')}
      </div>
      ${policy ? `<p style="${styles.note}">${policy}</p>` : ''}
      ${mapsUrl ? `<p style="${styles.note}">Directions open Google Maps and show travel time from your location.</p>` : ''}
    `;
};

const formatDate = (date: Date, timezone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

const formatTime = (date: Date, timezone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

export const sendBookingRescheduledEmail = async (
  params: BookingEmailParams & { previousStartTime: Date },
) => {
  const { styles, detailRow } = customerKit;
  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: params.email,
    subject: `Your booking at ${params.shopName} has been rescheduled`,
    html: customerTemplate(
      `Booking rescheduled — ${params.shopName}`,
      params.shopName,
      'Rescheduled',
      `
      <h1 style="${styles.h1}">Booking rescheduled, ${escapeHtml(params.customerName)}.</h1>
      <p style="${styles.p}">Your appointment has moved to a new time. The old time is no longer reserved for you.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('New date', formatDate(params.startTime, params.timezone))}
        ${detailRow('New time', formatTime(params.startTime, params.timezone))}
        ${detailRow('Was', `${formatDate(params.previousStartTime, params.timezone)}, ${formatTime(params.previousStartTime, params.timezone)}`)}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Provider', escapeHtml(params.staffName))}
        ${detailRow('Location', escapeHtml(params.formattedAddress ?? params.shopName))}
      </table>
      ${bookingActions(params)}
      <p style="${styles.note}">The links in earlier emails about this booking no longer work.</p>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send booking rescheduled email`);
    throw new Error('Failed to send booking rescheduled email');
  }

  logger.info(`Booking rescheduled email sent`);
};

export const sendBookingRescheduledNotificationEmail = async (params: {
  email: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  previousStartTime: Date;
  timezone: string;
}) => {
  const { styles, detailRow } = accountKit;
  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: params.email,
    subject: `Booking rescheduled at ${params.shopName}`,
    html: accountTemplate(
      `Booking rescheduled — ${params.shopName}`,
      'Rescheduled',
      `
      <h1 style="${styles.h1}">A customer rescheduled a booking.</h1>
      <p style="${styles.p}">The old time is free again and shows as rescheduled in your calendar.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('Customer', escapeHtml(params.customerName))}
        ${detailRow('Phone', escapeHtml(params.customerPhone))}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Provider', escapeHtml(params.staffName))}
        ${detailRow('New date', formatDate(params.startTime, params.timezone))}
        ${detailRow('New time', formatTime(params.startTime, params.timezone))}
        ${detailRow('Was', `${formatDate(params.previousStartTime, params.timezone)}, ${formatTime(params.previousStartTime, params.timezone)}`)}
      </table>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send booking rescheduled notification`);
    throw new Error('Failed to send booking rescheduled notification email');
  }

  logger.info(`Booking rescheduled notification sent`);
};

export const sendBookingConfirmationEmail = async (
  params: BookingEmailParams,
) => {
  const { styles, detailRow } = customerKit;
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(params.startTime);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(params.startTime);

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: params.email,
    subject: `Your booking at ${params.shopName} is confirmed`,
    html: customerTemplate(
      `Booking at ${params.shopName}`,
      params.shopName,
      'Booked',
      `
      <h1 style="${styles.h1}">Booking confirmed, ${escapeHtml(params.customerName)}.</h1>
      <p style="${styles.p}">Your appointment is locked in. We'll see you soon.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('Date', dateStr)}
        ${detailRow('Time', timeStr)}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Provider', escapeHtml(params.staffName))}
        ${detailRow('Location', escapeHtml(params.formattedAddress ?? params.shopName))}
      </table>
      ${bookingActions(params)}
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send booking confirmation email`);
    throw new Error('Failed to send booking confirmation email');
  }

  logger.info(`Booking confirmation email sent`);
};

export const sendCancellationConfirmationEmail = async (params: {
  email: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  startTime: Date;
  timezone: string;
}) => {
  const { styles, detailRow } = customerKit;
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(params.startTime);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(params.startTime);

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: params.email,
    subject: `Your booking at ${params.shopName} has been cancelled`,
    html: customerTemplate(
      `Booking Cancelled — ${params.shopName}`,
      params.shopName,
      'Cancelled',
      `
      <h1 style="${styles.h1}">Booking cancelled, ${escapeHtml(params.customerName)}.</h1>
      <p style="${styles.p}">Your appointment has been successfully cancelled.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('Date', dateStr)}
        ${detailRow('Time', timeStr)}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Location', escapeHtml(params.shopName))}
      </table>
      <p style="${styles.note}">If you'd like to book again, visit the shop's booking page.</p>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send cancellation email`);
    throw new Error('Failed to send cancellation confirmation email');
  }

  logger.info(`Cancellation confirmation email sent`);
};

export const sendNewBookingNotificationEmail = async (params: {
  email: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  timezone: string;
}) => {
  const { styles, detailRow } = accountKit;
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(params.startTime);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(params.startTime);

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: params.email,
    subject: `New booking at ${params.shopName}`,
    html: accountTemplate(
      `New Booking — ${params.shopName}`,
      'New booking',
      `
      <h1 style="${styles.h1}">New booking at ${escapeHtml(params.shopName)}.</h1>
      <p style="${styles.p}">A new appointment has just been made.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('Customer', escapeHtml(params.customerName))}
        ${detailRow('Phone', escapeHtml(params.customerPhone))}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Provider', escapeHtml(params.staffName))}
        ${detailRow('Date', dateStr)}
        ${detailRow('Time', timeStr)}
      </table>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send new booking notification`);
    throw new Error('Failed to send new booking notification email');
  }

  logger.info(`New booking notification sent`);
};

export const sendInviteEmail = async (
  recipientEmail: string,
  plainToken: string,
  shopName: string,
  inviterEmail: string,
  role: string,
) => {
  const { styles, btnOutline } = accountKit;
  const to = env.inviteEmailOverride ?? recipientEmail;
  const inviteUrl = `${env.clientUrl}/invite?token=${plainToken}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to,
    subject: `You've been invited to join ${shopName}`,
    html: accountTemplate(
      `Invitation to ${shopName}`,
      'Invite',
      `
      <h1 style="${styles.h1}">You're invited to ${escapeHtml(shopName)}.</h1>
      <p style="${styles.p}"><strong style="${styles.strong}">${escapeHtml(inviterEmail)}</strong> has invited you to join as a <strong style="${styles.strong}">${escapeHtml(role)}</strong>.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">7 days</strong>.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(inviteUrl, 'Accept invitation')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${inviteUrl}</p>
    `,
    ),
  });

  if (error) {
    logger.error(error, `Failed to send invite email`);
    throw new Error('Failed to send invite email');
  }

  logger.info(`Invite email sent`);
};
