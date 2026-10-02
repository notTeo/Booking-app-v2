import { describe, it, expect } from 'vitest';
import { apiErrorField, apiErrorMessage, isReferencedConflict } from './apiError';

const axiosLike = (data: unknown) => ({ response: { data } });

describe('apiErrorMessage', () => {
  it('returns the API message', () => {
    expect(apiErrorMessage(axiosLike({ message: 'Email in use' }), 'x')).toBe('Email in use');
  });
  it('falls back for anything that is not a string message', () => {
    for (const err of [
      new Error('network down'),
      axiosLike({}),
      axiosLike({ message: 42 }),
      axiosLike({ message: ['a'] }),
      axiosLike(undefined),
      { response: undefined },
      null,
      undefined,
      'boom',
    ]) {
      expect(apiErrorMessage(err, 'fallback')).toBe('fallback');
    }
  });
});

describe('apiErrorField', () => {
  it('reads another field, or empty string', () => {
    expect(apiErrorField(axiosLike({ error: 'already cancelled' }), 'error')).toBe('already cancelled');
    expect(apiErrorField(axiosLike({}), 'error')).toBe('');
    expect(apiErrorField(null, 'error')).toBe('');
  });
});

describe('isReferencedConflict', () => {
  it('is true only for a 409 CONFLICT_REFERENCED', () => {
    expect(isReferencedConflict({ response: { status: 409, data: { code: 'CONFLICT_REFERENCED' } } })).toBe(true);
    expect(isReferencedConflict({ response: { status: 409, data: { code: 'OTHER' } } })).toBe(false);
    expect(isReferencedConflict({ response: { status: 500, data: { code: 'CONFLICT_REFERENCED' } } })).toBe(false);
    for (const err of [new Error('network down'), null, undefined, { response: {} }]) {
      expect(isReferencedConflict(err)).toBe(false);
    }
  });
});
