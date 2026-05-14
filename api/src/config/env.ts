import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
  'CLIENT_URL',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
] as const;

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[env] Missing required environment variables:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const get = (key: string): string => process.env[key] as string;

export const env = {
  port: process.env.PORT || '3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: get('CLIENT_URL'),
  database: {
    url: get('DATABASE_URL'),
  },
  jwt: {
    accessSecret: get('JWT_ACCESS_SECRET'),
    refreshSecret: get('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  resend: {
    apiKey: get('RESEND_API_KEY'),
    emailFrom: get('EMAIL_FROM'),
  },
  inviteEmailOverride: process.env.INVITE_EMAIL_OVERRIDE ?? null,
};
