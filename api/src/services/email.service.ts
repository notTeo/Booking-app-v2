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

// Email clients are unreliable with <style> blocks and never load external
// fonts (Gmail strips the <link> tags), so every visual property below is
// inlined and font stacks stick to system-safe fallbacks. Gmail also forces
// its own blue/underline on <a> tags unless the inline color is marked
// !important — that's why every link/button color below has it.
const FONT = 'Helvetica, Arial, sans-serif';
const TEXT = '#064e3b';
const MUTED = '#475569';
const ACCENT = '#166534';
const BORDER = '#e2e8e2';

const styles = {
  body: `background:#ffffff;color:${TEXT};font-family:${FONT};margin:0;padding:0;`,
  wrapper: `max-width:520px;margin:0 auto;padding:40px 24px;`,
  brand: `font-family:${FONT};font-weight:800;font-size:20px;color:${ACCENT};letter-spacing:0.5px;`,
  pageLabel: `font-family:${FONT};font-size:15px;color:${MUTED};padding-left:10px;`,
  h1: `font-family:${FONT};font-size:26px;font-weight:700;line-height:1.3;color:${TEXT};margin:0 0 14px;`,
  p: `font-family:${FONT};color:${MUTED};font-size:15px;line-height:1.6;margin:0 0 20px;`,
  note: `font-family:${FONT};font-size:13px;color:${MUTED};line-height:1.5;margin:0 0 12px;`,
  fallbackLink: `font-family:${FONT};font-size:13px;color:${ACCENT} !important;word-break:break-all;`,
  detailLabel: `padding:9px 0;font-size:14px;color:${MUTED};border-bottom:1px solid ${BORDER};font-family:${FONT};`,
  detailValue: `padding:9px 0;font-size:14px;font-weight:700;color:${TEXT};text-align:right;border-bottom:1px solid ${BORDER};font-family:${FONT};`,
  footer: `font-family:${FONT};color:${MUTED};font-size:13px;margin-top:40px;`,
  strong: `color:${TEXT};`,
};

/** Outlined pill button — text lives in a nested <span> with its own
 * !important color, since some Gmail contexts only override the anchor
 * element's own color and leave a child element alone. */
const btnOutline = (href: string, label: string) => `
  <a href="${href}" style="display:inline-block;border:1.5px solid ${ACCENT};border-radius:50px;padding:10px 22px;margin:0 10px 10px 0;text-decoration:none;background:#ffffff;">
    <span style="font-family:${FONT};font-size:14px;font-weight:700;color:${ACCENT} !important;">${label}</span>
  </a>
`;

const inlineLink = (href: string, label: string) =>
  `<a href="${href}" style="color:${ACCENT} !important;font-weight:700;text-decoration:underline;">${label}</a>`;

const detailRow = (label: string, value: string) => `
  <tr>
    <td style="${styles.detailLabel}">${label}</td>
    <td style="${styles.detailValue}">${value}</td>
  </tr>
`;

const baseTemplate = (title: string, pageLabel: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="${styles.body}">
  <div style="${styles.wrapper}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="${styles.brand}">BOOKLY</td>
        <td style="${styles.pageLabel}">${pageLabel}</td>
      </tr>
    </table>
    ${content}
    <p style="${styles.footer}">&copy; ${new Date().getFullYear()} Bookly. All rights reserved.</p>
  </div>
</body>
</html>
`;

/** Google Calendar "add event" link — no attachment/dependency needed, same
 * pattern as the existing Google Maps "Get Directions" link below. */
const buildCalendarUrl = (params: {
  title: string;
  startTime: Date;
  endTime: Date;
  details: string;
  location?: string | null;
}) => {
  const toUtcBasic = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
  const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;
  const heading = name ? `Verify your email, ${escapeHtml(name)}.` : 'Verify your email.';

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: email,
    subject: 'Verify your email',
    html: baseTemplate('Verify your email', 'Verify', `
      <h1 style="${styles.h1}">${heading}</h1>
      <p style="${styles.p}">Confirm this email to activate your account and keep your access secure.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">24 hours</strong>. If you didn't create a Bookly account, you can ignore this email.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(verificationUrl, 'Verify email')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${verificationUrl}</p>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send verification email to ${email}`);
    throw new Error('Failed to send verification email');
  }

  logger.info(`Verification email sent to ${email}`);
};

export const sendEmailChangeVerification = async (
  newEmail: string,
  token: string,
) => {
  const verifyUrl = `${env.clientUrl}/verify-email-change?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: newEmail,
    subject: 'Verify your new email address',
    html: baseTemplate('Verify your new email address', 'Verify email change', `
      <h1 style="${styles.h1}">Verify your new email.</h1>
      <p style="${styles.p}">You requested to change your account's email address. Confirm this address to complete the change.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">24 hours</strong>.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(verifyUrl, 'Verify new email')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${verifyUrl}</p>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send email change verification to ${newEmail}`);
    throw new Error('Failed to send email change verification');
  }

  logger.info(`Email change verification sent to ${newEmail}`);
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  name?: string,
) => {
  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
  const heading = name ? `Reset your password, ${escapeHtml(name)}.` : 'Reset your password.';

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: email,
    subject: 'Reset your password',
    html: baseTemplate('Reset your password', 'Reset password', `
      <h1 style="${styles.h1}">${heading}</h1>
      <p style="${styles.p}">We received a request to reset your password. Set a new one below.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">1 hour</strong>. If you didn't request this, you can ignore this email.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(resetUrl, 'Reset password')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${resetUrl}</p>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send reset email to ${email}`);
    throw new Error('Failed to send password reset email');
  }

  logger.info(`Password reset email sent to ${email}`);
};

export const sendBookingConfirmationEmail = async (params: {
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
}) => {
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

  const mapsUrl = params.formattedAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(params.formattedAddress)}`
    : null;

  const calendarUrl = buildCalendarUrl({
    title: `${params.serviceName} at ${params.shopName}`,
    startTime: params.startTime,
    endTime: params.endTime,
    details: `Appointment with ${params.staffName} at ${params.shopName}.`,
    location: params.formattedAddress,
  });

  const cancelUrl = `${env.clientUrl}/cancel?token=${params.cancelToken}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: params.email,
    subject: `Your booking at ${params.shopName} is confirmed`,
    html: baseTemplate(`Booking at ${params.shopName}`, 'Booked', `
      <h1 style="${styles.h1}">Booking confirmed, ${escapeHtml(params.customerName)}.</h1>
      <p style="${styles.p}">Your appointment is locked in. We'll see you soon.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('Date', dateStr)}
        ${detailRow('Time', timeStr)}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Provider', escapeHtml(params.staffName))}
        ${detailRow('Location', escapeHtml(params.formattedAddress ?? params.shopName))}
      </table>
      <div style="margin:28px 0 16px;">
        ${btnOutline(calendarUrl, 'Save to calendar')}
        ${mapsUrl ? btnOutline(mapsUrl, 'Get directions') : ''}
      </div>
      <p style="${styles.note}">Directions open Google Maps and show travel time from your location.</p>
      <p style="${styles.note}">Need to cancel? ${inlineLink(cancelUrl, 'Cancel this booking')}.</p>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send booking confirmation email to ${params.email}`);
    throw new Error('Failed to send booking confirmation email');
  }

  logger.info(`Booking confirmation email sent to ${params.email}`);
};

export const sendCancellationConfirmationEmail = async (params: {
  email: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  startTime: Date;
  timezone: string;
}) => {
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
    html: baseTemplate(`Booking Cancelled — ${params.shopName}`, 'Cancelled', `
      <h1 style="${styles.h1}">Booking cancelled, ${escapeHtml(params.customerName)}.</h1>
      <p style="${styles.p}">Your appointment has been successfully cancelled.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:28px 0;">
        ${detailRow('Date', dateStr)}
        ${detailRow('Time', timeStr)}
        ${detailRow('Service', escapeHtml(params.serviceName))}
        ${detailRow('Location', escapeHtml(params.shopName))}
      </table>
      <p style="${styles.note}">If you'd like to book again, visit the shop's booking page.</p>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send cancellation email to ${params.email}`);
    throw new Error('Failed to send cancellation confirmation email');
  }

  logger.info(`Cancellation confirmation email sent to ${params.email}`);
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
    html: baseTemplate(`New Booking — ${params.shopName}`, 'New booking', `
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
    `),
  });

  if (error) {
    logger.error(error, `Failed to send new booking notification to ${params.email}`);
    throw new Error('Failed to send new booking notification email');
  }

  logger.info(`New booking notification sent to ${params.email}`);
};

export const sendInviteEmail = async (
  recipientEmail: string,
  plainToken: string,
  shopName: string,
  inviterEmail: string,
  role: string,
) => {
  const to = env.inviteEmailOverride ?? recipientEmail;
  const inviteUrl = `${env.clientUrl}/invite?token=${plainToken}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to,
    subject: `You've been invited to join ${shopName}`,
    html: baseTemplate(`Invitation to ${shopName}`, 'Invite', `
      <h1 style="${styles.h1}">You're invited to ${escapeHtml(shopName)}.</h1>
      <p style="${styles.p}"><strong style="${styles.strong}">${escapeHtml(inviterEmail)}</strong> has invited you to join as a <strong style="${styles.strong}">${escapeHtml(role)}</strong>.</p>
      <p style="${styles.note}">This link expires in <strong style="${styles.strong}">7 days</strong>.</p>
      <div style="margin:28px 0 16px;">
        ${btnOutline(inviteUrl, 'Accept invitation')}
      </div>
      <p style="${styles.note}">If the button doesn't work, copy and paste this link:</p>
      <p style="${styles.fallbackLink}">${inviteUrl}</p>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send invite email to ${recipientEmail}`);
    throw new Error('Failed to send invite email');
  }

  logger.info(`Invite email sent to ${recipientEmail} (delivered to ${to})`);
};
