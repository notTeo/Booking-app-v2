import { describe, it, expect } from 'vitest';
import { deviceCookieDomain } from './customerDevice.service';

describe('deviceCookieDomain', () => {
  it('is the web app’s site when the API is on a subdomain of it', () => {
    expect(deviceCookieDomain('api.bebooked.gr', 'https://bebooked.gr')).toBe(
      'bebooked.gr',
    );
    expect(
      deviceCookieDomain('api.bebooked.gr', 'https://www.bebooked.gr'),
    ).toBe('bebooked.gr');
  });

  it('is left out anywhere else, so the cookie stays the API host’s own', () => {
    // Local development: one host, two ports.
    expect(
      deviceCookieDomain('localhost', 'http://localhost:5173'),
    ).toBeUndefined();
    // An API on a host of its own: a browser would refuse the foreign domain.
    expect(
      deviceCookieDomain('bebooked-api.up.railway.app', 'https://bebooked.gr'),
    ).toBeUndefined();
    expect(
      deviceCookieDomain('api.notbebooked.gr', 'https://bebooked.gr'),
    ).toBeUndefined();
    expect(deviceCookieDomain('api.bebooked.gr', 'not a url')).toBeUndefined();
  });
});
