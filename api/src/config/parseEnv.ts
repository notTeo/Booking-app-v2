// Pure env parsing/validation, split from env.ts (which reads process.env and
// exits on failure) so the rules can be unit tested without touching the
// process.

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
] as const;

// The S3-compatible bucket photos are stored in (a Railway bucket in
// production). All five or none: without them photos are kept on local disk
// (development) or in memory (tests), which production refuses.
const STORAGE_VARS = [
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

// "15m", "12h", "30d", "2w", "90s". A bare number is rejected: jsonwebtoken
// reads a bare numeric *string* as milliseconds, which used to turn
// JWT_REFRESH_EXPIRES_IN=30 into a 30ms token.
export const parseDurationSeconds = (value: string): number | null => {
  const match = /^(\d+)([smhdw])$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]) * UNIT_SECONDS[match[2]];
  return seconds > 0 ? seconds : null;
};

const parseOrigins = (source: NodeJS.ProcessEnv): string[] => {
  // CLIENT_URLS (comma-separated) wins; CLIENT_URL is the single-origin
  // legacy name. The first entry is the canonical URL used in email links.
  const raw = source.CLIENT_URLS?.trim() || source.CLIENT_URL?.trim() || '';
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

export type Env = ReturnType<typeof buildEnv>;

const buildEnv = (
  source: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
  clientUrls: string[],
  accessSeconds: number,
  refreshSeconds: number,
) => ({
  port: source.PORT || '3000',
  nodeEnv,
  // Canonical frontend URL, used for links in emails.
  clientUrl: clientUrls[0],
  // Every origin CORS accepts.
  clientUrls,
  database: { url: source.DATABASE_URL as string },
  jwt: {
    accessSecret: source.JWT_ACCESS_SECRET as string,
    refreshSecret: source.JWT_REFRESH_SECRET as string,
    accessExpiresInSeconds: accessSeconds,
    refreshExpiresInSeconds: refreshSeconds,
  },
  resend: {
    apiKey: source.RESEND_API_KEY as string,
    emailFrom: source.EMAIL_FROM as string,
  },
  inviteEmailOverride: source.INVITE_EMAIL_OVERRIDE ?? null,
  // null = no bucket configured (local disk in development, memory in tests).
  storage: source.S3_BUCKET
    ? {
        endpoint: source.S3_ENDPOINT as string,
        region: source.S3_REGION as string,
        bucket: source.S3_BUCKET,
        accessKeyId: source.S3_ACCESS_KEY_ID as string,
        secretAccessKey: source.S3_SECRET_ACCESS_KEY as string,
      }
    : null,
});

export const parseEnv = (
  source: NodeJS.ProcessEnv,
): { env: Env; errors: [] } | { env: null; errors: string[] } => {
  const errors: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!source[key]) errors.push(`${key} is required`);
  }

  const nodeEnv = source.NODE_ENV as NodeEnv | undefined;
  // Deliberately no default: an unset NODE_ENV would silently disable HSTS,
  // secure cookies and the rate limiters on a production host.
  if (!nodeEnv || !NODE_ENVS.includes(nodeEnv)) {
    errors.push(
      `NODE_ENV is required and must be one of: ${NODE_ENVS.join(', ')}`,
    );
  }

  const clientUrls = parseOrigins(source);
  if (clientUrls.length === 0) {
    errors.push('CLIENT_URLS (or CLIENT_URL) is required');
  }
  for (const origin of clientUrls) {
    try {
      const u = new URL(origin);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch {
      errors.push(`CLIENT_URLS contains an invalid origin: "${origin}"`);
    }
  }

  const storageSet = STORAGE_VARS.filter((key) => source[key]);
  if (storageSet.length > 0 && storageSet.length < STORAGE_VARS.length) {
    for (const key of STORAGE_VARS) {
      if (!source[key])
        errors.push(`${key} is required when any S3_* variable is set`);
    }
  } else if (storageSet.length === 0 && nodeEnv === 'production') {
    errors.push(
      `${STORAGE_VARS.join(', ')} are required in production (photo storage)`,
    );
  }
  if (source.S3_ENDPOINT) {
    try {
      new URL(source.S3_ENDPOINT);
    } catch {
      errors.push('S3_ENDPOINT must be a URL');
    }
  }

  const access = parseDurationSeconds(source.JWT_ACCESS_EXPIRES_IN || '15m');
  if (access === null) {
    errors.push('JWT_ACCESS_EXPIRES_IN must look like 15m, 12h or 30d');
  }
  const refresh = parseDurationSeconds(source.JWT_REFRESH_EXPIRES_IN || '30d');
  if (refresh === null) {
    errors.push('JWT_REFRESH_EXPIRES_IN must look like 15m, 12h or 30d');
  }

  if (errors.length > 0) return { env: null, errors };
  return {
    env: buildEnv(source, nodeEnv as NodeEnv, clientUrls, access!, refresh!),
    errors: [],
  };
};
