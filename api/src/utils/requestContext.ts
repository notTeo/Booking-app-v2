import { AsyncLocalStorage } from 'async_hooks';
import type { EmailLocale } from '../services/emailStrings';

// Per-request store so every logger call made while handling a request (in
// services, not just middleware) carries the same requestId without passing
// it around.
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  // The language the caller has the app in (see utils/locale.ts).
  locale: EmailLocale;
}>();

export const getRequestId = (): string | undefined =>
  requestContext.getStore()?.requestId;
