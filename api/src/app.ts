import express from 'express';
import { env } from './config/env';
import cors from 'cors'
import helmet from 'helmet';
import { ErrorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from "./routes/auth.routes"
import userRoutes from "./routes/user.routes"
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { startCleanupJob } from './utils/cleanup';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import billingRoutes from './routes/billing.routes';

const app = express();

//Middleware
app.use(helmet({
  // Strict-Transport-Security: force HTTPS for 1 year in production
  hsts: env.nodeEnv === 'production'
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
}));

app.use(cors(
    {
        origin: env.clientUrl,
        credentials: true,
    }
))
app.use(cookieParser());
app.use(passport.initialize());

app.use('/billing', billingRoutes);
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API docs — only in non-production environments
if (env.nodeEnv !== 'production') {
  const swaggerDocument = parse(
    readFileSync(join(__dirname, 'docs/openapi.yaml'), 'utf8'),
  );
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use("/auth", authRoutes)
app.use('/user', userRoutes);

app.use(ErrorHandler);

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () =>{
    logger.info(`🚀 Server running on http://localhost:${env.port}`);
    startCleanupJob();
  });
}
