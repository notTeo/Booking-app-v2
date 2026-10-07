import { describe, expect, it } from 'vitest';
import { parseConfirmedBooking, type ConfirmedBooking } from './confirmedBooking';

const booking: ConfirmedBooking = {
  name: 'Maria',
  serviceNames: 'Haircut + Beard trim',
  date: '2026-11-03',
  time: '10:30',
  phone: '6900000000',
  email: '',
  products: [{ name: 'Shampoo', quantity: 2, unitPrice: 1250 }],
  servicePrice: 2500,
};

describe('parseConfirmedBooking', () => {
  it('reads back what was saved', () => {
    expect(parseConfirmedBooking(JSON.stringify(booking))).toEqual(booking);
  });

  it('leaves the service price out when there is none', () => {
    const plain = { ...booking, products: [], servicePrice: undefined };
    const parsed = parseConfirmedBooking(JSON.stringify(plain));
    expect(parsed).toEqual({ ...booking, products: [], servicePrice: undefined });
    expect(parsed && 'servicePrice' in parsed).toBe(false);
  });

  it('reads nothing, broken JSON or a wrong shape as "nothing to show"', () => {
    expect(parseConfirmedBooking(null)).toBeNull();
    expect(parseConfirmedBooking('{oops')).toBeNull();
    expect(parseConfirmedBooking('"text"')).toBeNull();
    expect(parseConfirmedBooking(JSON.stringify({ ...booking, name: 5 }))).toBeNull();
    expect(parseConfirmedBooking(JSON.stringify({ ...booking, products: 'none' }))).toBeNull();
    expect(parseConfirmedBooking(JSON.stringify({ ...booking, products: [{ name: 'x', quantity: '2', unitPrice: 1 }] }))).toBeNull();
  });

  it('drops unknown fields and caps very long text', () => {
    const parsed = parseConfirmedBooking(JSON.stringify({ ...booking, name: 'a'.repeat(1000), extra: '<script>' }));
    expect(parsed?.name).toHaveLength(300);
    expect(parsed).not.toHaveProperty('extra');
  });
});
