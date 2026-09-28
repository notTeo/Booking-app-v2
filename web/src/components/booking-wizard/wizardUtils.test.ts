import { describe, it, expect } from 'vitest';
import { buildISODateTime } from './wizardUtils';

const ATHENS = 'Europe/Athens';

// The customer's browser timezone (process TZ under vitest) must never leak
// into the instant that gets booked: it is always the SHOP's wall-clock time.
describe('buildISODateTime(date, time, shopTimezone)', () => {
  it('winter: 10:00 Athens is 08:00Z', () => {
    expect(buildISODateTime('2027-02-01', '10:00', ATHENS)).toBe(
      '2027-02-01T08:00:00.000Z',
    );
  });

  it('summer: 10:00 Athens is 07:00Z', () => {
    expect(buildISODateTime('2027-07-05', '10:00', ATHENS)).toBe(
      '2027-07-05T07:00:00.000Z',
    );
  });

  it('DST-start day 2027-03-28: 10:00 Athens is 07:00Z (EEST)', () => {
    expect(buildISODateTime('2027-03-28', '10:00', ATHENS)).toBe(
      '2027-03-28T07:00:00.000Z',
    );
  });

  it('DST-end day 2027-10-31: 10:00 Athens is 08:00Z (EET)', () => {
    expect(buildISODateTime('2027-10-31', '10:00', ATHENS)).toBe(
      '2027-10-31T08:00:00.000Z',
    );
  });

  it('repeated hour 2027-10-31 03:30 maps to the earlier instant (matches the server)', () => {
    expect(buildISODateTime('2027-10-31', '03:30', ATHENS)).toBe(
      '2027-10-31T00:30:00.000Z',
    );
  });

  it('uses the shop zone, not a hardcoded one', () => {
    expect(buildISODateTime('2027-02-01', '10:00', 'America/New_York')).toBe(
      '2027-02-01T15:00:00.000Z',
    );
  });
});
