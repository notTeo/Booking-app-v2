import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { requestContext } from '../utils/requestContext';
import { logger } from '../utils/logger';

// Accept a proxy-supplied id (Railway sets X-Request-Id) so logs line up with
// the edge, but only if it's short and boring — it ends up in logs and a
// response header.
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.get('x-request-id');
  const id =
    incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', id);

  requestContext.run({ requestId: id }, () => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.path === '/health') return;
      logger.info(
        {
          method: req.method,
          // path only: query strings carry tokens (verify-email, cancel, ...)
          path: req.originalUrl.split('?')[0],
          status: res.statusCode,
          ms: Number((process.hrtime.bigint() - start) / 1_000_000n),
        },
        'request',
      );
    });
    next();
  });
};
