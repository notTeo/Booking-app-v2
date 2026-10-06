import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import helmet from 'helmet';
import { ErrorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import cookieParser from 'cookie-parser';
import { startCleanupJob } from './utils/cleanup';
import { startReminderJob } from './utils/reminders';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import shopRoutes from './routes/shop.routes';
import globalInviteRoutes from './routes/globalInvite.routes';
import publicRoutes from './routes/public.routes';
import mediaRoutes from './routes/media.routes';
import { requestId } from './middleware/requestId';
import { authenticate } from './middleware/authenticate';
import { rejectControlChars } from './middleware/rejectControlChars';
import { prisma } from './utils/prisma';
import { createShutdown } from './utils/shutdown';

const IMPORT_PATH = /^\/api\/shops\/[^/]+\/customers\/import\/?$/;

const app = express();

//Middleware
app.set('trust proxy', 1);
app.use(requestId);
app.use(
  helmet({
    // Strict-Transport-Security: force HTTPS for 1 year in production
    hsts:
      env.nodeEnv === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    // This is a JSON API — no HTML is served, so CSP is not applicable
    contentSecurityPolicy: false,
    // Prevent MIME type sniffing
    noSniff: true,
    // Don't expose X-Powered-By
    hidePoweredBy: true,
    // Deny framing
    frameguard: { action: 'deny' },
    // XSS filter for older browsers
    xssFilter: true,
  }),
);

app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
    // Not in the CORS response-header safelist, so the browser hides it from
    // client JS unless explicitly exposed (needed for BOOKING_BUSY's 503 to
    // tell the frontend how long to wait before re-enabling the submit button).
    exposedHeaders: ['Retry-After'],
  }),
);
app.use(cookieParser());
// A customer import carries up to 500 rows, more than the default 100kb body.
// Its own, larger parser runs in the customer router, after authentication,
// so an anonymous caller is never read past the default limit.
const defaultJson = express.json();
app.use((req, res, next) => {
  if (!IMPORT_PATH.test(req.path)) return defaultJson(req, res, next);
  try {
    authenticate(req, res, next);
  } catch (err) {
    // Throw the unread body away (no buffering, no parsing) and answer once
    // it has all arrived, so the caller reads the 401 instead of a connection
    // broken halfway through its upload.
    req.once('end', () => next(err));
    req.once('error', () => next(err));
    req.resume();
  }
});
app.use(rejectControlChars);

// Liveness + DB reachability. 503 (no detail) when the DB is down so a
// platform health check restarts/stops routing instead of reporting healthy.
app.get('/health', async (_req, res) => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('db health check timed out')),
          3000,
        ).unref(),
      ),
    ]);
    res.json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error(err, 'Health check failed');
    res.status(503).json({
      status: 'error',
      db: 'down',
      timestamp: new Date().toISOString(),
    });
  }
});

// API docs — only in non-production environments
if (env.nodeEnv !== 'production') {
  const swaggerDocument = parse(
    readFileSync(join(__dirname, 'docs/openapi.yaml'), 'utf8'),
  );
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/invites', globalInviteRoutes);
app.use('/public', publicRoutes);
app.use('/media', mediaRoutes);

app.use(ErrorHandler);

export default app;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(env.port, () => {
    logger.info(`🚀 Server running on http://localhost:${env.port}`);
  });
  const cleanupTimer = startCleanupJob();
  const reminderTimer = startReminderJob();

  const shutdown = createShutdown({
    server,
    disconnect: () => prisma.$disconnect(),
    onShutdown: () => {
      clearInterval(cleanupTimer);
      clearInterval(reminderTimer);
    },
    log: logger,
    exit: (code) => process.exit(code),
  });

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  // Node's default (crash with no cleanup) is fine for correctness but loses
  // the log line and skips draining; log it, then shut down non-zero.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    void shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });
}
