import pino from 'pino';
import { env } from '../config/env';
import { getRequestId } from './requestContext';

export const logger = pino({
  level: 'info',
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
