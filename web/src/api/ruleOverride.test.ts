import { describe, it, expect } from 'vitest';
import { acceptableRuleCodes, getApiError } from './booking.api';

const v = (code: string, overridable = true) => ({ code, message: code, overridable });

describe('acceptableRuleCodes (what the "book anyway" dialog may resend)', () => {
  it('returns every violated code when all are overridable', () => {
    const info = {
      status: 422,
      code: 'BOOKING_IN_PAST',
      violations: [v('BOOKING_IN_PAST'), v('OUTSIDE_OPENING_HOURS')],
    };
    expect(acceptableRuleCodes(info)).toEqual(['BOOKING_IN_PAST', 'OUTSIDE_OPENING_HOURS']);
  });

  it('returns null (no dialog) if any violation is not overridable', () => {
    const info = {
      status: 422,
      code: 'BOOKING_BEYOND_ADVANCE_WINDOW',
      violations: [v('BOOKING_IN_PAST'), v('BOOKING_BEYOND_ADVANCE_WINDOW', false)],
    };
    expect(acceptableRuleCodes(info)).toBeNull();
  });

  it('never offers an override for the advance window, even without a violations list', () => {
    expect(acceptableRuleCodes({ status: 422, code: 'BOOKING_BEYOND_ADVANCE_WINDOW' })).toBeNull();
  });

  it('falls back to the single code when the server sent no violations list', () => {
    expect(acceptableRuleCodes({ status: 422, code: 'SHOP_CLOSED' })).toEqual(['SHOP_CLOSED']);
  });

  it('returns null for anything that is not a 422 rule violation', () => {
    expect(acceptableRuleCodes({ status: 409, code: 'SLOT_TAKEN' })).toBeNull();
    expect(acceptableRuleCodes({ status: 500 })).toBeNull();
  });
});

describe('getApiError', () => {
  it('extracts the violations list', () => {
    const err = {
      response: {
        status: 422,
        data: { code: 'SHOP_CLOSED', message: 'm', violations: [v('SHOP_CLOSED')] },
      },
    };
    expect(getApiError(err).violations).toEqual([v('SHOP_CLOSED')]);
  });

  it('parses Retry-After (seconds) off a 503 BOOKING_BUSY response', () => {
    const err = {
      response: {
        status: 503,
        data: { code: 'BOOKING_BUSY', message: 'busy' },
        headers: { 'retry-after': '1' },
      },
    };
    expect(getApiError(err).retryAfterSeconds).toBe(1);
  });

  it('has no retryAfterSeconds when the header is missing, blank or not a positive number', () => {
    expect(getApiError({ response: { status: 503, data: {} } }).retryAfterSeconds).toBeUndefined();
    expect(
      getApiError({ response: { status: 503, data: {}, headers: {} } }).retryAfterSeconds,
    ).toBeUndefined();
    expect(
      getApiError({ response: { status: 503, data: {}, headers: { 'retry-after': '0' } } })
        .retryAfterSeconds,
    ).toBeUndefined();
    expect(
      getApiError({ response: { status: 503, data: {}, headers: { 'retry-after': 'not-a-number' } } })
        .retryAfterSeconds,
    ).toBeUndefined();
  });
});
