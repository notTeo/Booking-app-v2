import { describe, it, expect } from 'vitest';
import { pickNavShop } from './useNavShop';

const hair = { slug: 'hair', name: 'Hairology', role: 'owner' as const };
const nails = { slug: 'nails', name: 'Nails', role: 'staff' as const };

describe('pickNavShop', () => {
  it('is nothing for someone who is not in any shop', () => {
    expect(pickNavShop([], null)).toBeNull();
    expect(pickNavShop(undefined, 'hair')).toBeNull();
  });

  it('is the one shop for someone in a single shop', () => {
    expect(pickNavShop([hair], null)).toEqual(hair);
  });

  it('is the shop opened last when there are several', () => {
    expect(pickNavShop([hair, nails], 'nails')).toEqual(nails);
  });

  it('falls back to the first shop when the last one is gone or none was opened', () => {
    expect(pickNavShop([hair, nails], 'deleted')).toEqual(hair);
    expect(pickNavShop([hair, nails], null)).toEqual(hair);
  });
});
