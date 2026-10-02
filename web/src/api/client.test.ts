import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    create: () => ({
      post,
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }),
  },
}));
vi.mock('../config/env', () => ({ env: { apiUrl: 'http://api.test' } }));

const { refreshTokens } = await import('./client');

const ok = (accessToken: string) => ({ data: { data: { accessToken } } });
const failure = (code?: string) =>
  Object.assign(new Error('Request failed'), { response: { status: 401, data: { code } } });

beforeEach(() => post.mockReset());

describe('refreshTokens (single-flight refresh)', () => {
  it('shares one request between parallel callers', async () => {
    post.mockResolvedValue(ok('t1'));

    const [a, b] = await Promise.all([refreshTokens(), refreshTokens()]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(a.data.accessToken).toBe('t1');
    expect(b).toBe(a);
  });

  it('retries exactly once when the server reports REFRESH_RACE', async () => {
    post.mockRejectedValueOnce(failure('REFRESH_RACE')).mockResolvedValueOnce(ok('t2'));

    const res = await refreshTokens();

    expect(post).toHaveBeenCalledTimes(2);
    expect(res.data.accessToken).toBe('t2');
  });

  it('does not retry a second REFRESH_RACE', async () => {
    post
      .mockRejectedValueOnce(failure('REFRESH_RACE'))
      .mockRejectedValueOnce(failure('REFRESH_RACE'));

    await expect(refreshTokens()).rejects.toBeDefined();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('does not retry any other error', async () => {
    const err = failure('SOMETHING_ELSE');
    post.mockRejectedValueOnce(err);

    await expect(refreshTokens()).rejects.toBe(err);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('starts a new request once the previous one has settled', async () => {
    post.mockResolvedValueOnce(ok('first')).mockResolvedValueOnce(ok('second'));

    expect((await refreshTokens()).data.accessToken).toBe('first');
    expect((await refreshTokens()).data.accessToken).toBe('second');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('starts a new request after a failure too', async () => {
    post.mockRejectedValueOnce(failure('X')).mockResolvedValueOnce(ok('again'));

    await expect(refreshTokens()).rejects.toBeDefined();
    expect((await refreshTokens()).data.accessToken).toBe('again');
  });
});
