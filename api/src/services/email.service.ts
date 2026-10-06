import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { currentLocale } from '../utils/locale';
import { emailStrings, type EmailLocale } from './emailStrings';

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
    lang: EmailLocale,
    title: string,
    header: string,
    pageLabel: string,
    content: string,
  ) => `
<!DOCTYPE html>
<html lang="${lang}">
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
const accountTemplate = (
  lang: EmailLocale,
  title: string,
  pageLabel: string,
  content: string,
) =>
  accountKit.template(
    lang,
    escapeHtml(title),
    wordmarkImg(ACCOUNT_THEME, 22),
    pageLabel,
    content,
  );

/** Emails to a shop's customers: the shop's name on top, no BeBooked heading. */
const customerTemplate = (
  lang: EmailLocale,
  title: string,
  shopName: string,
  pageLabel: string,
  content: string,
) =>
  customerKit.template(
    lang,
    escapeHtml(title),
    escapeHtml(shopName),
    pageLabel,
    content,
  );

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

const formatDate = (date: Date, timezone: string, lang: EmailLocale) =>
  new Intl.DateTimeFormat(emailStrings[lang].intlLocale, {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

const formatTime = (date: Date, timezone: string, lang: EmailLocale) =>
  new Intl.DateTimeFormat(emailStrings[lang].intlLocale, {
    timeZone: timezone,
    hour: emailStrings[lang].hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: emailStrings[lang].hour12,
  }).format(date);

const DETAILS_TABLE =
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">';

/** Send one email; a failure is logged and thrown under the email's name. */
const deliver = async (
  name: string,
  mail: { to: string; subject: string; html: string },
) => {
  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    ...mail,
  });
  if (error) {
    logger.error(error, `Failed to send ${name} email`);
    throw new Error(`Failed to send ${name} email`);
  }
  logger.info(`Sent ${name} email`);
};

/** The button, then the same link as text for clients that hide buttons. */
const linkBlock = (url: string, label: string, lang: EmailLocale) => {
  const { styles, btnOutline } = accountKit;
  return `
      <div style="margin:28px 0 16px;">
        ${btnOutline(url, label)}
      </div>
      <p style="${styles.note}">${emailStrings[lang].fallbackLink}</p>
      <p style="${styles.fallbackLink}">${url}</p>
    `;
};

const strong = (text: string) =>
  `<strong style="${accountKit.styles.strong}">${text}</strong>`;

export const sendVerificationEmail = async (
  email: string,
  token: string,
  name?: string,
  lang: EmailLocale = currentLocale(),
) => {
  const { styles } = accountKit;
  const t = emailStrings[lang];
  const url = `${env.clientUrl}/verify-email?token=${token}`;

  await deliver('verification', {
    to: email,
    subject: t.verify.subject,
    html: accountTemplate(
      lang,
      t.verify.subject,
      t.verify.page,
      `
      <h1 style="${styles.h1}">${t.verify.heading(name && escapeHtml(name))}</h1>
      <p style="${styles.p}">${t.verify.body}</p>
      <p style="${styles.note}">${t.expires(strong(t.span24h))} ${t.verify.ignore}</p>
      ${linkBlock(url, t.verify.button, lang)}
    `,
    ),
  });
};

// Sent instead of an error when someone signs up with an address that already
// has an account, so the sign-up form answers the same either way.
export const sendAccountExistsEmail = async (
  email: string,
  lang: EmailLocale = currentLocale(),
) => {
  const { styles } = accountKit;
  const t = emailStrings[lang];

  await deliver('account exists', {
    to: email,
    subject: t.accountExists.subject,
    html: accountTemplate(
      lang,
      t.accountExists.subject,
      t.accountExists.page,
      `
      <h1 style="${styles.h1}">${t.accountExists.heading}</h1>
      <p style="${styles.p}">${t.accountExists.body}</p>
      <p style="${styles.note}">${t.accountExists.ignore}</p>
      ${linkBlock(`${env.clientUrl}/login`, t.accountExists.button, lang)}
    `,
    ),
  });
};

export const sendEmailChangeVerification = async (
  newEmail: string,
  token: string,
  lang: EmailLocale = currentLocale(),
) => {
  const { styles } = accountKit;
  const t = emailStrings[lang];
  const url = `${env.clientUrl}/verify-email-change?token=${token}`;

  await deliver('email change verification', {
    to: newEmail,
    subject: t.emailChange.subject,
    html: accountTemplate(
      lang,
      t.emailChange.subject,
      t.emailChange.page,
      `
      <h1 style="${styles.h1}">${t.emailChange.heading}</h1>
      <p style="${styles.p}">${t.emailChange.body}</p>
      <p style="${styles.note}">${t.expires(strong(t.span24h))}</p>
      ${linkBlock(url, t.emailChange.button, lang)}
    `,
    ),
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  name?: string,
  lang: EmailLocale = currentLocale(),
) => {
  const { styles } = accountKit;
  const t = emailStrings[lang];
  const url = `${env.clientUrl}/reset-password?token=${token}`;

  await deliver('password reset', {
    to: email,
    subject: t.reset.subject,
    html: accountTemplate(
      lang,
      t.reset.subject,
      t.reset.page,
      `
      <h1 style="${styles.h1}">${t.reset.heading(name && escapeHtml(name))}</h1>
      <p style="${styles.p}">${t.reset.body}</p>
      <p style="${styles.note}">${t.expires(strong(t.span1h))} ${t.reset.ignore}</p>
      ${linkBlock(url, t.reset.button, lang)}
    `,
    ),
  });
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
  // Products reserved with the booking (price in cents, as stored).
  products?: { name: string; quantity: number; unitPrice: number }[];
  // The service's price in cents, so the total can include it.
  servicePrice?: number;
  // The language the customer booked in; the request's when not given.
  locale?: EmailLocale;
}

export const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} €`;

/** The reserved products as one detail row, with the total and the pay-in-shop note. */
const productRows = (
  products: BookingEmailParams['products'],
  servicePrice: number | undefined,
  lang: EmailLocale,
  detailRow: (label: string, value: string) => string,
) => {
  if (!products || products.length === 0) return '';
  const t = emailStrings[lang];
  const total =
    (servicePrice ?? 0) +
    products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const lines = products.map(
    (p) =>
      `${p.quantity} × ${escapeHtml(p.name)} — ${formatPrice(p.quantity * p.unitPrice)}`,
  );
  return detailRow(
    t.labels.products,
    `${lines.join('<br>')}<br>${escapeHtml(t.productsNote(formatPrice(total)))}`,
  );
};

/** One line telling the customer until when the links below still work. */
const changePolicyNote = (p: BookingEmailParams, lang: EmailLocale) => {
  const t = emailStrings[lang];
  const cancel = p.cancelCutoffHours;
  const reschedule = p.rescheduleCutoffHours;
  if (!p.canReschedule)
    return cancel > 0 ? t.policy.cancel(t.hours(cancel)) : '';
  if (cancel === reschedule)
    return cancel > 0 ? t.policy.both(t.hours(cancel)) : '';
  return [
    cancel > 0 ? t.policy.cancel(t.hours(cancel)) : '',
    reschedule > 0 ? t.policy.reschedule(t.hours(reschedule)) : '',
  ]
    .filter(Boolean)
    .join(' ');
};

/** Calendar, directions, reschedule and cancel buttons for a booking email. */
const bookingActions = (p: BookingEmailParams, lang: EmailLocale) => {
  const { styles, btnOutline } = customerKit;
  const t = emailStrings[lang];
  const mapsUrl = p.formattedAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.formattedAddress)}`
    : null;
  const calendarUrl = buildCalendarUrl({
    title: t.actions.calendarTitle(p.serviceName, p.shopName),
    startTime: p.startTime,
    endTime: p.endTime,
    details: t.actions.calendarDetails(p.staffName, p.shopName),
    location: p.formattedAddress,
  });
  const rescheduleUrl = `${env.clientUrl}/reschedule?token=${p.cancelToken}`;
  const cancelUrl = `${env.clientUrl}/cancel?token=${p.cancelToken}`;
  const policy = changePolicyNote(p, lang);

  return `
      <div style="margin:28px 0 16px;">
        ${btnOutline(calendarUrl, t.actions.calendar)}
        ${mapsUrl ? btnOutline(mapsUrl, t.actions.directions) : ''}
        ${p.canReschedule ? btnOutline(rescheduleUrl, t.actions.reschedule) : ''}
        ${btnOutline(cancelUrl, t.actions.cancel)}
      </div>
      ${policy ? `<p style="${styles.note}">${policy}</p>` : ''}
      ${mapsUrl ? `<p style="${styles.note}">${t.actions.directionsNote}</p>` : ''}
    `;
};

/** Date, time, service, provider and place of one appointment. */
const appointmentRows = (p: BookingEmailParams, lang: EmailLocale) => {
  const { detailRow } = customerKit;
  const { labels } = emailStrings[lang];
  return `
        ${detailRow(labels.date, formatDate(p.startTime, p.timezone, lang))}
        ${detailRow(labels.time, formatTime(p.startTime, p.timezone, lang))}
        ${detailRow(labels.service, escapeHtml(p.serviceName))}
        ${detailRow(labels.provider, escapeHtml(p.staffName))}
        ${detailRow(labels.location, escapeHtml(p.formattedAddress ?? p.shopName))}
        ${productRows(p.products, p.servicePrice, lang, detailRow)}`;
};

export const sendBookingConfirmationEmail = async (
  params: BookingEmailParams,
) => {
  const { styles } = customerKit;
  const lang = params.locale ?? currentLocale();
  const t = emailStrings[lang];

  await deliver('booking confirmation', {
    to: params.email,
    subject: t.confirmation.subject(params.shopName),
    html: customerTemplate(
      lang,
      t.confirmation.title(params.shopName),
      params.shopName,
      t.confirmation.page,
      `
      <h1 style="${styles.h1}">${t.confirmation.heading(escapeHtml(params.customerName))}</h1>
      <p style="${styles.p}">${t.confirmation.body}</p>
      ${DETAILS_TABLE}${appointmentRows(params, lang)}
      </table>
      ${bookingActions(params, lang)}
    `,
    ),
  });
};

/** Sent ahead of the appointment, as many hours before as the shop chose. */
export const sendBookingReminderEmail = async (params: BookingEmailParams) => {
  const { styles } = customerKit;
  const lang = params.locale ?? currentLocale();
  const t = emailStrings[lang];

  await deliver('booking reminder', {
    to: params.email,
    subject: t.reminder.subject(params.shopName),
    html: customerTemplate(
      lang,
      t.reminder.title(params.shopName),
      params.shopName,
      t.reminder.page,
      `
      <h1 style="${styles.h1}">${t.reminder.heading(escapeHtml(params.customerName))}</h1>
      <p style="${styles.p}">${t.reminder.body}</p>
      ${DETAILS_TABLE}${appointmentRows(params, lang)}
      </table>
      ${bookingActions(params, lang)}
    `,
    ),
  });
};

export const sendBookingRescheduledEmail = async (
  params: BookingEmailParams & { previousStartTime: Date },
) => {
  const { styles, detailRow } = customerKit;
  const lang = params.locale ?? currentLocale();
  const t = emailStrings[lang];
  const { labels } = t;
  const { timezone } = params;

  await deliver('booking rescheduled', {
    to: params.email,
    subject: t.rescheduled.subject(params.shopName),
    html: customerTemplate(
      lang,
      t.rescheduled.title(params.shopName),
      params.shopName,
      t.rescheduled.page,
      `
      <h1 style="${styles.h1}">${t.rescheduled.heading(escapeHtml(params.customerName))}</h1>
      <p style="${styles.p}">${t.rescheduled.body}</p>
      ${DETAILS_TABLE}
        ${detailRow(labels.newDate, formatDate(params.startTime, timezone, lang))}
        ${detailRow(labels.newTime, formatTime(params.startTime, timezone, lang))}
        ${detailRow(labels.was, `${formatDate(params.previousStartTime, timezone, lang)}, ${formatTime(params.previousStartTime, timezone, lang)}`)}
        ${detailRow(labels.service, escapeHtml(params.serviceName))}
        ${detailRow(labels.provider, escapeHtml(params.staffName))}
        ${detailRow(labels.location, escapeHtml(params.formattedAddress ?? params.shopName))}
      </table>
      ${bookingActions(params, lang)}
      <p style="${styles.note}">${t.rescheduled.oldLinks}</p>
    `,
    ),
  });
};

export const sendCancellationConfirmationEmail = async (params: {
  email: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  startTime: Date;
  timezone: string;
  locale?: EmailLocale;
}) => {
  const { styles, detailRow } = customerKit;
  const lang = params.locale ?? currentLocale();
  const t = emailStrings[lang];
  const { labels } = t;

  await deliver('cancellation confirmation', {
    to: params.email,
    subject: t.cancelled.subject(params.shopName),
    html: customerTemplate(
      lang,
      t.cancelled.title(params.shopName),
      params.shopName,
      t.cancelled.page,
      `
      <h1 style="${styles.h1}">${t.cancelled.heading(escapeHtml(params.customerName))}</h1>
      <p style="${styles.p}">${t.cancelled.body}</p>
      ${DETAILS_TABLE}
        ${detailRow(labels.date, formatDate(params.startTime, params.timezone, lang))}
        ${detailRow(labels.time, formatTime(params.startTime, params.timezone, lang))}
        ${detailRow(labels.service, escapeHtml(params.serviceName))}
        ${detailRow(labels.location, escapeHtml(params.shopName))}
      </table>
      <p style="${styles.note}">${t.cancelled.again}</p>
    `,
    ),
  });
};

/** What a shop is told about one of its bookings. */
interface BookingNoticeParams {
  email: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  timezone: string;
  products?: BookingEmailParams['products'];
  servicePrice?: number;
  locale?: EmailLocale;
}

export const sendNewBookingNotificationEmail = async (
  params: BookingNoticeParams,
) => {
  const { styles, detailRow } = accountKit;
  const lang = params.locale ?? currentLocale();
  const t = emailStrings[lang];
  const { labels } = t;

  await deliver('new booking notification', {
    to: params.email,
    subject: t.newBooking.subject(params.shopName),
    html: accountTemplate(
      lang,
      t.newBooking.title(params.shopName),
      t.newBooking.page,
      `
      <h1 style="${styles.h1}">${t.newBooking.heading(escapeHtml(params.shopName))}</h1>
      <p style="${styles.p}">${t.newBooking.body}</p>
      ${DETAILS_TABLE}
        ${detailRow(labels.customer, escapeHtml(params.customerName))}
        ${detailRow(labels.phone, escapeHtml(params.customerPhone))}
        ${detailRow(labels.service, escapeHtml(params.serviceName))}
        ${detailRow(labels.provider, escapeHtml(params.staffName))}
        ${detailRow(labels.date, formatDate(params.startTime, params.timezone, lang))}
        ${detailRow(labels.time, formatTime(params.startTime, params.timezone, lang))}
        ${productRows(params.products, params.servicePrice, lang, detailRow)}
      </table>
    `,
    ),
  });
};

export const sendBookingRescheduledNotificationEmail = async (
  params: BookingNoticeParams & { previousStartTime: Date },
) => {
  const { styles, detailRow } = accountKit;
  const lang = params.locale ?? currentLocale();
  const t = emailStrings[lang];
  const { labels } = t;
  const { timezone } = params;

  await deliver('booking rescheduled notification', {
    to: params.email,
    subject: t.rescheduledNotice.subject(params.shopName),
    html: accountTemplate(
      lang,
      t.rescheduledNotice.title(params.shopName),
      t.rescheduledNotice.page,
      `
      <h1 style="${styles.h1}">${t.rescheduledNotice.heading}</h1>
      <p style="${styles.p}">${t.rescheduledNotice.body}</p>
      ${DETAILS_TABLE}
        ${detailRow(labels.customer, escapeHtml(params.customerName))}
        ${detailRow(labels.phone, escapeHtml(params.customerPhone))}
        ${detailRow(labels.service, escapeHtml(params.serviceName))}
        ${detailRow(labels.provider, escapeHtml(params.staffName))}
        ${detailRow(labels.newDate, formatDate(params.startTime, timezone, lang))}
        ${detailRow(labels.newTime, formatTime(params.startTime, timezone, lang))}
        ${detailRow(labels.was, `${formatDate(params.previousStartTime, timezone, lang)}, ${formatTime(params.previousStartTime, timezone, lang)}`)}
      </table>
    `,
    ),
  });
};

export const sendInviteEmail = async (
  recipientEmail: string,
  plainToken: string,
  shopName: string,
  inviterEmail: string,
  role: string,
  lang: EmailLocale = currentLocale(),
) => {
  const { styles } = accountKit;
  const t = emailStrings[lang];
  const to = env.inviteEmailOverride ?? recipientEmail;
  const url = `${env.clientUrl}/invite?token=${plainToken}`;
  const [before, between, after] = t.invite.body;

  await deliver('invite', {
    to,
    subject: t.invite.subject(shopName),
    html: accountTemplate(
      lang,
      t.invite.title(shopName),
      t.invite.page,
      `
      <h1 style="${styles.h1}">${t.invite.heading(escapeHtml(shopName))}</h1>
      <p style="${styles.p}">${before}${strong(escapeHtml(inviterEmail))}${between}${strong(escapeHtml(t.roles[role] ?? role))}${after}</p>
      <p style="${styles.note}">${t.expires(strong(t.span7d))}</p>
      ${linkBlock(url, t.invite.button, lang)}
    `,
    ),
  });
};
