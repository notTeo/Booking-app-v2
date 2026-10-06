import { describe, it, expect } from 'vitest';
import { parseEnv, parseDurationSeconds } from './parseEnv';

const VALID = {
  NODE_ENV: 'production',
  CLIENT_URLS: 'https://a.example',
  DATABASE_URL: 'postgresql://x',
  JWT_ACCESS_SECRET: 's1',
  JWT_REFRESH_SECRET: 's2',
  RESEND_API_KEY: 'k',
  EMAIL_FROM: 'a@b.c',
  S3_ENDPOINT: 'https://storage.example',
  S3_REGION: 'auto',
  S3_BUCKET: 'media',
  S3_ACCESS_KEY_ID: 'id',
  S3_SECRET_ACCESS_KEY: 'secret',
} as NodeJS.ProcessEnv;

const errorsFor = (overrides: Record<string, string | undefined>) => {
  const r = parseEnv({ ...VALID, ...overrides } as NodeJS.ProcessEnv);
  return r.errors.join('|');
};

describe('parseEnv', () => {
  it('accepts a valid production config', () => {
    const r = parseEnv(VALID);
    expect(r.errors).toEqual([]);
    expect(r.env?.nodeEnv).toBe('production');
    expect(r.env?.jwt.refreshExpiresInSeconds).toBe(30 * 86400);
    expect(r.env?.jwt.accessExpiresInSeconds).toBe(900);
  });

  it('requires the photo bucket in production, and all five variables together', () => {
    const none = {
      S3_ENDPOINT: undefined,
      S3_REGION: undefined,
      S3_BUCKET: undefined,
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: undefined,
    };
    expect(errorsFor(none)).toContain('required in production');
    const dev = parseEnv({ ...VALID, ...none, NODE_ENV: 'development' });
    expect(dev.errors).toEqual([]);
    expect(dev.env?.storage).toBeNull();
    expect(
      errorsFor({ NODE_ENV: 'development', S3_SECRET_ACCESS_KEY: undefined }),
    ).toContain('S3_SECRET_ACCESS_KEY is required');
    expect(errorsFor({ S3_ENDPOINT: 'not a url' })).toContain('S3_ENDPOINT');
    expect(parseEnv(VALID).env?.storage?.bucket).toBe('media');
  });

  it('requires NODE_ENV, with no default', () => {
    expect(errorsFor({ NODE_ENV: undefined })).toContain('NODE_ENV');
    expect(errorsFor({ NODE_ENV: 'prod' })).toContain('NODE_ENV');
  });

  it('parses a comma-separated CLIENT_URLS list, trimming and dropping trailing slashes', () => {
    const r = parseEnv({
      ...VALID,
      CLIENT_URLS:
        ' https://a.example/ , https://www.a.example ,http://localhost:5173',
    });
    expect(r.env?.clientUrls).toEqual([
      'https://a.example',
      'https://www.a.example',
      'http://localhost:5173',
    ]);
    expect(r.env?.clientUrl).toBe('https://a.example');
  });

  it('falls back to the legacy CLIENT_URL, and CLIENT_URLS wins when both are set', () => {
    expect(
      parseEnv({
        ...VALID,
        CLIENT_URLS: undefined,
        CLIENT_URL: 'https://old.example',
      }).env?.clientUrls,
    ).toEqual(['https://old.example']);
    expect(
      parseEnv({ ...VALID, CLIENT_URL: 'https://old.example' }).env?.clientUrls,
    ).toEqual(['https://a.example']);
  });

  it('requires at least one valid http(s) origin', () => {
    expect(errorsFor({ CLIENT_URLS: undefined })).toContain('CLIENT_URLS');
    expect(errorsFor({ CLIENT_URLS: 'not a url' })).toContain('invalid origin');
    expect(errorsFor({ CLIENT_URLS: 'javascript:alert(1)' })).toContain(
      'invalid origin',
    );
  });

  it('reports every missing required variable', () => {
    const e = errorsFor({
      DATABASE_URL: undefined,
      JWT_ACCESS_SECRET: '',
      EMAIL_FROM: undefined,
    });
    expect(e).toContain('DATABASE_URL');
    expect(e).toContain('JWT_ACCESS_SECRET');
    expect(e).toContain('EMAIL_FROM');
  });

  it('rejects unparseable JWT durations instead of silently misusing them', () => {
    expect(errorsFor({ JWT_REFRESH_EXPIRES_IN: '30' })).toContain(
      'JWT_REFRESH_EXPIRES_IN',
    );
    expect(errorsFor({ JWT_REFRESH_EXPIRES_IN: 'soon' })).toContain(
      'JWT_REFRESH_EXPIRES_IN',
    );
    expect(errorsFor({ JWT_ACCESS_EXPIRES_IN: '0m' })).toContain(
      'JWT_ACCESS_EXPIRES_IN',
    );
  });

  it('honours non-day refresh durations', () => {
    expect(
      parseEnv({ ...VALID, JWT_REFRESH_EXPIRES_IN: '12h' }).env?.jwt
        .refreshExpiresInSeconds,
    ).toBe(43200);
  });
});

describe('parseDurationSeconds', () => {
  it('handles every unit', () => {
    expect(parseDurationSeconds('90s')).toBe(90);
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('12h')).toBe(43200);
    expect(parseDurationSeconds('30d')).toBe(2592000);
    expect(parseDurationSeconds('2w')).toBe(1209600);
  });
  it('rejects everything else', () => {
    for (const bad of ['', '30', 'd', '-5d', '1.5d', '5 days', '0d']) {
      expect(parseDurationSeconds(bad)).toBeNull();
    }
  });
});
