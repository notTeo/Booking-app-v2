import { AsyncLocalStorage } from 'async_hooks';

// Per-request store so every logger call made while handling a request (in
// services, not just middleware) carries the same requestId without passing
// it around.
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export const getRequestId = (): string | undefined =>
  requestContext.getStore()?.requestId;
