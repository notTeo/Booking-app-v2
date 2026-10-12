import { describe, it, expect } from 'vitest';
import handler, { keyFrom, renewedCookie } from '../../api/customer-key';

const KEY = 'k'.repeat(43);

const call = (method: string, headers: Record<string, string>) => {
  const sent: Record<string, string> = {};
  let status = 0;
  handler(
    { method, headers },
    {
      setHeader: (name, value) => { sent[name] = value; },
      status: (code) => { status = code; return { end: () => undefined }; },
    },
  );
  return { sent, status };
};

describe('the customer key function', () => {
  it('finds the key among other cookies, and nothing that is not one', () => {
    expect(keyFrom(`lang=el; customerKey=${KEY}; theme=dark`)).toBe(KEY);
    expect(keyFrom('lang=el')).toBeNull();
    expect(keyFrom('customerKey=short')).toBeNull();
    expect(keyFrom(`customerKey=${KEY}; injected`)).toBe(KEY);
    expect(keyFrom(`customerKey=${KEY}\r\nSet-Cookie: x=y`)).toBeNull();
    expect(keyFrom('')).toBeNull();
  });

  it('sets the same cookie again for the whole site, unreadable by scripts', () => {
    expect(renewedCookie(KEY, 'www.bebooked.gr')).toBe(
      `customerKey=${KEY}; Domain=bebooked.gr; Path=/; Max-Age=34560000; HttpOnly; Secure; SameSite=Lax`,
    );
    expect(renewedCookie(KEY, 'bebooked.gr:443')).toContain('Domain=bebooked.gr;');
  });

  it('renews on POST only, and never hands out a key to a browser without one', () => {
    const renewed = call('POST', { cookie: `customerKey=${KEY}`, host: 'bebooked.gr' });
    expect(renewed.status).toBe(204);
    expect(renewed.sent['Set-Cookie']).toContain(`customerKey=${KEY};`);
    expect(renewed.sent['Cache-Control']).toBe('no-store');

    for (const { sent, status } of [
      call('GET', { cookie: `customerKey=${KEY}`, host: 'bebooked.gr' }),
      call('POST', { host: 'bebooked.gr' }),
      call('POST', { cookie: 'customerKey=nonsense', host: 'bebooked.gr' }),
    ]) {
      expect(status).toBe(204);
      expect(sent['Set-Cookie']).toBeUndefined();
    }
  });
});
