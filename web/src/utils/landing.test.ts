import { describe, it, expect } from 'vitest';
import { pickLanding, safeRedirect } from './landing';

describe('safeRedirect', () => {
  it('keeps in-app paths with their query and hash', () => {
    expect(safeRedirect('/invite?token=abc')).toBe('/invite?token=abc');
    expect(safeRedirect('/shops/hair/bookings?date=2026-10-04#x')).toBe('/shops/hair/bookings?date=2026-10-04#x');
    expect(safeRedirect('/dashboard')).toBe('/dashboard');
  });

  it('rejects anything that could leave the site', () => {
    for (const raw of [
      '//evil.com',
      '/\\evil.com',
      '/\t/evil.com',
      'https://evil.com',
      'http://evil.com/dashboard',
      'javascript:alert(1)',
      'evil.com',
      'dashboard',
    ]) {
      expect(safeRedirect(raw)).toBeNull();
    }
  });

  it('rejects the auth pages, which would loop', () => {
    for (const raw of ['/login', '/login?redirect=/x', '/register', '/forgot-password']) {
      expect(safeRedirect(raw)).toBeNull();
    }
  });

  it('treats missing or empty as no redirect', () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect('')).toBeNull();
  });
});

describe('pickLanding', () => {
  it('sends a user with one shop into it', () => {
    expect(pickLanding({ pendingInvites: 0, shopSlugs: ['hair'] })).toBe('/shops/hair');
  });

  it('sends pending invites to the dashboard, even with one shop', () => {
    expect(pickLanding({ pendingInvites: 1, shopSlugs: ['hair'] })).toBe('/dashboard');
  });

  it('sends several shops to the dashboard', () => {
    expect(pickLanding({ pendingInvites: 0, shopSlugs: ['hair', 'nails'] })).toBe('/dashboard');
  });

  it('sends no shops and no invites to the dashboard', () => {
    expect(pickLanding({ pendingInvites: 0, shopSlugs: [] })).toBe('/dashboard');
  });
});
