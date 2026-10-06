import type { Request } from 'express';
import { requestContext } from './requestContext';
import {
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALES,
  type EmailLocale,
} from '../services/emailStrings';

/** A stored or received value as an email language; anything else is Greek. */
export const parseLocale = (value: unknown): EmailLocale =>
  EMAIL_LOCALES.includes(value as EmailLocale)
    ? (value as EmailLocale)
    : DEFAULT_EMAIL_LOCALE;

/**
 * The language the caller has the app in. The web app sends its own setting
 * as Accept-Language ("el" or "en"); only that first tag is read, so a
 * browser's default header from another client still falls back to Greek
 * unless it leads with English.
 */
export const requestLocale = (req: Request): EmailLocale =>
  parseLocale(
    req.headers['accept-language']
      ?.split(',')[0]
      ?.trim()
      .slice(0, 2)
      .toLowerCase(),
  );

/**
 * The language of the request being handled, for the emails it triggers.
 * Greek outside a request (the reminder job passes each booking's own).
 */
export const currentLocale = (): EmailLocale =>
  requestContext.getStore()?.locale ?? DEFAULT_EMAIL_LOCALE;
