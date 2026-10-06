import pino from 'pino';
import { env } from '../config/env';
import { getRequestId } from './requestContext';

export const logger = pino({
  level: 'info',
  // Secrets never belong in a log line, whatever object they arrive inside.
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.cancelToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  mixin: () => {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
