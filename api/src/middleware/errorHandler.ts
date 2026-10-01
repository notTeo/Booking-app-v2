import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../../dist/generated/prisma';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    // Stable machine-readable identifier clients can branch on.
    public code?: string,
    // Extra response headers (e.g. Retry-After on a 503).
    public headers?: Record<string, string>,
    // Extra fields merged into the JSON response body (e.g. the full list of
    // booking-rule `violations` on a 422).
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'App Error';
  }
}

export const ErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    if (err.headers) res.set(err.headers);
    return res.status(err.statusCode).json({
      status: 'error',
      ...(err.code && { code: err.code }),
      message: err.message,
      ...err.details,
    });
  }

  // A foreign-key violation that slipped past a route's own checks: the row is
  // still referenced elsewhere. A conflict with current data, not a server bug.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2003'
  ) {
    logger.warn(
      { err, path: req.path, method: req.method },
      'Foreign key conflict',
    );
    return res.status(409).json({
      status: 'error',
      code: 'CONFLICT_REFERENCED',
      message:
        "This item is still referenced by other records and can't be removed.",
    });
  }

  // Not our own AppError, but still the client's mistake, not a server
  // failure — e.g. a malformed JSON body throws a plain SyntaxError from
  // body-parser (upstream of our own routes) with status/statusCode 400.
  // Respect that instead of masking every non-AppError as a 500. Restricted
  // to 4xx so an unexpected 5xx-ish status on some other error still gets
  // logged and the generic message below (never leaking arbitrary internals).
  const status =
    (err as { status?: unknown }).status ??
    (err as { statusCode?: unknown }).statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const isMalformedJson =
      (err as { type?: string }).type === 'entity.parse.failed';
    return res.status(status).json({
      status: 'error',
      message: isMalformedJson
        ? 'Malformed JSON in request body.'
        : err.message,
    });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
